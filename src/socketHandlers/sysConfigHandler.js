const sendMessage = require('../utils/sendMessage')

module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle(logger, ws, data) {
  logger.info('Received system config event!')
  sendMessage(ws, 'restart')
  logger.info('restarting in 5 seconds')
  //TODO write restart code & mark firststart false
}