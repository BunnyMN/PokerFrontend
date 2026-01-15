'use client'

import { RoomPage } from '@/src/pages/RoomPage'

export default function RoomPageRoute({
  params,
}: {
  params: Promise<{ roomId: string }> | { roomId: string }
}) {
  // RoomPage uses useParams hook which will get roomId from URL
  // No need to unwrap params here since RoomPage handles it via useParams
  return <RoomPage />
}
