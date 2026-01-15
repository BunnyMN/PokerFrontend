'use client'

import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-heading font-semibold text-cyan-400/80 mb-2 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-12 px-4 glass border rounded-lg',
            'text-cyan-100 placeholder:text-cyan-400/50',
            'focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60',
            'focus:shadow-neon-cyan transition-all duration-300',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-pink-500/60 focus:ring-pink-400/50 focus:border-pink-400/60'
              : 'border-cyan-400/30 hover:border-cyan-400/50',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-cyan-400/70">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-pink-400 text-glow-magenta">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
