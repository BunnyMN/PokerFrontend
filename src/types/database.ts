export interface Room {
  id: string
  code: string
  owner_id: string
  status: 'lobby' | 'playing' | 'finished'
  score_limit: number
  created_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  player_id: string
  is_ready: boolean
  left_at: string | null
  joined_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  email: string
  avatar_url: string | null
}

