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
  [key: string]: any
}

export interface WSEventLog {
  timestamp: number
  event: string
  data?: any
}

export function connectGameSocketDebug(
  roomId: string,
  accessToken: string,
  onMessage: (msg: GameSocketMessage) => void,
  onClose?: (code?: number, reason?: string, wasClean?: boolean) => void,
  onEventLog?: (log: WSEventLog) => void
): WebSocket {
  const wsUrl = getWebSocketUrl()
  
  const logEvent = (event: string, data?: any) => {
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
  let manualClose = false

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
    
    const helloMessage = {
      type: 'HELLO',
      roomId,
      accessToken,
    }
    
    try {
      ws.send(JSON.stringify(helloMessage))
      helloSent = true
      logEvent('HELLO sent successfully')
    } catch (err) {
      logError('[WS] Failed to send HELLO message:', err)
      onMessage({
        type: 'WS_ERROR',
        error: 'Failed to send HELLO message',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  }
  
  const sendSyncRequest = () => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
          logError('[WS] Cannot send SYNC_REQUEST: roomId is invalid', { roomId, type: typeof roomId })
          return
        }
        const syncMessage = {
          type: 'SYNC_REQUEST' as const,
          roomId: roomId.trim(),
        }
        logEvent('Sending SYNC_REQUEST', syncMessage)
        ws.send(JSON.stringify(syncMessage))
        logEvent('SYNC_REQUEST sent successfully')
      } catch (err) {
        logError('[WS] Failed to send SYNC_REQUEST:', err)
      }
    } else {
      logError('[WS] Cannot send SYNC_REQUEST: WebSocket not open', { readyState: ws.readyState })
    }
  }
  
  ;(ws as any).sendSyncRequest = sendSyncRequest

  ws.onmessage = (event) => {
    logEvent('message received', { dataLength: event.data?.length || 0 })
    
    try {
      const message = JSON.parse(event.data) as GameSocketMessage
      logEvent('message parsed', { type: message.type })
      
      if (message.type === 'ERROR') {
        logError('[WS] Server ERROR message:', message)
      }
      
      onMessage(message)
    } catch (parseError) {
      logError('[WS] Failed to parse WebSocket message:', parseError)
      
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
    
    if (onClose) {
      onClose(event.code, event.reason, event.wasClean)
    }
  }
  
  ;(ws as any).markManualClose = () => {
    manualClose = true
  }

  return ws
}

export function connectGameSocket(
  roomId: string,
  accessToken: string,
  onMessage: (msg: GameSocketMessage) => void,
  onClose?: () => void
): WebSocket {
  return connectGameSocketDebug(roomId, accessToken, onMessage, onClose ? () => onClose() : undefined)
}
