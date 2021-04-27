const sendMessage = require('../utils/sendMessage')
const eventLib = require('../../lib/mirror_shared_code/socketEvents').mirror_frontend
const globalBus = require('../utils/globalEventBus')
const utils = require('../utils/utils')

/**
 * Handler to be called when the Frontend sends the GUI Ready signal!
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle (logger, ws, data) {

  const signal = eventLib.signal_frontend_ready

  logger.info('Received Ready Signal!')

  /*
  Setting up Update Loop and other loops
   */
  require('../loops/updateLoop')(logger, ws)

  // If no internet connectivity is available, we must do the wifi config.
  const connectivity = await utils.checkInetAccess(logger)
  sendMessage(ws, connectivity ? signal.responses.show_content : signal.responses.first_start)

  // we need some sort of message passing from config-frontend to mirror-frontend
  // this bus does the job.
  globalBus.on('frontendMessage', (data) => {
    logger.debug('Message for frontend: ' + data.event)
    sendMessage(ws, data.event, data.message)
  })
}
module.exports = handle
