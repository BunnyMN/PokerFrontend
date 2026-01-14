import type { Card, Rank, Suit } from '../types/cards'

/**
 * Get rank value for sorting (3-10, J, Q, K, A, 2)
 * Order: 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2
 */
function getRankValue(rank: Rank): number {
  const rankMap: Record<Rank, number> = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
    '2': 15,
  }
  return rankMap[rank] || 0
}

/**
 * Get suit value for sorting (D < C < H < S)
 * When same rank, order: Diamonds, Clubs, Hearts, Spades (left to right)
 * Diamonds (♦) - left, Spades (♠) - right
 */
function getSuitValue(suit: Suit): number {
  const suitMap: Record<Suit, number> = {
    D: 0, // Diamonds (♦) - left
    C: 1, // Clubs (♣)
    H: 2, // Hearts (♥)
    S: 3, // Spades (♠) - right
  }
  return suitMap[suit] || 0
}

/**
 * Sort cards by rank first (3 to 2), then by suit (Diamonds, Clubs, Hearts, Spades)
 * Order: 
 *   Rank 3: ♦3, ♣3, ♥3, ♠3
 *   Rank 4: ♦4, ♣4, ♥4, ♠4
 *   ...
 *   Rank 2: ♦2, ♣2, ♥2, ♠2
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // First sort by rank (3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2)
    const rankDiff = getRankValue(a.rank) - getRankValue(b.rank)
    if (rankDiff !== 0) return rankDiff
    
    // Then sort by suit (Spades, Hearts, Clubs, Diamonds)
    return getSuitValue(a.suit) - getSuitValue(b.suit)
  })
}

/**
 * Compare two cards for equality
 */
export function cardsEqual(card1: Card, card2: Card): boolean {
  return card1.rank === card2.rank && card1.suit === card2.suit
}
