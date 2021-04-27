const express = require('express')
const router = express.Router()
const utils = require('../../utils/utils')
const fs = require('fs')
const path = require('path')
const config = require('../../../config/conf').get(process.env.NODE_ENV)
const eventbus = require('../../utils/globalEventBus')
const bent = require('bent')
const getUpdate = bent(`http://${config.general.domain}:11881/v1/version`, 'GET', 'buffer', { Origin: 'magic-mirror' })
const tar = require('tar')
const stream = require('stream')

router.get('/available', async (req, res) => {
  const logger = res.locals.logger
  try {
    var answer = false
    eventbus.on('new_version', (version) => {
      answer = true
      if (!version) {
        logger.debug('No new version available!')
        res.locals.sendSuccess(res, false)
      } else {
        logger.debug('New Version available!')
        res.locals.sendSuccess(res, true)
      }
    })
    eventbus.emit('get_new_version')
    setTimeout(() => {
      if (!answer) {
        logger.debug('No answer from Eventbus!')
        res.locals.sendError(res, 'SERVER_ERROR')
      }
    }, 5000)
  } catch (error) {
    res.locals.logger.error('Error in GET /available: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/updateNow', async (req, res) => {
  const logger = res.locals.logger
  try {
    var version = await new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => { reject(new Error('No new version available')) }, 2000)
      eventbus.on('new_version', (version) => {
        clearTimeout(timeoutHandle)
        if (!version) {
          reject(new Error('No new version available!'))
        } else {
          resolve(version)
        }
      })
      eventbus.emit('get_new_version')
    })

    const response = await getUpdate(`/version/${version}`)
    if (Buffer.isBuffer(response)) {
      // Preparing empty dir to unzip into.
      const versionDir = path.join(config.directories.mirrorSoftwareDir, version)
      fs.emptyDirSync(versionDir)

      // Waiting until extraction is done
      await new Promise((resolve, reject) => {
        // Wrapping our Buffer in a readable Stream interface. Makes it easier to extract.
        const responseStream = new stream.Readable()
        responseStream._read = () => { }
        responseStream.push(response)
        responseStream.push(null)

        // Piping our Buffer from memory directly to gunzip and then to untar
        // -> In the future we will have to decrypt the buffer first.
        const tarStream = tar.extract({
          cwd: versionDir
        })

        responseStream.pipe(tarStream)

        tarStream.on('close', () => {
          logger.debug('Stream closed.')
          setTimeout(resolve, 2000)
        })
        tarStream.on('end', () => {
          logger.debug('Stream ended.')
          // setTimeout(resolve, 2000)
        })
        tarStream.on('error', (error) => {
          logger.error('Error when extracting app!')
          reject(error)
        })
      })

      // After extracting we do a quick check that everything is there:

      const dirList = ['backend', 'services', 'frontend', 'screen-ctl']

      const dirs = fs.readdirSync(versionDir)
      logger.info(JSON.stringify(dirs))

      const dirChecks = dirList.map(dir => {
        return new Promise((resolve, reject) => {
          logger.debug('Looking for path: ' + path.join(versionDir, dir))
          if (!fs.existsSync(path.join(versionDir, dir))) {
            reject(new Error('Dir did not exist: ' + dir))
          } else {
            resolve()
          }
        })
      })
      await Promise.all(dirChecks)

      // Set screenon and screenoff to be executed by any user
      fs.chmodSync(path.join(versionDir, config.files.screenonFile), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.screenoffFile), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.screenCtlScript), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.backendBinary), 0o777)

      // Now we need to fix the symlink
      const linkname = config.files.linkFile
      fs.removeSync(linkname)
      fs.ensureSymlinkSync(versionDir, linkname)

      // Now the update is complete. We must reboot tho!
      res.locals.sendSuccess(res, true)
      utils.reboot(logger)
    } else {
      logger.warning('Type of response does not match expected values! Type is ' + (typeof response))
      res.locals.sendError(res, 'SERVER_ERROR')
    }
  } catch (error) {
    res.locals.logger.error('Error in POST /updateNow: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})
module.exports = router
