import type { AppRoute } from '../types'
import { OriginsAddPage, OriginsUpdatePage } from './origins'
import { PageCreateRoute, PageUpdateRoute, PagesPage } from './pages'
import { RedirectCreateRoute, RedirectsPage } from './redirects'
import { ReferersPage, RemoteAddrPage, RequestLimitPage } from './traffic'
import {
  ReverseProxyPage,
  ReverseProxySchedulingPage,
  ReverseProxySchedulingPopupRoute,
  ReverseProxySettingPage,
} from './reverseProxy'
import { RewriteCreateRoute, RewritePage, RewriteUpdateRoute } from './rewrite'
import { StatPage, TcpPage, UdpPage, UnixPage, UserAgentPage } from './misc'
import { WebCreateIndexRoute, WebRootPage, WebsocketCreateOriginRoute, WebsocketPage, WebpPage } from './web'
import { WafGroupPage, WafGroupsPage, WafIndexPage } from './waf'
import {
  CountriesPage,
  IPListPage,
  ProvincesPage,
  ProvidersPage,
  SelectCountriesRoute,
  SelectProvidersRoute,
  SelectProvincesRoute,
  UpdateIPRoute,
  WafTestPage,
} from './wafIpadmin'

export const routes: AppRoute[] = [
  { path: '/servers/server/settings/origins/addPopup', element: <OriginsAddPage /> },
  { path: '/servers/server/settings/origins/updatePopup', element: <OriginsUpdatePage /> },

  { path: '/servers/server/settings/pages', element: <PagesPage /> },
  { path: '/servers/server/settings/pages/createPopup', element: <PageCreateRoute /> },
  { path: '/servers/server/settings/pages/updatePopup', element: <PageUpdateRoute /> },

  { path: '/servers/server/settings/redirects', element: <RedirectsPage /> },
  { path: '/servers/server/settings/redirects/createPopup', element: <RedirectCreateRoute /> },

  { path: '/servers/server/settings/referers', element: <ReferersPage /> },
  { path: '/servers/server/settings/remoteAddr', element: <RemoteAddrPage /> },
  { path: '/servers/server/settings/requestLimit', element: <RequestLimitPage /> },

  { path: '/servers/server/settings/reverseProxy', element: <ReverseProxyPage /> },
  { path: '/servers/server/settings/reverseProxy/scheduling', element: <ReverseProxySchedulingPage /> },
  { path: '/servers/server/settings/reverseProxy/setting', element: <ReverseProxySettingPage /> },
  {
    path: '/servers/server/settings/reverseProxy/updateSchedulingPopup',
    element: <ReverseProxySchedulingPopupRoute />,
  },

  { path: '/servers/server/settings/rewrite', element: <RewritePage /> },
  { path: '/servers/server/settings/rewrite/createPopup', element: <RewriteCreateRoute /> },
  { path: '/servers/server/settings/rewrite/updatePopup', element: <RewriteUpdateRoute /> },

  { path: '/servers/server/settings/stat', element: <StatPage /> },
  { path: '/servers/server/settings/tcp', element: <TcpPage /> },
  { path: '/servers/server/settings/udp', element: <UdpPage /> },
  { path: '/servers/server/settings/unix', element: <UnixPage /> },
  { path: '/servers/server/settings/userAgent', element: <UserAgentPage /> },

  { path: '/servers/server/settings/waf', element: <WafIndexPage /> },
  { path: '/servers/server/settings/waf/groups', element: <WafGroupsPage /> },
  { path: '/servers/server/settings/waf/group', element: <WafGroupPage /> },

  { path: '/servers/server/settings/waf/ipadmin/allowList', element: <IPListPage listType="white" /> },
  { path: '/servers/server/settings/waf/ipadmin/denyList', element: <IPListPage listType="black" /> },
  { path: '/servers/server/settings/waf/ipadmin/greyList', element: <IPListPage listType="grey" /> },
  { path: '/servers/server/settings/waf/ipadmin/countries', element: <CountriesPage /> },
  { path: '/servers/server/settings/waf/ipadmin/provinces', element: <ProvincesPage /> },
  { path: '/servers/server/settings/waf/ipadmin/providers', element: <ProvidersPage /> },
  { path: '/servers/server/settings/waf/ipadmin/test', element: <WafTestPage /> },
  { path: '/servers/server/settings/waf/ipadmin/updateIPPopup', element: <UpdateIPRoute /> },
  { path: '/servers/server/settings/waf/ipadmin/selectCountriesPopup', element: <SelectCountriesRoute /> },
  { path: '/servers/server/settings/waf/ipadmin/selectProvincesPopup', element: <SelectProvincesRoute /> },
  { path: '/servers/server/settings/waf/ipadmin/selectProvidersPopup', element: <SelectProvidersRoute /> },

  { path: '/servers/server/settings/web', element: <WebRootPage /> },
  { path: '/servers/server/settings/web/createIndex', element: <WebCreateIndexRoute /> },
  { path: '/servers/server/settings/webp', element: <WebpPage /> },
  { path: '/servers/server/settings/websocket', element: <WebsocketPage /> },
  { path: '/servers/server/settings/websocket/createOrigin', element: <WebsocketCreateOriginRoute /> },
]
