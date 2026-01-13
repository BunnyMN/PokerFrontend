import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { supabase } from '../../../shared/lib/supabase'

export function useAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signIn(email, password),
    onSuccess: (data) => {
      if (data.user && !data.error) {
        queryClient.setQueryData(['auth', 'user'], data.user)
        navigate('/lobby')
      }
    },
  })

  const signUpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signUp(email, password),
    onSuccess: (data) => {
      if (data.user && !data.error) {
        queryClient.setQueryData(['auth', 'user'], data.user)
        navigate('/lobby')
      }
    },
  })

  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'user'], null)
      navigate('/')
    },
  })

  return {
    user,
    isLoading,
    signIn: signInMutation.mutate,
    signUp: signUpMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    signOutError: signOutMutation.error,
  }
}
