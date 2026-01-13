import { cn } from '../utils/cn'
import type { Card } from '../types/cards'
import { suitToSymbol } from '../types/cards'

interface PlayingCardProps {
  card: Card
  isSelected?: boolean
  onClick?: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  isBack?: boolean
}

// Classic card colors: Black for Spades/Clubs, Red for Hearts/Diamonds
const suitColors: Record<string, string> = {
  S: 'text-black', // Spades - Black
  H: 'text-red-600', // Hearts - Red
  C: 'text-black', // Clubs - Black
  D: 'text-red-600', // Diamonds - Red
}

export function PlayingCard({
  card,
  isSelected = false,
  onClick,
  size = 'md',
  className,
  isBack = false,
}: PlayingCardProps) {
  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-32',
  }
  
  const rankSizes = {
    xs: 'text-[0.5rem]',
    sm: 'text-[0.65rem]',
    md: 'text-xs',
    lg: 'text-sm',
  }
  
  const suitSizes = {
    xs: 'text-[0.6rem]',
    sm: 'text-[0.75rem]',
    md: 'text-sm',
    lg: 'text-base',
  }
  
  const centerSuitSizes = {
    xs: 'text-lg',
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const suitSymbol = suitToSymbol(card.suit)
  const suitColor = suitColors[card.suit] || 'text-black'

  if (isBack) {
    return (
      <div
        className={cn(
          'relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-md border-2 border-blue-900 cursor-pointer transition-all duration-200',
          'hover:scale-105 hover:shadow-lg',
          'shadow-md',
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      >
        {/* Classic card back pattern */}
        <div className="absolute inset-0 rounded-md overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255, 255, 255, 0.1) 8px, rgba(255, 255, 255, 0.1) 16px),
              repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255, 255, 255, 0.1) 8px, rgba(255, 255, 255, 0.1) 16px)
            `,
          }} />
        </div>
        
        {/* Card back center design */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-10 rounded border-2 border-white/40 bg-white/10 flex items-center justify-center">
            <div className="text-white text-lg font-bold">♠</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative bg-white rounded-md border-2 border-gray-300 cursor-pointer transition-all duration-200',
        'hover:scale-105 hover:-translate-y-1 hover:shadow-xl',
        'shadow-md',
        isSelected
          ? 'scale-110 -translate-y-2 border-blue-500 shadow-xl ring-2 ring-blue-400/50'
          : 'hover:border-gray-400',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Card content - with overflow hidden to keep everything inside */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="h-full p-1 flex flex-col justify-between">
          {/* Top left: Rank and Suit */}
          <div className={cn('font-bold leading-tight', suitColor, rankSizes[size])}>
            <div className="font-extrabold">{card.rank}</div>
            <div className={cn('leading-none -mt-0.5', suitSizes[size])}>{suitSymbol}</div>
          </div>

          {/* Center: Large suit symbol */}
          <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', suitColor, centerSuitSizes[size])}>
            <div className="font-normal">{suitSymbol}</div>
          </div>

          {/* Bottom right: Rank and Suit (rotated) */}
          <div className={cn('font-bold self-end rotate-180 leading-tight', suitColor, rankSizes[size])}>
            <div className="font-extrabold">{card.rank}</div>
            <div className={cn('leading-none -mt-0.5', suitSizes[size])}>{suitSymbol}</div>
          </div>
        </div>
      </div>

      {/* Subtle corner decoration */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-gray-200 rounded-tl-md" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-gray-200 rounded-br-md" />
    </div>
  )
}
