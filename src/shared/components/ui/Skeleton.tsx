import { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }
  
  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--surface)]',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
