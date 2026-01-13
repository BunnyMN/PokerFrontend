import { create } from 'zustand'
import type { Card } from '../shared/types/cards'

interface GameState {
  // WebSocket state
  wsStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  wsError: string | null
  
  // Game state
  yourHand: Card[] | null
  selectedCards: Card[]
  seatedPlayerIds: string[]
  queuePlayerIds: string[]
  currentTurnPlayerId: string | null
  lastPlay: { playerId: string; cards: Card[]; kind?: string; fiveKind?: string } | null
  handsCount: Record<string, number>
  passedPlayerIds: string[]
  totalScores: Record<string, number>
  eliminated: string[]
  scoreLimit: number
  
  // Round state
  roundStart: { roomId: string; startedAt: string } | null
  roundEnd: { winnerPlayerId: string } | null
  starterPlayerId: string | null
  starterReason: string | null
  
  // Actions
  setWsStatus: (status: GameState['wsStatus']) => void
  setWsError: (error: string | null) => void
  setYourHand: (hand: Card[] | null) => void
  setSelectedCards: (cards: Card[]) => void
  toggleCardSelection: (card: Card) => void
  setSeatedPlayerIds: (ids: string[]) => void
  setQueuePlayerIds: (ids: string[]) => void
  setCurrentTurnPlayerId: (id: string | null) => void
  setLastPlay: (play: GameState['lastPlay']) => void
  setHandsCount: (count: Record<string, number>) => void
  setPassedPlayerIds: (ids: string[]) => void
  setTotalScores: (scores: Record<string, number>) => void
  setEliminated: (ids: string[]) => void
  setScoreLimit: (limit: number) => void
  setRoundStart: (start: GameState['roundStart']) => void
  setRoundEnd: (end: GameState['roundEnd']) => void
  setStarter: (playerId: string | null, reason: string | null) => void
  resetGameState: () => void
}

const initialState = {
  wsStatus: 'disconnected' as const,
  wsError: null,
  yourHand: null,
  selectedCards: [],
  seatedPlayerIds: [],
  queuePlayerIds: [],
  currentTurnPlayerId: null,
  lastPlay: null,
  handsCount: {},
  passedPlayerIds: [],
  totalScores: {},
  eliminated: [],
  scoreLimit: 60,
  roundStart: null,
  roundEnd: null,
  starterPlayerId: null,
  starterReason: null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  
  setWsStatus: (status) => set({ wsStatus: status }),
  setWsError: (error) => set({ wsError: error }),
  setYourHand: (hand) => set({ yourHand: hand, selectedCards: [] }),
  setSelectedCards: (cards) => set({ selectedCards: cards }),
  
  toggleCardSelection: (card) => set((state) => {
    const isSelected = state.selectedCards.some(
      (c) => c.rank === card.rank && c.suit === card.suit
    )
    
    if (isSelected) {
      return {
        selectedCards: state.selectedCards.filter(
          (c) => !(c.rank === card.rank && c.suit === card.suit)
        ),
      }
    } else {
      if (state.selectedCards.length >= 5) {
        return state // Max 5 cards
      }
      return {
        selectedCards: [...state.selectedCards, card],
      }
    }
  }),
  
  setSeatedPlayerIds: (ids) => set({ seatedPlayerIds: ids }),
  setQueuePlayerIds: (ids) => set({ queuePlayerIds: ids }),
  setCurrentTurnPlayerId: (id) => set({ currentTurnPlayerId: id }),
  setLastPlay: (play) => set({ lastPlay: play }),
  setHandsCount: (count) => set({ handsCount: count }),
  setPassedPlayerIds: (ids) => set({ passedPlayerIds: ids }),
  setTotalScores: (scores) => set({ totalScores: scores }),
  setEliminated: (ids) => set({ eliminated: ids }),
  setScoreLimit: (limit) => set({ scoreLimit: limit }),
  setRoundStart: (start) => set({ roundStart: start }),
  setRoundEnd: (end) => set({ roundEnd: end }),
  setStarter: (playerId, reason) => set({ starterPlayerId: playerId, starterReason: reason }),
  
  resetGameState: () => set(initialState),
}))
