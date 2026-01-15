'use client'

import { ReactNode } from 'react'
import { useNavigate } from '../lib/navigation'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'

interface AppShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
  showSignOut?: boolean
  userEmail?: string | null
}

export function AppShell({ children, showSignOut = true, userEmail }: AppShellProps) {
  const navigate = useNavigate()
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }
  
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-[var(--text)]">Game Lobby</h1>
              {userEmail && (
                <p className="text-sm text-[var(--text)]">Welcome, {userEmail}</p>
              )}
            </div>
            {showSignOut && (
              <Button 
                variant="ghost" 
                size="md" 
                onClick={handleSignOut}
                className="border border-[var(--danger)] text-[var(--text)] hover:bg-[var(--danger-bg)]"
              >
                <svg className="w-4 h-4 mr-2 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
