const bent = require('bent')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const getUpdate = bent(`http://${config.general.domain}:11881/v1/version`, 'GET', 'json', {"Origin": "magic-mirror"})
const fs = require('fs-extra')
const path = require('path')
const sendMessage = require('../utils/sendMessage')
const eventbus = require('../utils/globalEventBus')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const versionInfo = require('../utils/versionInfo')

var newVersion

module.exports = run
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 */
async function run (logger, ws) {
  logger.info('Starting update loop...')
  eventbus.on('get_new_version', () => {
    eventbus.emit('new_version', newVersion || false)
  })
  const intervalHandle = setInterval(async () => {checkForUpdate(logger, ws)}, config.general.updateLoopInterval)
  checkForUpdate(logger, ws)
  ws.on('close', () => {
    logger.info('Stopping update loop!')
    clearInterval(intervalHandle)
  })
}

/**
 * 
 * @param {winston.Logger} logger the winston logger
 * @param {WebSocket} ws the Websocket
 */
async function checkForUpdate(logger, ws) {
  logger.debug('Running intervalHandler...')

  //Sending request to update server and handling response
  try {
    let currentVersion = versionInfo.version
    try {
      let response = await getUpdate(`/latest?current=${currentVersion}`)

      //Declaring as var to break out of blockscope and make it available in run function
      newVersion = response
      logger.debug('newVersion is: ' + newVersion)
      sendMessage(ws, eventLib.mirror_frontend.signal_frontend_ready.responses.update_available)
    } catch (error) {
      if (error.statusCode === 304) {
        logger.debug('No new version! Received code 304 (Unmodified)')
      } else {
        logger.error('Error occurred in updateLoop: ' + error)
        logger.error(error.stack)
      }
    }
  } catch (error) {
    logger.error('Error when running update! ' + error)
    logger.error('Trace: ' + error.stack)
  }
}