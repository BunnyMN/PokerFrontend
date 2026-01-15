'use client'

import { useRouter, useParams as useNextParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

// Next.js navigation hooks wrapper for compatibility with react-router-dom API
export function useNavigate() {
  const router = useRouter()
  return (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }
}

// Wrapper to match react-router-dom useParams API
export function useParams<T extends Record<string, string>>(): T {
  const params = useNextParams()
  // Convert ReadonlyArray to object
  return useMemo(() => {
    const result: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        result[key] = Array.isArray(value) ? value[0] : value
      })
    }
    return result as T
  }, [params])
}

export { usePathname }
