
/**
 * @param {Object} res
 * @param {String} message The message to transmit
 * @param {Number} statusCode The Statuscode of the response
 */
module.exports = function (res, message, statusCode) {
  statusCode = statusCode || 500
  res.status(statusCode).send(JSON.stringify({ error: true, success: false, msg: message }))
}
