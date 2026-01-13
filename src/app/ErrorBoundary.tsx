import { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '../shared/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
          <div className="glass-lg rounded-xl border border-white/10 p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full border-2 border-pink-500/50 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-heading font-bold text-pink-300 mb-2">
                Something went wrong
              </h1>
              <p className="text-cyan-400/70 text-sm mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="w-full"
              >
                Reload Application
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  window.location.href = '/lobby'
                }}
                className="w-full"
              >
                Go to Lobby
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
