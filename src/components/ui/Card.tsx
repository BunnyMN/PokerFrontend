import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  footer?: ReactNode
}

export function Card({ className, header, footer, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'glass rounded-xl border border-white/10',
        'hover:border-cyan-400/30 hover:bg-white/5 transition-all duration-200',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-white/10">
          {header}
        </div>
      )}
      <div className={cn(header || footer ? 'px-6 py-4' : 'p-6')}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  )
}

// Re-export CardHeader components for convenience
export { CardHeader, CardTitle, CardDescription, CardContent } from './CardHeader'
