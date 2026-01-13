import React from 'react'
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

const suitColors: Record<string, string> = {
  S: 'text-cyan-400', // Spades - Cyan
  H: 'text-pink-500', // Hearts - Magenta
  C: 'text-purple-400', // Clubs - Purple
  D: 'text-lime-400', // Diamonds - Lime
}

const suitGlows: Record<string, string> = {
  S: 'shadow-neon-cyan',
  H: 'shadow-neon-magenta',
  C: 'shadow-neon-purple',
  D: 'shadow-neon-lime',
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
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-20 h-32 text-base',
  }

  const suitSymbol = suitToSymbol(card.suit)
  const suitColor = suitColors[card.suit] || 'text-white'
  const suitGlow = suitGlows[card.suit] || ''

  if (isBack) {
    return (
      <div
        className={cn(
          'relative glass rounded-lg border border-cyan-500/30 cursor-pointer transition-all duration-300',
          'hover:scale-110 hover:shadow-glow-cyan',
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      >
        {/* Circuit pattern background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 246, 255, 0.1) 2px, rgba(0, 246, 255, 0.1) 4px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0, 246, 255, 0.1) 2px, rgba(0, 246, 255, 0.1) 4px)
            `,
          }} />
        </div>
        
        {/* Pulsing logo/icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/50 animate-pulse-glow">
            <div className="w-full h-full flex items-center justify-center text-cyan-400 text-lg font-bold">
              ⚡
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative glass rounded-lg border transition-all duration-300 cursor-pointer',
        'hover:scale-110 hover:-translate-y-2 hover:rotate-1',
        'holographic',
        isSelected
          ? 'scale-110 -translate-y-2 border-cyan-400 shadow-glow-cyan ring-2 ring-cyan-400/50'
          : `border-cyan-500/30 ${suitGlow} hover:border-cyan-400/50`,
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* Card content */}
      <div className="absolute inset-0 p-2 flex flex-col justify-between">
        {/* Top left: Rank and Suit */}
        <div className={cn('font-bold', suitColor)}>
          <div className="leading-tight">{card.rank}</div>
          <div className="text-lg leading-none">{suitSymbol}</div>
        </div>

        {/* Center: Large suit symbol */}
        <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl', suitColor)}>
          {suitSymbol}
        </div>

        {/* Bottom right: Rank and Suit (rotated) */}
        <div className={cn('font-bold self-end rotate-180', suitColor)}>
          <div className="leading-tight">{card.rank}</div>
          <div className="text-lg leading-none">{suitSymbol}</div>
        </div>
      </div>

      {/* Neon glow effect on hover */}
      <div className={cn(
        'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300',
        'hover:opacity-100',
        suitGlow
      )} />
    </div>
  )
}
