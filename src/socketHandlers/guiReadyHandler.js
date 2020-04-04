const sendMessage = require('../utils/sendMessage')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const events = require('../../lib/mirror_shared_code/socketEvents').backendEvents
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const childprocess = require('child_process')
const globalBus = require('../utils/globalEventBus')
const utils = require('../utils/utils')
module.exports = handle


/**
 * Handler to be called when the Frontend sends the GUI Ready signal!
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

  // If no internet connectivity is available, we must do the wifi config.
  let connectivity = await utils.checkInetAccess(logger)
  sendMessage(ws, connectivity ? events.show_content : events.first_start)

  // we need some sort of message passing from config-frontend to mirror-frontend
  // this bus does the job.
  globalBus.on('frontendMessage', (data) => {
    logger.debug('Message for frontend: ' + data.event)
    sendMessage(ws, data.event, data.message)
  })

}