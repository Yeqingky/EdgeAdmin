import { Outlet } from 'react-router-dom'
import { useSession } from '../api/session'
import { TopNav } from './TopNav'
import { LeftMenu } from './LeftMenu'
import { LoadingBlock } from '../components/LoadingBlock'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function AppLayout() {
  const session = useSession()
  if (!session.data) {
    return <LoadingBlock />
  }
  const data = session.data
  return (
    <div>
      <TopNav session={data} />
      <LeftMenu session={data} />
      <div className="main without-footer">
        <div className="main-box">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <div className="clear" />
        </div>
      </div>
    </div>
  )
}
