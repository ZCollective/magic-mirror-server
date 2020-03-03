var express = require('express')
var router = express.Router()

router.use('/admin', require('./admin'))
router.use('/version', require('./version'))

module.exports = router
