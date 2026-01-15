'use client'

import { RoomPage } from '@/src/views/RoomPage'

export default function RoomPageRoute() {
  // RoomPage uses useParams hook which will get roomId from URL
  // No need to unwrap params here since RoomPage handles it via useParams
  return <RoomPage />
}
