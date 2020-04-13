const bent = require('bent')
const sendMessage = require('../utils/sendMessage')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const eventbus = require('../utils/globalEventBus')
const fs = require('fs-extra')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const getUpdate = bent(`http://${config.general.domain}:11881/v1/version`, 'GET', 'buffer', {"Origin": "magic-mirror"})
const utils = require('../utils/utils')
const gunzip = require('gunzip-maybe')
const tar = require('tar')
const stream = require('stream')
const path = require('path')


/**
 * Method called from config frontend to verify that an update is available
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleisUpdateAvailable(logger, ws, data) {

  const signal = eventLib.config_frontend.signal_is_update_available
  eventbus.on('new_version', (version) => {
    if (!version) {
      logger.debug('No new version available!')
      sendMessage(ws, signal.responses.no_update_available)
    } else {
      logger.debug('New Version available!')
      sendMessage(ws, signal.responses.update_available)
    }
  })
  eventbus.emit('get_new_version')
}

/**
 * Method to handle the updatenow request from the config frontend
 * 
 * @param {winston.Logger} logger The logger object
 * @param {Websocket} ws The websocket associated with the connection
 * @param {Object} data 
 */
async function handleUpdateNow(logger, ws, data) {
  const signal = eventLib.config_frontend.signal_update_now

  try {
    var version = await new Promise((resolve, reject) => {
      let timeoutHandle = setTimeout(() => { reject('No new version available') }, 2000)
      eventbus.on('new_version', (version) => {
        clearTimeout(timeoutHandle)
        if (!version) {
          reject('No new version available!')
        } else {
          resolve(version)
        }
      })
      eventbus.emit('get_new_version')  
    })  
  } catch (error) {
    logger.error(error)
    sendMessage(ws, signal.responses.update_failed, error)
  }

  try {
    let response = await getUpdate(`/version/${version}`)
    if (Buffer.isBuffer(response)) {
      // Preparing empty dir to unzip into.
      let versionDir = path.join(config.directories.mirrorSoftwareDir, version) 
      fs.emptyDirSync(versionDir)

      // Waiting until extraction is done
      await new Promise((resolve, reject) => {
        // Wrapping our Buffer in a readable Stream interface. Makes it easier to extract.
        const responseStream = new stream.Readable()
        responseStream._read = () => {}
        responseStream.push(response)
        responseStream.push(null)
        
        // Piping our Buffer from memory directly to gunzip and then to untar 
        // -> In the future we will have to decrypt the buffer first.
        let tarStream = tar.extract({
          cwd: versionDir,
        })

        responseStream.pipe(tarStream)

        tarStream.on('close', () => {
          logger.debug('Stream closed.')
          setTimeout(resolve, 2000)
        })
        tarStream.on('end', () => {
          logger.debug('Stream ended.')
          //setTimeout(resolve, 2000)
        })
        tarStream.on('error', (error) => {
          logger.error('Error when extracting app!')
          reject(error)
        })
      })


      // After extracting we do a quick check that everything is there:

      const dirList = ['backend', 'services', 'frontend', 'screen-ctl']

      let dirs = fs.readdirSync(versionDir)
      logger.info(JSON.stringify(dirs))

      let dirChecks = dirList.map(dir => { return new Promise((resolve, reject) => {
        logger.debug('Looking for path: ' + path.join(versionDir, dir))
        if (!fs.existsSync(path.join(versionDir, dir))) {
          reject(dir)
        } else {
          resolve()
        }
      })})
      try {
        await Promise.all(dirChecks)
      } catch (error) {
        logger.error('After extracting the directory ' + error + ' did not exist! Aborting Update!')
        sendMessage(ws, signal.responses.update_failed)
        return
      }

      //Set screenon and screenoff to be executed by any user
      fs.chmodSync(path.join(versionDir, config.files.screenonFile), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.screenoffFile), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.screenCtlScript), 0o777)
      fs.chmodSync(path.join(versionDir, config.files.backendBinary), 0o777)

      //Now we need to fix the symlink
      let linkname = config.files.linkFile
      fs.removeSync(linkname)
      fs.ensureSymlinkSync(versionDir, linkname)

      // Now the update is complete. We must reboot tho!
      sendMessage(ws, signal.responses.update_successful)
      utils.reboot(logger)

    } else {
      logger.warning('Type of response does not match expected values! Type is ' + (typeof response))
      sendMessage(ws, signal.responses.update_failed)
    }
  } catch (error) {
    logger.debug(error.stack)
    logger.error('Error in UpdateNow: ' + error)
    sendMessage(ws, signal.responses.update_failed)
  }
}

module.exports = {
  handleisUpdateAvailable,
  handleUpdateNow
}

