import type { AppRoute } from '../types'
import { ServerBasicSettingsPage } from './BasicSettingsPage'
import { ServerAccessSettingsPage } from './AccessPage'
import { ServerAccessLogSettingsPage } from './AccessLogPage'
import { ServerCacheFetchPage } from './CacheFetchPage'
import { ServerCachePurgePage } from './CachePurgePage'
import { ServerCacheSettingsPage } from './CachePage'
import { ServerCharsetSettingsPage } from './CharsetPage'
import { ServerCommonSettingsPage } from './CommonPage'
import { ServerCompressionSettingsPage } from './CompressionPage'
import { ServerDnsSettingsPage } from './DnsPage'
import { ServerFastcgiSettingsPage } from './FastcgiPage'
import { ServerHeadersSettingsPage } from './HeadersPage'
import { ServerHttpSettingsPage } from './HttpPage'
import { ServerHttpsSettingsPage } from './HttpsPage'
import { ServerNamesSettingsPage } from './ServerNamesPage'
import { ServerTlsSettingsPage } from './TlsPage'

export const routes: AppRoute[] = [
  { path: '/servers/server/settings', element: <ServerBasicSettingsPage /> },
  { path: '/servers/server/settings/access', element: <ServerAccessSettingsPage /> },
  { path: '/servers/server/settings/accessLog', element: <ServerAccessLogSettingsPage /> },
  { path: '/servers/server/settings/cache', element: <ServerCacheSettingsPage /> },
  { path: '/servers/server/settings/cache/purge', element: <ServerCachePurgePage /> },
  { path: '/servers/server/settings/cache/fetch', element: <ServerCacheFetchPage /> },
  { path: '/servers/server/settings/charset', element: <ServerCharsetSettingsPage /> },
  { path: '/servers/server/settings/common', element: <ServerCommonSettingsPage /> },
  { path: '/servers/server/settings/compression', element: <ServerCompressionSettingsPage /> },
  { path: '/servers/server/settings/dns', element: <ServerDnsSettingsPage /> },
  { path: '/servers/server/settings/fastcgi', element: <ServerFastcgiSettingsPage /> },
  { path: '/servers/server/settings/headers', element: <ServerHeadersSettingsPage /> },
  { path: '/servers/server/settings/http', element: <ServerHttpSettingsPage /> },
  { path: '/servers/server/settings/https', element: <ServerHttpsSettingsPage /> },
  { path: '/servers/server/settings/serverNames', element: <ServerNamesSettingsPage /> },
  { path: '/servers/server/settings/tls', element: <ServerTlsSettingsPage /> },
]
