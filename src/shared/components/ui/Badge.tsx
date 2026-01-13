import { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    default: 'glass border border-cyan-400/40 text-cyan-300',
    primary: 'bg-cyan-900/50 border border-cyan-400/60 text-cyan-300 shadow-neon-cyan',
    success: 'bg-lime-900/50 border border-lime-400/60 text-lime-300 shadow-neon-lime',
    danger: 'bg-pink-900/50 border border-pink-400/60 text-pink-300 shadow-neon-magenta',
    warning: 'bg-purple-900/50 border border-purple-400/60 text-purple-300 shadow-neon-purple',
    info: 'bg-cyan-900/50 border border-cyan-400/60 text-cyan-300 shadow-neon-cyan',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-heading',
    md: 'px-2.5 py-1 text-sm font-heading',
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-md backdrop-blur-sm',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
