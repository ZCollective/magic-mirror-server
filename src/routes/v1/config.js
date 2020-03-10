const config = require('../../../config/conf').get(process.env.NODE_ENV)
const path = require('path')
const fs = require('fs-extra')
const eventbus = require('../../utils/globalEventBus')

const express = require('express')
const router = express.Router()

router.post('/systemConfig', async (req, res) => {
    var logger = res.locals.logger
    try {
        let conf = req.body
        //TODO Implement syntax/sanity check
        let configFile = path.join(config.directories.configDir, config.files.systemConfig)
        fs.writeJSONSync(configFile, conf)
        eventbus.emit('sysReconfigure')
    } catch (error) {
        logger.error(error.stack)
        logger.error('Unexpected Error: ' + error)
        res.locals.sendError(res, 'SERVER_ERROR')
    }
})

router.get('/systemConfig', async (req, res) => {
    var logger = res.locals.logger
    try {
        //TODO Implement syntax/sanity check
        let configFile = path.join(config.directories.configDir, config.files.systemConfig)
        let config = fs.readJSONSync(configFile)
        res.locals.sendSuccess(res, config)
    } catch (error) {
        logger.error(error.stack)
        logger.error('Unexpected Error: ' + error)
        res.locals.sendError(res, 'SERVER_ERROR')
    }

})

router.post('/contentConfig', async (req, res) => {
    var logger = res.locals.logger
    try {
        let conf = req.body
        //TODO Implement syntax/sanity check
        let configFile = path.join(config.directories.configDir, config.files.contentConfig)
        fs.writeJSONSync(configFile, conf)
        eventbus.emit('contentReconfigure', conf)
    } catch (error) {
        logger.error(error.stack)
        logger.error('Unexpected Error: ' + error)
        res.locals.sendError(res, 'SERVER_ERROR')
    }
})

router.get('/contentConfig', async (req, res) => {
    var logger = res.locals.logger
    try {
        let configFile = path.join(config.directories.configDir, config.files.contentConfig)
        let config = fs.readJSONSync(configFile)
        res.locals.sendSuccess(res, config)
    } catch (error) {
        logger.error(error.stack)
        logger.error('Unexpected Error: ' + error)
        res.locals.sendError(res, 'SERVER_ERROR')
    }

})

module.exports = router
