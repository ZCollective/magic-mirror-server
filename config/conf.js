const winston = require('winston')
const format = winston.format
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
      level: 'silly',
      format: format.combine(
        format.timestamp(), format.json()
      ),
      transports: [
        transport
      ]
    },
    general: {
      port: 80,
      updateLoopInterval: /*1hour -> 60 * 60 * 1000 */ 60 * 60 * 1000,
      domain: 'spackenserver.de'
    },
    directories: {
      configDir: path.join(process.cwd(), 'config'),
      avahiDir: '/etc/avahi/services',
      mirrorSoftwareDir: '/mirror-sw',
      frontendDir: '/active-sw/frontend'
    },
    files: {
      zipFile: 'app.tar.gz',
      systemConfig: 'sysconfig.json',
      contentConfig: 'contentconfig.json',
      usageInfo: 'usageInfo.json',
      avahiService: 'mirror.service',
      linkFile: '/active-sw',
      screenonFile: '/screen-ctl/screenon',
      screenoffFile: '/screen-ctl/screenoff',
      screenCtlScript: '/screen-ctl/screen-ctl.py',
      backendBinary: '/backend/mirror-backend'
    }
  },
  default: {
    cors: {
      whitelist: ['localhost']
    },
    winston: {
      level: 'silly',
      format: format.combine(
        format.timestamp(), format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    },
    general: {
      port: 11882,
      updateLoopInterval: 10 * 1000 /*1 * 60 * 60 * 1000*/,
      domain: 'localhost'
    },
    directories: {
      configDir: path.join(process.cwd(), 'config'),
      avahiDir: '/etc/avahi/services',
      mirrorSoftwareDir: '/mirror-test-sw',
      frontendDir: path.join(process.cwd(), 'src/static'),
      settingsDir: '/settings'
    },
    files: {
      zipFile: 'app.tar.gz',
      systemConfig: 'sysconfig.json',
      contentConfig: 'contentconfig.json',
      usageInfo: 'usageInfo.json',
      avahiService: 'mirror.service',
      linkFile: '/update-test-sw',
      screenonFile: '/screen-ctl/screenon',
      screenoffFile: '/screen-ctl/screenoff',
      screenCtlScript: '/screen-ctl/screen-ctl.py',
      backendBinary: '/backend/mirror-backend',
    }
  }
}

exports.get = function get (env) {
  return config[env] || config.default
}
