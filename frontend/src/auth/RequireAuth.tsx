import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../api/session'
import { LoadingBlock } from '../components/LoadingBlock'

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()

  if (session.isLoading) {
    return <LoadingBlock />
  }
  if (session.isError || !session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
