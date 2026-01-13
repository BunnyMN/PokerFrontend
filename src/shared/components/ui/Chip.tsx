import { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean
  variant?: 'default' | 'active'
}

export function Chip({ className, active, variant, children, ...props }: ChipProps) {
  return (
    <button
      className={cn(
        'px-3 py-1.5 text-xs font-heading font-semibold rounded-md transition-all duration-200',
        'border border-white/10 hover:border-cyan-400/40 hover:bg-white/5',
        active || variant === 'active'
          ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-300'
          : 'bg-transparent text-cyan-400/70',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
