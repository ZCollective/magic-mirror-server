const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs-extra')
const config = require('../../../config/conf').get(process.env.NODE_ENV)
const weatherFile = path.join(config.directories.settingsDir, 'weather.json')

router.get('/weatherConfig', async (req, res) => {
  const logger = res.locals.logger
  try {
    const weatherConfig = {}
    if (fs.existsSync(weatherFile)) {
      logger.debug('Weatherfile existing')
      const weatherFileContent = fs.readJSONSync(weatherFile)
      weatherConfig.country = weatherFileContent.country
      weatherConfig.city = weatherFileContent.city
      weatherConfig.id = weatherFileContent.id
    }
    res.locals.sendSuccess(res, weatherConfig)
  } catch (error) {
    logger.error('Error in GET weatherConfig: ' + error)
    logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/weatherConfig', async (req, res) => {
  const logger = res.locals.logger
  try {
    const country = req.body.country
    const city = req.body.city
    const id = req.body.id
    if (!country || !city || !id) {
      throw new Error('Not all body params given: ' + JSON.stringify(req.body))
    }
    const weatherConfig = {
      country,
      city,
      id
    }
    fs.writeJSONSync(weatherFile, weatherConfig)
    res.locals.sendSuccess(res, weatherConfig)
  } catch (error) {
    logger.error('Error in GET weatherConfig: ' + error)
    logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

module.exports = router
