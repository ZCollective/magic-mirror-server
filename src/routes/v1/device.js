const express = require('express')
const router = express.Router()
const utils = require('../../utils/utils')
const childprocess = require('child_process')
const fs = require('fs')
const path = require('path')
const config = require('../../../config/conf').get(process.env.NODE_ENV)
const versionInfo = require('../../utils/versionInfo')

router.get('/name', async (req, res) => {
  const logger = res.locals.logger
  try {
    res.locals.sendSuccess(res, 'NA')
  } catch (error) {
    res.locals.logger.error('Error in GET /networks: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/name', async (req, res) => {
  const logger = res.locals.logger
  try {
    const devicename = req.body.name
    if (devicename === undefined) {
      logger.debug('name is missing from body!')
      res.locals.sendError(res, 'BAD_REQUEST', 400)
      return
    }
    const hostname = utils.getHostName(logger)
    const serviceText = `<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>${hostname}</name>
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>visibleName=${devicename}</txt-record>
  </service>
</service-group>`

    const avahiServicePath = path.join(config.directories.avahiDir, config.files.avahiService)

    // If env Variable IGNORE_CONF is set to true, we just print info text
    // Otherwise we re-create the avahi service file and change the owner to avahi.
    if (process.env.IGNORE_CONF === 'true') {
      logger.debug('Would set avahi conf to: ' + serviceText)
      logger.debug('Avahi service filepath: ' + avahiServicePath)
    } else {
      fs.writeFileSync(avahiServicePath, serviceText)
      childprocess.execSync(`chown avahi:avahi ${avahiServicePath}`)
    }
    res.locals.sendSuccess(res, true)
  } catch (error) {
    res.locals.logger.error('Error in POST /devicename: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.get('/info', async (req, res) => {
  const logger = res.locals.logger
  try {
    const hostname = utils.getHostName(logger)
    res.locals.sendSuccess(res, { version: versionInfo.version, name: hostname, buildnum: versionInfo.build })
  } catch (error) {
    res.locals.logger.error('Error in GET /networks: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

module.exports = router
