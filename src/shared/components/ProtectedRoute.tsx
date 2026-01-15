'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Skeleton } from './ui/Skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { data: session, isLoading } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession()
      return data.session
    },
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-3 border-cyan-400 border-t-transparent mb-4"></div>
            <p className="text-cyan-400/70 font-heading font-medium">Verifying authentication...</p>
          </div>
          <Skeleton className="h-12 w-full" variant="rectangular" />
          <Skeleton className="h-10 w-3/4" variant="rectangular" />
          <Skeleton className="h-10 w-full" variant="rectangular" />
        </div>
      </div>
    )
  }

  if (!session) {
    router.replace('/auth')
    return null
  }

  return <>{children}</>
}
