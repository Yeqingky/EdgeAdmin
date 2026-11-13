import { Navigate, useSearchParams } from 'react-router-dom'
import type { AppRoute } from '../types'
import { NodesPage } from './NodesPage'
import { NodeDetailPage } from './NodeDetailPage'
import { NodeLogsPage } from './NodeLogsPage'
import { NodeInstallPage } from './NodeInstallPage'
import { NodeUpdatePage } from './NodeUpdatePage'
import { NodeDNSPopupPage } from './NodeDNSPopupPage'
import { NodeCacheSettingsPage } from './NodeCacheSettingsPage'
import { NodeDNSSettingsPage } from './NodeDNSSettingsPage'
import { NodeSSHSettingsPage } from './NodeSSHSettingsPage'
import { NodeSystemSettingsPage } from './NodeSystemSettingsPage'
import { NodeDDoSSettingsPage } from './NodeDDoSSettingsPage'
import { CreateNodePage } from './CreateNodePage'
import { UpgradeRemotePage } from './UpgradeRemotePage'
import { DnsIndexPage } from './DnsIndexPage'
import { DnsClusterPage } from './DnsClusterPage'
import { DnsProvidersPage } from './DnsProvidersPage'
import { DnsProviderPage } from './DnsProviderPage'
import { DnsProviderFormPage } from './DnsProviderFormPage'
import { DnsIssuesPage } from './DnsIssuesPage'
import { DnsTasksPage } from './DnsTasksPage'
import { DomainSelectForm } from './dnsForms'
import { MenuLinks } from './ui'

function NodeIndexRedirect() {
  const [searchParams] = useSearchParams()
  const clusterId = searchParams.get('clusterId') || ''
  const nodeId = searchParams.get('nodeId') || ''
  return <Navigate to={`/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${nodeId}`} replace />
}

function DomainSelectPage() {
  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns' },
          { name: 'DNS服务商', to: '/dns/providers' },
          { name: '选择域名', to: '/dns/domains/selectPopup', active: true },
        ]}
      />
      <DomainSelectForm />
    </div>
  )
}

export const routes: AppRoute[] = [
  { path: '/clusters/cluster/nodes', element: <NodesPage /> },
  { path: '/clusters/cluster/node', element: <NodeIndexRedirect /> },
  { path: '/clusters/cluster/node/detail', element: <NodeDetailPage /> },
  { path: '/clusters/cluster/node/logs', element: <NodeLogsPage /> },
  { path: '/clusters/cluster/node/install', element: <NodeInstallPage /> },
  { path: '/clusters/cluster/node/update', element: <NodeUpdatePage /> },
  { path: '/clusters/cluster/node/updateDNSPopup', element: <NodeDNSPopupPage /> },
  { path: '/clusters/cluster/node/settings/cache', element: <NodeCacheSettingsPage /> },
  { path: '/clusters/cluster/node/settings/dns', element: <NodeDNSSettingsPage /> },
  { path: '/clusters/cluster/node/settings/ssh', element: <NodeSSHSettingsPage /> },
  { path: '/clusters/cluster/node/settings/system', element: <NodeSystemSettingsPage /> },
  { path: '/clusters/cluster/node/settings/ddos-protection', element: <NodeDDoSSettingsPage /> },
  { path: '/clusters/cluster/createNode', element: <CreateNodePage /> },
  { path: '/clusters/cluster/upgradeRemote', element: <UpgradeRemotePage /> },
  { path: '/dns', element: <DnsIndexPage /> },
  { path: '/dns/clusters/cluster', element: <DnsClusterPage /> },
  { path: '/dns/providers', element: <DnsProvidersPage /> },
  { path: '/dns/providers/provider', element: <DnsProviderPage /> },
  { path: '/dns/providers/createPopup', element: <DnsProviderFormPage mode="create" /> },
  { path: '/dns/providers/updatePopup', element: <DnsProviderFormPage mode="update" /> },
  { path: '/dns/domains/selectPopup', element: <DomainSelectPage /> },
  { path: '/dns/issues', element: <DnsIssuesPage /> },
  { path: '/dns/tasks/listPopup', element: <DnsTasksPage /> },
]
