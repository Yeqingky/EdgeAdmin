import type { AppRoute } from '../types'
import { PagesPage } from './PagesPage'
import { ReferersPage } from './ReferersPage'
import { RemoteAddrPage } from './RemoteAddrPage'
import { RequestLimitPage } from './RequestLimitPage'
import { StatPage } from './StatPage'
import { UserAgentPage } from './UserAgentPage'
import { WafPage } from './WafPage'
import { WebRootPage } from './WebRootPage'
import { WebpPage } from './WebpPage'
import { WebsocketPage } from './WebsocketPage'
import { RewritePage } from './RewritePage'
import { ReverseProxyOriginsPage } from './ReverseProxyOriginsPage'
import { ReverseProxySchedulingPage } from './ReverseProxySchedulingPage'
import { ReverseProxySettingPage } from './ReverseProxySettingPage'

export const routes: AppRoute[] = [
  { path: '/servers/server/settings/locations/pages', element: <PagesPage /> },
  { path: '/servers/server/settings/locations/referers', element: <ReferersPage /> },
  { path: '/servers/server/settings/locations/remoteAddr', element: <RemoteAddrPage /> },
  { path: '/servers/server/settings/locations/requestLimit', element: <RequestLimitPage /> },
  { path: '/servers/server/settings/locations/stat', element: <StatPage /> },
  { path: '/servers/server/settings/locations/userAgent', element: <UserAgentPage /> },
  { path: '/servers/server/settings/locations/waf', element: <WafPage /> },
  { path: '/servers/server/settings/locations/web', element: <WebRootPage /> },
  { path: '/servers/server/settings/locations/webp', element: <WebpPage /> },
  { path: '/servers/server/settings/locations/websocket', element: <WebsocketPage /> },
  { path: '/servers/server/settings/locations/rewrite', element: <RewritePage /> },
  { path: '/servers/server/settings/locations/reverseProxy', element: <ReverseProxyOriginsPage /> },
  { path: '/servers/server/settings/locations/reverseProxy/scheduling', element: <ReverseProxySchedulingPage /> },
  { path: '/servers/server/settings/locations/reverseProxy/setting', element: <ReverseProxySettingPage /> },
]
