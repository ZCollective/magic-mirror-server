const express = require('express')
const router = express.Router()
const utils = require('../../utils/utils')
const crypto = require('crypto')
const childprocess = require('child_process')
const fs = require('fs')

router.get('/networks', async (req, res) => {
  const logger = res.locals.logger
  try {
    await utils.scanAvailableNetworks(res.locals.logger)
    const ssidList = utils.getAvailableNetworks()
    logger.debug('Found Networks: ' + JSON.stringify(ssidList))
    res.locals.sendSuccess(res, ssidList)
  } catch (error) {
    res.locals.logger.error('Error in GET /networks: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.get('/ap', async (res, req) => {
  const logger = res.locals.logger
  try {
    const password = crypto.randomBytes(8).toString('hex')
    logger.debug('Generated password: ' + password)

    // start access point if NOWIFI env variable is not set to true.
    if (process.env.NOWIFI !== 'true') {
      logger.debug('Stopping eventual earlier ap')
      utils.stopAP()
      logger.debug('Starting access point')
      const command = `create_ap -n --redirect-to-localhost --country DE --no-dns --daemon -w 2 ${process.env.IFACE ? process.env.IFACE : 'wlan0'} Mirror ${password}`
      logger.debug('Command is: ' + command)
      const output = childprocess.execSync(command)
      logger.silly('Output of create_ap: ' + output)
    }
    res.locals.sendSuccess(password)
  } catch (error) {
    res.locals.logger.error('Error in GET /ap: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/connect', async (req, res) => {
  const logger = res.locals.logger
  try {
    const ssid = req.body.ssid
    const password = req.body.password

    if (ssid === undefined || password === undefined) {
      logger.debug('Request did not contain ssid or password!')
      logger.silly(JSON.stringify(req.body))
      res.locals.sendError(res, 'BAD_REQUEST', 400)
      return
    }
    /*
    It is difficult to connect to a network via cli directly. Additonally the wifi
    adapter might not support ap mode and wireless mode at the same time

    To set the wifi connectivity, we write the ssid and password into the wpa_supplicant.conf file
    Afterwards we need to reboot for the changes to take effect.

    Errorhandling: If the wifi password is wrong, or wifi network does not work anymore, we just have to restart the mirror
    Due to no connectivity, it will go into wifi config mode.
   */
    if (process.env.NOWIFI !== 'true') {
      // config file content
      const config = `# interfaces(5) file used by ifup(8) and ifdown(8)

      # Please note that this file is written to be used with dhcpcd
      # For static IP, consult /etc/dhcpcd.conf and 'man dhcpcd.conf'
      
      # Include files from /etc/network/interfaces.d:
      source-directory /etc/network/interfaces.d
      
      auto lo
      iface lo inet loopback
      iface eth0 inet dhcp
      
      auto wlan0
      allow-hotplug wlan0
      iface wlan0 inet dhcp
      wpa-ap-scan 1
      wpa-scan-ssid 1
      wpa-ssid ${ssid}
      wpa-psk ${password}`

      // writing config file
      fs.writeFileSync('/etc/network/interfaces', config)
    } else {
      logger.debug('Sending successful connection response')
      // To test on machines without wifi, we simulate a successful connection after 2 seconds.
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 2000)
      })
    }
    res.locals.sendSuccess(res, { ssid: ssid })
  } catch (error) {
    res.locals.logger.error('Error in POST /connect: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/confirmConfig', async (req, res) => {
  const logger = res.locals.logger
  try {
    utils.stopAP()
    utils.reboot(logger)
    res.locals.sendSuccess(res, true)
  } catch (error) {
    res.locals.logger.error('Error in POST /confirmConfig: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.get('/connectivity', async (req, res) => {
  const logger = res.locals.logger
  try {
    res.locals.sendSuccess(res, utils.checkInetAccess(logger))
  } catch (error) {
    res.locals.logger.error('Error in GET /connectivity: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})
module.exports = router
