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

// Premium card colors with better contrast
const suitColors: Record<string, string> = {
  S: 'text-gray-900', // Spades - Deep Black
  H: 'text-red-600', // Hearts - Rich Red
  C: 'text-gray-900', // Clubs - Deep Black
  D: 'text-red-600', // Diamonds - Rich Red
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
    xs: 'w-9 h-12.5',
    sm: 'w-14 h-19',
    md: 'w-18 h-25',
    lg: 'w-22 h-31',
  }
  
  const rankSizes = {
    xs: 'text-[0.6rem] leading-none',
    sm: 'text-[0.75rem] leading-none',
    md: 'text-sm leading-none',
    lg: 'text-base leading-none',
  }
  
  const suitSizes = {
    xs: 'text-[0.7rem] leading-none',
    sm: 'text-[0.85rem] leading-none',
    md: 'text-base leading-none',
    lg: 'text-lg leading-none',
  }
  
  const centerSuitSizes = {
    xs: 'text-xl',
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }

  const suitSymbol = suitToSymbol(card.suit)
  const suitColor = suitColors[card.suit] || 'text-gray-900'

  if (isBack) {
    return (
      <div
        className={cn(
          'relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-lg border-2 border-slate-600 cursor-pointer transition-all duration-300',
          'hover:scale-105 hover:shadow-2xl hover:border-slate-500',
          'shadow-lg',
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      >
        {/* Premium card back pattern */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          {/* Diagonal pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px),
                repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px)
              `,
            }} 
          />
        </div>
        
        {/* Card back center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-12 rounded-md border-2 border-white/30 bg-white/5 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <div className="text-white text-xl font-bold drop-shadow-lg">♠</div>
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-300',
        'hover:scale-105 hover:-translate-y-1 hover:shadow-2xl',
        'shadow-lg',
        isSelected
          ? 'scale-110 -translate-y-2 border-cyan-400 shadow-2xl ring-4 ring-cyan-400/30 border-2'
          : 'border-gray-200 hover:border-gray-300',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Card background with subtle texture */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white via-white to-gray-50" />
      
      {/* Card content */}
      <div className="relative h-full p-1.5 flex flex-col justify-between overflow-hidden">
        {/* Top left corner */}
        <div className={cn('flex flex-col items-start', suitColor)}>
          <div className={cn('font-black tracking-tight', rankSizes[size])}>
            {card.rank}
          </div>
          <div className={cn('font-bold -mt-0.5', suitSizes[size])}>
            {suitSymbol}
          </div>
        </div>

        {/* Center suit symbol */}
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          suitColor,
          centerSuitSizes[size]
        )}>
          <div className="font-normal drop-shadow-sm">{suitSymbol}</div>
        </div>

        {/* Bottom right corner (rotated) */}
        <div className={cn(
          'flex flex-col items-end rotate-180 self-end',
          suitColor
        )}>
          <div className={cn('font-black tracking-tight', rankSizes[size])}>
            {card.rank}
          </div>
          <div className={cn('font-bold -mt-0.5', suitSizes[size])}>
            {suitSymbol}
          </div>
        </div>
      </div>

      {/* Premium corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gray-100 rounded-tl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gray-100 rounded-br-lg" />

      {/* Selected state glow */}
      {isSelected && (
        <div className="absolute -inset-1 rounded-lg bg-cyan-400/20 blur-sm -z-10 animate-pulse" />
      )}
    </div>
  )
}
