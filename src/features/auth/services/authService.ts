import { supabase } from '../../../shared/lib/supabase'

export interface AuthResponse {
  user: any
  error: Error | null
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    }
  },

  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.signOut()
    return {
      error: error ? new Error(error.message) : null,
    }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
}
