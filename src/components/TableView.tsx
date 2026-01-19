'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import { SeatCard } from './SeatCard'
import { PlayingCard } from './PlayingCard'
import { normalizeCard, type Card } from '../types/cards'

interface TableViewProps {
  seatedPlayerIds: string[]
  handsCount: Record<string, number>
  totalScores: Record<string, number>
  scoreLimit: number
  currentTurnPlayerId: string | null
  eliminated: string[]
  disconnectedPlayerIds?: string[]
  currentUserId: string | null
  lastPlay: {playerId: string, cards: Card[], kind?: string, fiveKind?: string} | null
  playerNames?: Record<string, string>
  playerAvatars?: Record<string, string | null>
  turnTimeRemaining?: number | null
}

// Hook to get responsive table dimensions
function useResponsiveTable() {
  const [dimensions, setDimensions] = useState({
    containerSize: 500,
    tableSize: 400,
    radius: 200,
    isMobile: false,
    cardSize: 'sm' as 'xs' | 'sm'
  })

  useEffect(() => {
    function updateDimensions() {
      const width = window.innerWidth
      if (width < 480) {
        setDimensions({
          containerSize: 280,
          tableSize: 220,
          radius: 110,
          isMobile: true,
          cardSize: 'xs'
        })
      } else if (width < 768) {
        setDimensions({
          containerSize: 380,
          tableSize: 300,
          radius: 150,
          isMobile: true,
          cardSize: 'xs'
        })
      } else {
        setDimensions({
          containerSize: 500,
          tableSize: 400,
          radius: 200,
          isMobile: false,
          cardSize: 'sm'
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  return dimensions
}

export const TableView = memo(function TableView({
  seatedPlayerIds,
  handsCount,
  totalScores,
  scoreLimit,
  currentTurnPlayerId,
  eliminated,
  disconnectedPlayerIds = [],
  currentUserId,
  lastPlay,
  playerNames,
  playerAvatars,
  turnTimeRemaining,
}: TableViewProps) {
  const { containerSize, tableSize, radius, isMobile, cardSize } = useResponsiveTable()

  // Calculate positions for seats around a circular table
  const centerX = containerSize / 2
  const centerY = containerSize / 2
  const numSeats = seatedPlayerIds.length

  // Memoize seat positions calculation - must be called before any early returns
  const seatPositions = useMemo(() => {
    if (numSeats === 0) return []
    return seatedPlayerIds.map((_, index) => {
      const angle = (270 + (index * 360) / numSeats) * (Math.PI / 180)
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      return { x, y, angle: angle * (180 / Math.PI) }
    })
  }, [seatedPlayerIds, numSeats, centerX, centerY, radius])

  if (numSeats === 0) return null

  const getSeatPosition = (index: number) => seatPositions[index]

  return (
    <div className="flex justify-center items-center p-2 sm:p-4 md:p-6 min-h-[350px] sm:min-h-[450px] md:min-h-[600px] relative">
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        {/* Futuristic Poker Table - Circular with glowing edge */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: tableSize, height: tableSize }}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-900/20 via-cyan-900/20 to-pink-900/20 animate-pulse-glow" />
          
          {/* Table felt - deep gradient */}
          <div 
            className="absolute inset-2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(157, 0, 255, 0.3) 0%, rgba(10, 0, 21, 0.9) 50%, #0a0015 100%)',
              border: '2px solid rgba(0, 246, 255, 0.3)',
            }}
          >
            {/* Inner cyan rim light */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(0,246,255,0.3)]" />
            
            {/* Subtle circuit pattern overlay */}
            <div 
              className="absolute inset-0 rounded-full opacity-10"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0, 246, 255, 0.1) 20px, rgba(0, 246, 255, 0.1) 21px),
                  repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0, 246, 255, 0.1) 20px, rgba(0, 246, 255, 0.1) 21px)
                `,
              }}
            />
          </div>
          
          {/* Glowing edge */}
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400/60 shadow-[0_0_30px_rgba(0,246,255,0.5),inset_0_0_30px_rgba(0,246,255,0.2)] animate-glow-pulse" />
        </div>
        
        {/* Center Pot Display - Floating glass */}
        {lastPlay && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 glass-lg rounded-xl border border-cyan-400/50 p-2 sm:p-4 min-w-[120px] sm:min-w-[200px] text-center shadow-glow-cyan">
            <div className="text-[10px] sm:text-xs text-cyan-400/80 mb-1 sm:mb-2 font-heading uppercase tracking-wider">Last Play</div>
            <div className="text-xs sm:text-sm font-bold text-cyan-300 mb-2 sm:mb-3 font-heading text-glow-cyan">
              {(() => {
                const cardCount = lastPlay.cards.length
                let kind = lastPlay.kind
                if (!kind) {
                  kind = cardCount === 1 ? 'SINGLE'
                    : cardCount === 2 ? 'PAIR'
                    : cardCount === 3 ? 'SET'
                    : cardCount === 5 ? 'FIVE'
                    : 'PLAY'
                }
                if (kind === 'FIVE' && lastPlay.fiveKind) {
                  return isMobile ? lastPlay.fiveKind : `${kind} (${lastPlay.fiveKind})`
                }
                return kind
              })()}
            </div>
            <div className={`flex justify-center ${isMobile ? 'gap-0' : 'gap-2 flex-wrap'}`}>
              {lastPlay.cards.map((card, idx) => {
                const normalizedCard = normalizeCard(card)
                return (
                  <div
                    key={idx}
                    style={isMobile ? { marginLeft: idx === 0 ? 0 : '-0.5rem' } : undefined}
                  >
                    <PlayingCard
                      card={normalizedCard}
                      size={cardSize}
                      className="pointer-events-none"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Seats positioned around table */}
        {seatedPlayerIds.map((playerId, index) => {
          const position = getSeatPosition(index)
          return (
            <div
              key={playerId}
              className="absolute z-10"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SeatCard
                playerId={playerId}
                playerName={playerNames?.[playerId]}
                playerAvatar={playerAvatars?.[playerId] || null}
                cardsLeft={handsCount[playerId] || 0}
                totalScore={totalScores[playerId] || 0}
                scoreLimit={scoreLimit}
                isCurrentTurn={playerId === currentTurnPlayerId}
                isEliminated={eliminated.includes(playerId)}
                isDisconnected={disconnectedPlayerIds.includes(playerId)}
                isYou={playerId === currentUserId}
                compact={isMobile}
                turnTimeRemaining={playerId === currentTurnPlayerId ? turnTimeRemaining : null}
                turnTotalTime={30000}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})
