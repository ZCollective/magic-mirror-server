
/**
 * @param {Object} res
 * @param {String} message The message to transmit
 */
module.exports = function (res, message) {
  res.send(JSON.stringify(message))
}
