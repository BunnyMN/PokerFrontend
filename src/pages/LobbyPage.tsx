import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateRoomCode } from '../utils/roomCode'
import { z } from 'zod'
import type { Room } from '../types/database'

const createRoomSchema = z.object({
  score_limit: z.number().int().min(1).max(1000).default(30),
})

const joinRoomSchema = z.object({
  code: z.string().length(6, 'Room code must be 6 characters').transform((val) => val.toUpperCase()),
})

export function LobbyPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [createScoreLimit, setCreateScoreLimit] = useState(30)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentRooms, setRecentRooms] = useState<Room[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || null)
      }
    }

    const fetchRecentRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setRecentRooms(data as Room[])
      }
    }

    fetchUser()
    fetchRecentRooms()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const formData = createRoomSchema.parse({ score_limit: createScoreLimit })
      const roomCode = generateRoomCode()

      // Insert room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          owner_id: user.id,
          status: 'lobby',
          score_limit: formData.score_limit,
        })
        .select()
        .single()

      if (roomError) throw roomError
      if (!room) throw new Error('Failed to create room')

      // Insert room player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          player_id: user.id,
          is_ready: false,
        })

      if (playerError) throw playerError

      navigate(`/room/${room.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create room')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const formData = joinRoomSchema.parse({ code: joinCode })

      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', formData.code)
        .single()

      if (roomError || !room) {
        throw new Error('Room not found')
      }

      // Insert room player (ignore duplicate errors)
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          player_id: user.id,
          is_ready: false,
        })

      // If duplicate, just redirect (user already in room)
      if (playerError && !playerError.message.includes('duplicate')) {
        throw playerError
      }

      navigate(`/room/${room.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to join room')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.email}>Logged in as: {userEmail}</div>
        </div>
        <button onClick={handleSignOut} style={styles.signOutButton}>
          Sign Out
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Create Room</h2>
          {error && <div style={styles.error}>{error}</div>}
          <form onSubmit={handleCreateRoom} style={styles.form}>
            <div style={styles.inputGroup}>
              <label htmlFor="score_limit" style={styles.label}>
                Score Limit
              </label>
              <input
                id="score_limit"
                type="number"
                value={createScoreLimit}
                onChange={(e) => setCreateScoreLimit(Number(e.target.value))}
                style={styles.input}
                min="1"
                max="1000"
                disabled={loading}
              />
            </div>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Join Room</h2>
          <form onSubmit={handleJoinRoom} style={styles.form}>
            <div style={styles.inputGroup}>
              <label htmlFor="room_code" style={styles.label}>
                Room Code
              </label>
              <input
                id="room_code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={styles.input}
                placeholder="ABC123"
                maxLength={6}
                disabled={loading}
              />
            </div>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>

        {recentRooms.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Rooms</h2>
            <div style={styles.roomList}>
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  style={styles.roomItem}
                  onClick={() => navigate(`/room/${room.id}`)}
                >
                  <div style={styles.roomCode}>{room.code}</div>
                  <div style={styles.roomMeta}>
                    Score Limit: {room.score_limit} • {room.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  email: {
    fontSize: '14px',
    color: '#666',
  },
  signOutButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roomItem: {
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  roomCode: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  roomMeta: {
    fontSize: '14px',
    color: '#666',
  },
}

