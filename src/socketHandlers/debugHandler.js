const sendMessage = require('../utils/sendMessage')
const utils = require('../utils/utils')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const fs = require('fs-extra')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const path = require('path')
const versionInfo = require('../utils/versionInfo')
/**
 * Short debug function to get hostname and backend version to display in frontend
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleGetDeviceInfo(logger, ws, data) {

  const signal = eventLib.mirror_frontend.signal_get_device_info

  let hostname = 'NA'
  let currentVersion = 'NA'
  let buildnum = 'NA'
  try {
    hostname = utils.getHostName(logger)
  } catch (error) {
    logger.error('Fatal error when reading hostname: ' + error)
  }
  sendMessage(ws, signal.responses.device_info, { version: versionInfo.version, name: hostname, buildnum: versionInfo.build})
}

module.exports = {
  handleGetDeviceInfo
}
