
module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle (logger, ws, data) {
  logger.info('Received: ' + data)
  ws.send(data)
}
