const sendMessage = require('../utils/sendMessage')
const crypto = require('crypto')
const childprocess = require('child_process')
const events = require('../../lib/mirror_shared_code/socketEvents').backendEvents
const config = require('../../config/conf').get(process.env.NODE_ENV)
const fs = require('fs-extra')
const path = require('path')
const utils = require('../utils/utils')


/**
 * 
 * Handler to be called when the Frontend is ready to start the Access point.
 * 
 * This is usually the case when the QR Code component has loaded in the frontend.
 * 
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} [data]
 */
async function handleStartAP(logger, ws, data) {

  //generate wpa password & start access point.
  let password = crypto.randomBytes(8).toString('hex')    
  logger.debug('Generated password: ' + password)

  logger.debug('Stopping eventual earlier ap')
  utils.stopAP()

  //The scan for networks is done, to allow access point usage. Some controllers do not allow scans while in AP mode.
  //logger.debug('Scanning for networks...')
  //await utils.scanAvailableNetworks(logger)
  
  //start access point if NOWIFI env variable is not set to true.
  if (process.env.NOWIFI !== "true") {
    logger.debug('Starting access point')
    let command = `create_ap -n --redirect-to-localhost --country DE --no-dns --daemon -w 2 ${process.env.IFACE ? process.env.IFACE : 'wlan0'} Mirror ${password}`
    logger.debug('Command is: ' + command)
    let output = childprocess.execSync(command)
    logger.silly('Output of create_ap: ' + output)
  }
  sendMessage(ws, events.ap_started, password)
}

/**
 * Handler to be called when the Frontend wants to list the wifi networks available.
 * 
 * @param {winston.Logger} logger the winston Logger object
 * @param {WebSocket} ws the current relevant websocket
 * @param {data} [data] additional data transferred through the websocket
 */
async function handleListWifi(logger, ws, data) {
  // Wifi networks are pre-scanned and just fetched here.
  logger.debug('Getting wifi networks')
  await utils.scanAvailableNetworks(logger)
  let ssidList = utils.getAvailableNetworks()
  logger.debug('Sending list: ' + ssidList)
  sendMessage(ws, events.available_networks, ssidList)
}

/**
 * Handler to be called when the user has selected a network to connect to.
 * 
 * @param {winston.Logger} logger the winston Logger object
 * @param {WebSocket} ws the current relevant websocket
 * @param {data} data additional data transferred through the websocket
 */
async function handleConnectWifi(logger, ws, data) {

  /*
    It is difficult to connect to a network via cli directly. Additonally the wifi 
    adapter might not support ap mode and wireless mode at the same time

    To set the wifi connectivity, we write the ssid and password into the wpa_supplicant.conf file
    Afterwards we need to reboot for the changes to take effect.

    Errorhandling: If the wifi password is wrong, or wifi network does not work anymore, we just have to restart the mirror
    Due to no connectivity, it will go into wifi config mode.
   */
  let connectionStatus
  if (process.env.NOWIFI !== "true") {
    try {

      // config file content
      let config = `# interfaces(5) file used by ifup(8) and ifdown(8)

      # Please note that this file is written to be used with dhcpcd
      # For static IP, consult /etc/dhcpcd.conf and 'man dhcpcd.conf'
      
      # Include files from /etc/network/interfaces.d:
      source-directory /etc/network/interfaces.d
      
      auto lo
      iface lo inet loopback
      iface eth0 inet dhcp
      
      auto wlan0
      allow-hotplug wlan0
      iface wlan0 inet dhcp
      wpa-ap-scan 1
      wpa-scan-ssid 1
      wpa-ssid ${data.ssid}
      wpa-psk ${data.password}`
      
      //writing config file
      fs.writeFileSync('/etc/network/interfaces', config)  
      connectionStatus = true
    } catch (error) {
      logger.error('Writing config file failed: ' + error)
      connectionStatus = false
    }
  } else {
    logger.debug('Sending successful connection response')
    //To test on machines without wifi, we simulate a successful connection after 2 seconds.
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 2000)
    })
    connectionStatus = true
  }
  sendMessage(ws, events.new_connection_result, { ssid: data.ssid, status: connectionStatus})
}

//Exporting the functions to make them available in the basehandler
module.exports = {
  handleStartAP,
  handleListWifi,
  handleConnectWifi
}