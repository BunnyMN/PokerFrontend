import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-heading font-semibold transition-all duration-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg focus-visible:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden'
    
    const variants = {
      primary: 'glass border-2 border-cyan-400/60 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200 hover:shadow-glow-cyan active:scale-95',
      secondary: 'glass border-2 border-cyan-500/40 text-white hover:border-cyan-400/60 hover:shadow-neon-cyan active:scale-95',
      ghost: 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 border border-transparent hover:border-cyan-400/30 active:scale-95',
      danger: 'glass border-2 border-pink-500/60 text-pink-300 hover:border-pink-400 hover:text-pink-200 hover:shadow-glow-magenta active:scale-95',
      success: 'glass border-2 border-lime-400/60 text-lime-300 hover:border-lime-400 hover:text-lime-200 hover:shadow-glow-lime active:scale-95',
      warning: 'glass border-2 border-purple-400/60 text-purple-300 hover:border-purple-400 hover:text-purple-200 hover:shadow-glow-purple active:scale-95',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12',
    }
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Holographic shine effect */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transform -skew-x-12 animate-scanline" />
        </div>
        
        <span className="relative z-10">
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : (
            children
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
