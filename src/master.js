var winston = require('winston')
var config = require('../config/conf').get(process.env.NODE_ENV)
const cluster = require('cluster')
const numCPUs = /* process.env.NODE_ENV === 'production' ? require('os').cpus().length : */ 1
const logger = winston.createLogger(config.winston)

/*
Some remarks:

This server is designed for single threadedness. Handling the GlobalEventBus between different processes is alot of work.
Due to the fact that this will run on the PI, and only ever have one frontend connect to it (and maybe the app) we really dont need
more than one process.

This master cluster structure is still kept, to make sure the server restarts if it crashes at some point.

Yes, there are frameworks that also do this.
Yes, there are probably fancier solutions out there.

But: This solution works, its reliable and we dont have additional dependencies and potentially unnecessary code!
 */

start()

async function start () {
  if (cluster.isMaster) {
    logger.info('Master PID is: ' + process.pid)
    logger.info('Starting HTTP REST Server...')
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork(process.env)
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.info('Server died: ' + worker.process.pid + ' with signal: ' + signal)
      logger.info('Starting new server...')
      cluster.fork(process.env)
    })
  } else {
    logger.info('HTTP REST Server ' + process.pid + ' is starting up...')
    require('./server').startServer()
  }
}
