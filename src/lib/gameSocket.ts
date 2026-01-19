import { log, error as logError } from './logger'

const getWebSocketUrl = (): string => {
  const wsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_WS_URL || process.env.VITE_GAME_SERVER_WS_URL
  if (!wsUrl) {
    throw new Error('NEXT_PUBLIC_GAME_SERVER_WS_URL or VITE_GAME_SERVER_WS_URL environment variable is not set')
  }
  return wsUrl
}

export interface GameSocketMessage {
  type: string
  [key: string]: unknown
}

export interface WSEventLog {
  timestamp: number
  event: string
  data?: unknown
}

export function connectGameSocketDebug(
  roomId: string,
  accessToken: string,
  onMessage: (msg: GameSocketMessage) => void,
  onClose?: (code?: number, reason?: string, wasClean?: boolean) => void,
  onEventLog?: (log: WSEventLog) => void
): WebSocket {
  const wsUrl = getWebSocketUrl()
  
  const logEvent = (event: string, data?: unknown) => {
    const logEntry: WSEventLog = {
      timestamp: Date.now(),
      event,
      data,
    }
    log(`[WS] ${event}`, data !== undefined ? data : '')
    if (onEventLog) {
      onEventLog(logEntry)
    }
  }

  logEvent('creating socket', { url: wsUrl })

  const ws = new WebSocket(wsUrl)
  let helloSent = false
  let openTimeout: NodeJS.Timeout | null = null
  let manualClose = false // Track if close was intentional

  // Set timeout for open event (5 seconds)
  openTimeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN && !helloSent) {
      logEvent('open timeout - WS_OPEN_TIMEOUT', { readyState: ws.readyState })
      const errorMsg: GameSocketMessage = {
        type: 'WS_OPEN_TIMEOUT',
        error: 'WebSocket open event did not fire within 5 seconds',
      }
      onMessage(errorMsg)
      ws.close()
    }
  }, 5000)

  ws.onopen = () => {
    if (openTimeout) {
      clearTimeout(openTimeout)
      openTimeout = null
    }
    logEvent('open')
    
    // Send HELLO message ONLY after 'open' event fires
    const helloMessage = {
      type: 'HELLO',
      roomId,
      accessToken,
    }
    
    try {
      ws.send(JSON.stringify(helloMessage))
      helloSent = true
      logEvent('HELLO sent successfully')
      
      // After HELLO, wait for WELCOME then send SYNC_REQUEST
      // We'll handle SYNC_REQUEST in the message handler when WELCOME is received
    } catch (err) {
      logError('[WS] Failed to send HELLO message:', err)
      onMessage({
        type: 'WS_ERROR',
        error: 'Failed to send HELLO message',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  }
  
  // Helper to send SYNC_REQUEST
  const sendSyncRequest = () => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const syncMessage = {
          type: 'SYNC_REQUEST',
          roomId,
        }
        ws.send(JSON.stringify(syncMessage))
        logEvent('SYNC_REQUEST sent')
      } catch (err) {
        logError('[WS] Failed to send SYNC_REQUEST:', err)
      }
    }
  }
  
  // Expose sendSyncRequest via a custom property for RoomPage to call after WELCOME
  ;(ws as WebSocket & { sendSyncRequest?: () => void }).sendSyncRequest = sendSyncRequest

  // Helper to send STAND_UP (voluntary leave with loss)
  const sendStandUp = () => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const standUpMessage = {
          type: 'STAND_UP',
          roomId,
        }
        ws.send(JSON.stringify(standUpMessage))
        logEvent('STAND_UP sent')
      } catch (err) {
        logError('[WS] Failed to send STAND_UP:', err)
      }
    }
  }

  // Expose sendStandUp via a custom property
  ;(ws as WebSocket & { sendStandUp?: () => void }).sendStandUp = sendStandUp

  ws.onmessage = (event) => {
    logEvent('message received', { dataLength: event.data?.length || 0 })
    
    try {
      const message = JSON.parse(event.data) as GameSocketMessage
      logEvent('message parsed', { type: message.type })
      
      // Handle ERROR messages from server
      if (message.type === 'ERROR') {
        logError('[WS] Server ERROR message:', message)
      }
      
      onMessage(message)
    } catch (parseError) {
      logError('[WS] Failed to parse WebSocket message:', parseError)
      
      // Still call onMessage with error info so UI can display it
      onMessage({
        type: 'PARSE_ERROR',
        error: 'Failed to parse message',
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        raw: event.data,
      })
    }
  }

  ws.onerror = (err) => {
    logError('[WS] WebSocket error event:', err)
    
    // Send error message to handler
    onMessage({
      type: 'WS_ERROR',
      error: 'WebSocket connection error',
      details: err instanceof Error ? err.message : String(err),
    })
  }

  ws.onclose = (event) => {
    if (openTimeout) {
      clearTimeout(openTimeout)
      openTimeout = null
    }
    
    const closeInfo = {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      manualClose,
    }
    logEvent('close', closeInfo)
    
    // Notify about close - reconnection will be handled by RoomPage
    if (onClose) {
      onClose(event.code, event.reason, event.wasClean)
    }
  }
  
  // Expose method to mark as manual close
  ;(ws as WebSocket & { markManualClose?: () => void }).markManualClose = () => {
    manualClose = true
  }

  return ws
}

// Legacy function for backward compatibility
export function connectGameSocket(
  roomId: string,
  accessToken: string,
  onMessage: (msg: GameSocketMessage) => void,
  onClose?: () => void
): WebSocket {
  return connectGameSocketDebug(roomId, accessToken, onMessage, onClose ? () => onClose() : undefined)
}
