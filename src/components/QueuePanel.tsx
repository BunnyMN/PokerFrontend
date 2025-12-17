import React from 'react'

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
    <div style={queuePanelStyles.container}>
      {/* Queue Section */}
      <div style={queuePanelStyles.section}>
        <h3 style={queuePanelStyles.title}>Queue</h3>
        {queuePlayerIds.length === 0 ? (
          <div style={queuePanelStyles.empty}>No players in queue</div>
        ) : (
          <div style={queuePanelStyles.list}>
            {queuePlayerIds.map((playerId, index) => (
              <div key={playerId} style={queuePanelStyles.queueItem}>
                <span style={queuePanelStyles.queuePosition}>{index + 1}.</span>
                <span style={queuePanelStyles.queuePlayer}>{shortId(playerId)}</span>
                <span style={queuePanelStyles.queueScore}>
                  {totalScores[playerId] || 0} / {scoreLimit}
                </span>
                {eliminated.includes(playerId) && (
                  <span style={queuePanelStyles.elimBadge}>ELIM</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seated Scores Section */}
      <div style={queuePanelStyles.section}>
        <h3 style={queuePanelStyles.title}>Seated Scores</h3>
        {seatedPlayerIds.length === 0 ? (
          <div style={queuePanelStyles.empty}>No players seated</div>
        ) : (
          <div style={queuePanelStyles.table}>
            <div style={queuePanelStyles.tableHeader}>
              <div style={queuePanelStyles.tableCell}>Player</div>
              <div style={queuePanelStyles.tableCell}>Cards</div>
              <div style={queuePanelStyles.tableCell}>Score</div>
              <div style={queuePanelStyles.tableCell}>Turn</div>
            </div>
            {seatedPlayerIds.map((playerId) => (
              <div
                key={playerId}
                style={{
                  ...queuePanelStyles.tableRow,
                  ...(eliminated.includes(playerId) ? queuePanelStyles.tableRowEliminated : {}),
                }}
              >
                <div style={queuePanelStyles.tableCell}>{shortId(playerId)}</div>
                <div style={queuePanelStyles.tableCell}>{handsCount[playerId] || 0}</div>
                <div style={queuePanelStyles.tableCell}>
                  {totalScores[playerId] || 0} / {scoreLimit}
                </div>
                <div style={queuePanelStyles.tableCell}>
                  {playerId === currentTurnPlayerId ? (
                    <span style={queuePanelStyles.turnIndicator}>●</span>
                  ) : (
                    <span style={queuePanelStyles.noTurn}>○</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const queuePanelStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '300px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  empty: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  queueItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  queuePosition: {
    fontWeight: '600',
    color: '#666',
    minWidth: '20px',
  },
  queuePlayer: {
    flex: 1,
    color: '#333',
  },
  queueScore: {
    fontSize: '12px',
    color: '#666',
  },
  elimBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
  },
  tableRowEliminated: {
    backgroundColor: '#f8d7da',
    opacity: 0.7,
  },
  tableCell: {
    display: 'flex',
    alignItems: 'center',
  },
  turnIndicator: {
    color: '#ffc107',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  noTurn: {
    color: '#ddd',
    fontSize: '16px',
  },
}
