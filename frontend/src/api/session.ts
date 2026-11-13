import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { SessionData } from './types'

export const SESSION_KEY = ['session'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => apiGet<SessionData>('/api/session'),
    retry: false,
    staleTime: 30_000,
  })
}
