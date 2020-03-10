
/**
 * 
 * @param {WebSocket} ws 
 * @param {string} flag 
 * @param {any} [data] 
 */
function send (ws, event, data) {
    ws.send(JSON.stringify({ event: event, data: data }))
}

module.exports = send
