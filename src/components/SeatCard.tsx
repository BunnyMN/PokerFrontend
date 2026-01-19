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
  compact?: boolean
  turnTimeRemaining?: number | null // milliseconds remaining
  turnTotalTime?: number // total turn time in milliseconds (default 30000)
}

// KKPoker-style circular timer around avatar
const AvatarTimer = memo(function AvatarTimer({
  progress,
  size,
}: {
  progress: number // 0 to 1
  size: number // avatar size in pixels
}) {
  const strokeWidth = 4
  const padding = 4 // gap between avatar and timer ring
  const radius = (size / 2) + padding + (strokeWidth / 2)
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference
  const svgSize = radius * 2 + strokeWidth

  // Color based on time remaining - KKPoker style (green -> yellow -> red)
  const getColor = () => {
    if (progress <= 0.17) return '#ef4444' // red - less than ~5s
    if (progress <= 0.33) return '#f59e0b' // orange/yellow - less than ~10s
    return '#22c55e' // green
  }

  const color = getColor()

  return (
    <svg
      className="absolute pointer-events-none"
      width={svgSize}
      height={svgSize}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      {/* Background circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle - starts from top, goes clockwise */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
    </svg>
  )
})

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
  compact = false,
  turnTimeRemaining = null,
  turnTotalTime = 30000,
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
        compact ? 'w-20 sm:w-24 p-1.5 sm:p-2' : 'w-36 p-4',
        isCurrentTurn
          ? 'border-transparent'
          : 'border-cyan-500/30',
        isEliminated && 'opacity-50 border-pink-500/50 bg-pink-900/20',
        isYou && !isCurrentTurn && 'border-lime-400/40'
      )}
    >
      {/* Holographic avatar frame with KKPoker-style timer */}
      <div className={cn('relative', compact ? 'mb-1' : 'mb-3')}>
        {/* KKPoker-style circular timer around avatar */}
        {isCurrentTurn && turnTimeRemaining !== null && turnTimeRemaining > 0 && (
          <AvatarTimer
            progress={turnTimeRemaining / turnTotalTime}
            size={compact ? 32 : 64}
          />
        )}
        <div className={cn(
          'mx-auto rounded-full border-2 flex items-center justify-center overflow-hidden',
          'glass-lg',
          compact ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-16 h-16',
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
              'font-bold font-heading',
              compact ? 'text-sm sm:text-base' : 'text-2xl',
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
      <div className={cn('font-heading font-semibold', compact ? 'text-[10px] sm:text-xs mb-1' : 'text-sm mb-2')}>
        <div className={cn(
          'truncate',
          isCurrentTurn ? 'text-cyan-300 text-glow-cyan' : 'text-white',
          isEliminated && 'text-pink-400'
        )}>
          {compact ? displayName.substring(0, 6) : displayName}
        </div>
        {isYou && (
          <span className={cn('text-lime-400 text-glow-lime font-medium', compact ? 'text-[8px]' : 'ml-1 text-xs')}>{compact ? 'YOU' : '(YOU)'}</span>
        )}
      </div>

      {/* Stats */}
      <div className={cn('text-xs', compact ? 'space-y-0.5' : 'space-y-2')}>
        {compact ? (
          /* Compact stats - single line */
          <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px]">
            <span className="text-cyan-300 font-bold">{cardsLeft}</span>
            <span className="text-cyan-400/60">|</span>
            <span className={cn(
              'font-bold',
              scorePercentage >= 80 ? 'text-pink-400' : scorePercentage >= 50 ? 'text-yellow-400' : 'text-lime-400'
            )}>
              {totalScore}
            </span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Status badges */}
      {isCurrentTurn && (
        <Badge
          variant="warning"
          size="sm"
          className={cn(
            'absolute shadow-lg border-cyan-400 bg-cyan-900/50 text-cyan-300 font-heading',
            compact ? '-top-1 -right-1 text-[8px] px-1 py-0' : '-top-2 -right-2'
          )}
        >
          {compact ? '!' : 'TURN'}
        </Badge>
      )}
      {isEliminated && (
        <Badge
          variant="danger"
          size="sm"
          className={cn(
            'absolute shadow-lg border-pink-400 bg-pink-900/50 text-pink-300 font-heading',
            compact ? '-top-1 -left-1 text-[8px] px-1 py-0' : '-top-2 -left-2'
          )}
        >
          {compact ? 'X' : 'ELIM'}
        </Badge>
      )}
    </div>
  )
})
