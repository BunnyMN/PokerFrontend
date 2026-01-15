'use client'

import { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 3000)
    
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])
  
  const types = {
    success: 'bg-[var(--success-bg)] border-[var(--success)] text-[var(--success)]',
    error: 'bg-[var(--danger-bg)] border-[var(--danger)] text-[var(--danger)]',
    info: 'bg-[var(--info-bg)] border-[var(--info)] text-[var(--info)]',
    warning: 'bg-[var(--warning-bg)] border-[var(--warning)] text-[var(--warning)]',
  }
  
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm',
        'transition-all duration-300 ease-in-out',
        types[toast.type || 'info'],
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{toast.message}</span>
      </div>
    </div>
  )
}

let toastIdCounter = 0
const toasts: Toast[] = []
const listeners: Array<(toasts: Toast[]) => void> = []

function notify() {
  listeners.forEach(listener => listener([...toasts]))
}

export const toast = {
  show: (message: string, type: Toast['type'] = 'info', duration?: number) => {
    const id = `toast-${++toastIdCounter}`
    toasts.push({ id, message, type, duration })
    notify()
    return id
  },
  success: (message: string, duration?: number) => toast.show(message, 'success', duration),
  error: (message: string, duration?: number) => toast.show(message, 'error', duration),
  info: (message: string, duration?: number) => toast.show(message, 'info', duration),
  warning: (message: string, duration?: number) => toast.show(message, 'warning', duration),
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts)
    listeners.push(listener)
    setCurrentToasts([...toasts])
    
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])
  
  const handleRemove = (id: string) => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.splice(index, 1)
      notify()
    }
  }
  
  if (currentToasts.length === 0) return null
  
  return (
    <div className="fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm">
      {currentToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  )
}
