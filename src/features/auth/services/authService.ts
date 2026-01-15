import { supabase } from '../../../shared/lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  error: Error | null
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // After successful login, ensure profile exists and fetch it
    if (data.user && !error) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', data.user.id)
          .single()

        // If profile doesn't exist, create it with email username as initial display_name
        if (!existingProfile) {
          const emailUsername = email.split('@')[0] || null
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              display_name: emailUsername,
            })
            .then(({ error: insertError }) => {
              if (insertError && insertError.code !== '23505') {
                console.warn('Failed to create profile on sign in:', insertError)
              }
            })
        }
      } catch (err) {
        console.warn('Profile check/creation error on sign in (non-critical):', err)
        // Don't fail login if profile creation fails
      }
    }

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

    // After successful signup, create profile with email username as initial display_name
    if (data.user && !error) {
      try {
        const emailUsername = email.split('@')[0] || null
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            display_name: emailUsername,
          })
          .then(({ error: insertError }) => {
            if (insertError && insertError.code !== '23505') {
              console.warn('Failed to create profile on sign up:', insertError)
            }
          })
      } catch (err) {
        console.warn('Profile creation error on sign up (non-critical):', err)
        // Don't fail signup if profile creation fails
      }
    }

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
