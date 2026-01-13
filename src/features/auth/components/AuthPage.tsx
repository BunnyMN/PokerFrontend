import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { SegmentedTabs } from '../../../shared/components/ui/SegmentedTabs'
import { useAuth } from '../hooks/useAuth'

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AuthFormData = z.infer<typeof authSchema>

const SpadeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C8.5 2 6 4.5 6 8c0 2 1.5 3.5 2.5 4.5L8 14h8l-.5-1.5c1-1 2.5-2.5 2.5-4.5 0-3.5-2.5-6-6-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 14v8M9 18h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const { signIn, signUp, isSigningIn, isSigningUp, signInError, signUpError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: AuthFormData) => {
    if (isSignUp) {
      signUp(data)
    } else {
      signIn(data)
    }
  }

  const error = signInError || signUpError
  const isLoading = isSigningIn || isSigningUp

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cyberpunk Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 50%, rgba(157, 0, 255, 0.1) 0%, transparent 50%), ' +
              'radial-gradient(circle at 80% 80%, rgba(0, 246, 255, 0.1) 0%, transparent 50%), ' +
              'radial-gradient(circle at 40% 20%, rgba(255, 0, 170, 0.08) 0%, transparent 50%), ' +
              'linear-gradient(180deg, #0a0015 0%, #120025 50%, #0a0015 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 246, 255, 0.03) 1px, transparent 1px), ' +
              'linear-gradient(90deg, rgba(0, 246, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Glass Card */}
      <div className="w-full max-w-md relative">
        <div className="glass-lg rounded-2xl border border-white/10 p-8 sm:p-10 shadow-2xl">
          {/* Top Icon Badge */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl glass border-2 border-cyan-400/50 flex items-center justify-center shadow-glow-cyan animate-pulse-glow">
              <SpadeIcon className="w-10 h-10 text-cyan-400" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-cyan-300 text-glow-cyan mb-3 tracking-tight">
              Cyber
            </h1>
            <p className="text-cyan-400/70 text-sm sm:text-base font-medium">
              Join the ultimate poker experience
            </p>
          </div>

          {/* Segmented Tabs */}
          <div className="mb-7">
            <SegmentedTabs
              value={isSignUp ? 'signup' : 'signin'}
              onValueChange={(value) => {
                setIsSignUp(value === 'signup')
                reset()
              }}
              options={[
                { value: 'signin', label: 'Sign In' },
                { value: 'signup', label: 'Sign Up' },
              ]}
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-pink-900/20 border border-pink-500/50 text-pink-300 rounded-lg text-sm font-medium">
              {error instanceof Error ? error.message : 'An error occurred'}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              {...register('email')}
              placeholder="player@cyberpoker.game"
              disabled={isLoading}
              error={errors.email?.message}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              {...register('password')}
              placeholder="••••••"
              disabled={isLoading}
              error={errors.password?.message}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                isLoading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
