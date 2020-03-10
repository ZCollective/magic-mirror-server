const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
var winston = require('winston')
var http = require('http')


var config = require('../config/conf').get(process.env.NODE_ENV)

var logger = winston.createLogger(config.winston)

var exports = module.exports = {}

exports.startServer = async function () {
  logger.debug('Server running on pid: ' + process.pid)
  try {
    /*
    Configuring cors
    */
    logger.info('Configuring Cors with whitelist...')
    var whitelist = config.cors.whitelist
    var corsOptions = {
      origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS: ' + origin))
        }
      },
      credentials: true
    }
    logger.info('Cors Configuration Successful.')
    logger.info('Starting Express Framework...')
    const app = express()

    /*
    Declaring middleware functions used by ALL Routes
    */
    logger.info('Adding Middleware Functions...')
    app.use(morgan('combined'))
    app.use(cors())

    /*
    Adding resources to Response object
    */
    app.use(function (req, res, next) {
      res.locals.sendError = require('./utils/sendError')
      res.locals.sendSuccess = require('./utils/sendSuccess')
      res.locals.logger = logger
      next()
    })

    app.use(require('./routes/apiRouter'))

    app.get('/echo', (req, res) => {
      res.send('Sending message!')
    })

    app.use((req, res) => {
      res.status(404).send(JSON.stringify({ error: true, success: false, msg: 'Could not find the requested resource!' }))
    })

    logger.info('Starting Listener on Port: ' + config.general.port)
    var httpServer = http.createServer(app)
    httpServer.listen(config.general.port, '0.0.0.0')

    /*
     Setting up websocket server
     */
    require('./socketHandlers/baseHandler').setupServer(httpServer, logger)

    logger.info('HTTP REST Server Startup Complete.')
  } catch (error) {
    logger.error('Fatal error has occurred in HTTP REST Server ' + process.pid + ' : ' + error)
    logger.error('Stacktrace: ' + error.stack)
    process.exit(-1)
  }
}
