const express = require('express')
const router = express.Router()
const fs = require('fs-extra')
const { google } = require('googleapis')
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.readonly']
const credentials = require('../../utils/client_secret')
const path = require('path')
const config = require('../../../config/conf').get(process.env.NODE_ENV)
const calendarFile = path.join(config.directories.settingsDir, 'calendar.json')
/**
 * @type {google.auth.OAuth2}
 */
var oAuth2Client

router.get('/googleAuthURL', async (req, res) => {
  try {
    // Create OAuth2 Client
    const clientSecret = credentials.installed.client_secret
    const clientID = credentials.installed.client_id
    const redirectURIs = credentials.installed.redirect_uris
    oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])

    // TODO Check if we have a token
    const authURL = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })
    res.locals.sendSuccess(res, authURL)
  } catch (error) {
    res.locals.logger.error('Error in GET /authURL: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/googleCode', async (req, res) => {
  const logger = res.locals.logger
  try {
    const code = req.body.code
    if (oAuth2Client === null || oAuth2Client === undefined) {
      // Create OAuth2 Client
      const clientSecret = credentials.installed.client_secret
      const clientID = credentials.installed.client_id
      const redirectURIs = credentials.installed.redirect_uris
      oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])
    }
    const authTokens = await new Promise((resolve, reject) => {
      oAuth2Client.getToken(code, (error, tokens) => {
        if (error) reject(error)
        else resolve(tokens)
      })
    })
    logger.debug('Tokens: ' + JSON.stringify(authTokens))
    const access = authTokens.access_token
    const refresh = authTokens.refresh_token
    const expiryDate = authTokens.expiry_date

    // Store tokens in file
    let calendarObj
    try {
      calendarObj = fs.readJsonSync(calendarFile)
    } catch (error) {
      logger.error(error)
      logger.error(error.stack)
      logger.debug('Calendar config does not exist yet!')
      calendarObj = {}
    }
    calendarObj.type = 'google'
    calendarObj.token = access
    calendarObj.refreshtoken = refresh
    calendarObj.expiryDate = expiryDate
    fs.ensureFileSync(calendarFile)
    fs.writeJSONSync(calendarFile, calendarObj)
    res.locals.sendSuccess(res, access)
  } catch (error) {
    res.locals.logger.error('Error in POST /googleCode: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.post('/googleId', async (req, res) => {
  const logger = res.locals.logger
  try {
    const calendarid = req.body.id
    logger.debug('Data: ' + calendarid)

    // Storing Calendar Info
    const calendarObj = fs.readJSONSync(calendarFile)
    calendarObj.calendarid = calendarid
    fs.writeJSONSync(calendarFile, calendarObj)
    res.locals.sendSuccess(res, true)
  } catch (error) {
    res.locals.logger.error('Error in POST /id: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})

router.get('/info', async (req, res) => {
  const logger = res.locals.logger
  try {
    if (!fs.existsSync(calendarFile)) {
      res.locals.sendSuccess(res, {})
      return
    }
    const calendarInfo = fs.readJSONSync(calendarFile)
    if (calendarInfo.type === null || calendarInfo.type === undefined) {
      throw new Error('File does not have a CalendarType!')
    } else {
      const type = calendarInfo.type
      switch (type) {
        case 'google':
          if (!calendarInfo.calendarid || !calendarInfo.refreshtoken) {
            throw new Error('File does not contain google info! Content: ' + JSON.stringify(calendarInfo))
          } else {
            const clientSecret = credentials.installed.client_secret
            const clientID = credentials.installed.client_id
            const redirectURIs = credentials.installed.redirect_uris
            const oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])
            oAuth2Client.setCredentials({
              access_token: calendarInfo.token,
              refresh_token: calendarInfo.refreshtoken,
              expiry_date: calendarInfo.expiryDate || 1
            })
            if (oAuth2Client.isTokenExpiring()) {
              logger.debug('Refreshing token')
              const tokens = await oAuth2Client.refreshAccessToken()
              calendarInfo.token = tokens.credentials.access_token || calendarInfo.token
              calendarInfo.refreshtoken = tokens.credentials.refresh_token || calendarInfo.refreshtoken
              calendarInfo.expiryDate = tokens.credentials.expiry_date || calendarInfo.expiryDate
            }
            logger.debug('Token: ' + calendarInfo.token)
            fs.writeJSONSync(calendarFile, calendarInfo)
            res.locals.sendSuccess(res, {
              token: calendarInfo.token,
              id: calendarInfo.calendarid,
              type: 'google'
            })
          }
          break
        case 'ical':
          // TODO implement Ical support
          throw new Error('ICal is not yet supported!')
        default:
          throw new Error('Invalid Calendar type: ' + type)
      }
    }
  } catch (error) {
    res.locals.logger.error('Error in GET /info: ' + error)
    res.locals.logger.error(error.stack)
    res.locals.sendError(res, 'SERVER_ERROR')
  }
})
module.exports = router
