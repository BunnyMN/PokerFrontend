import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { Skeleton } from './shared/components/ui/Skeleton'

// Lazy load pages for code splitting
const AuthPage = lazy(() => import('./features/auth/components/AuthPage').then(m => ({ default: m.AuthPage })))
const LobbyPage = lazy(() => import('./pages/LobbyPage').then(m => ({ default: m.LobbyPage })))
const RoomPage = lazy(() => import('./pages/RoomPage').then(m => ({ default: m.RoomPage })))

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-block animate-spin rounded-full h-14 w-14 border-3 border-cyan-400 border-t-transparent mb-6"></div>
        <p className="text-cyan-400/70 font-heading font-medium text-lg mb-8">
          Loading CyberPoker ...
        </p>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" variant="rectangular" />
          <Skeleton className="h-10 w-3/4 mx-auto" variant="rectangular" />
          <Skeleton className="h-10 w-full" variant="rectangular" />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
