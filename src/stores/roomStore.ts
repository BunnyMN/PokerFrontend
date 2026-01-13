import { create } from 'zustand'
import type { Room, RoomPlayer, Profile } from '../shared/types/database'

interface PlayerWithProfile extends RoomPlayer {
  profile: Profile | null
}

interface RoomState {
  room: Room | null
  players: PlayerWithProfile[]
  roomStatePlayers: Array<{ playerId: string; isReady: boolean }>
  currentUserId: string | null
  loading: boolean
  error: string | null
  
  // Actions
  setRoom: (room: Room | null) => void
  setPlayers: (players: PlayerWithProfile[]) => void
  setRoomStatePlayers: (players: Array<{ playerId: string; isReady: boolean }>) => void
  setCurrentUserId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetRoomState: () => void
}

const initialState = {
  room: null,
  players: [],
  roomStatePlayers: [],
  currentUserId: null,
  loading: true,
  error: null,
}

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,
  
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setRoomStatePlayers: (players) => set({ roomStatePlayers: players }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  resetRoomState: () => set(initialState),
}))
