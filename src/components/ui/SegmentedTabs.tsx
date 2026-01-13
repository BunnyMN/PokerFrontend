import { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface SegmentedTabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}

export function SegmentedTabs({
  value,
  onValueChange,
  options,
  disabled,
  className,
  ...props
}: SegmentedTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 p-1 glass rounded-full border border-white/10',
        className
      )}
      role="tablist"
      {...props}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${option.value}`}
            onClick={() => !disabled && onValueChange(option.value)}
            disabled={disabled}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-full text-sm font-heading font-semibold transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2',
              isActive
                ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 shadow-neon-cyan'
                : 'text-cyan-400/70 hover:text-cyan-300 hover:bg-white/5',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
