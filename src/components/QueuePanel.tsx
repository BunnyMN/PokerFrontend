import React from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { cn } from '../utils/cn'

interface QueuePanelProps {
  queuePlayerIds: string[]
  seatedPlayerIds: string[]
  handsCount: Record<string, number>
  totalScores: Record<string, number>
  scoreLimit: number
  currentTurnPlayerId: string | null
  eliminated: string[]
}

export function QueuePanel({
  queuePlayerIds,
  seatedPlayerIds,
  handsCount,
  totalScores,
  scoreLimit,
  currentTurnPlayerId,
  eliminated,
}: QueuePanelProps) {
  const shortId = (id: string) => id.length > 6 ? id.substring(0, 6) + '...' : id

  return (
    <Card className="w-full max-w-sm">
      <div className="space-y-6">
        {/* Queue Section */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Queue</h3>
          {queuePlayerIds.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">No players in queue</p>
          ) : (
            <div className="space-y-2">
              {queuePlayerIds.map((playerId, index) => (
                <div
                  key={playerId}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]',
                    'bg-[var(--bg-elevated)] hover:bg-[var(--surface-hover)] transition-colors'
                  )}
                >
                  <span className="text-sm font-semibold text-[var(--text-muted)] w-6">
                    {index + 1}.
                  </span>
                  <span className="flex-1 text-sm text-[var(--text)] font-medium">
                    {shortId(playerId)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {totalScores[playerId] || 0} / {scoreLimit}
                  </span>
                  {eliminated.includes(playerId) && (
                    <Badge variant="danger" size="sm">ELIM</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seated Scores Section */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Seated Scores</h3>
          {seatedPlayerIds.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">No players seated</p>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr] gap-3 px-3 py-2 bg-[var(--bg-elevated)] rounded-lg text-xs font-semibold text-[var(--text-muted)]">
                <div>Player</div>
                <div>Cards</div>
                <div>Score</div>
                <div>Turn</div>
              </div>
              {/* Rows */}
              {seatedPlayerIds.map((playerId) => (
                <div
                  key={playerId}
                  className={cn(
                    'grid grid-cols-[2fr_1fr_1.5fr_1fr] gap-3 px-3 py-2 rounded-lg',
                    'border border-[var(--border)] bg-[var(--bg-elevated)]',
                    'hover:bg-[var(--surface-hover)] transition-colors',
                    eliminated.includes(playerId) && 'opacity-60 bg-[var(--danger-bg)]'
                  )}
                >
                  <div className="text-sm text-[var(--text)] font-medium truncate">
                    {shortId(playerId)}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {handsCount[playerId] || 0}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {totalScores[playerId] || 0} / {scoreLimit}
                  </div>
                  <div className="flex items-center">
                    {playerId === currentTurnPlayerId ? (
                      <span className="text-[var(--warning)] text-lg font-bold">●</span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-lg">○</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
