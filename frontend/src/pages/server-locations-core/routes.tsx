import type { ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AppRoute } from '../types'
import { LocationsIndexPage } from './LocationsIndexPage'
import { LocationCreatePage } from './LocationCreatePage'
import { LocationDetailPage } from './LocationDetailPage'
import { LocationHttpPage } from './LocationHttpPage'
import { LocationAccessPage } from './LocationAccessPage'
import { LocationAccessLogPage } from './LocationAccessLogPage'
import { LocationCachePage } from './LocationCachePage'
import { LocationCharsetPage } from './LocationCharsetPage'
import { LocationCompressionPage } from './LocationCompressionPage'
import { LocationFastcgiPage } from './LocationFastcgiPage'
import { LocationHeadersPage } from './LocationHeadersPage'

function ServerPageRoute({ Page }: { Page: ComponentType<{ serverId: string }> }) {
  const [searchParams] = useSearchParams()
  return <Page serverId={searchParams.get('serverId') || '0'} />
}

function LocationPageRoute({ Page }: { Page: ComponentType<{ serverId: string; locationId: string }> }) {
  const [searchParams] = useSearchParams()
  return (
    <Page
      serverId={searchParams.get('serverId') || '0'}
      locationId={searchParams.get('locationId') || '0'}
    />
  )
}

// 路由规则(对应 legacy /servers/server/settings/locations/*)
export const routes: AppRoute[] = [
  {
    path: '/servers/server/settings/locations',
    element: <ServerPageRoute Page={LocationsIndexPage} />,
  },
  {
    path: '/servers/server/settings/locations/create',
    element: <ServerPageRoute Page={LocationCreatePage} />,
  },
  {
    path: '/servers/server/settings/locations/location',
    element: <LocationPageRoute Page={LocationDetailPage} />,
  },
  {
    path: '/servers/server/settings/locations/http',
    element: <LocationPageRoute Page={LocationHttpPage} />,
  },
  {
    path: '/servers/server/settings/locations/access',
    element: <LocationPageRoute Page={LocationAccessPage} />,
  },
  {
    path: '/servers/server/settings/locations/accessLog',
    element: <LocationPageRoute Page={LocationAccessLogPage} />,
  },
  {
    path: '/servers/server/settings/locations/cache',
    element: <LocationPageRoute Page={LocationCachePage} />,
  },
  {
    path: '/servers/server/settings/locations/charset',
    element: <LocationPageRoute Page={LocationCharsetPage} />,
  },
  {
    path: '/servers/server/settings/locations/compression',
    element: <LocationPageRoute Page={LocationCompressionPage} />,
  },
  {
    path: '/servers/server/settings/locations/fastcgi',
    element: <LocationPageRoute Page={LocationFastcgiPage} />,
  },
  {
    path: '/servers/server/settings/locations/headers',
    element: <LocationPageRoute Page={LocationHeadersPage} />,
  },
]
