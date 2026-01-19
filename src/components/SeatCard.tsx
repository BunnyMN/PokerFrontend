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

// Rounded rectangle progress component for turn timer around the card
const CardTimerProgress = memo(function CardTimerProgress({
  progress,
  compact,
}: {
  progress: number // 0 to 1
  compact: boolean
}) {
  const strokeWidth = compact ? 3 : 4
  const borderRadius = 12
  // Use viewBox coordinates - actual size will be 100% of parent
  const width = 100
  const height = 100

  // Calculate the perimeter of a rounded rectangle
  const straightWidth = width - 2 * borderRadius
  const straightHeight = height - 2 * borderRadius
  const cornerLength = (Math.PI * borderRadius) / 2
  const perimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerLength
  const offset = perimeter - progress * perimeter

  // Color based on time remaining
  const getColor = () => {
    if (progress <= 0.17) return '#ef4444' // red - less than ~5s
    if (progress <= 0.33) return '#eab308' // yellow - less than ~10s
    return '#00f6ff' // cyan
  }

  const color = getColor()

  // Create rounded rectangle path starting from top center, going clockwise
  const halfWidth = width / 2
  const inset = strokeWidth / 2
  const path = `
    M ${halfWidth} ${inset}
    L ${width - borderRadius} ${inset}
    A ${borderRadius - inset} ${borderRadius - inset} 0 0 1 ${width - inset} ${borderRadius}
    L ${width - inset} ${height - borderRadius}
    A ${borderRadius - inset} ${borderRadius - inset} 0 0 1 ${width - borderRadius} ${height - inset}
    L ${borderRadius} ${height - inset}
    A ${borderRadius - inset} ${borderRadius - inset} 0 0 1 ${inset} ${height - borderRadius}
    L ${inset} ${borderRadius}
    A ${borderRadius - inset} ${borderRadius - inset} 0 0 1 ${borderRadius} ${inset}
    Z
  `

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ zIndex: 50 }}
    >
      {/* Background path */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0, 246, 255, 0.15)"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {/* Progress path */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={perimeter}
        strokeDashoffset={offset}
        vectorEffect="non-scaling-stroke"
        style={{
          filter: `drop-shadow(0 0 ${compact ? '4px' : '8px'} ${color})`,
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
      {/* Card timer progress - wraps around the entire card */}
      {isCurrentTurn && turnTimeRemaining !== null && turnTimeRemaining > 0 && (
        <CardTimerProgress
          progress={turnTimeRemaining / turnTotalTime}
          compact={compact}
        />
      )}

      {/* Holographic avatar frame */}
      <div className={cn('relative', compact ? 'mb-1' : 'mb-3')}>
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
