var winston = require('winston')
const path = require('path')
require('winston-daily-rotate-file')

var transport = new (winston.transports.DailyRotateFile)({
  frequency: '24h',
  filename: 'mirror-update-server-%DATE%.log',
  dirname: 'logs',
  datePattern: 'YYY-MM-DD-HH'
})

transport.on('rotate', () => {
  console.log('Rotating File!')
})
var config = {
  production: {
    cors: {
      whitelist: ['localhost']
    },
    winston: {
      level: 'info',
      format: winston.format.json(),
      transports: [
        transport
      ]
    },
    general: {
      port: 11882
    },
    directories: {

    },
    files: {
      versionInfo: 'versionInfo.json'
    }
  },
  default: {
    cors: {
      whitelist: ['localhost']
    },
    winston: {
      level: 'silly',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console()
      ]
    },
    general: {
      port: 11882,
      updateLoopInterval: /*10 * 1000*/ 1 * 60 * 60 * 1000
    },
    directories: {
      htmlDir: path.join(process.cwd(),'html'),
      zipDir: path.join(process.cwd(), 'zip'),
      firstDeployDir: path.join(process.cwd(), 'deploy1'),
      secondDeployDir: path.join(process.cwd(), 'deploy2'),
      configDir: path.join(process.cwd(), 'config')
    },
    files: {
      versionInfo: 'versionInfo.json',
      zipFile: 'app.tar.gz',
      backendBinary: 'mirror-backend',
      systemConfig: 'sysconfig.json',
      contentConfig: 'contentconfig.json',
      usageInfo: 'usageInfo.json'
    }
  }
}

exports.get = function get (env) {
  return config[env] || config.default
}
