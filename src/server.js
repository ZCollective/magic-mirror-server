const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
var winston = require('winston')
var http = require('http')
const bodyParser = require('body-parser')

var config = require('../config/conf').get(process.env.NODE_ENV)

var logger = winston.createLogger(config.winston)

logger.debug('Server running on pid: ' + process.pid)
try {
  /*
  Configuring cors
  */
  logger.info('Starting Express Framework...')
  const app = express()

  /*
  Declaring middleware functions used by ALL Routes
  */
  logger.info('Adding Middleware Functions...')
  if (process.env.NODE_ENV === 'production') app.use(morgan('combined'))
  app.use(bodyParser.json())

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
  logger.info('Serving static from: ' + config.directories.frontendDir)
  app.use(express.static(config.directories.frontendDir))
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
