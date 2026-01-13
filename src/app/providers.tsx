import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-block animate-spin rounded-full h-14 w-14 border-3 border-cyan-400 border-t-transparent mb-6"></div>
        <p className="text-cyan-400/70 font-heading font-medium text-lg mb-8">
          Loading CyberPoker...
        </p>
        <div className="space-y-4">
          <div className="h-12 w-full bg-cyan-900/20 rounded-lg border border-cyan-400/10 animate-pulse"></div>
          <div className="h-10 w-3/4 mx-auto bg-cyan-900/20 rounded-lg border border-cyan-400/10 animate-pulse"></div>
          <div className="h-10 w-full bg-cyan-900/20 rounded-lg border border-cyan-400/10 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
