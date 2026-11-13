import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { LoginInfo } from './types'

export function useLoginInfo() {
  return useQuery({
    queryKey: ['login-info'],
    queryFn: () => apiGet<LoginInfo>('/api/login'),
    retry: false,
    staleTime: 0,
  })
}
