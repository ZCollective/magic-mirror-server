var express = require('express')
var router = express.Router()

const fs = require('fs-extra')
const path = require('path')

var Busboy = require('busboy')

var config = require('../../../config/conf').get(process.env.NODE_ENV)

router.put('/newVersion', (req, res) => {
  var tempFolder
  var logger = res.locals.logger
  try {
    var deliveredToken
    var tempFile
    var tempFileName
    var version

    /*
    Preparing busboy streams & events
     */
    var busboy = new Busboy({ headers: req.headers })

    busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated) => {
      if (fieldname === 'token') {
        logger.info('Found Token: ' + val)
        deliveredToken = val
      } else if (fieldname === 'version') {
        logger.info('Found Version: ' + val)
        /*
         Making sure we do not upload an existing version
         */
        var versionPath = path.join(process.cwd(), config.general.versionDir, val)
        if (fs.existsSync(versionPath)) {
          logger.error('Version ' + val + ' already exists!')
        } else {
          version = val
        }
      } else {
        logger.info('Found other field: ' + fieldname + ' : ' + val)
      }
    })
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      /*
      Sanity checking filename and other info
       */

      if (fieldname !== 'application-tar') {
        logger.error('Invalid FieldName for app file: ' + fieldname)
        logger.error('Piping file to Nirvana...')
        file.resume()
      } else if (filename !== 'app.tar.gz') {
        logger.error('Invalid Filename for app file: ' + filename)
        logger.error('Piping file to Nirvana...')
        file.resume()
      } else {
        /*
        Preparing download folder to temporarily store file
         */
        tempFileName = filename
        tempFolder = fs.mkdtempSync('mm_vers-')
        logger.debug('Temp folder: ' + tempFolder)
        tempFile = path.join(tempFolder, filename)
        var writeStream = fs.createWriteStream(tempFile)
        writeStream.on('error', (error) => {
          logger.error('Write error: ' + error)
          file.resume()
        })
        writeStream.on('finish', () => {
          logger.debug('Finished writing file to disk.')
        })
        file.pipe(writeStream)
      }
    })

    busboy.on('finish', () => {
      logger.info('Busboy Stream is finished.')
      /*
       Always sending success, to hide illegal API codes or illegal parameters
       Yes, security through obscurity is not ideal, but still adds to protection along other mechanisms
       */
      res.locals.sendSuccess(res, 'SUCCESS')

      if (deliveredToken !== res.locals.token) {
        /*
        Possibility to hook email alerts or lockdowns of update route?
         */
        logger.error('ILLEGAL TOKEN: ' + deliveredToken)
        /*
         Removing temporary file from disk
         */
        if (fs.existsSync(tempFolder)) {
          fs.remove(tempFolder, (error) => {
            if (error) logger.error('Could not delete dir: ' + tempFolder)
          })
        }
      } else if (!version) {
        logger.error('No version supplied!')
      } else if (!tempFile) {
        logger.error('No File found!')
      } else {
        /*
        Token is valid.
        Moving file to regular directory with version name
         */
        var finalDir = path.join(process.cwd(), config.general.versionDir, version)
        var finalFile = path.join(finalDir, tempFileName)
        fs.moveSync(tempFile, finalFile)
        fs.writeJSONSync(path.join(finalDir, 'ready.json'), { ready: true })
        logger.info('New Version was added successfully.')
      }
    })

    /*
    Piping the request to busboy for parsing
     */
    req.pipe(busboy)
  } catch (error) {
    logger.error('Unexpected Error: ' + error)
    logger.error('Could not store new Version!')
    res.locals.sendError(res, 'BAD_REQUEST')
  } finally {
    if (tempFolder) fs.removeSync(tempFolder)
  }
})

module.exports = router
