import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../shared/lib/supabase'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../shared/components/ui/Card'
import { toast } from '../shared/components/ui/Toast'

export function ProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.user) {
          navigate('/auth')
          return
        }

        const userId = session.user.id
        const userEmail = session.user.email || ''
        setEmail(userEmail)

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', userId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (data) {
          setProfile({ id: data.id, display_name: data.display_name, avatar_url: data.avatar_url || null })
          setDisplayName(data.display_name || '')
          setAvatarUrl(data.avatar_url || null)
        } else {
          setProfile({ id: userId, display_name: null, avatar_url: null })
          setDisplayName('')
          setAvatarUrl(null)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const initials = useMemo(() => {
    const source = displayName || email
    if (!source) return '?'
    const parts = source.split('@')[0].split(' ')
    const letters = parts.filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase())
    return letters.join('') || '?'
  }, [displayName, email])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('Not authenticated')
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const userId = session.user.id
      const fileName = `${userId}/${Math.random()}.${fileExt}`
      const filePath = fileName // Store as {userId}/{filename} for better security

      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          // Extract path from URL - format: .../storage/v1/object/public/avatars/{userId}/{filename}
          const urlParts = avatarUrl.split('/')
          const avatarsIndex = urlParts.findIndex(part => part === 'avatars')
          if (avatarsIndex !== -1 && avatarsIndex < urlParts.length - 1) {
            // Get everything after 'avatars/' in the URL
            const pathAfterAvatars = urlParts.slice(avatarsIndex + 1).join('/')
            if (pathAfterAvatars) {
              await supabase.storage.from('avatars').remove([pathAfterAvatars])
            }
          }
        } catch (err) {
          console.warn('Failed to delete old avatar:', err)
          // Continue with upload even if delete fails
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(data.publicUrl)
      
      // Update profile immediately (session is already available from above)
      if (session?.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', session.user.id)

        if (updateError) throw updateError
        setProfile(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null)
      }

      toast.success('Avatar uploaded successfully')
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      if (!avatarUrl) return

      // Delete from storage
      const urlParts = avatarUrl.split('/')
      const avatarsIndex = urlParts.findIndex(part => part === 'avatars')
      if (avatarsIndex !== -1 && avatarsIndex < urlParts.length - 1) {
        // Get everything after 'avatars/' in the URL
        const pathAfterAvatars = urlParts.slice(avatarsIndex + 1).join('/')
        if (pathAfterAvatars) {
          await supabase.storage.from('avatars').remove([pathAfterAvatars])
        }
      }

      // Update profile
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', session.user.id)

        if (error) throw error
        setProfile(prev => prev ? { ...prev, avatar_url: null } : null)
        setAvatarUrl(null)
        toast.success('Avatar removed')
      }
    } catch (err) {
      console.error('Failed to remove avatar:', err)
      toast.error('Failed to remove avatar')
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.user) {
        navigate('/auth')
        return
      }

      const payload = {
        id: session.user.id,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl,
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })

      if (error) throw error

      setProfile(payload)
      toast.success('Profile updated')
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--bg-surface)]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-cyan-300 text-glow-cyan">
                Profile
              </h1>
              <p className="text-xs sm:text-sm text-cyan-400/70 font-medium">
                Manage your account details
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/lobby')}
              className="border border-white/10 hover:bg-white/5 hover:border-cyan-400/30"
            >
              Back to Lobby
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <Card className="hover:shadow-glow-cyan transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarUrl ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/30 ring-2 ring-cyan-400/20">
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-cyan-400/15 text-cyan-300 font-bold text-lg">${initials}</div>`
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-cyan-400/15 border-2 border-cyan-400/30 flex items-center justify-center text-cyan-300 font-bold text-xl ring-2 ring-cyan-400/20">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer p-2 bg-cyan-400/20 hover:bg-cyan-400/30 rounded-full border border-cyan-400/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading || loading}
                      className="hidden"
                    />
                    <svg className="w-4 h-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploading || loading}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full border border-red-400/50"
                    >
                      <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <CardTitle>Profile Info</CardTitle>
                <CardDescription className="mt-1">
                  Update your display name and profile picture. Email is read-only.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-cyan-300/80 font-semibold">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-cyan-300/80 font-semibold">
                Email
              </label>
              <Input value={email} readOnly disabled />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => navigate('/lobby')}
                disabled={saving || loading}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
