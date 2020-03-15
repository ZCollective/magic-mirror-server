const sendMessage = require('../utils/sendMessage')
const crypto = require('crypto')
const childprocess = require('child_process')

/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleStartAP(logger, ws, data) {

  //generate wpa password & start access point.
  let password = crypto.randomBytes(8).toString('hex')    
  logger.debug('Generated password: ' + password)
  
  //start access point
  if (process.env.NOWIFI !== "true") {
    childprocess.execSync(`create_ap --stop wlp3s0`)
    childprocess.execSync(`create_ap -n --redirect-to-localhost --no-virt --daemon wlp3s0 Mirror ${password}`)  
  }
  sendMessage(ws, 'wifiup', password)
}

/**
 * 
 * @param {winston.Logger} logger the winston Logger object
 * @param {WebSocket} ws the current relevant websocket
 * @param {data} [data] additional data transferred through the websocket
 */
async function handleListWifi(logger, ws, data) {
  logger.debug('Scanning wifi networks')

  let ssidList = []
  if (process.env.NOWIFI !== "true") {
    //todo implement actual scan
  } else {
    logger.debug('Running in NOWIFI mode. Creating dummy list')
    ssidList.push({ ssid: 'TestWifi', strength: 60})
    ssidList.push({ ssid: 'ASDFNetwork', strength: 70})
  }
  sendMessage(ws, 'availablewifi', ssidList)
}

/**
 * 
 * @param {winston.Logger} logger the winston Logger object
 * @param {WebSocket} ws the current relevant websocket
 * @param {data} [data] additional data transferred through the websocket
 */
async function handleConnectWifi(logger, ws, data) {
}
module.exports = {
  handleStartAP,
  handleListWifi,
  handleConnectWifi
}