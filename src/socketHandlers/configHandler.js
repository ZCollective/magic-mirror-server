const sendMessage = require('../utils/sendMessage')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const utils = require('../utils/utils')
const path = require('path')
const fs = require('fs-extra')
const globalBus = require('../utils/globalEventBus')
const childprocess = require('child_process')

/**
 * Handler to be called when the Config Frontend has loaded and is ready to start operation
 * 
 * The Handler determines if normal or wifi config should be presented to the user.
 *
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleConfigReady(logger, ws, data) {

  const signal = eventLib.config_frontend.signal_config_ready

  /*
  To determine if we need to do the WIFI configuration we check if we have internet connectivity.
  Pinging 8.8.8.8 is a good start to reliably determine internet access

  If we do not have internet we send the wificonfig event
   */
  let connectivity = await utils.checkInetAccess(logger)
  sendMessage(ws, connectivity ? signal.responses.normal_config : signal.responses.wifi_config)
}



/**
 * Handler to be called when the user has confirmed the wifi config
 * 
 * This Handler will essentially just send a reboot signal to the frontend
 * and then shutdown the machine
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleConfirmWifiConfig(logger, ws, data) {

  //After wifi settings are confirmed, we must restart to let them take effect.
  utils.stopAP()
  utils.reboot(logger)
}

/**
 * Handler to be called when the user sets the Visible Device Name
 * 
 * This Handler will reconfigure the Avahi service file to contain the user defined
 * visible name for this device.
 * Hostname will be taken from the official /etc/hostname file
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleSetDeviceName(logger, ws, data) {

  const signal = eventLib.config_frontend.signal_set_device_name

  // Use utils to get the hostname. Might fail, so we add a catch
  let hostname
  try {
    hostname = utils.getHostName(logger)
  } catch (error) {
    logger.error('Error reading hostname: ' + error)    
    sendMessage(ws, events.confirm_device_name, false)
    return
  }

  let serviceText = `<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>${hostname}</name>
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>visibleName=${data}</txt-record>
  </service>
</service-group>`

  let avahiServicePath = path.join(config.directories.avahiDir, config.files.avahiService)

  // If env Variable IGNORE_CONF is set to true, we just print info text
  // Otherwise we re-create the avahi service file and change the owner to avahi.
  if (process.env.IGNORE_CONF === 'true') {
    logger.debug('Would set avahi conf to: ' + serviceText)
    logger.debug('Avahi service filepath: ' + avahiServicePath)
  } else {
    try {
      fs.writeFileSync(avahiServicePath, serviceText)
      childprocess.execSync(`chown avahi:avahi ${avahiServicePath}`)
    } catch (error) {
      logger.error('Could not write avahi conf! ' + error)
      sendMessage(ws, signal.responses.confirm_device_name, false)
      return
    }
  }
  sendMessage(ws, events.confirm_device_name, true)
}

/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleContentConfig(logger, ws, data) {
  // Reserved for future use
}

module.exports = {
  handleConfigReady,
  handleConfirmWifiConfig,
  handleSetDeviceName,
}
