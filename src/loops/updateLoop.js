const bent = require('bent')
const domain = process.env.NODE_ENV === 'production' ? 'spackenserver.de' : 'localhost'
const getUpdate = bent(`http://${domain}:11881/v1/version/latest`, 'GET', 'buffer', {"Origin": "magic-mirror"})
const config = require('../../config/conf').get(process.env.NODE_ENV)
const fs = require('fs-extra')
const path = require('path')
const gunzip = require('gunzip-maybe')
const tar = require('tar-fs')
const stream = require('stream')
const sendMessage = require('../utils/sendMessage')
module.exports = run
/**
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 */
async function run (logger, ws) {
  logger.info('Starting update loop...')
  const intervalHandle = setInterval(async () => {
    logger.debug('Running intervalHandler...')
    /*
    Here I actually do the request and handle potential updates 

    Step 1: Get latest installed version
     */
    try {
      let currentVersion = fs.readJSONSync(path.join(process.cwd(), config.files.versionInfo)).version
      try {
        let response = await getUpdate(`?current=${currentVersion}`)
        if (Buffer.isBuffer(response)) {
          logger.info('New Version available! Loading into binaryDir!')

          // Preparing empty dir to unzip into.
          fs.emptyDirSync(config.directories.zipDir)

          // Wrapping our Buffer in a readable Stream interface. Makes it easier to extract.
          const responseStream = new stream.Readable()
          responseStream._read = () => {}
          responseStream.push(response)
          responseStream.push(null)

          // Piping our Buffer from memory directly to gunzip and then to untar 
          // -> In the future we will have to decrypt the buffer first.
          responseStream.pipe(gunzip(3)).pipe(tar.extract(config.directories.zipDir))

          // TODO do the installation of the app.
          sendMessage(ws, 'updateAvailable')
        } else {
          logger.warning('Type of response does not match expected values! Type is ' + (typeof response))
        }
      } catch (error) {
        if (error.statusCode === 304) {
          logger.debug('No new version! Received code 304 (Unmodified)')
        } else {
          logger.error('Error occurred in updateLoop: ' + error)
          logger.error(error.stack)
        }
      }
    } catch (error) {
      logger.error('Error when running update! ' + error)
      logger.error('Trace: ' + error.stack)
    }
  }, config.general.updateLoopInterval)
  ws.on('close', () => {
    logger.info('Stopping update loop!')
    clearInterval(intervalHandle)
  })
}