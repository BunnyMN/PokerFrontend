import { memo } from 'react'
import { cn } from '../utils/cn'
import type { Card } from '../types/cards'
import { suitToSymbol } from '../types/cards'

interface PlayingCardProps {
  card: Card
  isSelected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  isBack?: boolean
}

// Classic card colors: Red for Hearts/Diamonds, Black for Spades/Clubs
const suitColors: Record<string, string> = {
  S: 'text-black', // Spades - Black
  H: 'text-red-600', // Hearts - Red
  C: 'text-black', // Clubs - Black
  D: 'text-red-600', // Diamonds - Red
}

export const PlayingCard = memo(function PlayingCard({
  card,
  isSelected = false,
  onClick,
  size = 'md',
  className,
  isBack = false,
}: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-20 h-32 text-base',
  }

  const suitSymbol = suitToSymbol(card.suit)
  const suitColor = suitColors[card.suit] || 'text-black'

  if (isBack) {
    return (
      <div
        className={cn(
          'relative bg-white rounded-lg border-2 border-gray-300 cursor-pointer transition-all duration-300',
          'hover:scale-110 hover:border-gray-400',
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      >
        {/* Simple pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)
            `,
          }} />
        </div>
        
        {/* Simple logo in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-black text-2xl font-bold">
            ♠
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative bg-white rounded-lg border-2 border-gray-300 transition-all duration-300 cursor-pointer',
        'hover:scale-110 hover:-translate-y-2 hover:border-gray-400 hover:shadow-xl',
        isSelected
          ? 'scale-110 -translate-y-2 border-blue-500 ring-2 ring-blue-400/50 shadow-xl'
          : 'hover:border-gray-400',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Card content */}
      <div className="absolute inset-0 p-2 flex flex-col justify-between">
        {/* Top left: Rank and Suit */}
        <div className={cn('font-bold', suitColor)}>
          <div className="leading-tight">{card.rank}</div>
       
        </div>

        {/* Center: Large suit symbol - 50% smaller */}
        <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl', suitColor)}>
          {suitSymbol}
        </div>

        {/* Bottom right: Rank and Suit (rotated) */}
        <div className={cn('font-bold self-end rotate-180', suitColor)}>
          <div className="leading-tight">{card.rank}</div>
         
        </div>
      </div>
    </div>
  )
})
