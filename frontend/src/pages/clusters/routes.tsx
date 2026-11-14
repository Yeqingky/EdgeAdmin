import type { AppRoute } from '../types'
import { ClustersPage } from './ClustersPage'
import { ClustersNodesPage } from './ClustersNodesPage'
import { ClusterCreateNodeIndexPage, ClusterCreatePage, ClusterSelectPopupPage } from './ClusterCreatePages'
import {
  ClusterCreateBatchPage,
  ClusterDeletePage,
  ClusterIndexRedirectPage,
  ClusterInstallManualPage,
  ClusterInstallNodesPage,
  ClusterInstallRemotePage,
  ClusterUpdateNodeSSHPage,
} from './ClusterClusterPages'
import {
  ClusterGroupCreatePopupPage,
  ClusterGroupsPage,
  ClusterGroupSelectPopupPage,
  ClusterGroupUpdatePopupPage,
} from './ClusterGroupsPages'
import {
  GrantCreatePage,
  GrantCreatePopupPage,
  GrantDetailPage,
  GrantSelectPopupPage,
  GrantTestPage,
  GrantUpdatePage,
  GrantUpdatePopupPage,
  GrantsPage,
} from './GrantsPages'
import { LogsPage } from './LogsPage'
import {
  RegionCreatePopupPage,
  RegionNodesPage,
  RegionsPage,
  RegionSelectPopupPage,
  RegionUpdateNodeRegionPopupPage,
  RegionUpdatePopupPage,
} from './RegionsPages'
import { ClusterTasksPage } from './TasksPopupPage'
import { ClusterSettingsBasicPage } from './settings/SettingsBasicPage'
import { ClusterSettingsDnsPage, ClusterSettingsDnsRecordsPage } from './settings/SettingsDnsPage'
import { ClusterSettingsFrpPage } from './settings/SettingsFrpPage'
import { ClusterSettingsHealthPage, ClusterSettingsHealthRunPopupPage } from './settings/SettingsHealthPage'
import {
  ClusterSettingsCachePage,
  ClusterSettingsDdosProtectionPage,
  ClusterSettingsDdosStatusPage,
  ClusterSettingsServicesPage,
  ClusterSettingsServicesStatusPage,
  ClusterSettingsWafPage,
  ClusterSettingsWebpPage,
} from './settings/SettingsPolicyPages'
import {
  ClusterSettingsFirewallActionCreatePopupPage,
  ClusterSettingsFirewallActionsPage,
  ClusterSettingsFirewallActionUpdatePopupPage,
} from './settings/SettingsFirewallActionsPage'
import { ClusterSettingsMetricCreatePopupPage, ClusterSettingsMetricsPage } from './settings/SettingsMetricsPage'
import { ClusterSettingsGlobalServerConfigPage } from './settings/SettingsGlobalServerConfigPage'

