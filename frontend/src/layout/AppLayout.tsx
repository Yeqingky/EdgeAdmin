import { useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../api/session'
import { TopNav } from './TopNav'
import { LeftMenu } from './LeftMenu'
import { LoadingBlock } from '../components/LoadingBlock'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function AppLayout() {
  const session = useSession()
  const navigate = useNavigate()

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor) {
        return
      }
      if (anchor.target && anchor.target !== '_self') {
        return
      }
      if (anchor.hasAttribute('download') || anchor.dataset.noSpa !== undefined) {
        return
      }
      const href = anchor.getAttribute('href') || ''
      if (!href.startsWith('/') || href.startsWith('//')) {
        return
      }
      if (/^\/(logout|api)(\/|$)/.test(href) || /^\/(files|ui\/image)\//.test(href) || /\/(export|exportDownload|download)(\/|\?|$)/i.test(href)) {
        return
      }
      const url = new URL(href, window.location.origin)
      event.preventDefault()
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash === window.location.hash) {
        return
      }
      navigate(url.pathname + url.search + url.hash)
    },
    [navigate],
  )

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [handleClick])
  if (!session.data) {
    return <LoadingBlock />
  }
  const data = session.data
  return (
    <div>
      <TopNav session={data} />
      <LeftMenu session={data} />
      <div className="main without-footer without-menu without-secondary-menu">
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
