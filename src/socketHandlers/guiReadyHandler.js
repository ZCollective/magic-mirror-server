const sendMessage = require('../utils/sendMessage')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const childprocess = require('child_process')
const globalBus = require('../utils/globalEventBus')
module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle (logger, ws, data) {
  logger.info('Received Ready Signal!')

  /*
  Setting up Update Loop and other loops
   */
  require('../loops/updateLoop')(logger, ws)

  checkFirstStartup(logger, ws)

}

/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 */
function checkFirstStartup (logger, ws)  {

  // Checking if its the first startup
  let usageFilePath = path.join(config.directories.configDir, config.files.usageInfo)
  let usageFile = fs.readJSONSync(usageFilePath)
  if (usageFile.firstUsage) {
    sendMessage(ws, 'firstStart')
  }
  //sendMessage(ws,'firstStart', {password: '12345678'})
}

function simulateConfigEvent (logger, ws) {
  setTimeout(() => {
    globalBus.emit('sysReconfigure')
  }, 8000)
}