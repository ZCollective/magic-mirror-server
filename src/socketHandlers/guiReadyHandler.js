
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
}
