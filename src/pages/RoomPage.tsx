import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { connectGameSocketDebug, type GameSocketMessage, type WSEventLog } from '../lib/gameSocket'
import { log, warn, error as logError } from '../lib/logger'
import type { Room, RoomPlayer, Profile } from '../types/database'
import type { Card } from '../types/cards'
import { renderCard, normalizeCard } from '../types/cards'
import { TableView } from '../components/TableView'
import { QueuePanel } from '../components/QueuePanel'

const isDev = import.meta.env.DEV

interface PlayerWithProfile extends RoomPlayer {
  profile: Profile | null
}

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<PlayerWithProfile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingReady, setUpdatingReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  
  // WebSocket state
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected')
  const [wsMessages, setWsMessages] = useState<GameSocketMessage[]>([])
  const [wsError, setWsError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const connectingRef = useRef<boolean>(false)
  const [wsEvents, setWsEvents] = useState<WSEventLog[]>([])
  const [wsUrl, setWsUrl] = useState<string>('')
  const shouldReconnectRef = useRef<boolean>(true) // Control reconnection
  const reconnectAttemptRef = useRef<number>(0)
  
  // Game state from WS
  const [roomStatePlayers, setRoomStatePlayers] = useState<Array<{playerId: string, isReady: boolean}>>([])
  const [roundStart, setRoundStart] = useState<{roomId: string, startedAt: string} | null>(null)
  
  // DEALT state
  const [yourHand, setYourHand] = useState<Card[] | null>(null)
  const [starterPlayerId, setStarterPlayerId] = useState<string | null>(null)
  const [starterReason, setStarterReason] = useState<"WINNER" | "WEAKEST_SINGLE" | string | null>(null)
  const [seatedPlayerIds, setSeatedPlayerIds] = useState<string[]>([])
  const [queuePlayerIds, setQueuePlayerIds] = useState<string[]>([])
  
  // Game state
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null)
  const [lastPlay, setLastPlay] = useState<{playerId: string, cards: Card[], kind?: string, fiveKind?: string} | null>(null)
  const [handsCount, setHandsCount] = useState<Record<string, number>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [canPass, setCanPass] = useState<boolean>(false) // Legacy, kept for backward compatibility (server may still send it, but PASS button uses lastPlay instead)
  const [passedPlayerIds, setPassedPlayerIds] = useState<string[]>([])
  const [roundEnd, setRoundEnd] = useState<{winnerPlayerId: string} | null>(null)
  
  // Rules and scoring
  const [scoreLimit, setScoreLimit] = useState<number>(60)
  const [scoreboard, setScoreboard] = useState<{playerId: string, totalScore: number, eliminated: boolean}[]>([])
  const [scoreLimitInput, setScoreLimitInput] = useState<number>(60)
  const [totalScores, setTotalScores] = useState<Record<string, number>>({})
  const [eliminated, setEliminated] = useState<string[]>([])

  // Auto-connect function: connects to WS if room status is "playing"
  const connectIfPlaying = useCallback(async (roomStatus: string, roomIdToConnect: string) => {
    // If roomStatus !== "playing", do nothing
    if (roomStatus !== 'playing') {
      shouldReconnectRef.current = false // Stop reconnecting if room not playing
      return
    }
    
    // Enable reconnection when connecting
    shouldReconnectRef.current = true

    // If already connected or connecting, do nothing
    if (wsRef.current) {
      const readyState = wsRef.current.readyState
      if (readyState === WebSocket.OPEN) {
        log('[AutoConnect] Already connected, skipping')
        return
      }
      if (readyState === WebSocket.CONNECTING) {
        log('[AutoConnect] Already connecting, skipping')
        return
      }
      // If closing or closed, clean up first
      if (readyState === WebSocket.CLOSING || readyState === WebSocket.CLOSED) {
        wsRef.current.close()
        wsRef.current = null
      }
    }

    if (connectingRef.current) {
      log('[AutoConnect] Connection in progress (flag), skipping')
      return
    }

    log('[AutoConnect] room.status is playing')

    try {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const hasToken = !!session?.access_token
      log('[AutoConnect] token present?', hasToken)

      if (!session?.access_token) {
        log('[AutoConnect] No access token available')
        setWsError('No access token available')
        setWsStatus('error')
        return
      }

      log('[AutoConnect] creating WS')
      
      // Connect to WS using gameSocket helper
      connectingRef.current = true
      setWsStatus('connecting')
      setWsError(null)

      // Get WS URL for display
      const wsUrlEnv = (import.meta.env as { VITE_GAME_SERVER_WS_URL?: string }).VITE_GAME_SERVER_WS_URL || 'not set'
      setWsUrl(wsUrlEnv)

      const ws = connectGameSocketDebug(
        roomIdToConnect,
        session.access_token,
        (message) => {
          log("[WS] message handler received", message.type)
          // Handle incoming messages (only store in dev for debug UI)
          if (isDev) {
            setWsMessages((prev) => {
              const newMessages = [message, ...prev].slice(0, 20)
              return newMessages
            })
          }

          // Handle ERROR messages from server
          if (message.type === 'ERROR') {
            const errorMsg = message.error || message.message || 'Server error'
            logError('[WS] Server ERROR:', errorMsg)
            setWsError(errorMsg)
            setWsStatus('error')
          } else if (message.type === 'WELCOME') {
            log('[WS] Received WELCOME')
            log('[AutoConnect] WS connected because room is playing')
            setWsStatus('connected')
            setWsError(null)
            connectingRef.current = false
            reconnectAttemptRef.current = 0
            
            // Send SYNC_REQUEST after WELCOME
            setTimeout(() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomId) {
                try {
                  const syncMessage = {
                    type: 'SYNC_REQUEST',
                    roomId,
                  }
                  wsRef.current.send(JSON.stringify(syncMessage))
                  log('[WS] SYNC_REQUEST sent')
                } catch (err) {
                  logError('[WS] Failed to send SYNC_REQUEST:', err)
                }
              }
            }, 100) // Small delay to ensure connection is stable
          } else if (message.type === 'STATE') {
            log('[WS] Received STATE')
            log('[AutoConnect] WS connected because room is playing')
            setWsStatus('connected')
            setWsError(null)
            connectingRef.current = false
            reconnectAttemptRef.current = 0
            
            // Also send SYNC_REQUEST after STATE (in case WELCOME was missed)
            setTimeout(() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomId) {
                try {
                  const syncMessage = {
                    type: 'SYNC_REQUEST',
                    roomId,
                  }
                  wsRef.current.send(JSON.stringify(syncMessage))
                  log('[WS] SYNC_REQUEST sent (after STATE)')
                } catch (err) {
                  logError('[WS] Failed to send SYNC_REQUEST:', err)
                }
              }
            }, 100)
          } else if (message.type === 'SYNC_STATE') {
            log('[WS] Received SYNC_STATE')
            // Apply SYNC_STATE - overwrite all relevant state (do NOT merge)
            if (message.seatedPlayerIds && Array.isArray(message.seatedPlayerIds)) {
              setSeatedPlayerIds(message.seatedPlayerIds)
            }
            if (message.queuePlayerIds && Array.isArray(message.queuePlayerIds)) {
              setQueuePlayerIds(message.queuePlayerIds)
            }
            if (message.currentTurnPlayerId) {
              setCurrentTurnPlayerId(message.currentTurnPlayerId)
            }
            if (message.lastPlay) {
              const normalizedLastPlay = {
                playerId: message.lastPlay.playerId,
                cards: Array.isArray(message.lastPlay.cards) 
                  ? message.lastPlay.cards.map((card: any) => normalizeCard(card))
                  : [],
                kind: message.lastPlay.kind,
                fiveKind: message.lastPlay.fiveKind
              }
              setLastPlay(normalizedLastPlay)
            } else {
              setLastPlay(null)
            }
            if (message.handsCount && typeof message.handsCount === 'object') {
              setHandsCount(message.handsCount)
            }
            if (message.totalScores && typeof message.totalScores === 'object') {
              const scoresMap: Record<string, number> = {}
              for (const [playerId, score] of Object.entries(message.totalScores)) {
                scoresMap[playerId] = typeof score === 'number' ? score : 0
              }
              setTotalScores(scoresMap)
            }
            if (message.eliminated && Array.isArray(message.eliminated)) {
              setEliminated(message.eliminated)
            }
            if (message.yourHand && Array.isArray(message.yourHand)) {
              const normalizedHand = message.yourHand.map((card: any) => normalizeCard(card))
              setYourHand(normalizedHand)
            }
            if (typeof message.scoreLimit === 'number') {
              setScoreLimit(message.scoreLimit)
            }
          } else if (message.type === 'ROOM_STATE') {
            log('[WS] Received ROOM_STATE')
            if (message.players && Array.isArray(message.players)) {
              setRoomStatePlayers(message.players)
            }
          } else if (message.type === 'ROUND_START') {
            log('[WS] Received ROUND_START')
            if (message.roomId && message.startedAt) {
              setRoundStart({ roomId: message.roomId, startedAt: message.startedAt })
            }
          } else if (message.type === 'RULES') {
            log('[WS] Received RULES')
            if (typeof message.scoreLimit === 'number') {
              setScoreLimit(message.scoreLimit)
              setScoreLimitInput(message.scoreLimit)
            }
          } else if (message.type === 'SCORE_UPDATE') {
            log('[WS] Received SCORE_UPDATE')
            if (message.totalScores && typeof message.totalScores === 'object') {
              const scores: {playerId: string, totalScore: number, eliminated: boolean}[] = []
              const scoresMap: Record<string, number> = {}
              for (const [playerId, score] of Object.entries(message.totalScores)) {
                const scoreValue = typeof score === 'number' ? score : 0
                scoresMap[playerId] = scoreValue
                scores.push({
                  playerId,
                  totalScore: scoreValue,
                  eliminated: message.eliminated && Array.isArray(message.eliminated) 
                    ? message.eliminated.includes(playerId)
                    : false
                })
              }
              setTotalScores(scoresMap)
              setScoreboard(scores)
              if (message.eliminated && Array.isArray(message.eliminated)) {
                setEliminated(message.eliminated)
              }
            }
          } else if (message.type === 'DEALT') {
            log('[WS] Received DEALT')
            // Hide round end banner when new hand is dealt
            setRoundEnd(null)
            if (message.yourHand && Array.isArray(message.yourHand)) {
              // Normalize cards to handle various formats (numeric, symbol, or canonical)
              const normalizedHand = message.yourHand.map((card: any) => normalizeCard(card))
              setYourHand(normalizedHand)
              setSelectedCards([]) // Reset selection when new hand is dealt
            }
            if (message.starterPlayerId) {
              setStarterPlayerId(message.starterPlayerId)
            }
            if (message.reason) {
              setStarterReason(message.reason)
            }
            if (message.seatedPlayerIds && Array.isArray(message.seatedPlayerIds)) {
              setSeatedPlayerIds(message.seatedPlayerIds)
            }
          } else if (message.type === 'GAME_STATE') {
            log('[WS] Received GAME_STATE')
            if (message.currentTurnPlayerId) {
              setCurrentTurnPlayerId(message.currentTurnPlayerId)
            }
            if (message.lastPlay) {
              const normalizedLastPlay = {
                playerId: message.lastPlay.playerId,
                cards: Array.isArray(message.lastPlay.cards) 
                  ? message.lastPlay.cards.map((card: any) => normalizeCard(card))
                  : [],
                kind: message.lastPlay.kind, // SINGLE, PAIR, SET, FIVE, etc.
                fiveKind: message.lastPlay.fiveKind // STRAIGHT, FLUSH, FULL_HOUSE, FOUR, STRAIGHT_FLUSH
              }
              setLastPlay(normalizedLastPlay)
            } else {
              setLastPlay(null)
            }
            // Clear selection on GAME_STATE update (turn change)
            setSelectedCards([])
            if (message.handsCount && typeof message.handsCount === 'object') {
              setHandsCount(message.handsCount)
            }
            if (typeof message.canPass === 'boolean') {
              setCanPass(message.canPass) // Legacy, kept for backward compatibility (not used for button logic)
            }
            // Handle passedPlayerIds if provided by server
            if (message.passedPlayerIds && Array.isArray(message.passedPlayerIds)) {
              setPassedPlayerIds(message.passedPlayerIds)
            } else {
              // Reset if not provided (server may omit it when no one has passed)
              setPassedPlayerIds([])
            }
            // Handle queuePlayerIds if provided
            if (message.queuePlayerIds && Array.isArray(message.queuePlayerIds)) {
              setQueuePlayerIds(message.queuePlayerIds)
            }
            // Handle totalScores and eliminated if provided
            if (message.totalScores && typeof message.totalScores === 'object') {
              const scoresMap: Record<string, number> = {}
              for (const [playerId, score] of Object.entries(message.totalScores)) {
                scoresMap[playerId] = typeof score === 'number' ? score : 0
              }
              setTotalScores(scoresMap)
            }
            if (message.eliminated && Array.isArray(message.eliminated)) {
              setEliminated(message.eliminated)
            }
          } else if (message.type === 'ACTION_ERROR') {
            const errorMsg = message.error || message.message || 'Action error'
            logError('[WS] Received ACTION_ERROR:', errorMsg)
            setActionError(errorMsg)
            // Do NOT clear selection on error - user may want to adjust
            // Clear error after 5 seconds
            setTimeout(() => setActionError(null), 5000)
          } else if (message.type === 'ROUND_END') {
            log('[WS] Received ROUND_END')
            if (message.winnerPlayerId) {
              setRoundEnd({ winnerPlayerId: message.winnerPlayerId })
            }
          } else if (message.type === 'WS_ERROR' || message.type === 'PARSE_ERROR') {
            const errorMsg = message.error || 'WebSocket error'
            logError('[WS] Client error:', errorMsg)
            setWsError(errorMsg)
            setWsStatus('error')
            connectingRef.current = false
          } else if (message.type === 'WS_OPEN_TIMEOUT') {
            const errorMsg = message.error || 'WebSocket open timeout'
            logError('[WS] Open timeout:', errorMsg)
            setWsError(errorMsg)
            setWsStatus('error')
            connectingRef.current = false
          }
        },
        (code, reason, wasClean) => {
          // On close - handle reconnection at RoomPage level
          log(`[WS] close handler: code=${code}, reason=${reason}, wasClean=${wasClean}`)
          
          wsRef.current = null
          connectingRef.current = false
          
          // Only attempt reconnect if it wasn't a manual close and room is still playing
          if (shouldReconnectRef.current && room?.status === 'playing' && !wasClean) {
            // Start reconnection with exponential backoff
            const reconnectDelays = [500, 1000, 2000, 4000, 8000]
            const maxAttempts = 10
            
            const attemptReconnect = async (attempt: number) => {
              if (!shouldReconnectRef.current || room?.status !== 'playing') {
                setWsStatus('disconnected')
                return
              }
              
              if (attempt > maxAttempts) {
                setWsStatus('disconnected')
                setWsError('Failed to reconnect after 10 attempts')
                log('[Reconnect] Max attempts reached, giving up')
                return
              }
              
              const delayIndex = Math.min(attempt - 1, reconnectDelays.length - 1)
              const delay = reconnectDelays[delayIndex]
              
              reconnectAttemptRef.current = attempt
              setWsStatus('reconnecting')
              log(`[Reconnect] Attempt ${attempt} in ${delay}ms`)
              
              setTimeout(async () => {
                if (!shouldReconnectRef.current || room?.status !== 'playing') {
                  setWsStatus('disconnected')
                  return
                }
                
                // Check if we're already connected/connecting before attempting
                if (wsRef.current) {
                  const readyState = wsRef.current.readyState
                  if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
                    log('[Reconnect] Already connected/connecting, skipping')
                    return
                  }
                }
                
                await connectIfPlaying(room.status, room.id)
                
                // Check connection status after a delay to see if we need to retry
                setTimeout(() => {
                  if (shouldReconnectRef.current && room?.status === 'playing') {
                    // Check if we're still not connected
                    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                      attemptReconnect(attempt + 1)
                    }
                  }
                }, delay + 1000) // Check after delay + 1s
              }, delay)
            }
            
            attemptReconnect(1)
          } else {
            setWsStatus('disconnected')
          }
        },
        (logEntry) => {
          // Event log callback (only store in dev for debug UI)
          if (isDev) {
            setWsEvents((prev) => {
              const newEvents = [logEntry, ...prev].slice(0, 20)
              return newEvents
            })
          }
        }
      )

      wsRef.current = ws
      
      // Update wsRef when reconnecting (the reconnect creates a new ws)
      if ((ws as any).sendSyncRequest) {
        // Store reference for SYNC_REQUEST
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to game server'
      logError('[AutoConnect] Connection error:', err)
      setWsError(errorMessage)
      setWsStatus('error')
      wsRef.current = null
      connectingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby')
      return
    }

    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/auth')
          return
        }
        setCurrentUserId(user.id)

        // Fetch room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (roomError || !roomData) {
          throw new Error('Room not found')
        }
        setRoom(roomData as Room)

        // Fetch players
        await fetchPlayers(roomId)

        // Subscribe to room_players changes
        const channel = supabase
          .channel(`room_players:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'room_players',
              filter: `room_id=eq.${roomId}`,
            },
            () => {
              fetchPlayers(roomId)
            }
          )
          .subscribe()

        // Subscribe to room status changes
        const channelName = `room:${roomId}`
        const filterString = `id=eq.${roomId}`
        log('[RoomsRT] Creating channel:', channelName)
        log('[RoomsRT] Filter:', filterString)
        
        const roomChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'rooms',
              filter: filterString,
            },
            (payload) => {
              log('[RoomsRT] payload received')
              if (payload.new) {
                const updatedRoom = payload.new as Room
                setRoom(updatedRoom)
                
                // Auto-connect when status becomes "playing" (for ALL users)
                if (updatedRoom.status === 'playing') {
                  log('[AutoConnect] Realtime: room status updated to playing')
                  connectIfPlaying(updatedRoom.status, roomId)
                }
              }
            }
          )
          .subscribe((status) => {
            log('[RoomsRT] Subscribe status:', status)
            if (status === 'SUBSCRIBED') {
              log('[RoomsRT] Successfully subscribed to room updates')
            } else if (status === 'TIMED_OUT') {
              warn('[RoomsRT] Subscription timed out')
            } else if (status === 'CHANNEL_ERROR') {
              logError('[RoomsRT] Channel error occurred')
            } else if (status === 'CLOSED') {
              log('[RoomsRT] Channel closed')
            }
          })

        // A) After initial room fetch: auto-connect if already "playing"
        log('[AutoConnect] Initial fetch: room.status =', roomData.status)
        connectIfPlaying(roomData.status, roomId)

        return () => {
          supabase.removeChannel(channel)
          supabase.removeChannel(roomChannel)
          // Close WebSocket on unmount
          if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
          }
          connectingRef.current = false
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load room')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [roomId, navigate, connectIfPlaying])

  // Initialize scoreLimit from room data
  useEffect(() => {
    if (room?.score_limit) {
      setScoreLimit(room.score_limit)
      setScoreLimitInput(room.score_limit)
    }
  }, [room?.score_limit])

  // Fallback polling: check room status every 1s if not connected and room not playing
  useEffect(() => {
    if (!roomId || !room) return

    // Only poll if:
    // - WS is not connected/connecting
    // - local room.status is not "playing" yet
    const shouldPoll = 
      wsStatus !== 'connected' && 
      wsStatus !== 'connecting' && 
      room.status !== 'playing'

    if (!shouldPoll) {
      return
    }

    log('[Polling] Starting fallback polling for room status')
    
    const pollInterval = setInterval(async () => {
      try {
        const { data: roomData, error } = await supabase
          .from('rooms')
          .select('status')
          .eq('id', roomId)
          .single()

        if (error) {
          logError('[Polling] Error fetching room status:', error)
          return
        }

        if (roomData?.status === 'playing') {
          log('[Polling] Room status changed to playing, connecting WS')
          connectIfPlaying('playing', roomId)
          // Stop polling once connected
          clearInterval(pollInterval)
        }
      } catch (err) {
        logError('[Polling] Polling error:', err)
      }
    }, 1000)

    return () => {
      log('[Polling] Stopping fallback polling')
      clearInterval(pollInterval)
    }
  }, [roomId, room?.status, wsStatus, connectIfPlaying])

  const fetchPlayers = async (id: string) => {
    try {
      // Try querying with .is() filter first
      let { data: playersData, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', id)
        .is('left_at', null) // Only show players who haven't left

      // If that fails (500 error or any error), try fetching all and filtering client-side
      if (playersError) {
        warn('Query with .is() failed, trying alternative approach:', playersError)
        const { data: allPlayers, error: allError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', id)

        if (allError) {
          logError('Failed to fetch players:', allError)
          const errorMsg = (allError as any)?.message || String(allError)
          setError(`Failed to load players: ${errorMsg}`)
          return
        }

        // Filter client-side for players who haven't left
        playersData = allPlayers?.filter(p => p.left_at === null) || null
      }

      if (!playersData || playersData.length === 0) {
        setPlayers([])
        return
      }

      // Fetch profiles for each player
      const playersWithProfiles: PlayerWithProfile[] = await Promise.all(
        playersData.map(async (player) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', player.player_id)
            .single()

          // Log profile errors but don't fail the whole operation
          if (profileError) {
            warn(`Failed to fetch profile for player ${player.player_id}:`, profileError)
          }

          return {
            ...player,
            profile: profile as Profile | null,
          }
        })
      )

      setPlayers(playersWithProfiles)
    } catch (err) {
      logError('Error in fetchPlayers:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch players'
      setError(errorMessage)
    }
  }

  // Send READY message via WebSocket
  const sendReadyMessage = useCallback((isReady: boolean) => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      warn('[READY] Cannot send READY: WS not connected')
      return false
    }

    try {
      const readyMessage = {
        type: 'READY',
        roomId,
        isReady,
      }
      log('[READY] Sending READY message')
      wsRef.current.send(JSON.stringify(readyMessage))
      return true
    } catch (err) {
      logError('[READY] Failed to send READY message:', err)
      return false
    }
  }, [roomId])

  // Send PLAY message via WebSocket
  const sendPlayMessage = useCallback((cards: Card[]) => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      warn('[PLAY] Cannot send PLAY: WS not connected')
      return false
    }

    try {
      const playMessage = {
        type: 'PLAY',
        roomId,
        cards,
      }
      log('[PLAY] Sending PLAY message')
      wsRef.current.send(JSON.stringify(playMessage))
      setActionError(null) // Clear any previous errors
      setSelectedCards([]) // Clear selection after successful send
      return true
    } catch (err) {
      logError('[PLAY] Failed to send PLAY message:', err)
      setActionError('Failed to send play message')
      return false
    }
  }, [roomId])

  // Send SET_RULES message via WebSocket
  const sendSetRulesMessage = useCallback((newScoreLimit: number) => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      warn('[SET_RULES] Cannot send SET_RULES: WS not connected')
      return false
    }

    try {
      const rulesMessage = {
        type: 'SET_RULES',
        roomId,
        scoreLimit: newScoreLimit,
      }
      log('[SET_RULES] Sending SET_RULES message')
      wsRef.current.send(JSON.stringify(rulesMessage))
      setActionError(null) // Clear any previous errors
      return true
    } catch (err) {
      logError('[SET_RULES] Failed to send SET_RULES message:', err)
      setActionError('Failed to set rules')
      return false
    }
  }, [roomId])

  // Send PASS message via WebSocket
  const sendPassMessage = useCallback(() => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      warn('[PASS] Cannot send PASS: WS not connected')
      return false
    }

    try {
      const passMessage = {
        type: 'PASS',
        roomId,
      }
      log('[PASS] Sending PASS message')
      wsRef.current.send(JSON.stringify(passMessage))
      setActionError(null) // Clear any previous errors
      return true
    } catch (err) {
      logError('[PASS] Failed to send PASS message:', err)
      setActionError('Failed to send pass message')
      return false
    }
  }, [roomId])

  const handleCardClick = (card: Card) => {
    // Toggle selection (max 5 cards)
    setSelectedCards((prev) => {
      // Check if card is already selected
      const isSelected = prev.some(
        (c) => c.rank === card.rank && c.suit === card.suit
      )
      
      if (isSelected) {
        // Remove from selection
        return prev.filter(
          (c) => !(c.rank === card.rank && c.suit === card.suit)
        )
      } else {
        // Add to selection if under limit
        if (prev.length >= 5) {
          return prev // Max 5 cards
        }
        return [...prev, card]
      }
    })
  }

  const handlePlay = () => {
    // Allow 1, 2, 3, or 5 cards (not 4)
    const validLengths = [1, 2, 3, 5]
    if (!validLengths.includes(selectedCards.length)) return
    
    sendPlayMessage(selectedCards)
    // Selection cleared in sendPlayMessage after successful send
  }

  const handlePass = () => {
    sendPassMessage()
  }

  const isMyTurn = currentTurnPlayerId === currentUserId

  const handleToggleReady = async () => {
    if (!roomId || !currentUserId || updatingReady) return

    // If WS is connected, use WS READY messages
    if (wsStatus === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
      // Get current ready state from ROOM_STATE if available, otherwise from Supabase
      const roomStatePlayer = roomStatePlayers.find((p) => p.playerId === currentUserId)
      const supabasePlayer = players.find((p) => p.player_id === currentUserId)
      const currentReadyState = roomStatePlayer 
        ? roomStatePlayer.isReady 
        : supabasePlayer?.is_ready ?? false
      
      const newReadyState = !currentReadyState
      
      setUpdatingReady(true)
      const sent = sendReadyMessage(newReadyState)
      if (!sent) {
        setError('Failed to send ready status. Please try again.')
      }
      setUpdatingReady(false)
      return
    }

    // Fallback to Supabase if WS not connected
    setUpdatingReady(true)
    try {
      const currentPlayer = players.find((p) => p.player_id === currentUserId)
      if (!currentPlayer) return

      const { error } = await supabase
        .from('room_players')
        .update({ is_ready: !currentPlayer.is_ready })
        .eq('room_id', roomId)
        .eq('player_id', currentUserId)

      if (error) throw error
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setUpdatingReady(false)
    }
  }

  const handleLeave = async () => {
    if (!roomId || !currentUserId || leaving) return

    setLeaving(true)
    try {
      // Stop reconnection attempts
      shouldReconnectRef.current = false
      
      // Mark as manual close and close WebSocket connection
      if (wsRef.current) {
        const markManualClose = (wsRef.current as any).markManualClose
        if (markManualClose) {
          markManualClose()
        }
        wsRef.current.close()
        wsRef.current = null
      }
      connectingRef.current = false
      setWsStatus('disconnected')

      // Update left_at
      const { error } = await supabase
        .from('room_players')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('player_id', currentUserId)

      if (error) throw error

      navigate('/lobby')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLeaving(false)
    }
  }

  const handleStart = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    log("[Start] clicked")
    
    if (isStarting) {
      log("[Start] Already starting, ignoring duplicate click")
      return
    }

    if (!roomId || !currentUserId) {
      log("[Start] Missing roomId or currentUserId", { roomId, currentUserId })
      setError('Missing room ID or user ID')
      return
    }

    log("[Start] roomId", roomId)
    setIsStarting(true)

    try {
      // Get session and access token
      const { data: { session } } = await supabase.auth.getSession()
      const hasToken = !!session?.access_token
      log("[Start] session token present?", hasToken)
      
      if (!session?.access_token) {
        setError('No access token available. Please log in again.')
        setWsError('No access token available')
        return
      }

      // Fetch the room row first to verify ownership and current status
      const { data: roomData, error: roomFetchError } = await supabase
        .from('rooms')
        .select('id, owner_id, status')
        .eq('id', roomId)
        .single()

      if (roomFetchError || !roomData) {
        const errorMsg = roomFetchError?.message || 'Room not found'
        logError("[Start] room fetch error:", roomFetchError)
        setError(`Failed to fetch room: ${errorMsg}`)
        setWsError(`Failed to fetch room: ${errorMsg}`)
        return
      }

      // Verify ownership
      if (currentUserId !== roomData.owner_id) {
        const errorMsg = 'Only the room owner can start the game'
        log("[Start] Ownership check failed", { currentUserId, ownerId: roomData.owner_id })
        setError(errorMsg)
        setWsError(errorMsg)
        return
      }

      // If status is already "playing", do nothing (WS connection handled by connectIfPlaying)
      if (roomData.status === 'playing') {
        log("[Start] Room already playing, skipping PATCH")
        setIsStarting(false)
        return
      }

      // Update room status to 'playing'
      // The realtime subscription will trigger connectIfPlaying for ALL users (including owner)
      log("[Start] Patching rooms.status to 'playing'")
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)

      if (updateError) {
        // Handle Supabase error with detailed information
        const errorDetails = {
          status: (updateError as any)?.status || 'unknown',
          message: updateError.message || 'Unknown error',
          details: (updateError as any)?.details || null,
          hint: (updateError as any)?.hint || null,
        }
        
        logError('[Start] patch rooms.status result ERROR:', errorDetails)
        const errorMsg = `Failed to update room status: ${errorDetails.message}${errorDetails.hint ? ` (${errorDetails.hint})` : ''}`
        setError(errorMsg)
        setWsError(errorMsg)
        setIsStarting(false)
        return
      }

      log("[Start] patch rooms.status result SUCCESS")
      // Note: WS connection will be triggered by realtime subscription via connectIfPlaying
      // Reset isStarting when WS connects or after a timeout
      const resetTimeout = setTimeout(() => {
        setIsStarting(false)
      }, 5000)
      
      // Also reset when WS connects or errors
      const checkConnection = setInterval(() => {
        if (wsStatus === 'connected' || wsStatus === 'error') {
          clearInterval(checkConnection)
          clearTimeout(resetTimeout)
          setIsStarting(false)
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(checkConnection)
      }, 10000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game'
      logError('[Start] Unexpected error:', err)
      setError(errorMessage)
      setWsError(errorMessage)
      setIsStarting(false)
    }
  }

  const handleReconnect = async () => {
    if (!roomId || !currentUserId || !room) return

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    connectingRef.current = false

    // Use connectIfPlaying to reconnect (only connects if room.status === "playing")
    await connectIfPlaying(room.status, room.id)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading room...</div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Room not found'}</div>
        <button onClick={() => navigate('/lobby')} style={styles.button}>
          Back to Lobby
        </button>
      </div>
    )
  }

  const currentPlayer = players.find((p) => p.player_id === currentUserId)
  const isOwner = currentUserId === room.owner_id

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Room: {room.code}</h1>
          <div style={styles.meta}>Score Limit: {scoreLimit}</div>
        </div>
        <button onClick={handleLeave} style={styles.leaveButton} disabled={leaving}>
          {leaving ? 'Leaving...' : 'Leave Room'}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* ROUND_START Banner */}
      {roundStart && (
        <div style={styles.roundStartBanner}>
          <div style={styles.roundStartContent}>
            <strong>Round starting...</strong>
            <span style={styles.roundStartTime}>
              {new Date(roundStart.startedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* DEALT Banner */}
      {yourHand && (
        <div style={styles.dealtBanner}>
          Cards dealt. Waiting for starter...
        </div>
      )}

      {/* Debug Panel - only in dev */}
      {isDev && (
        <div style={styles.debugPanel}>
          <h3 style={styles.debugTitle}>Debug Info</h3>
          <div style={styles.debugGrid}>
            <div key="room-status" style={styles.debugItem}>
              <strong>room.status:</strong> {room.status}
            </div>
            <div key="current-user-id" style={styles.debugItem}>
              <strong>current auth.uid:</strong> {currentUserId || 'null'}
            </div>
            <div key="owner-id" style={styles.debugItem}>
              <strong>room.owner_id:</strong> {room.owner_id}
            </div>
            <div key="is-owner" style={styles.debugItem}>
              <strong>isOwner:</strong> {isOwner ? 'true' : 'false'}
            </div>
          </div>
        </div>
      )}

      {/* WebSocket Connection Panel */}
      <div style={styles.wsPanel}>
        <div style={styles.wsHeader}>
          <h3 style={styles.wsTitle}>Game Server Connection</h3>
          <div style={{
            ...styles.statusBadge,
            ...(wsStatus === 'connected' ? styles.statusConnected : {}),
            ...(wsStatus === 'connecting' ? styles.statusConnecting : {}),
            ...(wsStatus === 'reconnecting' ? styles.statusReconnecting : {}),
            ...(wsStatus === 'error' ? styles.statusError : {}),
            ...(wsStatus === 'disconnected' ? styles.statusDisconnected : {}),
          }}>
            {wsStatus === 'connected' && '● Connected'}
            {wsStatus === 'connecting' && '● Connecting...'}
            {wsStatus === 'reconnecting' && `● Reconnecting (${reconnectAttemptRef.current}/10)...`}
            {wsStatus === 'error' && '● Error'}
            {wsStatus === 'disconnected' && '○ Disconnected'}
          </div>
        </div>
        {wsError && (
          <div style={styles.wsError}>
            {wsError}
          </div>
        )}
        
        {/* WS Debug Info - only in dev */}
        {isDev && (
          <div style={styles.wsDebugInfo}>
            <div style={styles.wsDebugRow}>
              <strong>wsUrl:</strong> {wsUrl || 'not set'}
            </div>
            <div style={styles.wsDebugRow}>
              <strong>wsReadyState:</strong> {wsRef.current ? wsRef.current.readyState : 'null'} 
              ({wsRef.current ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][wsRef.current.readyState] : 'null'})
            </div>
            <div style={styles.wsDebugRow}>
              <strong>connectionStatus:</strong> {wsStatus}
            </div>
          </div>
        )}

        {wsStatus === 'disconnected' && room?.status === 'playing' && (
          <button onClick={handleReconnect} style={styles.reconnectButton}>
            Reconnect
          </button>
        )}
        
        {/* WS Events Log - only in dev */}
        {isDev && wsEvents.length > 0 && (
          <div style={styles.eventsContainer}>
            <div style={styles.eventsTitle}>Last {wsEvents.length} WS Events:</div>
            <div style={styles.eventsList}>
              {wsEvents.map((event, idx) => (
                <div key={`event-${event.timestamp}-${idx}`} style={styles.eventItem}>
                  <span style={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={styles.eventName}>{event.event}</span>
                  {event.data && (
                    <span style={styles.eventData}>
                      {typeof event.data === 'object' ? JSON.stringify(event.data) : String(event.data)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* WS Messages - only in dev */}
        {isDev && wsMessages.length > 0 && (
          <div style={styles.messagesContainer}>
            <div style={styles.messagesTitle}>Last {wsMessages.length} Messages:</div>
            <div style={styles.messagesList}>
              {wsMessages.map((msg, idx) => (
                <div key={`msg-${msg.type}-${idx}`} style={styles.messageItem}>
                  {JSON.stringify(msg, null, 2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Players ({roomStatePlayers.length > 0 ? roomStatePlayers.length : players.length})
          </h2>
          <div style={styles.playerList}>
            {(() => {
              // Use ROOM_STATE players if available, otherwise fallback to Supabase players
              const playersToRender = roomStatePlayers.length > 0
                ? roomStatePlayers.map(p => ({
                    playerId: p.playerId,
                    isReady: p.isReady,
                  }))
                : players.map(p => ({
                    playerId: p.player_id,
                    isReady: p.is_ready,
                  }))

              if (playersToRender.length === 0) {
                return <div style={styles.empty}>No players in room</div>
              }

              return playersToRender.map((player) => {
                const isCurrentPlayer = player.playerId === currentUserId
                const hasPassed = passedPlayerIds.includes(player.playerId)
                const isCurrentTurn = player.playerId === currentTurnPlayerId

                return (
                  <div
                    key={player.playerId}
                    style={{
                      ...styles.playerItem,
                      ...(isCurrentPlayer ? styles.currentPlayer : {}),
                      ...(isCurrentTurn ? styles.currentTurnPlayer : {}),
                    }}
                  >
                    <div style={styles.playerInfo}>
                      <div style={styles.playerName}>{player.playerId}</div>
                      {isOwner && player.playerId === room.owner_id && (
                        <div style={styles.ownerBadge}>Owner</div>
                      )}
                      {hasPassed && (
                        <div style={styles.passedBadge}>Passed</div>
                      )}
                    </div>
                    <div style={styles.playerStatus}>
                      {player.isReady ? (
                        <span style={styles.ready}>✓ Ready</span>
                      ) : (
                        <span style={styles.notReady}>Not Ready</span>
                      )}
                      {isCurrentTurn && (
                        <span style={styles.turnIndicator}>• Your Turn</span>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        <div style={styles.actions}>
          {currentUserId && (() => {
            const roomStatePlayer = roomStatePlayers.find(p => p.playerId === currentUserId)
            const currentReady = roomStatePlayer 
              ? roomStatePlayer.isReady 
              : currentPlayer?.is_ready ?? false
            const isDisabled = updatingReady || wsStatus !== 'connected' || !!roundStart
            
            return (
              <button
                onClick={handleToggleReady}
                style={{
                  ...styles.button,
                  ...(currentReady ? styles.readyButton : styles.notReadyButton),
                  ...(isDisabled ? styles.buttonDisabled : {}),
                }}
                disabled={isDisabled}
                title={wsStatus !== 'connected' ? 'Connect first' : roundStart ? 'Round already started' : ''}
              >
                {wsStatus !== 'connected' 
                  ? 'Connect first'
                  : roundStart
                  ? 'Round started'
                  : updatingReady
                  ? 'Updating...'
                  : currentReady 
                  ? 'Mark Not Ready' 
                  : 'Mark Ready'}
              </button>
            )
          })()}

          {/* Owner Rules Setting */}
          {isOwner && room.status !== 'playing' && !roundStart && (
            <div style={styles.rulesSection}>
              <div style={styles.rulesInputGroup}>
                <label htmlFor="scoreLimit" style={styles.rulesLabel}>
                  Score Limit (1-60):
                </label>
                <input
                  id="scoreLimit"
                  type="number"
                  min="1"
                  max="60"
                  value={scoreLimitInput}
                  onChange={(e) => setScoreLimitInput(Math.min(60, Math.max(1, Number(e.target.value) || 60)))}
                  style={styles.rulesInput}
                />
                <button
                  onClick={() => {
                    if (scoreLimitInput >= 1 && scoreLimitInput <= 60) {
                      sendSetRulesMessage(scoreLimitInput)
                    }
                  }}
                  style={styles.rulesButton}
                  disabled={wsStatus !== 'connected' || scoreLimitInput < 1 || scoreLimitInput > 60}
                  title={wsStatus !== 'connected' ? 'WebSocket disconnected' : ''}
                >
                  Set Rules
                </button>
              </div>
            </div>
          )}
          
          {isOwner && room.status !== 'playing' && !roundStart && (
            <button 
              type="button" 
              onClick={handleStart} 
              style={styles.startButton}
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
          )}
        </div>

        {/* Game Area - Poker-style Table UI */}
        {yourHand && room?.status === 'playing' && (
          <div style={styles.gameArea}>
            {/* Round End Banner */}
            {roundEnd && (
              <div style={styles.roundEndBanner}>
                <strong>Round ended. Winner: {roundEnd.winnerPlayerId}</strong>
              </div>
            )}

            {/* Action Error Banner */}
            {actionError && (
              <div style={styles.actionErrorBanner}>
                {actionError}
              </div>
            )}

            {/* Main Game Layout: Table + Queue Panel */}
            <div style={styles.gameLayout}>
              {/* Table View */}
              <div style={styles.tableSection}>
                <TableView
                  seatedPlayerIds={seatedPlayerIds}
                  handsCount={handsCount}
                  totalScores={totalScores}
                  scoreLimit={scoreLimit}
                  currentTurnPlayerId={currentTurnPlayerId}
                  eliminated={eliminated}
                  currentUserId={currentUserId}
                  lastPlay={lastPlay}
                  renderCard={renderCard}
                />
              </div>

              {/* Queue Panel */}
              <div style={styles.queueSection}>
                <QueuePanel
                  queuePlayerIds={queuePlayerIds}
                  seatedPlayerIds={seatedPlayerIds}
                  handsCount={handsCount}
                  totalScores={totalScores}
                  scoreLimit={scoreLimit}
                  currentTurnPlayerId={currentTurnPlayerId}
                  eliminated={eliminated}
                />
              </div>
            </div>

            {/* Your Hand and Controls (Bottom Center) */}
            <div style={styles.playerArea}>
              <div style={styles.handContainer}>
                <div style={styles.handTitle}>
                  Your Hand ({yourHand.length} cards)
                  {selectedCards.length > 0 && (
                    <span style={styles.selectedCount}> • Selected: {selectedCards.length}/5</span>
                  )}
                </div>
                <div style={styles.handGrid}>
                  {yourHand.map((card, idx) => {
                    const isSelected = selectedCards.some(
                      (c) => c.rank === card.rank && c.suit === card.suit
                    )
                    return (
                      <div 
                        key={idx} 
                        style={{
                          ...styles.cardItem,
                          ...(isSelected ? styles.cardItemSelected : {}),
                          cursor: 'pointer',
                        }}
                        onClick={() => handleCardClick(card)}
                      >
                        {renderCard(card)}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Play/Pass Buttons */}
              {!roundEnd && (
                <div style={styles.gameActions}>
                  <button
                    onClick={handlePlay}
                    style={{
                      ...styles.button,
                      ...styles.playButton,
                      ...(() => {
                        const validLengths = [1, 2, 3, 5]
                        const isValidSelection = validLengths.includes(selectedCards.length)
                        return (!isValidSelection || !isMyTurn || wsStatus !== 'connected' ? styles.buttonDisabled : {})
                      })(),
                    }}
                    disabled={(() => {
                      const validLengths = [1, 2, 3, 5]
                      return !validLengths.includes(selectedCards.length) || !isMyTurn || wsStatus !== 'connected'
                    })()}
                    title={
                      wsStatus !== 'connected' 
                        ? 'WebSocket disconnected' 
                        : !isMyTurn 
                        ? 'Not your turn' 
                        : selectedCards.length === 0 
                        ? 'Select 1, 2, 3, or 5 cards to play' 
                        : selectedCards.length === 4
                        ? '4 cards not allowed. Select 1, 2, 3, or 5 cards'
                        : selectedCards.length > 5
                        ? 'Maximum 5 cards allowed'
                        : ''
                    }
                  >
                    PLAY {selectedCards.length > 0 && `(${selectedCards.length})`}
                  </button>
                  <button
                    onClick={handlePass}
                    style={{
                      ...styles.button,
                      ...styles.passButton,
                      ...(!isMyTurn || !lastPlay || wsStatus !== 'connected' ? styles.buttonDisabled : {}),
                    }}
                    disabled={!isMyTurn || !lastPlay || wsStatus !== 'connected'}
                    title={
                      wsStatus !== 'connected' 
                        ? 'WebSocket disconnected' 
                        : !isMyTurn 
                        ? 'Not your turn' 
                        : !lastPlay 
                        ? 'You must start the trick' 
                        : ''
                    }
                  >
                    PASS
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  meta: {
    fontSize: '14px',
    color: '#666',
  },
  leaveButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  playerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  currentPlayer: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007bff',
  },
  currentTurnPlayer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playerName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  ownerBadge: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#ffc107',
    color: '#333',
    borderRadius: '4px',
    fontWeight: '600',
    marginLeft: '8px',
  },
  passedBadge: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  turnIndicator: {
    fontSize: '12px',
    color: '#ff9800',
    fontWeight: 'bold',
    marginLeft: '8px',
  },
  playerStatus: {
    fontSize: '14px',
  },
  ready: {
    color: '#28a745',
    fontWeight: '600',
  },
  notReady: {
    color: '#999',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  readyButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  notReadyButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  startButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  wsPanel: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  wsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  wsTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  statusConnected: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusConnecting: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusReconnecting: {
    backgroundColor: '#ffeaa7',
    color: '#856404',
    animation: 'pulse 2s infinite',
  },
  statusError: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusDisconnected: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  wsError: {
    padding: '10px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  reconnectButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  messagesContainer: {
    marginTop: '12px',
  },
  messagesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
  },
  messagesList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
  },
  messageItem: {
    padding: '8px',
    marginBottom: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #eee',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  wsDebugInfo: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  wsDebugRow: {
    marginBottom: '6px',
    padding: '4px',
  },
  eventsContainer: {
    marginTop: '12px',
  },
  eventsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
  },
  eventsList: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  eventItem: {
    padding: '4px',
    marginBottom: '4px',
    backgroundColor: 'white',
    borderRadius: '3px',
    border: '1px solid #eee',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  eventTime: {
    color: '#999',
    minWidth: '80px',
  },
  eventName: {
    color: '#0066cc',
    fontWeight: '600',
    minWidth: '150px',
  },
  eventData: {
    color: '#333',
    flex: 1,
    wordBreak: 'break-all',
  },
  debugPanel: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: '1px solid #ddd',
  },
  debugTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  debugGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  debugItem: {
    padding: '6px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #eee',
  },
  roundStartBanner: {
    padding: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  roundStartContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: '600',
  },
  roundStartTime: {
    fontSize: '14px',
    fontWeight: '400',
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dealtBanner: {
    padding: '16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center',
  },
  gameInfo: {
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  gameInfoRow: {
    marginBottom: '8px',
    fontSize: '14px',
    color: '#333',
  },
  handContainer: {
    marginTop: '16px',
  },
  handTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  selectedCount: {
    fontSize: '14px',
    color: '#007bff',
    fontWeight: '500',
  },
  handGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  cardItem: {
    padding: '8px 12px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    fontFamily: 'monospace',
    minWidth: '50px',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  cardItemSelected: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
    transform: 'scale(1.1)',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.4)',
  },
  gameStateInfo: {
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
  },
  gameStateRow: {
    marginBottom: '6px',
    fontSize: '14px',
    color: '#333',
  },
  actionErrorBanner: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  gameActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '20px',
  },
  playButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
  },
  passButton: {
    backgroundColor: '#ffc107',
    color: '#333',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
  },
  roundEndBanner: {
    padding: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontSize: '18px',
    fontWeight: '600',
    textAlign: 'center',
  },
  rulesSection: {
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  rulesInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rulesLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  rulesInput: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '80px',
  },
  rulesButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  scoreboard: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  scoreboardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  scoreboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  scoreboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  scoreboardItemEliminated: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    opacity: 0.7,
  },
  scoreboardPlayer: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  scoreboardScore: {
    fontSize: '14px',
    color: '#666',
  },
  eliminatedBadge: {
    color: '#dc3545',
    fontWeight: '600',
    marginLeft: '8px',
  },
  gameArea: {
    width: '100%',
    padding: '20px',
  },
  gameLayout: {
    display: 'flex',
    gap: '20px',
    marginBottom: '40px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tableSection: {
    flex: '1 1 600px',
    minWidth: '400px',
    maxWidth: '800px',
  },
  queueSection: {
    flex: '0 0 300px',
    minWidth: '280px',
  },
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
}

