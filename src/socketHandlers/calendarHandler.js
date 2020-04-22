const sendMessage = require('../utils/sendMessage')
const config = require('../../config/conf').get(process.env.NODE_ENV)
const eventbus = require('../utils/globalEventBus')
const fs = require('fs-extra')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
const {google} = require('googleapis')
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.readonly']
const credentials = require('../utils/client_secret')
const path = require('path')
const calendarFile = path.join(process.cwd(), 'calendar.json')
/**
 * @type {google.auth.OAuth2}
 */
var oAuth2Client

/**
 * Method called from config frontend to verify that an update is available
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleGetOAuthLinkGoogle (logger, ws, data) {
  const signal = eventLib.config_frontend.signal_get_google_api_auth_url

  // Create OAuth2 Client
  const clientSecret = credentials.installed.client_secret
  const clientID = credentials.installed.client_id
  const redirectURIs = credentials.installed.redirect_uris
  oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])

  //TODO Check if we have a token
  const authURL = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })
  sendMessage(ws, signal.responses.google_auth_url, authURL)
}

/**
 * Method called from config frontend to verify that an update is available
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleGenerateTokenGoogle(logger, ws, data) {
  const signal = eventLib.config_frontend.signal_generate_google_api_token
  try {
    if (oAuth2Client === null || oAuth2Client === undefined) {
        // Create OAuth2 Client
      const clientSecret = credentials.installed.client_secret
      const clientID = credentials.installed.client_id
      const redirectURIs = credentials.installed.redirect_uris
      oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])
    }
    let authTokens = await new Promise((resolve, reject) => {
      oAuth2Client.getToken(data, (error, tokens) => {
        if (error) reject(error)
        else resolve(tokens)
      })
    })
    logger.debug('Tokens: ' + JSON.stringify(authTokens))
    let access = authTokens.access_token
    let refresh = authTokens.refresh_token
    let expiryDate = authTokens.expiry_date

    //Store tokens in file
    let calendarObj = fs.readJsonSync(calendarFile)
    calendarObj.type = 'google'
    calendarObj.token = access
    calendarObj.refreshtoken = refresh
    calendarObj.expiryDate = expiryDate
    fs.writeJSONSync(calendarFile, calendarObj)
    sendMessage(ws, signal.responses.google_api_token, access)
  } catch (error) {
    logger.debug(error.stack)
    logger.error('Error when generating token! ' + error)    
    sendMessage(ws, signal.responses.google_api_token_failure)
  }
}

/**
 * Method called from config frontend to verify that an update is available
 * @param {winston.Logger} logger
 * @param {WebSocket} ws
 * @param {Object} data
 */
async function handleSupplyGoogleCalendarId(logger, ws, data) {
  const signal = eventLib.config_frontend.signal_supply_google_calendar_id
  try {
    logger.debug('Data: ' + data)
    let calendarid = data
  
    //Storing Calendar Info
    let calendarObj = fs.readJSONSync(calendarFile)
    calendarObj.calendarid = data
    fs.writeJSONSync(calendarFile, calendarObj)  
    sendMessage(ws, signal.responses.google_cal_save_confirm)
  } catch (error) {
    logger.debug(error.stack)
    logger.error('Error when saving Google calendar info: ' + error)
    sendMessage(ws, signal.responses.google_cal_save_deny)
  }
} 

async function handleGetCalendarInfo(logger, ws, data) {
  const signal = eventLib.mirror_frontend.signal_get_calendar_info  
  try {
    let calendarInfo = fs.readJSONSync(calendarFile)
    if (calendarInfo.type === null || calendarInfo.type === undefined) {
      throw new Error('File does not have a CalendarType!') 
    } else {
      let type = calendarInfo.type
      switch (type) {
        case 'google':
          if (!calendarInfo.calendarid || !calendarInfo.refreshtoken) {
            throw new Error('File does not contain google info! Content: ' + JSON.stringify(calendarInfo))
          } else {
            const clientSecret = credentials.installed.client_secret
            const clientID = credentials.installed.client_id
            const redirectURIs = credentials.installed.redirect_uris
            let oAuth2Client = new google.auth.OAuth2(clientID, clientSecret, redirectURIs[0])
            oAuth2Client.setCredentials({
              access_token: calendarInfo.token,
              refresh_token: calendarInfo.refreshtoken,
              expiry_date: calendarInfo.expiryDate || 1
            })
            if(oAuth2Client.isTokenExpiring()) {
              logger.debug('Refreshing token')
              let tokens = await oAuth2Client.refreshAccessToken()
              calendarInfo.token = tokens.credentials.access_token || calendarInfo.token
              calendarInfo.refreshtoken = tokens.credentials.refresh_token || calendarInfo.refreshtoken
              calendarInfo.expiryDate = tokens.credentials.expiry_date || calendarInfo.expiryDate
            }
            logger.debug('Token: ' + calendarInfo.token)
            fs.writeJSONSync(calendarFile, calendarInfo)
            sendMessage(ws, signal.responses.google_calendar_info, {
              token: calendarInfo.token,
              id: calendarInfo.calendarid
            })
          }
          break
        case 'ical':
          //TODO implement Ical support
          throw new Error('ICal is not yet supported!')
          break
        default: 
          throw new Error('Invalid Calendar type: ' + type)
          break
      }
    }
  } catch (error) {
    logger.debug(error.stack)
    logger.error('Error when reading calendar info: ' + error)
    sendMessage(ws, signal.responses.no_calendar_info)
  }
}

module.exports = {
  handleGetOAuthLinkGoogle,
  handleGenerateTokenGoogle,
  handleSupplyGoogleCalendarId,
  handleGetCalendarInfo
}
