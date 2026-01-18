'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from '../lib/navigation'
import { supabase } from '../shared/lib/supabase'
import { generateRoomCode } from '../shared/utils/roomCode'
import { z } from 'zod'
import type { Room } from '../shared/types/database'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../shared/components/ui/Card'
import { Badge } from '../shared/components/ui/Badge'
import { Chip } from '../shared/components/ui/Chip'
import { toast } from '../shared/components/ui/Toast'
import { cn } from '../shared/utils/cn'
import { timeAgo } from '../shared/utils/timeAgo'

const createRoomSchema = z.object({
  score_limit: z.number().int().min(1).max(60).default(60),
})

interface RoomWithPlayerCount extends Room {
  player_count?: number
}

const joinRoomSchema = z.object({
  code: z.string().length(6, 'Room code must be 6 characters').transform((val) => val.toUpperCase()),
})

type RoomStatusFilter = 'all' | 'lobby' | 'playing'

export function LobbyPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [createScoreLimit, setCreateScoreLimit] = useState(60)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentRooms, setRecentRooms] = useState<RoomWithPlayerCount[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RoomStatusFilter>('all')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || null)

        // Fetch profile to get display_name (profile should exist after login)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        if (profile) {
          setDisplayName(profile.display_name)
        } else if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist - create it with email username
          const emailUsername = user.email?.split('@')[0] || null
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              display_name: emailUsername,
            })

          if (!insertError) {
            setDisplayName(emailUsername)
          } else if (insertError.code !== '23505') {
            console.warn('Failed to create profile:', insertError)
          }
        } else if (profileError) {
          console.warn('Failed to fetch profile:', profileError)
        }
      }
    }

    const fetchRecentRooms = async () => {
      setRoomsLoading(true)
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (!error && data) {
          // Fetch player counts for each room
          const roomsWithCounts = await Promise.all(
            (data as Room[]).map(async (room) => {
              const { count } = await supabase
                .from('room_players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .is('left_at', null)

              return {
                ...room,
                player_count: count || 0,
              }
            })
          )
          setRecentRooms(roomsWithCounts)
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      } finally {
        setRoomsLoading(false)
      }
    }

    fetchUser()
    fetchRecentRooms()

    // Subscribe to realtime room changes (status updates)
    const roomsChannel = supabase
      .channel('lobby-rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Update the room in the list when status changes
            const updatedRoom = payload.new as Room
            setRecentRooms((prev) =>
              prev.map((room) =>
                room.id === updatedRoom.id
                  ? { ...room, ...updatedRoom }
                  : room
              )
            )
          } else if (payload.eventType === 'INSERT') {
            // Add new room to the list
            const newRoom = payload.new as Room
            setRecentRooms((prev) => {
              // Check if room already exists
              if (prev.some((r) => r.id === newRoom.id)) {
                return prev
              }
              return [{ ...newRoom, player_count: 0 }, ...prev].slice(0, 20)
            })
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted room from the list
            const deletedRoom = payload.old as Room
            setRecentRooms((prev) =>
              prev.filter((room) => room.id !== deletedRoom.id)
            )
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(roomsChannel)
    }
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get session to ensure user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get session')
      }
      if (!session || !session.user) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      const userId = session.user.id
      console.log('Creating room for user:', userId)

      const formData = createRoomSchema.parse({ score_limit: createScoreLimit })
      const roomCode = generateRoomCode()

      // Insert room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          owner_id: userId,
          status: 'lobby',
          score_limit: formData.score_limit,
        })
        .select()
        .single()

      if (roomError) {
        console.error('Room creation error:', roomError)
        throw new Error(roomError.message || 'Failed to create room')
      }
      if (!room) {
        throw new Error('Failed to create room: No room data returned')
      }

      // Insert room player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          player_id: userId,
          is_ready: false,
        })

      if (playerError) {
        console.error('Room player creation error:', playerError)
        throw new Error(playerError.message || 'Failed to add player to room')
      }

      toast.success(`Room ${roomCode} created!`)
      navigate(`/room/${room.id}`)
    } catch (err) {
      console.error('Create room error:', err)
      let errorMsg = 'Failed to create room'
      
      if (err instanceof z.ZodError) {
        errorMsg = err.errors[0].message
      } else if (err instanceof Error) {
        errorMsg = err.message
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = String(err.message)
      }
      
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session || !session.user) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      const userId = session.user.id
      const formData = joinRoomSchema.parse({ code: joinCode })

      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', formData.code)
        .single()

      if (roomError) {
        console.error('Room lookup error:', roomError)
        throw new Error(roomError.message || 'Room not found')
      }
      if (!room) {
        throw new Error('Room not found')
      }

      // Insert room player (ignore duplicate errors)
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          player_id: userId,
          is_ready: false,
        })

      // If duplicate, just redirect (user already in room)
      if (playerError) {
        const isDuplicate = playerError.code === '23505' || 
                           playerError.message?.toLowerCase().includes('duplicate') ||
                           playerError.message?.toLowerCase().includes('unique')
        
        if (!isDuplicate) {
          console.error('Room player join error:', playerError)
          throw new Error(playerError.message || 'Failed to join room')
        }
        // If duplicate, user is already in room, just navigate
      }

      toast.success(`Joined room ${formData.code}!`)
      navigate(`/room/${room.id}`)
    } catch (err) {
      console.error('Join room error:', err)
      let errorMsg = 'Failed to join room'
      
      if (err instanceof z.ZodError) {
        errorMsg = err.errors[0].message
      } else if (err instanceof Error) {
        errorMsg = err.message
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = String(err.message)
      }
      
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Filter rooms based on search and status
  const filteredRooms = recentRooms.filter((room) => {
    const matchesSearch = searchQuery === '' || 
      room.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Icon components
  const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  const PeopleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )

  const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleJoinRoomById = async (roomId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session || !session.user) {
        toast.error('Not authenticated. Please sign in again.')
        return
      }

      const userId = session.user.id

      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomId,
          player_id: userId,
          is_ready: false,
        })

      if (playerError) {
        const isDuplicate = playerError.code === '23505' || 
                           playerError.message?.toLowerCase().includes('duplicate') ||
                           playerError.message?.toLowerCase().includes('unique')
        
        if (!isDuplicate) {
          console.error('Room player join error:', playerError)
          throw new Error(playerError.message || 'Failed to join room')
        }
        // If duplicate, user is already in room, just navigate
      }

      navigate(`/room/${roomId}`)
    } catch (err) {
      console.error('Join room by ID error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to join room'
      toast.error(errorMsg)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--bg-surface)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-20">
            <div className="flex flex-col gap-0.5 sm:gap-1.5">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-heading font-bold text-cyan-300 text-glow-cyan">
                Game Lobby
              </h1>
              {(displayName || userEmail) && (
                <p className="text-[10px] sm:text-xs md:text-sm text-cyan-400/70 font-medium truncate max-w-[150px] sm:max-w-none">
                  Welcome, <span className="text-cyan-300">{displayName || userEmail}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="border border-white/10 hover:bg-white/5 hover:border-cyan-400/30 text-xs sm:text-sm px-2 sm:px-3"
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="border border-white/10 hover:bg-white/5 hover:border-cyan-400/30 text-xs sm:text-sm px-2 sm:px-3"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        <div className="space-y-4 sm:space-y-8">
          {/* Action Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
            {/* Create Room Card */}
            <Card className="hover:shadow-glow-cyan transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg glass border border-cyan-400/30 flex items-center justify-center bg-cyan-400/10">
                    <PlusIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle>Create Room</CardTitle>
                    <CardDescription className="mt-1">Start a new game and invite players</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {error && (
                  <div className="mb-5 p-3.5 bg-pink-900/20 border border-pink-500/50 text-pink-300 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleCreateRoom} className="space-y-5">
                  <Input
                    label="Score Limit (1-60)"
                    type="number"
                    value={createScoreLimit}
                    onChange={(e) => setCreateScoreLimit(Number(e.target.value))}
                    min="1"
                    max="60"
                    disabled={loading}
                  />
                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      isLoading={loading}
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      {!loading && <PlusIcon className="w-4 h-4 mr-2" />}
                      {loading ? 'Creating...' : 'Create Room'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="hover:shadow-glow-cyan transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg glass border border-cyan-400/30 flex items-center justify-center bg-cyan-400/10">
                    <PeopleIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle>Join Room</CardTitle>
                    <CardDescription className="mt-1">Enter a room code to join existing game</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleJoinRoom} className="space-y-5">
                  <Input
                    label="Room Code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    disabled={loading}
                    className="font-mono tracking-wider"
                  />
                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      isLoading={loading}
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      {!loading && <PeopleIcon className="w-4 h-4 mr-2" />}
                      {loading ? 'Joining...' : 'Join Room'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent Rooms Row */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Rooms</CardTitle>
                  <CardDescription className="mt-1.5">Browse and join available game rooms</CardDescription>
                </div>
                {filteredRooms.length > 0 && (
                  <Badge variant="info" size="sm">
                    {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Filters */}
              <div className="space-y-5 mb-8">
                {/* Search Input */}
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/50 pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by room code..."
                    className="pl-12"
                  />
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap gap-2.5">
                  <Chip
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                    className="transition-all duration-200"
                  >
                    All
                  </Chip>
                  <Chip
                    active={statusFilter === 'lobby'}
                    onClick={() => setStatusFilter('lobby')}
                    className="transition-all duration-200"
                  >
                    Waiting
                  </Chip>
                  <Chip
                    active={statusFilter === 'playing'}
                    onClick={() => setStatusFilter('playing')}
                    className="transition-all duration-200"
                  >
                    Playing
                  </Chip>
                </div>
              </div>

              {/* Rooms List */}
              {roomsLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-cyan-400 border-t-transparent mb-5"></div>
                  <p className="text-sm text-cyan-400/70 font-medium">Loading rooms...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full glass border border-cyan-400/20 flex items-center justify-center mx-auto mb-5">
                    <PeopleIcon className="w-8 h-8 text-cyan-400/30" />
                  </div>
                  <p className="text-sm text-cyan-400/70 font-medium">
                    {recentRooms.length === 0 
                      ? 'No rooms available yet. Create one to get started!'
                      : 'No rooms match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {filteredRooms.map((room) => {
                    const isJoinable = room.status === 'lobby'
                    const isFinished = room.status === 'finished'
                    return (
                      <div
                        key={room.id}
                        className={cn(
                          'flex items-center gap-2 sm:gap-5 p-2.5 sm:p-5 rounded-lg sm:rounded-xl border border-white/10',
                          'hover:bg-white/5 hover:border-cyan-400/30 hover:shadow-neon-cyan/20',
                          'transition-all duration-300 group cursor-pointer',
                          'backdrop-blur-sm',
                          isFinished && 'opacity-60'
                        )}
                      >
                        {/* Left: Icon + Room Code */}
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border border-cyan-400/30 flex items-center justify-center bg-cyan-400/10 group-hover:bg-cyan-400/20 group-hover:border-cyan-400/50 transition-all duration-300">
                            <PeopleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
                          </div>
                          <div className="flex flex-col gap-0">
                            <span className="text-sm sm:text-xl font-heading font-bold text-cyan-300 font-mono tracking-wider">
                              {room.code}
                            </span>
                            <span className="text-[10px] sm:text-xs text-cyan-400/50 hidden sm:block">
                              {timeAgo(room.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Status + Info */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-4 flex-wrap">
                          <Badge
                            variant={room.status === 'playing' ? 'success' : room.status === 'finished' ? 'danger' : 'info'}
                            size="sm"
                            className="font-semibold text-[10px] sm:text-xs"
                          >
                            {room.status === 'lobby' ? 'WAIT' : room.status === 'finished' ? 'END' : 'PLAY'}
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-cyan-400/70">
                            <PeopleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="font-medium">
                              {room.player_count || 0}
                            </span>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400/70">
                            <span className="font-medium">Limit:</span>
                            <span className="text-cyan-300 font-semibold">{room.score_limit}</span>
                          </div>
                        </div>

                        {/* Right: Join Button */}
                        <Button
                          variant={isJoinable ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleJoinRoomById(room.id)}
                          disabled={!isJoinable || isFinished}
                          className="flex-shrink-0 min-w-[60px] sm:min-w-[100px] text-xs sm:text-sm px-2 sm:px-3"
                        >
                          {isFinished ? 'End' : isJoinable ? 'Join' : 'Play'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
