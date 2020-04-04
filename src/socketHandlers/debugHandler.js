const sendMessage = require('../utils/sendMessage')
const events = require('../../lib/mirror_shared_code/socketEvents').backendEvents
const config = require('../../config/conf').get(process.env.NODE_ENV)
const utils = require('../utils/utils')
const path = require('path')
const fs = require('fs-extra')
const globalBus = require('../utils/globalEventBus')

/**
 * Short debug function to get hostname and backend version to display in frontend
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleGetDeviceInfo(logger, ws, data) {
  let hostname = 'NA'
  try {
    hostname = utils.getHostName()
  } catch (error) {
    logger.error('Fatal error when reading hostname: ' + error)
  }
  sendMessage(ws, events.device_info, { version: '0.0.0-000', name: hostname})
}

module.exports = {
  handleGetDeviceInfo
}
