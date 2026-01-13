import React from 'react'
import { SeatCard } from './SeatCard'
import { PlayingCard } from './PlayingCard'
import { cn } from '../utils/cn'
import type { Card } from '../types/cards'
import { normalizeCard } from '../types/cards'

interface TableViewProps {
  seatedPlayerIds: string[]
  handsCount: Record<string, number>
  totalScores: Record<string, number>
  scoreLimit: number
  currentTurnPlayerId: string | null
  eliminated: string[]
  currentUserId: string | null
  lastPlay: {playerId: string, cards: any[], kind?: string, fiveKind?: string} | null
  renderCard: (card: any) => string
}

export function TableView({
  seatedPlayerIds,
  handsCount,
  totalScores,
  scoreLimit,
  currentTurnPlayerId,
  eliminated,
  currentUserId,
  lastPlay,
  renderCard,
}: TableViewProps) {
  const numSeats = seatedPlayerIds.length
  if (numSeats === 0) return null

  // Calculate positions for seats around a circular table
  const centerX = 250
  const centerY = 250
  const radius = 200

  const getSeatPosition = (index: number, total: number) => {
    // Start from top (270 degrees) and distribute evenly
    const angle = (270 + (index * 360) / total) * (Math.PI / 180)
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    return { x, y, angle: angle * (180 / Math.PI) }
  }

  return (
    <div className="flex justify-center items-center p-6 min-h-[600px] relative">
      <div className="relative w-[500px] h-[500px]">
        {/* Futuristic Poker Table - Circular with glowing edge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full">
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 glass-lg rounded-xl border border-cyan-400/50 p-4 min-w-[200px] text-center shadow-glow-cyan">
            <div className="text-xs text-cyan-400/80 mb-2 font-heading uppercase tracking-wider">Last Play</div>
            <div className="text-sm font-bold text-cyan-300 mb-3 font-heading text-glow-cyan">
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
                  return `${kind} (${lastPlay.fiveKind})`
                }
                return kind
              })()}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {lastPlay.cards.map((card, idx) => {
                const normalizedCard = normalizeCard(card)
                return (
                  <PlayingCard
                    key={idx}
                    card={normalizedCard}
                    size="sm"
                    className="pointer-events-none"
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Seats positioned around table */}
        {seatedPlayerIds.map((playerId, index) => {
          const position = getSeatPosition(index, numSeats)
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
                cardsLeft={handsCount[playerId] || 0}
                totalScore={totalScores[playerId] || 0}
                scoreLimit={scoreLimit}
                isCurrentTurn={playerId === currentTurnPlayerId}
                isEliminated={eliminated.includes(playerId)}
                isYou={playerId === currentUserId}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
