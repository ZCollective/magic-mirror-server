const sendMessage = require('../utils/sendMessage')

module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle(logger, ws, data) {
  logger.info('Received content config event!')
  sendMessage(ws, 'configured', data)
}