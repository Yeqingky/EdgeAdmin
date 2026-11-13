import type { AppRoute } from '../types'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'

function RedirectToParent({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search}`} replace />
}

function GroupWafRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const groupId = Number(params.get('groupId') || 0)
  const query = useQuery({
    queryKey: ['group-waf-redirect', groupId],
    queryFn: () => apiGet<{ firewallPolicyId: number }>('/servers/groups/group/settings/waf', { groupId }),
    enabled: groupId > 0,
  })
  if (groupId <= 0) {
    return <div className="ui negative message">缺少groupId参数。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  const firewallPolicyId = query.data?.firewallPolicyId || 0
  if (firewallPolicyId <= 0) {
    return <Navigate to={`/servers/groups/group${location.search}`} replace />
  }
  return <Navigate to={`/servers/components/waf/policy?firewallPolicyId=${firewallPolicyId}`} replace />
}

const redirects: Record<string, string> = {
  '/clusters/cluster/settings/message': '/clusters/cluster/settings',
  '/clusters/cluster/settings/message/selectReceiverPopup': '/clusters/cluster/settings',
  '/dns/domains/clustersPopup': '/dns',
  '/dns/domains/createPopup': '/dns',
  '/dns/domains/nodesPopup': '/dns',
  '/dns/domains/routesPopup': '/dns',
  '/dns/domains/serversPopup': '/dns',
  '/dns/domains/updatePopup': '/dns',
  '/dns/issues/updateNodePopup': '/dns/issues',
  '/dns/updateClusterPopup': '/dns',
  '/servers/addOriginPopup': '/servers',
  '/servers/addPortPopup': '/servers',
  '/servers/addServerNamePopup': '/servers',
  '/servers/serverNamesPopup': '/servers/server',
  '/servers/groups/group/settings/cache/createPopup': '/servers/groups/group/settings/cache',
  '/servers/groups/group/settings/compression/gzip': '/servers/groups/group/settings/compression',
  '/servers/iplists/createIPPopup': '/servers/iplists',
  '/servers/iplists/createPopup': '/servers/iplists',
  '/servers/iplists/updateIPPopup': '/servers/iplists',
  '/servers/metrics/charts/createPopup': '/servers/metrics/charts',
  '/servers/metrics/createPopup': '/servers/metrics',
  '/servers/server/log/viewPopup': '/servers/server/log',
  '/servers/server/settings/access/createPopup': '/servers/server/settings/access',
  '/servers/server/settings/access/updatePopup': '/servers/server/settings/access',
  '/servers/server/settings/cache/createPopup': '/servers/server/settings/cache',
  '/servers/server/settings/compression/gzip': '/servers/server/settings/compression',
  '/servers/server/settings/conds/addCondPopup': '/servers/server/settings/cache',
  '/servers/server/settings/conds/addGroupPopup': '/servers/server/settings/cache',
  '/servers/server/settings/dns/updateCNAMEPopup': '/servers/server/settings/dns',
  '/servers/server/settings/fastcgi/createPopup': '/servers/server/settings/fastcgi',
  '/servers/server/settings/fastcgi/updatePopup': '/servers/server/settings/fastcgi',
  '/servers/server/settings/headers/createDeletePopup': '/servers/server/settings/headers',
  '/servers/server/settings/headers/createNonStandardPopup': '/servers/server/settings/headers',
  '/servers/server/settings/headers/createSetPopup': '/servers/server/settings/headers',
  '/servers/server/settings/headers/updateCORSPopup': '/servers/server/settings/headers',
  '/servers/server/settings/headers/updateSetPopup': '/servers/server/settings/headers',
  '/servers/server/settings/https/requestCertPopup': '/servers/server/settings/https',
  '/servers/server/settings/locations/compression/gzip': '/servers/server/settings/locations/compression',
  '/servers/server/settings/locations/reverseProxy/updateSchedulingPopup': '/servers/server/settings/locations/reverseProxy/scheduling',
  '/servers/server/settings/traffic': '/servers/server/settings',
  '/setup/mysql/installPopup': '/setup',
}

const groupWafPaths = [
  '/servers/groups/group/settings/waf/group',
  '/servers/groups/group/settings/waf/groups',
  '/servers/groups/group/settings/waf/ipadmin/allowList',
  '/servers/groups/group/settings/waf/ipadmin/countries',
  '/servers/groups/group/settings/waf/ipadmin/denyList',
  '/servers/groups/group/settings/waf/ipadmin/provinces',
  '/servers/groups/group/settings/waf/ipadmin/test',
  '/servers/groups/group/settings/waf/ipadmin/updateIPPopup',
]

const routes: AppRoute[] = [
  ...Object.entries(redirects).map(([path, to]) => ({ path, element: <RedirectToParent to={to} /> })),
  { path: '/servers/groups/group/settings/waf', element: <GroupWafRedirect /> },
  ...groupWafPaths.map((path) => ({ path, element: <GroupWafRedirect /> })),
]

export { routes }
