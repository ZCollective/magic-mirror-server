const childprocess = require('child_process')
const eventbus = require('./globalEventBus')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const fs = require('fs-extra')

var availableNetworks = []
/**
 * @param {winston.Logger} logger the winston logger object.
 * Method checks internet access by pinging 8.8.8.8
 * 
 * Setting the WIFICONFIG env variable to true, will force this method to return true as well
 * 
 * @returns true if internet can be accessed, false otherwise
 */
async function checkInetAccess(logger) {
  let connectivity = false
  try {
    childprocess.execSync('ping 8.8.8.8 -c 5')
    connectivity = true
  } catch (error) {
    // If ping does not have network connectivity it will return exit code: 1 (or 2 for other errors)
    // non-zero exit codes are thrown as errors.
    logger.error('No Connectivity! -> Ping command returned non zero code: ' + error)
  }

  logger.debug('Connectivity: ' + connectivity)
  // we additionally check for first use, as with lan connectivity
  if (process.env.WIFICONFIG === 'true' || !connectivity) {
    return false
  } else {
    return true
  }
}

function getAvailableNetworks() {
  return availableNetworks
}

/**
 * 
 * @param {winston.Logger} logger 
 */
async function scanAvailableNetworks(logger) {
  // If env variable NOWIFI is set, the a dummy list will be generated for testing purposes
  let ssidList = []
  if (process.env.NOWIFI !== "true") {
    let networks = {}

    try {

      // Executing wifi scan
      let scanStatus = childprocess.execSync(`wpa_cli scan`)
      logger.debug('wpa_cli scan -> ' + scanStatus)

      // List results of the scan
      let scanResults = childprocess.execSync(`wpa_cli scan_results`).toString()

      /*
      iterating over every interesting line.
       1. splitting the lines into an array using the regex: /[^\r\n]+/g 
       2. Removing the first two lines, as they contain info about the interface, and other info
 
       Example output: 
 
       Selected interface 'wlan0'
       bssid / frequency / signal level / flags / ssid
       7c:ff:4d:50:9b:13	2467	-59	[WPA2-PSK-CCMP][WPS][ESS]	Bifroest
 
       */
      for (let line of scanResults.match(/[^\r\n]+/g).slice(2)) {

        /*
        Splitting the columns of a line by matching more than one whitespace character
         */
        let columns = line.match(/\S+/g)
        let strength = columns[2]
        let ssid = columns[4]

        // Some networks exist twice, due to repeaters. Here we take the strongest signal for each ssid
        if (!networks[ssid] || (networks[ssid] && networks[ssid] > parseInt(strength))) {
          networks[ssid] = parseInt(strength)
        }
      }
    } catch (error) {
      logger.error('Failure scanning for networks: ' + error)
    }

    //Transforming object into list
    for (let key of Object.keys(networks)) {
      ssidList.push({ ssid: key, strength: networks[key] })
    }
  } else {
    // if we are testing on a machine without wifi, we create a dummy list
    logger.debug('Running in NOWIFI mode. Creating dummy list')
    ssidList.push({ ssid: 'TestWifi', strength: 60 })
    ssidList.push({ ssid: 'ASDFNetwork', strength: 75 })
    ssidList.push({ ssid: 'WorstCase', strength: 88 })
    //To simulate realism, we set a timeout of 2 seconds
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 2000)
    })
  }
  availableNetworks = ssidList
}

function stopAP () {
  childprocess.execSync(`create_ap --stop ${process.env.IFACE ? process.env.IFACE : 'wlan0'}`)
}

function getHostName (logger) {
  try {
    return fs.readFileSync('/etc/hostname').toString()
  } catch (error) {
    logger.error('Failed to read hostname: ' + error)
    throw error
  }
}

function reboot(logger) {

  eventbus.emit('frontendMessage', {
    event: eventLib.mirror_frontend.signal_frontend_ready.responses.reboot
  })

  // For testing purposes we dont actually restart if the NOREBOOT env variable is set to true
  if (process.env.NOREBOOT !== 'true') {
    childprocess.exec(`sleep 10s;shutdown -r now`)
  } else {
    logger.debug('Simulating shutdown of system!')
  }
}
module.exports = {
  checkInetAccess,
  getAvailableNetworks,
  scanAvailableNetworks,
  stopAP,
  getHostName,
  reboot
}