export const routes: AppRoute[] = [
  { path: '/clusters', element: <ClustersPage /> },
  { path: '/clusters/nodes', element: <ClustersNodesPage /> },
  { path: '/clusters/create', element: <ClusterCreatePage /> },
  { path: '/clusters/createNode', element: <ClusterCreateNodeIndexPage /> },
  { path: '/clusters/selectPopup', element: <ClusterSelectPopupPage /> },

  { path: '/clusters/cluster', element: <ClusterIndexRedirectPage /> },
  { path: '/clusters/cluster/delete', element: <ClusterDeletePage /> },
  { path: '/clusters/cluster/createBatch', element: <ClusterCreateBatchPage /> },
  { path: '/clusters/cluster/installNodes', element: <ClusterInstallNodesPage /> },
  { path: '/clusters/cluster/installManual', element: <ClusterInstallManualPage /> },
  { path: '/clusters/cluster/installRemote', element: <ClusterInstallRemotePage /> },
  { path: '/clusters/cluster/updateNodeSSH', element: <ClusterUpdateNodeSSHPage /> },

  { path: '/clusters/cluster/groups', element: <ClusterGroupsPage /> },
  { path: '/clusters/cluster/groups/createPopup', element: <ClusterGroupCreatePopupPage /> },
  { path: '/clusters/cluster/groups/updatePopup', element: <ClusterGroupUpdatePopupPage /> },
  { path: '/clusters/cluster/groups/selectPopup', element: <ClusterGroupSelectPopupPage /> },

  { path: '/clusters/cluster/settings', element: <ClusterSettingsBasicPage /> },
  { path: '/clusters/cluster/settings/dns', element: <ClusterSettingsDnsPage /> },
  { path: '/clusters/cluster/settings/dns/records', element: <ClusterSettingsDnsRecordsPage /> },
  { path: '/clusters/cluster/settings/frp', element: <ClusterSettingsFrpPage /> },
  { path: '/clusters/cluster/settings/health', element: <ClusterSettingsHealthPage /> },
  { path: '/clusters/cluster/settings/health/runPopup', element: <ClusterSettingsHealthRunPopupPage /> },
  { path: '/clusters/cluster/settings/cache', element: <ClusterSettingsCachePage /> },
  { path: '/clusters/cluster/settings/waf', element: <ClusterSettingsWafPage /> },
  { path: '/clusters/cluster/settings/webp', element: <ClusterSettingsWebpPage /> },
  { path: '/clusters/cluster/settings/services', element: <ClusterSettingsServicesPage /> },
  { path: '/clusters/cluster/settings/services/status', element: <ClusterSettingsServicesStatusPage /> },
  { path: '/clusters/cluster/settings/ddos-protection', element: <ClusterSettingsDdosProtectionPage /> },
  { path: '/clusters/cluster/settings/ddos-protection/status', element: <ClusterSettingsDdosStatusPage /> },
  { path: '/clusters/cluster/settings/firewall-actions', element: <ClusterSettingsFirewallActionsPage /> },
  { path: '/clusters/cluster/settings/firewall-actions/createPopup', element: <ClusterSettingsFirewallActionCreatePopupPage /> },
  { path: '/clusters/cluster/settings/firewall-actions/updatePopup', element: <ClusterSettingsFirewallActionUpdatePopupPage /> },
  { path: '/clusters/cluster/settings/metrics', element: <ClusterSettingsMetricsPage /> },
  { path: '/clusters/cluster/settings/metrics/createPopup', element: <ClusterSettingsMetricCreatePopupPage /> },
  { path: '/clusters/cluster/settings/global-server-config', element: <ClusterSettingsGlobalServerConfigPage /> },

  { path: '/clusters/grants', element: <GrantsPage /> },
  { path: '/clusters/grants/create', element: <GrantCreatePage /> },
  { path: '/clusters/grants/update', element: <GrantUpdatePage /> },
  { path: '/clusters/grants/grant', element: <GrantDetailPage /> },
  { path: '/clusters/grants/test', element: <GrantTestPage /> },
  { path: '/clusters/grants/createPopup', element: <GrantCreatePopupPage /> },
  { path: '/clusters/grants/updatePopup', element: <GrantUpdatePopupPage /> },
  { path: '/clusters/grants/selectPopup', element: <GrantSelectPopupPage /> },

  { path: '/clusters/logs', element: <LogsPage /> },

  { path: '/clusters/regions', element: <RegionsPage /> },
  { path: '/clusters/regions/nodes', element: <RegionNodesPage /> },
  { path: '/clusters/regions/createPopup', element: <RegionCreatePopupPage /> },
  { path: '/clusters/regions/updatePopup', element: <RegionUpdatePopupPage /> },
  { path: '/clusters/regions/updateNodeRegionPopup', element: <RegionUpdateNodeRegionPopupPage /> },
  { path: '/clusters/regions/selectPopup', element: <RegionSelectPopupPage /> },

  { path: '/clusters/tasks/listPopup', element: <ClusterTasksPage /> },
]
