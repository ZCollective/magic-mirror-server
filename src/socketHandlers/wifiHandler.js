const sendMessage = require('../utils/sendMessage')
const crypto = require('crypto')
const childprocess = require('child_process')

module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle(logger, ws, data) {

  //generate wpa password & start access point.
  let password = crypto.randomBytes(8).toString('hex')    
  logger.debug('Generated password: ' + password)
  
  //start access point
  childprocess.execSync(`create_ap --stop wlp3s0`)
  childprocess.execSync(`create_ap -n --redirect-to-localhost --no-virt --daemon wlp3s0 Mirror ${password}`)
  sendMessage(ws, 'wifiup', password)
}