const WebSocket = require('ws')
const events = require('events')
const eventLib = require('../../lib/mirror_shared_code/socketEvents')
/*
Setup Websocket Eventbus for Responses
 */
const EventBus = new events.EventEmitter()

var exports = module.exports = {}

exports.eventbus = EventBus

exports.setupServer = function (server, logger) {
  // Setup Listener
  const wss = new WebSocket.Server({ server: server })
  /*
   Setup individual handlers
   */

   //Events from Mirror Frontend
  EventBus.on(eventLib.mirror_frontend.signal_frontend_ready.event, require('./guiReadyHandler'))
  EventBus.on(eventLib.mirror_frontend.signal_start_ap.event, require('./wifiHandler').handleStartAP)
  EventBus.on(eventLib.mirror_frontend.signal_get_device_info.event, require('./debugHandler').handleGetDeviceInfo)
 
   //Events from Config Frontend
  EventBus.on(eventLib.config_frontend.signal_config_ready.event, require('./configHandler').handleConfigReady)
  EventBus.on(eventLib.config_frontend.signal_list_wifi.event, require('./wifiHandler').handleListWifi)
  EventBus.on(eventLib.config_frontend.signal_connect_wifi.event, require('./wifiHandler').handleConnectWifi)
  EventBus.on(eventLib.config_frontend.signal_confirm_wifi_settings.event, require('./configHandler').handleConfirmWifiConfig)
  EventBus.on(eventLib.config_frontend.signal_set_device_name.event, require('./configHandler').handleSetDeviceName)
  //EventBus.on(eventLib.config_frontend.signal_get_device_name)
  EventBus.on(eventLib.config_frontend.signal_is_update_available.event, require('./updateHandler').handleisUpdateAvailable)
  EventBus.on(eventLib.config_frontend.signal_update_now.event, require('./updateHandler').handleUpdateNow)

  /*
   Define on Connection listener
   */
  wss.on('connection', (ws) => {
    
    logger.debug('Connection with Socket was made!')

    /*
    Setting up individual Connection event listeners
     */
    ws.on('open', () => {
      // New Socket opened. Maybe log for usage stats?
    })

    ws.on('close', (code, reason) => {
      // Socket has closed! Should log!
      logger.info('Socket has closed!')
    })

    ws.on('error', (error) => {
      // Error on this connection! Should log!
      logger.error('Error in WebSocket: ' + error)
      logger.debug('Stacktrace: ' + error.stack)
    })

    ws.on('ping', (data) => {
      // Received ping from frontend. Should log for debug!
      logger.debug('Ping: ' + data)
    })

    ws.on('pong', (data) => {
      // Client sent pong packet! Log & Set connection alive!
      logger.debug('Received Pong!')
    })

    ws.on('unexpected-response', (req, res) => {
      // Should log for error resolution!
      logger.error('Unexpected response: ' + res + ' For request: ' + req)
    })

    ws.on('message', (data) => {
      // Received message. Forward to appropriate Handler!
      logger.debug('Websocket received message!')
      try {
        var message = JSON.parse(data)
      } catch (error) {
        ws.close(1003, 'Could not parse!')
      }

      /*
       Sanity checking the message!
       */
      if (message === null || message === undefined) {
        ws.close(1003, 'No Message!')
      } else if (message.event === null || message.event === undefined) {
        ws.close(1003, 'No Event!')
      } else {
        if (message.data === null || message.data === undefined) {
          logger.debug('No Data for event: ' + message.event)
        }
        logger.debug('Event: ' + message.event)
        EventBus.emit(message.event, logger, ws, message.data || '')
      }
    })
  })
}
