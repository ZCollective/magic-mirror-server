var express = require('express')
var router = express.Router()
const fs = require('fs-extra')
const compare = require('compare-versions')
const path = require('path')

var config = require('../../../config/conf').get(process.env.NODE_ENV)

router.get('/latest', async (req, res) => {
  const logger = res.locals.logger
  const cache = res.locals.cache
  try {
    /*
     Sanity Checking inputs -> QueryParam
     */
    var currentVersion = req.query.current

    if (currentVersion === null || currentVersion === undefined) {
      logger.error('Invalid arguments, current is not defined')
      res.locals.sendError(res, 'BAD_REQUEST', 403)
    } else {
      var latestVersion = cache.get('latest')
      if (latestVersion === undefined) {
        /*
         Cache Miss -> Reading FS
         */
        var versionPath = path.join(process.cwd(), config.general.versionDir)
        var versions = fs.readdirSync(versionPath).filter(dir => {
          var readyPath = path.join(versionPath, dir, 'ready.json')
          return fs.existsSync(readyPath)
        }).sort(compare).reverse()

        if (versions < 0) {
          logger.error('No Version found!')
          res.locals.sendError(res, 'NOT_FOUND', 404)
        } else {
          var latestFoundVersion = versions[0]
          var versionFilePath = path.join(process.cwd(), config.general.versionDir, latestFoundVersion, 'app.tar.gz')
          if (!fs.existsSync(versionFilePath)) {
            logger.error('App File not found!')
            res.locals.sendError(res, 'NOT_FOUND', 404)
          } else {
            cache.set('latest', { version: latestFoundVersion, path: versionFilePath })
            latestVersion = { version: latestFoundVersion, path: versionFilePath }
          }
        }
      }
      /*
        Cache Hit -> Send Response (incl. File if latest is higher!)
        */
      if (compare(latestVersion.version, currentVersion) > 0) {
        // Latest is newer. Return file.
        fs.createReadStream(latestVersion.path).pipe(res)
        logger.info('Streaming latest version file!')
      } else {
        logger.debug('Latest version and current version match!')
        res.locals.sendError(res, 'NO_CHANGE', 304)
      }
    }
  } catch (error) {
    logger.debug(error.stack)
    logger.error('Error sending latest: ' + error)
    res.locals.sendError(res, 'INTERNAL_ERROR')
  }
})
module.exports = router
