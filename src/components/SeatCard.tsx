import React from 'react'

interface SeatCardProps {
  playerId: string
  cardsLeft: number
  totalScore: number
  scoreLimit: number
  isCurrentTurn: boolean
  isEliminated: boolean
  isYou: boolean
}

export function SeatCard({
  playerId,
  cardsLeft,
  totalScore,
  scoreLimit,
  isCurrentTurn,
  isEliminated,
  isYou,
}: SeatCardProps) {
  const shortId = playerId.length > 6 ? playerId.substring(0, 6) + '...' : playerId

  return (
    <div
      style={{
        ...seatCardStyles.card,
        ...(isCurrentTurn ? seatCardStyles.cardTurn : {}),
        ...(isEliminated ? seatCardStyles.cardEliminated : {}),
      }}
    >
      <div style={seatCardStyles.playerName}>
        {shortId}
        {isYou && <span style={seatCardStyles.youBadge}> (You)</span>}
      </div>
      <div style={seatCardStyles.info}>
        <div style={seatCardStyles.cardsCount}>{cardsLeft} cards</div>
        <div style={seatCardStyles.score}>
          {totalScore} / {scoreLimit}
        </div>
      </div>
      {isCurrentTurn && (
        <div style={seatCardStyles.turnBadge}>TURN</div>
      )}
      {isEliminated && (
        <div style={seatCardStyles.elimBadge}>ELIM</div>
      )}
    </div>
  )
}

const seatCardStyles: Record<string, React.CSSProperties> = {
  card: {
    position: 'absolute',
    width: '120px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px solid #ddd',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    zIndex: 10,
  },
  cardTurn: {
    borderColor: '#ffc107',
    backgroundColor: '#fff3cd',
    boxShadow: '0 4px 12px rgba(255, 193, 7, 0.4)',
  },
  cardEliminated: {
    opacity: 0.6,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  playerName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  youBadge: {
    fontSize: '12px',
    color: '#007bff',
    fontWeight: '500',
  },
  info: {
    fontSize: '12px',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardsCount: {
    fontWeight: '500',
  },
  score: {
    fontSize: '11px',
  },
  turnBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#ffc107',
    color: '#333',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  elimBadge: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    backgroundColor: '#dc3545',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
}
