const sendMessage = require('../utils/sendMessage')
const events = require('../../lib/mirror_shared_code/socketEvents').backendEvents

module.exports = handle
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handle (logger, ws, data) {
  logger.info('Received: ' + data)
  sendMessage(ws, events.echo, data)
}
