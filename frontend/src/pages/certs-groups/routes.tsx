import { Navigate, useSearchParams } from 'react-router-dom'
import type { AppRoute } from '../types'
import { CertsPage } from './certs/CertsPage'
import { CertSelectPage } from './certs/CertSelectPage'
import { CertsAcmePage } from './certs/CertsAcmePage'
import { AcmeCreatePage } from './certs/AcmeCreatePage'
import { AcmeUsersPage } from './certs/AcmeUsersPage'
import { AcmeAccountsPage } from './certs/AcmeAccountsPage'
import { OcspPage } from './certs/OcspPage'
import {
  AcmeAccountCreatePage,
  AcmeAccountUpdatePage,
  AcmeUpdateTaskPage,
  AcmeUserCreatePage,
  AcmeUserUpdatePage,
  CertBatchUploadPage,
  CertDetailPage,
  CertUpdatePage,
  CertUploadPage,
} from './certs/CertPopupPages'
import { GroupsPage } from './groups/GroupsPage'
import { GroupDetailPage } from './groups/GroupDetailPage'
import { GroupUpdatePage } from './groups/GroupUpdatePage'
import { GroupCreatePage, GroupSelectPage } from './groups/GroupPopupPages'
import {
  GroupSettingsAccessLogPage,
  GroupSettingsCharsetPage,
  GroupSettingsCompressionPage,
  GroupSettingsPagesPage,
  GroupSettingsRemoteAddrPage,
  GroupSettingsRequestLimitPage,
  GroupSettingsStatPage,
  GroupSettingsWebPage,
  GroupSettingsWebpPage,
  GroupSettingsWebsocketPage,
} from './groups/settings/WebSettingsPages'
import { GroupSettingsHeadersPage } from './groups/settings/HeadersSettingsPage'
import {
  GroupSettingsCacheFetchPage,
  GroupSettingsCachePage,
  GroupSettingsCachePurgePage,
} from './groups/settings/CacheSettingsPages'
import {
  GroupSettingsHttpProxyPage,
  GroupSettingsHttpProxySchedulingPage,
  GroupSettingsHttpProxySettingPage,
  GroupSettingsTcpProxyPage,
  GroupSettingsTcpProxySchedulingPage,
  GroupSettingsTcpProxySettingPage,
  GroupSettingsUdpProxyPage,
  GroupSettingsUdpProxySchedulingPage,
  GroupSettingsUdpProxySettingPage,
} from './groups/settings/ProxySettingsPages'

function GroupSettingsIndexPage() {
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId') || '0'
  return <Navigate to={`/servers/groups/group/settings/httpReverseProxy?groupId=${groupId}`} replace />
}

export const routes: AppRoute[] = [
  { path: '/servers/certs', element: <CertsPage /> },
  { path: '/servers/certs/uploadPopup', element: <CertUploadPage /> },
  { path: '/servers/certs/uploadBatchPopup', element: <CertBatchUploadPage /> },
  { path: '/servers/certs/updatePopup', element: <CertUpdatePage /> },
  { path: '/servers/certs/certPopup', element: <CertDetailPage /> },
  { path: '/servers/certs/selectPopup', element: <CertSelectPage /> },
  { path: '/servers/certs/acme', element: <CertsAcmePage /> },
  { path: '/servers/certs/acme/create', element: <AcmeCreatePage /> },
  { path: '/servers/certs/acme/updateTaskPopup', element: <AcmeUpdateTaskPage /> },
  { path: '/servers/certs/acme/users', element: <AcmeUsersPage /> },
  { path: '/servers/certs/acme/users/createPopup', element: <AcmeUserCreatePage /> },
  { path: '/servers/certs/acme/users/updatePopup', element: <AcmeUserUpdatePage /> },
  { path: '/servers/certs/acme/accounts', element: <AcmeAccountsPage /> },
  { path: '/servers/certs/acme/accounts/createPopup', element: <AcmeAccountCreatePage /> },
  { path: '/servers/certs/acme/accounts/updatePopup', element: <AcmeAccountUpdatePage /> },
  { path: '/servers/certs/ocsp', element: <OcspPage /> },

  { path: '/servers/groups', element: <GroupsPage /> },
  { path: '/servers/groups/createPopup', element: <GroupCreatePage /> },
  { path: '/servers/groups/selectPopup', element: <GroupSelectPage /> },
  { path: '/servers/groups/group', element: <GroupDetailPage /> },
  { path: '/servers/groups/group/update', element: <GroupUpdatePage /> },
  { path: '/servers/groups/group/settings', element: <GroupSettingsIndexPage /> },
  { path: '/servers/groups/group/settings/accessLog', element: <GroupSettingsAccessLogPage /> },
  { path: '/servers/groups/group/settings/cache', element: <GroupSettingsCachePage /> },
  { path: '/servers/groups/group/settings/cache/purge', element: <GroupSettingsCachePurgePage /> },
  { path: '/servers/groups/group/settings/cache/fetch', element: <GroupSettingsCacheFetchPage /> },
  { path: '/servers/groups/group/settings/charset', element: <GroupSettingsCharsetPage /> },
  { path: '/servers/groups/group/settings/compression', element: <GroupSettingsCompressionPage /> },
  { path: '/servers/groups/group/settings/headers', element: <GroupSettingsHeadersPage /> },
  { path: '/servers/groups/group/settings/httpReverseProxy', element: <GroupSettingsHttpProxyPage /> },
  { path: '/servers/groups/group/settings/httpReverseProxy/scheduling', element: <GroupSettingsHttpProxySchedulingPage /> },
  { path: '/servers/groups/group/settings/httpReverseProxy/setting', element: <GroupSettingsHttpProxySettingPage /> },
  { path: '/servers/groups/group/settings/tcpReverseProxy', element: <GroupSettingsTcpProxyPage /> },
  { path: '/servers/groups/group/settings/tcpReverseProxy/scheduling', element: <GroupSettingsTcpProxySchedulingPage /> },
  { path: '/servers/groups/group/settings/tcpReverseProxy/setting', element: <GroupSettingsTcpProxySettingPage /> },
  { path: '/servers/groups/group/settings/udpReverseProxy', element: <GroupSettingsUdpProxyPage /> },
  { path: '/servers/groups/group/settings/udpReverseProxy/scheduling', element: <GroupSettingsUdpProxySchedulingPage /> },
  { path: '/servers/groups/group/settings/udpReverseProxy/setting', element: <GroupSettingsUdpProxySettingPage /> },
  { path: '/servers/groups/group/settings/pages', element: <GroupSettingsPagesPage /> },
  { path: '/servers/groups/group/settings/remoteAddr', element: <GroupSettingsRemoteAddrPage /> },
  { path: '/servers/groups/group/settings/requestLimit', element: <GroupSettingsRequestLimitPage /> },
  { path: '/servers/groups/group/settings/stat', element: <GroupSettingsStatPage /> },
  { path: '/servers/groups/group/settings/web', element: <GroupSettingsWebPage /> },
  { path: '/servers/groups/group/settings/webp', element: <GroupSettingsWebpPage /> },
  { path: '/servers/groups/group/settings/websocket', element: <GroupSettingsWebsocketPage /> },
]
