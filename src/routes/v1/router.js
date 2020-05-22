var express = require('express')
var router = express.Router()

router.use('/wifi', require('./wifi'))
router.use('/calendar', require('./calendar'))
router.use('/updates', require('./updates'))
router.use('/device', require('./device'))
module.exports = router

/*

Boilerplate for a new route

router.get('', async (req, res) => {
  const logger = res.locals.logger
  try {
    res.locals.sendSuccess(res, ssidList)
  } catch (error) {
    res.locals.logger.error('Error in GET /networks: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})
*/
