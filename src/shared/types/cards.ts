export type Suit = "S" | "H" | "C" | "D"
export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2"
export type Card = { rank: Rank; suit: Suit }

/**
 * Normalizes a card from various possible formats to canonical format
 * Handles:
 *   a) {suit:"S"|"H"|"C"|"D", rank:"3".."2"}  (correct)
 *   b) {suit:0..3, rank:3..15}                 (numeric)
 *   c) {suit:"♠"|"♥"|"♣"|"♦", rank:3..15}       (mixed)
 */
export function normalizeCard(card: unknown): { suit: Suit; rank: Rank } {
  let suit: Suit
  let rank: Rank

  // Type guard: ensure card is an object
  if (typeof card !== 'object' || card === null) {
    return { suit: 'S', rank: '3' } // fallback
  }

  const cardObj = card as { suit?: unknown; rank?: unknown }

  // Normalize suit
  if (typeof cardObj.suit === 'number') {
    // Numeric suit: 0=>"S", 1=>"H", 2=>"C", 3=>"D"
    const suitMap: Record<number, Suit> = {
      0: "S",
      1: "H",
      2: "C",
      3: "D",
    }
    suit = suitMap[cardObj.suit] || "S"
  } else if (typeof cardObj.suit === 'string') {
    // Check if it's a symbol
    const symbolToSuit: Record<string, Suit> = {
      "♠": "S",
      "♥": "H",
      "♣": "C",
      "♦": "D",
    }
    suit = symbolToSuit[cardObj.suit] || (cardObj.suit as Suit)
    // If it's already a valid suit code, use it
    if (!["S", "H", "C", "D"].includes(suit)) {
      suit = "S" // fallback
    }
  } else {
    suit = "S" // fallback
  }

  // Normalize rank
  if (typeof cardObj.rank === 'number') {
    // Numeric rank: 3-10 => "3"-"10", 11=>"J", 12=>"Q", 13=>"K", 14=>"A", 15=>"2"
    const rankMap: Record<number, Rank> = {
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "J",
      12: "Q",
      13: "K",
      14: "A",
      15: "2",
    }
    rank = rankMap[cardObj.rank] || "3" // fallback
  } else if (typeof cardObj.rank === 'string') {
    // Already a string, validate it's a valid rank
    const validRanks: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
    rank = validRanks.includes(cardObj.rank as Rank) ? (cardObj.rank as Rank) : "3" // fallback
  } else {
    rank = "3" // fallback
  }

  return { suit, rank }
}

/**
 * Converts suit code to symbol
 * S -> ♠, H -> ♥, C -> ♣, D -> ♦
 */
export function suitToSymbol(suit: Suit): string {
  const suitMap: Record<Suit, string> = {
    S: "♠",
    H: "♥",
    C: "♣",
    D: "♦",
  }
  return suitMap[suit]
}

/**
 * Renders a card as a string (e.g., "♦3", "♠A")
 * Accepts any card format and normalizes it first
 */
export function renderCard(card: unknown): string {
  const normalized = normalizeCard(card)
  return `${suitToSymbol(normalized.suit)}${normalized.rank}`
}
