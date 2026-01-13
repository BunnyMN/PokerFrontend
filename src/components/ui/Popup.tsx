import { ReactNode } from 'react'
import { Modal, ModalProps } from './Modal'
import { Button } from './Button'
import { cn } from '../../utils/cn'

export interface PopupProps extends Omit<ModalProps, 'children' | 'content'> {
  children?: ReactNode
  content?: ReactNode
  actions?: {
    primary?: {
      label: string
      onClick: () => void
      variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
      isLoading?: boolean
      disabled?: boolean
    }
    secondary?: {
      label: string
      onClick: () => void
      variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
      disabled?: boolean
    }
  }
  showActions?: boolean
  actionsAlign?: 'left' | 'center' | 'right' | 'between'
}

export function Popup({
  title,
  description,
  children,
  content,
  actions,
  showActions = true,
  actionsAlign = 'right',
  ...modalProps
}: PopupProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }

  return (
    <Modal
      title={title}
      description={description}
      {...modalProps}
    >
      <div className="space-y-6">
        {/* Content */}
        <div>{content || children}</div>

        {/* Actions Footer */}
        {showActions && actions && (actions.primary || actions.secondary) && (
          <div
            className={cn(
              'pt-6 border-t border-[var(--border)] flex gap-3',
              alignClasses[actionsAlign]
            )}
          >
            {actions.secondary && (
              <Button
                variant={actions.secondary.variant || 'secondary'}
                onClick={actions.secondary.onClick}
                disabled={actions.secondary.disabled}
              >
                {actions.secondary.label}
              </Button>
            )}
            {actions.primary && (
              <Button
                variant={actions.primary.variant || 'primary'}
                onClick={actions.primary.onClick}
                isLoading={actions.primary.isLoading}
                disabled={actions.primary.disabled}
                className={cn(
                  actions.primary.variant === 'primary' &&
                    'bg-gradient-to-r from-[var(--gradient-purple-start)] to-[var(--gradient-pink-start)] hover:opacity-90 border-0'
                )}
              >
                {actions.primary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
