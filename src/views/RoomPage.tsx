'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from '../lib/navigation'
import { supabase } from '../lib/supabase'
import { connectGameSocketDebug, type GameSocketMessage, type WSEventLog } from '../lib/gameSocket'
import { log, warn, error as logError } from '../lib/logger'
import type { Room, RoomPlayer, Profile } from '../types/database'
import type { Card } from '../types/cards'
import { normalizeCard } from '../types/cards'
import { sortCards, cardsEqual } from '../utils/cardSort'
import { TableView } from '../components/TableView'
import { PlayingCard } from '../components/PlayingCard'
import { QueuePanel } from '../components/QueuePanel'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Card as UICard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { toast } from '../components/ui/Toast'
import { Skeleton } from '../components/ui/Skeleton'
import { cn } from '../utils/cn'
import { useGameSounds } from '../hooks/useGameSounds'

const isDev = process.env.NODE_ENV === 'development'

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
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null) // Track room channel to prevent duplicate subscriptions
  const playersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null) // Track players channel to prevent duplicate subscriptions
  const isSettingUpChannelsRef = useRef<boolean>(false) // Prevent concurrent channel setup
  
  // Game state from WS
  const [roomStatePlayers, setRoomStatePlayers] = useState<Array<{playerId: string, isReady: boolean}>>([])
  const [roundStart, setRoundStart] = useState<{roomId: string, startedAt: string} | null>(null)
  
  // DEALT state
  const [yourHand, setYourHand] = useState<Card[] | null>(null)
  const [handOrder, setHandOrder] = useState<number[]>([]) // Custom order indices
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pendingPlayCards, setPendingPlayCards] = useState<Card[] | null>(null) // Cards we're trying to play (for error recovery) - state for setter, ref for reading
  const pendingPlayCardsRef = useRef<Card[] | null>(null) // Ref to access current pending cards in message handlers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_starterPlayerId, setStarterPlayerId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_starterReason, setStarterReason] = useState<"WINNER" | "WEAKEST_SINGLE" | string | null>(null)
  const [seatedPlayerIds, setSeatedPlayerIds] = useState<string[]>([])
  const [queuePlayerIds, setQueuePlayerIds] = useState<string[]>([])
  
  // Game state
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null)
  const [lastPlay, setLastPlay] = useState<{playerId: string, cards: Card[], kind?: string, fiveKind?: string} | null>(null)
  const [handsCount, setHandsCount] = useState<Record<string, number>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_canPass, setCanPass] = useState<boolean>(false) // Legacy, kept for backward compatibility (server may still send it, but PASS button uses lastPlay instead)
  const [passedPlayerIds, setPassedPlayerIds] = useState<string[]>([])
  const [roundEnd, setRoundEnd] = useState<{winnerPlayerId: string} | null>(null)
  const [gameEnd, setGameEnd] = useState<{winnerPlayerId: string, totalScores: Record<string, number>} | null>(null)
  
  // Rules and scoring
  const [scoreLimit, setScoreLimit] = useState<number>(60)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_scoreboard, setScoreboard] = useState<{playerId: string, totalScore: number, eliminated: boolean}[]>([])
  const [scoreLimitInput, setScoreLimitInput] = useState<number>(60)
  const [totalScores, setTotalScores] = useState<Record<string, number>>({})
  const [eliminated, setEliminated] = useState<string[]>([])

  // Responsive state for mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sound effects
  const {
    playCardDeal,
    playCardPlay,
    playYourTurn,
    playPass,
    playRoundEnd,
    playWin,
    playLose,
    playButtonClick
  } = useGameSounds();

  // Refs to track previous state for sound triggers
  const prevYourHandLengthRef = useRef<number>(0);
  const prevCurrentTurnRef = useRef<string | null>(null);
  const prevLastPlayRef = useRef<typeof lastPlay>(null);

  // Helper function to get display name for a player
  const getPlayerDisplayName = useCallback((playerId: string): string => {
    const player = players.find(p => p.player_id === playerId)
    if (player?.profile?.display_name) {
      return player.profile.display_name
    }
    // Fallback to short ID if no display_name
    return playerId.length > 8 ? `${playerId.substring(0, 8)}...` : playerId
  }, [players])

  // Create player name map for passing to components
  const playerNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    players.forEach((p) => {
      const name = p.profile?.display_name || ''
      if (name) {
        map[p.player_id] = name
      }
    })
    return map
  }, [players])

  // Create player avatar map for passing to components
  const playerAvatarMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    players.forEach((p) => {
      if (p.profile?.avatar_url) {
        map[p.player_id] = p.profile.avatar_url
      }
    })
    return map
  }, [players])

  // Auto-connect function: connects to WS for 'lobby' or 'playing' status
  const connectIfPlaying = useCallback(async (roomStatus: string, roomIdToConnect: string) => {
    // Connect for 'lobby' or 'playing' status (need WS for ready/start logic)
    if (roomStatus !== 'playing' && roomStatus !== 'lobby') {
      shouldReconnectRef.current = false // Stop reconnecting if room finished
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

    log('[AutoConnect] room.status is', roomStatus)

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
      const wsUrlEnv = process.env.NEXT_PUBLIC_GAME_SERVER_WS_URL || process.env.VITE_GAME_SERVER_WS_URL || 'not set'
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
            const errorMsg = typeof message.error === 'string' 
              ? message.error 
              : typeof message.message === 'string'
              ? message.message
              : typeof message.error === 'object' && message.error !== null && 'message' in message.error
              ? String((message.error as { message?: unknown }).message || 'Server error')
              : 'Server error'
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
            // Use roomIdToConnect to ensure we have the correct roomId from the function parameter
            setTimeout(() => {
              const currentRoomId = roomIdToConnect || roomId
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentRoomId) {
                try {
                  // Validate roomId before sending
                  if (!currentRoomId || typeof currentRoomId !== 'string' || currentRoomId.trim() === '') {
                    logError('[WS] Cannot send SYNC_REQUEST: Invalid roomId', { 
                      roomId: currentRoomId, 
                      type: typeof currentRoomId,
                      fromParams: roomId,
                      fromConnect: roomIdToConnect
                    })
                    return
                  }
                  
                  const syncMessage = {
                    type: 'SYNC_REQUEST' as const,
                    roomId: currentRoomId.trim(),
                  }
                  log('[WS] Sending SYNC_REQUEST:', syncMessage)
                  const messageString = JSON.stringify(syncMessage)
                  log('[WS] SYNC_REQUEST JSON:', messageString)
                  wsRef.current.send(messageString)
                  log('[WS] SYNC_REQUEST sent')
                } catch (err) {
                  logError('[WS] Failed to send SYNC_REQUEST:', err)
                }
              } else {
                logError('[WS] Cannot send SYNC_REQUEST:', {
                  wsReady: wsRef.current?.readyState === WebSocket.OPEN,
                  roomId: currentRoomId,
                  roomIdFromParams: roomId,
                  roomIdFromConnect: roomIdToConnect,
                })
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
            // Use roomIdToConnect to ensure we have the correct roomId from the function parameter
            setTimeout(() => {
              const currentRoomId = roomIdToConnect || roomId
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentRoomId) {
                try {
                  // Validate roomId before sending
                  if (!currentRoomId || typeof currentRoomId !== 'string' || currentRoomId.trim() === '') {
                    logError('[WS] Cannot send SYNC_REQUEST (after STATE): Invalid roomId', { 
                      roomId: currentRoomId, 
                      type: typeof currentRoomId,
                      fromParams: roomId,
                      fromConnect: roomIdToConnect
                    })
                    return
                  }
                  
                  const syncMessage = {
                    type: 'SYNC_REQUEST' as const,
                    roomId: currentRoomId.trim(),
                  }
                  log('[WS] Sending SYNC_REQUEST (after STATE):', syncMessage)
                  const messageString = JSON.stringify(syncMessage)
                  log('[WS] SYNC_REQUEST JSON (after STATE):', messageString)
                  wsRef.current.send(messageString)
                  log('[WS] SYNC_REQUEST sent (after STATE)')
                } catch (err) {
                  logError('[WS] Failed to send SYNC_REQUEST:', err)
                }
              } else {
                logError('[WS] Cannot send SYNC_REQUEST (after STATE):', {
                  wsReady: wsRef.current?.readyState === WebSocket.OPEN,
                  roomId: currentRoomId,
                  roomIdFromParams: roomId,
                  roomIdFromConnect: roomIdToConnect,
                })
              }
            }, 100)
          } else if (message.type === 'SYNC_STATE') {
            log('[WS] Received SYNC_STATE')
            // Clear any pending play cards (state synced from server)
            setPendingPlayCards(null)
            pendingPlayCardsRef.current = null
            // Apply SYNC_STATE - overwrite all relevant state (do NOT merge)
            if (message.seatedPlayerIds && Array.isArray(message.seatedPlayerIds)) {
              setSeatedPlayerIds(message.seatedPlayerIds)
            }
            if (message.queuePlayerIds && Array.isArray(message.queuePlayerIds)) {
              setQueuePlayerIds(message.queuePlayerIds)
            }
            if (message.currentTurnPlayerId && typeof message.currentTurnPlayerId === 'string') {
              setCurrentTurnPlayerId(message.currentTurnPlayerId)
            }
            if (message.lastPlay && typeof message.lastPlay === 'object' && message.lastPlay !== null) {
              const lastPlay = message.lastPlay as { playerId?: unknown; cards?: unknown; kind?: unknown; fiveKind?: unknown }
              const normalizedLastPlay = {
                playerId: typeof lastPlay.playerId === 'string' ? lastPlay.playerId : '',
                cards: Array.isArray(lastPlay.cards) 
                  ? lastPlay.cards.map((card: unknown) => normalizeCard(card))
                  : [],
                kind: typeof lastPlay.kind === 'string' ? lastPlay.kind : undefined,
                fiveKind: typeof lastPlay.fiveKind === 'string' ? lastPlay.fiveKind : undefined
              }
              setLastPlay(normalizedLastPlay)
            } else {
              setLastPlay(null)
            }
            if (message.handsCount && typeof message.handsCount === 'object' && message.handsCount !== null) {
              const handsCountMap: Record<string, number> = {}
              for (const [playerId, count] of Object.entries(message.handsCount)) {
                handsCountMap[playerId] = typeof count === 'number' ? count : 0
              }
              setHandsCount(handsCountMap)
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
              const normalizedHand = message.yourHand.map((card: unknown) => normalizeCard(card))
              const sortedHand = sortCards(normalizedHand)
              setYourHand(sortedHand)
              setHandOrder([]) // Reset custom order when new hand is received
            }
            if (typeof message.scoreLimit === 'number') {
              setScoreLimit(message.scoreLimit)
            }
          } else if (message.type === 'ROOM_STATE') {
            log('[WS] Received ROOM_STATE')
            if (message.players && Array.isArray(message.players)) {
              const playersArray = message.players as Array<{ playerId: string; isReady?: boolean }>
              // Map to ensure isReady is always boolean
              setRoomStatePlayers(playersArray.map(p => ({ playerId: p.playerId, isReady: p.isReady ?? false })))
              // Fetch profiles for any new players that don't have profiles yet
              // Use functional update to access current players state
              setPlayers(currentPlayers => {
                const newPlayerIds = playersArray.map((p) => p.playerId)
                const existingPlayerIds = new Set(currentPlayers.map(p => p.player_id))
                const missingPlayerIds = newPlayerIds.filter((id: string) => !existingPlayerIds.has(id))
                
                if (missingPlayerIds.length > 0 && roomId) {
                  // Fetch profiles for missing players asynchronously
                  Promise.all(
                    missingPlayerIds.map(async (playerId: string) => {
                      try {
                        const { data: profile } = await supabase
                          .from('profiles')
                          .select('id, display_name, avatar_url')
                          .eq('id', playerId)
                          .single()
                        
                        // Update players state with new profile
                        if (profile) {
                          setPlayers(prev => {
                            const existing = prev.find(p => p.player_id === playerId)
                            if (existing) {
                              return prev.map(p => 
                                p.player_id === playerId 
                                  ? { ...p, profile: profile as Profile }
                                  : p
                              )
                            }
                            // If player doesn't exist in players list, add them
                            return [...prev, {
                              player_id: playerId,
                              room_id: roomId,
                              is_ready: (playersArray.find((p) => p.playerId === playerId)?.isReady) || false,
                              left_at: null,
                              joined_at: new Date().toISOString(),
                              id: '', // Will be set by Supabase
                              profile: profile as Profile,
                            } as PlayerWithProfile]
                          })
                        }
                      } catch (err) {
                        warn(`Failed to fetch profile for player ${playerId}:`, err)
                      }
                    })
                  ).catch(err => {
                    warn('Failed to fetch profiles for new players:', err)
                  })
                }
                
                return currentPlayers // Return current state, updates will happen via setPlayers in Promise
              })
            }
          } else if (message.type === 'ROUND_START') {
            log('[WS] Received ROUND_START')
            if (message.roomId && typeof message.roomId === 'string' && 
                message.startedAt && typeof message.startedAt === 'string') {
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
            // Clear any pending play cards (new hand dealt)
            setPendingPlayCards(null)
            pendingPlayCardsRef.current = null
            // Clear last play (new round starts fresh)
            setLastPlay(null)
            // Clear passed players (new round)
            setPassedPlayerIds([])
            // Clear current turn (will be set by GAME_STATE)
            setCurrentTurnPlayerId(null)

            if (message.yourHand && Array.isArray(message.yourHand)) {
              // Normalize cards to handle various formats (numeric, symbol, or canonical)
              const normalizedHand = message.yourHand.map((card: unknown) => normalizeCard(card))
              const sortedHand = sortCards(normalizedHand)
              setYourHand(sortedHand)
              setSelectedCards([]) // Reset selection when new hand is dealt
              setHandOrder([]) // Reset custom order when new hand is dealt
            }
            if (message.starterPlayerId && typeof message.starterPlayerId === 'string') {
              setStarterPlayerId(message.starterPlayerId)
            }
            if (message.reason && typeof message.reason === 'string') {
              setStarterReason(message.reason)
            }
            if (message.seatedPlayerIds && Array.isArray(message.seatedPlayerIds)) {
              setSeatedPlayerIds(message.seatedPlayerIds)
              // Initialize handsCount for all seated players (13 cards each at start of round)
              const newHandsCount: Record<string, number> = {}
              message.seatedPlayerIds.forEach((playerId: string) => {
                newHandsCount[playerId] = 13
              })
              setHandsCount(newHandsCount)
            }
            // Also update handsCount if provided in message
            if (message.handsCount && typeof message.handsCount === 'object' && message.handsCount !== null) {
              const handsCountMap: Record<string, number> = {}
              for (const [playerId, count] of Object.entries(message.handsCount)) {
                handsCountMap[playerId] = typeof count === 'number' ? count : 0
              }
              setHandsCount(handsCountMap)
            }
          } else if (message.type === 'GAME_STATE') {
            log('[WS] Received GAME_STATE')
            if (message.currentTurnPlayerId && typeof message.currentTurnPlayerId === 'string') {
              setCurrentTurnPlayerId(message.currentTurnPlayerId)
            }
            if (message.lastPlay && typeof message.lastPlay === 'object' && message.lastPlay !== null) {
              const lastPlay = message.lastPlay as { playerId?: unknown; cards?: unknown; kind?: unknown; fiveKind?: unknown }
              const normalizedLastPlay = {
                playerId: typeof lastPlay.playerId === 'string' ? lastPlay.playerId : '',
                cards: Array.isArray(lastPlay.cards) 
                  ? lastPlay.cards.map((card: unknown) => normalizeCard(card))
                  : [],
                kind: typeof lastPlay.kind === 'string' ? lastPlay.kind : undefined,
                fiveKind: typeof lastPlay.fiveKind === 'string' ? lastPlay.fiveKind : undefined
              }
              setLastPlay(normalizedLastPlay)
            } else {
              setLastPlay(null)
            }

            // Always clear pending cards on GAME_STATE - trust server state
            if (pendingPlayCardsRef.current) {
              log('[WS] Clearing pending cards on GAME_STATE')
              setPendingPlayCards(null)
              pendingPlayCardsRef.current = null
            }
            // Clear selection on GAME_STATE update (turn change)
            setSelectedCards([])
            if (message.handsCount && typeof message.handsCount === 'object' && message.handsCount !== null) {
              const handsCountMap: Record<string, number> = {}
              for (const [playerId, count] of Object.entries(message.handsCount)) {
                handsCountMap[playerId] = typeof count === 'number' ? count : 0
              }
              setHandsCount(handsCountMap)
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
            const errorMsg = typeof message.error === 'string' 
              ? message.error 
              : typeof message.message === 'string'
              ? message.message
              : typeof message.error === 'object' && message.error !== null && 'message' in message.error
              ? String((message.error as { message?: unknown }).message || 'Action error')
              : 'Action error'
            logError('[WS] Received ACTION_ERROR:', errorMsg)
            setActionError(errorMsg)
            
            // Restore cards if we had pending play cards (error recovery)
            const pendingCards = pendingPlayCardsRef.current
            if (pendingCards && pendingCards.length > 0) {
              log('[WS] Restoring cards after ACTION_ERROR:', pendingCards)
              setYourHand((prevHand) => {
                if (!prevHand) return prevHand

                // Filter out cards that are already in hand (prevent duplicates)
                const cardsToRestore = pendingCards.filter(pendingCard =>
                  !prevHand.some(handCard =>
                    handCard.rank === pendingCard.rank && handCard.suit === pendingCard.suit
                  )
                )

                if (cardsToRestore.length === 0) {
                  log('[WS] No cards to restore (already in hand)')
                  return prevHand
                }

                log('[WS] Actually restoring cards:', cardsToRestore)
                const restoredHand = [...prevHand, ...cardsToRestore]
                return sortCards(restoredHand)
              })

              // Reset handOrder since we're restoring cards
              setHandOrder([])

              // Clear pending cards
              setPendingPlayCards(null)
              pendingPlayCardsRef.current = null
            }
            
            // Do NOT clear selection on error - user may want to adjust
            // Clear error after 5 seconds
            setTimeout(() => setActionError(null), 5000)
          } else if (message.type === 'ROUND_END') {
            log('[WS] Received ROUND_END')
            if (message.winnerPlayerId && typeof message.winnerPlayerId === 'string') {
              setRoundEnd({ winnerPlayerId: message.winnerPlayerId })
            }
          } else if (message.type === 'GAME_END') {
            log('[WS] Received GAME_END')
            if (message.winnerPlayerId && typeof message.winnerPlayerId === 'string') {
              const totalScores = message.totalScores && typeof message.totalScores === 'object'
                ? message.totalScores as Record<string, number>
                : {}
              setGameEnd({ winnerPlayerId: message.winnerPlayerId, totalScores })
              // Update room status locally
              setRoom(prevRoom => prevRoom ? { ...prevRoom, status: 'finished' } : null)
              // Stop reconnection attempts
              shouldReconnectRef.current = false
              toast.success(`Game Over! Winner: ${getPlayerDisplayName(message.winnerPlayerId)}`)
            }
          } else if (message.type === 'PLAYER_LEFT') {
            log('[WS] Received PLAYER_LEFT')
            if (message.playerId && typeof message.playerId === 'string') {
              const leftPlayerId = message.playerId
              // Remove from players list
              setPlayers(prev => prev.filter(p => p.player_id !== leftPlayerId))
              // Remove from roomStatePlayers
              setRoomStatePlayers(prev => prev.filter(p => p.playerId !== leftPlayerId))
              // Remove from seatedPlayerIds
              setSeatedPlayerIds(prev => prev.filter(id => id !== leftPlayerId))
              // Remove from handsCount
              setHandsCount(prev => {
                const newHandsCount = { ...prev }
                delete newHandsCount[leftPlayerId]
                return newHandsCount
              })
              // Show toast notification
              toast.info(`${getPlayerDisplayName(leftPlayerId)} left the room`)
            }
          } else if (message.type === 'PLAYER_JOINED') {
            log('[WS] Received PLAYER_JOINED')
            if (message.playerId && typeof message.playerId === 'string') {
              // Show toast notification - ROOM_STATE will update the player list
              toast.info(`New player joined!`)
            }
          } else if (message.type === 'WS_ERROR' || message.type === 'PARSE_ERROR') {
            const errorMsg = typeof message.error === 'string' 
              ? message.error 
              : typeof message.error === 'object' && message.error !== null && 'message' in message.error
              ? String((message.error as { message?: unknown }).message || 'WebSocket error')
              : 'WebSocket error'
            logError('[WS] Client error:', errorMsg)
            setWsError(errorMsg)
            setWsStatus('error')
            connectingRef.current = false
          } else if (message.type === 'WS_OPEN_TIMEOUT') {
            const errorMsg = typeof message.error === 'string' 
              ? message.error 
              : typeof message.error === 'object' && message.error !== null && 'message' in message.error
              ? String((message.error as { message?: unknown }).message || 'WebSocket open timeout')
              : 'WebSocket open timeout'
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
          // Use roomId from closure and check room status via ref to avoid dependency issues
          const currentRoomStatus = room?.status
          if (shouldReconnectRef.current && currentRoomStatus === 'playing' && !wasClean) {
            // Start reconnection with exponential backoff
            const reconnectDelays = [500, 1000, 2000, 4000, 8000]
            const maxAttempts = 10
            
            const attemptReconnect = async (attempt: number) => {
              const currentRoomStatus = room?.status
              const currentRoomId = room?.id
              if (!shouldReconnectRef.current || currentRoomStatus !== 'playing' || !currentRoomId) {
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
                const checkRoomStatus = room?.status
                const checkRoomId = room?.id
                if (!shouldReconnectRef.current || checkRoomStatus !== 'playing' || !checkRoomId) {
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
                
                await connectIfPlaying(checkRoomStatus, checkRoomId)
                
                // Check connection status after a delay to see if we need to retry
                setTimeout(() => {
                  if (shouldReconnectRef.current && (room?.status === 'playing' || room?.status === 'lobby')) {
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
      // Store reference for SYNC_REQUEST if needed
      if (ws && 'sendSyncRequest' in ws) {
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
    // currentUserId, room?.id, room?.status, and roomId are intentionally omitted to prevent infinite loops
    // They are accessed via closure and refs where needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby')
      return
    }

    // Guard: Don't create channels if setup is already in progress
    if (isSettingUpChannelsRef.current) {
      log('[RoomsRT] Channel setup already in progress, skipping')
      return
    }

    // Guard: Don't create channels if they already exist and are active
    const existingRoomChannel = roomChannelRef.current
    const existingPlayersChannel = playersChannelRef.current
    
    if (existingRoomChannel && existingPlayersChannel) {
      // Check channel state - Supabase channels have a state property
      const roomChannelState = (existingRoomChannel as { state?: string })?.state
      const playersChannelState = (existingPlayersChannel as { state?: string })?.state
      
      // If channels are still subscribed or joining, don't recreate
      if (roomChannelState === 'joined' || roomChannelState === 'joining' || 
          playersChannelState === 'joined' || playersChannelState === 'joining') {
        log('[RoomsRT] Channels already exist and active, skipping creation')
        return
      }
      
      // If channels are closed/errored, clean them up first
      if (roomChannelState === 'closed' || roomChannelState === 'errored' ||
          playersChannelState === 'closed' || playersChannelState === 'errored') {
        log('[RoomsRT] Cleaning up closed/errored channels')
        supabase.removeChannel(existingRoomChannel)
        supabase.removeChannel(existingPlayersChannel)
        roomChannelRef.current = null
        playersChannelRef.current = null
      }
    }

    // Mark that we're setting up channels
    isSettingUpChannelsRef.current = true

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

        // Clean up existing channels if they exist (prevent duplicates)
        if (playersChannelRef.current) {
          supabase.removeChannel(playersChannelRef.current)
          playersChannelRef.current = null
        }
        if (roomChannelRef.current) {
          supabase.removeChannel(roomChannelRef.current)
          roomChannelRef.current = null
        }

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
        playersChannelRef.current = channel

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
                // Only update if room actually changed to prevent unnecessary re-renders
                setRoom(prevRoom => {
                  if (prevRoom && prevRoom.id === updatedRoom.id && 
                      prevRoom.status === updatedRoom.status &&
                      prevRoom.score_limit === updatedRoom.score_limit) {
                    // Room hasn't meaningfully changed, return previous to prevent re-render
                    return prevRoom
                  }
                  return updatedRoom
                })
                
                // Auto-connect when status becomes "waiting" or "playing" (for ALL users)
                if (updatedRoom.status === 'playing' || updatedRoom.status === 'lobby') {
                  log('[AutoConnect] Realtime: room status updated to', updatedRoom.status)
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
              // Don't recreate on timeout - let it retry naturally
            } else if (status === 'CHANNEL_ERROR') {
              logError('[RoomsRT] Channel error occurred')
              // Clear ref so it can be recreated on next effect run
              if (roomChannelRef.current === roomChannel) {
                roomChannelRef.current = null
              }
            } else if (status === 'CLOSED') {
              log('[RoomsRT] Channel closed')
              // Only clear ref if this is the current channel (not a stale one)
              // Don't recreate immediately to avoid infinite loop
              if (roomChannelRef.current === roomChannel) {
                roomChannelRef.current = null
              }
            }
          })
        roomChannelRef.current = roomChannel

        // A) After initial room fetch: auto-connect if already "playing"
        log('[AutoConnect] Initial fetch: room.status =', roomData.status)
        connectIfPlaying(roomData.status, roomId)

        // Mark channel setup as complete
        isSettingUpChannelsRef.current = false

        return () => {
          isSettingUpChannelsRef.current = false
          if (playersChannelRef.current) {
            supabase.removeChannel(playersChannelRef.current)
            playersChannelRef.current = null
          }
          if (roomChannelRef.current) {
            supabase.removeChannel(roomChannelRef.current)
            roomChannelRef.current = null
          }
          // Close WebSocket on unmount
          if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
          }
          connectingRef.current = false
        }
      } catch (err) {
        isSettingUpChannelsRef.current = false
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]) // Only depend on roomId - navigate is stable, but we removed it to be safe

  // Initialize scoreLimit from room data and sync to WebSocket server
  useEffect(() => {
    if (room?.score_limit) {
      setScoreLimit(room.score_limit)
      setScoreLimitInput(room.score_limit)

      // Sync score limit to WebSocket server if owner and connected
      if (
        currentUserId &&
        room.owner_id === currentUserId &&
        room.status === 'lobby' &&
        wsRef.current?.readyState === WebSocket.OPEN
      ) {
        const rulesMessage = {
          type: 'SET_RULES',
          roomId: room.id,
          scoreLimit: room.score_limit,
        }
        wsRef.current.send(JSON.stringify(rulesMessage))
        log('[SET_RULES] Auto-synced score limit to WebSocket server:', room.score_limit)
      }
    }
  }, [room?.score_limit, room?.owner_id, room?.status, room?.id, currentUserId])

  // Sound effect: Cards dealt
  useEffect(() => {
    if (yourHand && yourHand.length > 0 && prevYourHandLengthRef.current === 0) {
      playCardDeal();
    }
    prevYourHandLengthRef.current = yourHand?.length || 0;
  }, [yourHand, playCardDeal]);

  // Sound effect: Your turn notification
  useEffect(() => {
    if (currentTurnPlayerId && currentTurnPlayerId === currentUserId && prevCurrentTurnRef.current !== currentUserId) {
      playYourTurn();
    }
    prevCurrentTurnRef.current = currentTurnPlayerId;
  }, [currentTurnPlayerId, currentUserId, playYourTurn]);

  // Sound effect: Card played
  useEffect(() => {
    if (lastPlay && lastPlay !== prevLastPlayRef.current) {
      // Don't play sound if it's our own play (we play it on button click)
      if (lastPlay.playerId !== currentUserId) {
        playCardPlay();
      }
    }
    prevLastPlayRef.current = lastPlay;
  }, [lastPlay, currentUserId, playCardPlay]);

  // Sound effect: Round end
  useEffect(() => {
    if (roundEnd) {
      playRoundEnd();
    }
  }, [roundEnd, playRoundEnd]);

  // Sound effect: Game end (win/lose)
  useEffect(() => {
    if (gameEnd) {
      if (gameEnd.winnerPlayerId === currentUserId) {
        playWin();
      } else {
        playLose();
      }
    }
  }, [gameEnd, currentUserId, playWin, playLose]);

  // Fallback polling: check room status every 1s if not connected
  useEffect(() => {
    if (!roomId || !room) return

    // Only poll if WS is not connected/connecting
    const shouldPoll =
      wsStatus !== 'connected' &&
      wsStatus !== 'connecting'

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

        if (roomData?.status === 'playing' || roomData?.status === 'lobby') {
          log('[Polling] Room status is', roomData.status, '- connecting WS')
          connectIfPlaying(roomData.status, roomId)
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
    // room is intentionally omitted to prevent infinite loops - we check room?.status inside the interval
    // connectIfPlaying is stable due to useCallback with empty deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, wsStatus, connectIfPlaying])

  const fetchPlayers = async (id: string) => {
    try {
      // Try querying with .is() filter first
      const { data: playersDataInitial, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', id)
        .is('left_at', null) // Only show players who haven't left

      // If that fails (500 error or any error), try fetching all and filtering client-side
      let playersData = playersDataInitial
      if (playersError) {
        warn('Query with .is() failed, trying alternative approach:', playersError)
        const { data: allPlayers, error: allError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', id)

        if (allError) {
          logError('Failed to fetch players:', allError)
          const errorMsg = (allError as { message?: string })?.message || String(allError)
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
            .select('id, display_name, avatar_url')
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
      
      // Store cards we're trying to play (for error recovery)
      setPendingPlayCards(cards)
      pendingPlayCardsRef.current = cards
      
      // Optimistically remove played cards from yourHand in real-time
      // If server returns error, we'll restore them
      setYourHand((prevHand) => {
        if (!prevHand) return prevHand
        
        // Filter out the played cards
        let newHand = prevHand.filter((handCard) => {
          return !cards.some(
            (playedCard) => cardsEqual(playedCard, handCard)
          )
        })
        
        // Re-sort the remaining cards to maintain proper order
        newHand = sortCards(newHand)
        
        // Update handOrder to remove indices of played cards
        setHandOrder((prevOrder) => {
          if (prevOrder.length === 0) return []
          
          // Find indices of played cards in original hand
          const playedIndices = new Set(
            cards.map((playedCard) =>
              prevHand.findIndex((handCard) => cardsEqual(handCard, playedCard))
            ).filter((idx) => idx !== -1)
          )
          
          // Remove played indices and adjust remaining indices
          const newOrder = prevOrder
            .filter((idx) => !playedIndices.has(idx))
            .map((idx) => {
              // Adjust index: count how many played cards were before this index
              const adjustment = Array.from(playedIndices).filter((playedIdx) => playedIdx < idx).length
              return idx - adjustment
            })
          
          return newOrder
        })
        
        return newHand
      })
      
      // Clear selection after sending (optimistic)
      setSelectedCards([])
      
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

  const sendStartGameMessage = useCallback(() => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      warn('[START_GAME] Cannot send START_GAME: WS not connected')
      return false
    }

    try {
      // First sync score limit to ensure it's set correctly
      if (room?.score_limit) {
        const rulesMessage = {
          type: 'SET_RULES',
          roomId,
          scoreLimit: room.score_limit,
        }
        log('[START_GAME] Syncing score limit before start:', room.score_limit)
        wsRef.current.send(JSON.stringify(rulesMessage))
      }

      // Then send START_GAME
      const startGameMessage = {
        type: 'START_GAME',
        roomId,
      }
      log('[START_GAME] Sending START_GAME message')
      wsRef.current.send(JSON.stringify(startGameMessage))
      return true
    } catch (err) {
      logError('[START_GAME] Failed to send START_GAME message:', err)
      setActionError('Failed to start game')
      return false
    }
  }, [roomId, room?.score_limit])

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

    playCardPlay(); // Play card sound
    sendPlayMessage(selectedCards)
    // Selection cleared in sendPlayMessage after successful send
  }

  const handlePass = () => {
    playPass(); // Play pass sound
    sendPassMessage()
  }

  const isMyTurn = currentTurnPlayerId === currentUserId

  const handleToggleReady = async () => {
    if (!roomId || !currentUserId || updatingReady) return

    playButtonClick(); // Play button click sound

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
        const wsWithMark = wsRef.current as WebSocket & { markManualClose?: () => void }
        if (wsWithMark.markManualClose) {
          wsWithMark.markManualClose()
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
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !room) {
    return (
      <AppShell>
        <div className="space-y-4">
          <UICard>
            <div className="p-6 text-center space-y-4">
              <p className="text-[var(--danger)]">{error || 'Room not found'}</p>
              <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
            </div>
          </UICard>
        </div>
      </AppShell>
    )
  }

  const currentPlayer = players.find((p) => p.player_id === currentUserId)
  const isOwner = currentUserId === room.owner_id

  return (
    <AppShell
      title={`Room: ${room.code}`}
      subtitle={`Score Limit: ${scoreLimit}`}
      showSignOut={false}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end">
          <Button variant="danger" onClick={handleLeave} disabled={leaving} isLoading={leaving}>
            Leave Room
          </Button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg">
            {error}
          </div>
        )}

        {/* ROUND_START Banner */}
        {roundStart && (
          <div className="p-4 bg-[var(--success)] text-white rounded-lg shadow-md">
            <div className="flex justify-between items-center">
              <strong className="text-lg">Round starting...</strong>
              <span className="text-sm opacity-90">
                {new Date(roundStart.startedAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* DEALT Banner */}
        {yourHand && (
          <div className="p-4 bg-[var(--info)] text-white rounded-lg shadow-md text-center font-semibold">
            Cards dealt. Waiting for starter...
          </div>
        )}

        {/* Debug Panel - only in dev */}
        {isDev && (
          <UICard>
            <UICard header={<h3 className="text-sm font-semibold text-[var(--text)]">Debug Info</h3>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
                  <strong>room.status:</strong> {room.status}
                </div>
                <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
                  <strong>current auth.uid:</strong> {currentUserId || 'null'}
                </div>
                <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
                  <strong>room.owner_id:</strong> {room.owner_id}
                </div>
                <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
                  <strong>isOwner:</strong> {isOwner ? 'true' : 'false'}
                </div>
              </div>
            </UICard>
          </UICard>
        )}

        {/* WebSocket Connection Panel */}
        <UICard>
          <UICard header={
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-[var(--text)]">Game Server Connection</h3>
              <Badge
                variant={
                  wsStatus === 'connected' ? 'success' :
                  wsStatus === 'connecting' || wsStatus === 'reconnecting' ? 'warning' :
                  wsStatus === 'error' ? 'danger' : 'default'
                }
              >
                {wsStatus === 'connected' && '● Connected'}
                {wsStatus === 'connecting' && '● Connecting...'}
                {wsStatus === 'reconnecting' && `● Reconnecting (${reconnectAttemptRef.current}/10)...`}
                {wsStatus === 'error' && '● Error'}
                {wsStatus === 'disconnected' && '○ Disconnected'}
              </Badge>
            </div>
          }>
            {wsError && (
              <div className="mb-4 p-3 bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg text-sm">
                {wsError}
              </div>
            )}
            
            {/* WS Debug Info - only in dev */}
            {isDev && (
              <div className="mb-4 p-3 bg-[var(--bg-elevated)] rounded text-xs font-mono space-y-1">
                <div><strong>wsUrl:</strong> {wsUrl || 'not set'}</div>
                <div>
                  <strong>wsReadyState:</strong> {wsRef.current ? wsRef.current.readyState : 'null'} 
                  ({wsRef.current ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][wsRef.current.readyState] : 'null'})
                </div>
                <div><strong>connectionStatus:</strong> {wsStatus}</div>
              </div>
            )}

            {wsStatus === 'disconnected' && (room?.status === 'playing' || room?.status === 'lobby') && (
              <Button size="sm" onClick={handleReconnect}>Reconnect</Button>
            )}
            
            {/* WS Events Log - only in dev */}
            {isDev && wsEvents.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-[var(--text-muted)] mb-2">
                  Last {wsEvents.length} WS Events:
                </div>
                <div className="max-h-[200px] overflow-y-auto border border-[var(--border)] rounded p-2 bg-[var(--bg-elevated)] text-xs font-mono space-y-1">
                  {wsEvents.map((event, idx) => (
                    <div key={`event-${event.timestamp}-${idx}`} className="flex gap-2 p-1 bg-[var(--bg-surface)] rounded border border-[var(--border)]">
                      <span className="text-[var(--text-muted)] min-w-[80px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-[var(--info)] font-semibold min-w-[150px]">{event.event}</span>
                      {event.data !== undefined && event.data !== null && (
                        <span className="text-[var(--text)] flex-1 break-all">
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
              <div className="mt-4">
                <div className="text-sm font-semibold text-[var(--text-muted)] mb-2">
                  Last {wsMessages.length} Messages:
                </div>
                <div className="max-h-[300px] overflow-y-auto border border-[var(--border)] rounded p-2 bg-[var(--bg-elevated)] text-xs font-mono space-y-2">
                  {wsMessages.map((msg, idx) => (
                    <div key={`msg-${msg.type}-${idx}`} className="p-2 bg-[var(--bg-surface)] rounded border border-[var(--border)] whitespace-pre-wrap break-all">
                      {JSON.stringify(msg, null, 2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </UICard>
        </UICard>

        {/* Players Section */}
        <UICard>
          <UICard header={
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Players ({roomStatePlayers.length > 0 ? roomStatePlayers.length : players.length})
            </h2>
          }>
            <div className="space-y-3">
              {(() => {
                // Always use players state (which has profiles) as source of truth for display
                // Merge ready status from roomStatePlayers if available
                const playersToRender = players.map(p => {
                  const roomStatePlayer = roomStatePlayers.find(rsp => rsp.playerId === p.player_id)
                  return {
                    playerId: p.player_id,
                    isReady: roomStatePlayer?.isReady ?? p.is_ready,
                    displayName: p.profile?.display_name || null,
                  }
                })

                // If roomStatePlayers has players not in players list, add them (will show ID until profile loads)
                if (roomStatePlayers.length > 0) {
                  roomStatePlayers.forEach(rsp => {
                    if (!playersToRender.find(p => p.playerId === rsp.playerId)) {
                      playersToRender.push({
                        playerId: rsp.playerId,
                        isReady: rsp.isReady,
                        displayName: null,
                      })
                    }
                  })
                }

                if (playersToRender.length === 0) {
                  return <p className="text-center text-[var(--text-muted)] py-8">No players in room</p>
                }

                return playersToRender.map((player) => {
                  const isCurrentPlayer = player.playerId === currentUserId
                  const hasPassed = passedPlayerIds.includes(player.playerId)
                  const isCurrentTurn = player.playerId === currentTurnPlayerId
                  // Use displayName if available, otherwise fallback to getPlayerDisplayName
                  const displayName = player.displayName || getPlayerDisplayName(player.playerId)

                  return (
                    <div
                      key={player.playerId}
                      className={cn(
                        'flex justify-between items-center p-4 rounded-lg border transition-all',
                        isCurrentPlayer && 'bg-[var(--primary-bg)] border-[var(--primary)]',
                        isCurrentTurn && 'bg-[var(--warning-bg)] border-[var(--warning)]',
                        !isCurrentPlayer && !isCurrentTurn && 'bg-[var(--bg-elevated)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[var(--text)]">
                          {displayName}
                        </span>
                        {isOwner && player.playerId === room.owner_id && (
                          <Badge variant="warning" size="sm">Owner</Badge>
                        )}
                        {hasPassed && (
                          <Badge variant="default" size="sm">Passed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {player.isReady ? (
                          <Badge variant="success" size="sm">✓ Ready</Badge>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">Not Ready</span>
                        )}
                        {isCurrentTurn && (
                          <Badge variant="warning" size="sm">• Your Turn</Badge>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </UICard>
        </UICard>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          {currentUserId && (() => {
            const roomStatePlayer = roomStatePlayers.find(p => p.playerId === currentUserId)
            const currentReady = roomStatePlayer 
              ? roomStatePlayer.isReady 
              : currentPlayer?.is_ready ?? false
            const isDisabled = updatingReady || wsStatus !== 'connected' || !!roundStart
            
            return (
              <Button
                onClick={handleToggleReady}
                variant={currentReady ? 'success' : 'secondary'}
                disabled={isDisabled}
                isLoading={updatingReady}
                title={wsStatus !== 'connected' ? 'Connect first' : roundStart ? 'Round already started' : ''}
              >
                {wsStatus !== 'connected' 
                  ? 'Connect first'
                  : roundStart
                  ? 'Round started'
                  : currentReady
                  ? 'Mark Not Ready'
                  : 'Mark Ready'}
              </Button>
            )
          })()}

          {/* Start Game Button (Owner only) */}
          {isOwner && room.status !== 'playing' && !roundStart && !yourHand && (
            (() => {
              const allReady = roomStatePlayers.length >= 2 && roomStatePlayers.every(p => p.isReady)
              return (
                <Button
                  onClick={() => sendStartGameMessage()}
                  variant="success"
                  disabled={!allReady || wsStatus !== 'connected'}
                  title={
                    wsStatus !== 'connected'
                      ? 'Connect first'
                      : roomStatePlayers.length < 2
                      ? 'Need at least 2 players'
                      : !allReady
                      ? 'All players must be ready'
                      : 'Start the game!'
                  }
                  className="px-6"
                >
                  Start Game
                </Button>
              )
            })()
          )}

          {/* Owner Rules Setting */}
          {isOwner && room.status !== 'playing' && !roundStart && (
            <div className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
              <label htmlFor="scoreLimit" className="text-sm font-medium text-[var(--text)]">
                Score Limit (1-60):
              </label>
              <input
                id="scoreLimit"
                type="number"
                min="1"
                max="60"
                value={scoreLimitInput}
                onChange={(e) => setScoreLimitInput(Math.min(60, Math.max(1, Number(e.target.value) || 60)))}
                className="w-20 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (scoreLimitInput >= 1 && scoreLimitInput <= 60) {
                    sendSetRulesMessage(scoreLimitInput)
                    toast.success('Score limit updated')
                  }
                }}
                disabled={wsStatus !== 'connected' || scoreLimitInput < 1 || scoreLimitInput > 60}
                title={wsStatus !== 'connected' ? 'WebSocket disconnected' : ''}
              >
                Set Rules
              </Button>
            </div>
          )}
        </div>

        {/* Game Area - Poker-style Table UI */}
        {yourHand && (room?.status === 'playing' || room?.status === 'finished') && (
          <div className="space-y-6">
            {/* Game End Banner */}
            {gameEnd && (
              <div className="p-6 bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-magenta)] text-white rounded-lg shadow-lg text-center space-y-4">
                <h2 className="text-2xl font-heading font-bold text-glow-cyan">GAME OVER!</h2>
                <p className="text-xl">
                  Winner: <span className="font-bold text-[var(--neon-lime)]">{getPlayerDisplayName(gameEnd.winnerPlayerId)}</span>
                </p>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Final Scores:</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {Object.entries(gameEnd.totalScores).map(([playerId, score]) => (
                      <div key={playerId} className={cn(
                        "px-4 py-2 rounded-lg",
                        playerId === gameEnd.winnerPlayerId ? "bg-[var(--neon-lime)]/20 border border-[var(--neon-lime)]" : "bg-white/10"
                      )}>
                        <span className="font-medium">{getPlayerDisplayName(playerId)}</span>
                        <span className="ml-2 font-bold">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => navigate('/lobby')} variant="primary" className="mt-4">
                  Back to Lobby
                </Button>
              </div>
            )}

            {/* Round End Banner */}
            {roundEnd && !gameEnd && (
              <div className="p-4 bg-[var(--success)] text-white rounded-lg shadow-md text-center">
                <strong className="text-lg">Round ended. Winner: {getPlayerDisplayName(roundEnd.winnerPlayerId)}</strong>
              </div>
            )}

            {/* Action Error Banner */}
            {actionError && (
              <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg text-sm font-medium">
                {actionError}
              </div>
            )}

            {/* Main Game Layout: Table + Queue Panel */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center">
              {/* Table View + Your Hand (vertical stack) */}
              <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-6">
                {/* Table View */}
                <TableView
                  seatedPlayerIds={seatedPlayerIds}
                  handsCount={handsCount}
                  totalScores={totalScores}
                  scoreLimit={scoreLimit}
                  currentTurnPlayerId={currentTurnPlayerId}
                  eliminated={eliminated}
                  currentUserId={currentUserId}
                  lastPlay={lastPlay}
                  playerNames={playerNameMap}
                  playerAvatars={playerAvatarMap}
                />

                {/* Your Hand and Controls (directly below table) */}
                <UICard>
              <div className="space-y-3 sm:space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <h3 className="text-sm sm:text-lg font-heading font-bold text-cyan-300 text-glow-cyan">
                      Your Hand ({yourHand.length})
                      {selectedCards.length > 0 && (
                        <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-lime-400 text-glow-lime font-medium">
                          • {selectedCards.length}/5
                        </span>
                      )}
                    </h3>
                    {handOrder.length > 0 && (
                      <Button
                        onClick={() => setHandOrder([])}
                        variant="secondary"
                        size="sm"
                        title="Sort cards by rank and suit"
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Sort
                      </Button>
                    )}
                  </div>
                  {/* Hand container - overlapping cards on mobile */}
                  <div className={cn(
                    'flex justify-center',
                    isMobile
                      ? 'overflow-x-auto pb-2 -mx-2 px-2'
                      : 'flex-wrap gap-3'
                  )}>
                    {(() => {
                      // If user has custom order, use it; otherwise show sorted cards
                      if (handOrder.length > 0 && handOrder.length === yourHand.length) {
                        // User's custom arrangement
                        return handOrder.map((originalIdx) => yourHand[originalIdx]).filter(Boolean)
                      } else {
                        // Default sorted order
                        return sortCards(yourHand)
                      }
                    })().map((card, displayIndex) => {
                      const isSelected = selectedCards.some(
                        (c) => cardsEqual(c, card)
                      )
                      const originalIdx = yourHand.findIndex((c) => cardsEqual(c, card))

                      return (
                        <div
                          key={`${card.rank}-${card.suit}-${originalIdx}`}
                          draggable={!isMobile}
                          onDragStart={(e) => {
                            if (isMobile) return
                            e.dataTransfer.setData('cardIndex', String(originalIdx))
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => {
                            if (isMobile) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                          }}
                          onDrop={(e) => {
                            if (isMobile) return
                            e.preventDefault()
                            const draggedIndex = parseInt(e.dataTransfer.getData('cardIndex'), 10)
                            const dropIndex = originalIdx

                            if (draggedIndex === dropIndex) return

                            setHandOrder((prevOrder) => {
                              if (prevOrder.length === 0) {
                                // Initialize order array
                                return yourHand.map((_, idx) => idx)
                              }

                              const newOrder = [...prevOrder]
                              const draggedPos = newOrder.indexOf(draggedIndex)
                              const dropPos = newOrder.indexOf(dropIndex)

                              // Remove dragged item
                              newOrder.splice(draggedPos, 1)
                              // Insert at new position
                              newOrder.splice(dropPos, 0, draggedIndex)

                              return newOrder
                            })
                          }}
                          className={cn(
                            'transition-all duration-200 flex-shrink-0',
                            !isMobile && 'cursor-move hover:scale-110',
                            isMobile && displayIndex > 0 && '-ml-4',
                            isSelected && 'z-10 -translate-y-2 sm:-translate-y-3'
                          )}
                          style={isMobile && isSelected ? { marginLeft: displayIndex === 0 ? 0 : '-0.5rem' } : undefined}
                        >
                          <PlayingCard
                            card={card}
                            isSelected={isSelected}
                            onClick={() => handleCardClick(card)}
                            size={isMobile ? 'sm' : 'md'}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Play/Pass Buttons */}
                {!roundEnd && !gameEnd && (
                  <div className="flex gap-2 sm:gap-4 justify-center pt-1 sm:pt-2">
                    <Button
                      onClick={handlePlay}
                      variant="success"
                      size={isMobile ? 'sm' : 'md'}
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
                      className="text-xs sm:text-sm"
                    >
                      PLAY {selectedCards.length > 0 && `(${selectedCards.length})`}
                    </Button>
                    <Button
                      onClick={handlePass}
                      variant="warning"
                      size={isMobile ? 'sm' : 'md'}
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
                      className="text-xs sm:text-sm"
                    >
                      PASS
                    </Button>
                  </div>
                )}
              </div>
            </UICard>
              </div>

              {/* Queue Panel */}
              <div className="lg:w-80 flex-shrink-0">
                <QueuePanel
                  queuePlayerIds={queuePlayerIds}
                  seatedPlayerIds={seatedPlayerIds}
                  handsCount={handsCount}
                  totalScores={totalScores}
                  scoreLimit={scoreLimit}
                  currentTurnPlayerId={currentTurnPlayerId}
                  eliminated={eliminated}
                  playerNames={playerNameMap}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

