import React from 'react'
import { SeatCard } from './SeatCard'

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

  // Calculate positions for seats around an oval table
  // For 1-4 players, distribute evenly around a circle
  const centerX = 200 // Center of table
  const centerY = 200
  const radiusX = 180 // Horizontal radius of oval
  const radiusY = 140 // Vertical radius of oval

  const getSeatPosition = (index: number, total: number) => {
    // Start from top (270 degrees) and go clockwise
    const angle = (270 + (index * 360) / total) * (Math.PI / 180)
    const x = centerX + radiusX * Math.cos(angle)
    const y = centerY + radiusY * Math.sin(angle)
    return { x, y }
  }

  return (
    <div style={tableViewStyles.container}>
      <div style={tableViewStyles.tableArea}>
        {/* Oval table */}
        <div style={tableViewStyles.table} />
        
        {/* Last play display in center */}
        {lastPlay && (
          <div style={tableViewStyles.lastPlay}>
            <div style={tableViewStyles.lastPlayLabel}>Last Play:</div>
            <div style={tableViewStyles.lastPlayKind}>
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
                  return `FIVE (${lastPlay.fiveKind})`
                }
                return kind
              })()}
            </div>
            <div style={tableViewStyles.lastPlayCards}>
              {lastPlay.cards.map((card, idx) => (
                <span key={idx} style={tableViewStyles.lastPlayCard}>
                  {renderCard(card)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Seats */}
        {seatedPlayerIds.map((playerId, index) => {
          const position = getSeatPosition(index, numSeats)
          return (
            <div
              key={playerId}
              style={{
                ...tableViewStyles.seatWrapper,
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

const tableViewStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    minHeight: '500px',
  },
  tableArea: {
    position: 'relative',
    width: '400px',
    height: '400px',
  },
  table: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '360px',
    height: '280px',
    backgroundColor: '#0d6e0d',
    borderRadius: '50%',
    border: '8px solid #8b4513',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  seatWrapper: {
    position: 'absolute',
  },
  lastPlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #007bff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    minWidth: '150px',
    zIndex: 5,
  },
  lastPlayLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '4px',
  },
  lastPlayKind: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '6px',
  },
  lastPlayCards: {
    fontSize: '16px',
    fontFamily: 'monospace',
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  lastPlayCard: {
    display: 'inline-block',
  },
}
