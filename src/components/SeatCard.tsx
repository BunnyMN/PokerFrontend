import { memo } from 'react'
import { Badge } from './ui/Badge'
import { cn } from '../utils/cn'

interface SeatCardProps {
  playerId: string
  playerName?: string
  playerAvatar?: string | null
  cardsLeft: number
  totalScore: number
  scoreLimit: number
  isCurrentTurn: boolean
  isEliminated: boolean
  isYou: boolean
}

export const SeatCard = memo(function SeatCard({
  playerId,
  playerName,
  playerAvatar,
  cardsLeft,
  totalScore,
  scoreLimit,
  isCurrentTurn,
  isEliminated,
  isYou,
}: SeatCardProps) {
  const shortId = playerId.length > 8 ? playerId.substring(0, 8) + '...' : playerId
  const displayName = playerName || shortId
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'
  const scorePercentage = (totalScore / scoreLimit) * 100

  return (
    <div
      className={cn(
        'relative glass rounded-xl border-2 text-center transition-all duration-300',
        'hover:scale-105 hover:shadow-glow-cyan',
        'w-36 p-4',
        isCurrentTurn
          ? 'border-cyan-400 shadow-glow-cyan ring-2 ring-cyan-400/50 animate-pulse-glow'
          : 'border-cyan-500/30',
        isEliminated && 'opacity-50 border-pink-500/50 bg-pink-900/20',
        isYou && !isCurrentTurn && 'border-lime-400/40'
      )}
    >
      {/* Holographic avatar frame */}
      <div className="relative mb-3">
        <div className={cn(
          'w-16 h-16 mx-auto rounded-full border-2 flex items-center justify-center overflow-hidden',
          'glass-lg',
          isCurrentTurn 
            ? 'border-cyan-400 shadow-glow-cyan' 
            : isYou 
            ? 'border-lime-400/60 shadow-neon-lime'
            : 'border-cyan-500/40',
          isEliminated && 'border-pink-500/50'
        )}>
          {playerAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={playerAvatar}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center ${isCurrentTurn ? 'text-cyan-300 text-glow-cyan' : 'text-cyan-400'} ${isEliminated ? 'text-pink-400' : ''} text-2xl font-bold font-heading">${initial}</div>`
                }
              }}
            />
          ) : (
            /* Avatar placeholder - first letter of display name */
            <div className={cn(
              'text-2xl font-bold font-heading',
              isCurrentTurn ? 'text-cyan-300 text-glow-cyan' : 'text-cyan-400',
              isEliminated && 'text-pink-400'
            )}>
              {initial}
            </div>
          )}
          
          {/* Pulsing ring for current turn */}
          {isCurrentTurn && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
          )}
        </div>
      </div>

      {/* Player name */}
      <div className="font-heading font-semibold text-sm mb-2">
        <div className={cn(
          'truncate',
          isCurrentTurn ? 'text-cyan-300 text-glow-cyan' : 'text-white',
          isEliminated && 'text-pink-400'
        )}>
          {displayName}
        </div>
        {isYou && (
          <span className="ml-1 text-xs text-lime-400 text-glow-lime font-medium">(YOU)</span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-cyan-400/80">Cards:</span>
          <span className="font-bold text-cyan-300">{cardsLeft}</span>
        </div>
        
        {/* Score progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-400/80">Score:</span>
            <span className={cn(
              'font-bold',
              scorePercentage >= 80 ? 'text-pink-400' : scorePercentage >= 50 ? 'text-yellow-400' : 'text-lime-400'
            )}>
              {totalScore} / {scoreLimit}
            </span>
          </div>
          <div className="h-1.5 bg-cyan-900/30 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                scorePercentage >= 80 ? 'bg-gradient-to-r from-pink-500 to-pink-600 shadow-neon-magenta' :
                scorePercentage >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                'bg-gradient-to-r from-lime-400 to-lime-500 shadow-neon-lime'
              )}
              style={{ width: `${Math.min(scorePercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status badges */}
      {isCurrentTurn && (
        <Badge
          variant="warning"
          size="sm"
          className="absolute -top-2 -right-2 shadow-lg border-cyan-400 bg-cyan-900/50 text-cyan-300 font-heading"
        >
          TURN
        </Badge>
      )}
      {isEliminated && (
        <Badge
          variant="danger"
          size="sm"
          className="absolute -top-2 -left-2 shadow-lg border-pink-400 bg-pink-900/50 text-pink-300 font-heading"
        >
          ELIM
        </Badge>
      )}
    </div>
  )
})
