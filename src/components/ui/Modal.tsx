'use client'

import { useEffect, useRef, useState, ReactNode, HTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  variant?: 'default' | 'glass'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  variant = 'glass',
  className,
  ...props
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Focus trap and restore focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      setIsAnimating(true)
      // Focus the modal after a brief delay to allow animation
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
    } else {
      setIsAnimating(false)
      // Restore focus when modal closes
      previousActiveElement.current?.focus()
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen && !isAnimating) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4',
        'transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-sm transition-opacity duration-300',
          variant === 'glass'
            ? 'bg-[var(--bg-overlay)]'
            : 'bg-black/60'
        )}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative z-[var(--z-modal)] w-full',
          sizes[size],
          'transform transition-all duration-300 ease-out',
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <div
          className={cn(
            'relative rounded-[20px] border',
            'max-h-[90vh] flex flex-col',
            'overflow-hidden',
            variant === 'glass'
              ? cn(
                  'backdrop-blur-xl',
                  'bg-[var(--auth-card-bg)]',
                  'border-[var(--auth-card-border)]',
                  'shadow-[var(--auth-card-shadow)]'
                )
              : cn(
                  'bg-[var(--bg-surface)]',
                  'border-[var(--border)]',
                  'shadow-xl'
                )
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
              <div className="flex-1 pr-4">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-2xl font-bold text-white mb-1"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="text-sm text-[var(--text-muted)]"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={cn(
                    'flex-shrink-0 p-2 rounded-lg',
                    'text-[var(--text-muted)] hover:text-white',
                    'hover:bg-[var(--surface-hover)]',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gradient-purple-start)] focus-visible:ring-offset-2'
                  )}
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
