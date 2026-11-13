import type { AppRoute } from '../types'
import { ServersPage } from './ServersPage'
import { ServerCreatePage } from './ServerCreatePage'
import { ServerDetailPage } from './ServerDetailPage'
import { ServerDeletePage } from './ServerDeletePage'
import { ServerLogHistoryPage, ServerLogRealtimePage, ServerLogTodayPage } from './ServerLogPages'
import {
  ServerStatClientsPage,
  ServerStatDailyRequestsPage,
  ServerStatHourlyRequestsPage,
  ServerStatPage,
  ServerStatProvidersPage,
  ServerStatRegionsPage,
  ServerStatWafPage,
} from './ServerStatPages'
import { ServerLogsPage, ServerLogsSettingsPage } from './ServerLogsPages'
import {
  MetricChartPage,
  MetricChartUpdatePage,
  MetricChartsPage,
  MetricItemPage,
  MetricStatsPage,
  MetricUpdatePage,
  MetricsPage,
} from './MetricsPages'
import { IpboxPage } from './IpboxPage'
import {
  IpListAccessLogsPopupPage,
  IpListBindFirewallPopupPage,
  IpListDetailPage,
  IpListExportPage,
  IpListImportPage,
  IpListItemsPage,
  IpListListsPage,
  IpListSelectPopupPage,
  IpListTestPage,
  IpListUpdatePage,
  IpListsPage,
} from './IpListsPages'

export const routes: AppRoute[] = [
  { path: '/servers', element: <ServersPage /> },
  { path: '/servers/create', element: <ServerCreatePage /> },
  { path: '/servers/server', element: <ServerDetailPage /> },
  { path: '/servers/server/delete', element: <ServerDeletePage /> },
  { path: '/servers/server/log', element: <ServerLogRealtimePage /> },
  { path: '/servers/server/log/today', element: <ServerLogTodayPage /> },
  { path: '/servers/server/log/history', element: <ServerLogHistoryPage /> },
  { path: '/servers/server/stat', element: <ServerStatPage /> },
  { path: '/servers/server/stat/hourlyRequests', element: <ServerStatHourlyRequestsPage /> },
  { path: '/servers/server/stat/dailyRequests', element: <ServerStatDailyRequestsPage /> },
  { path: '/servers/server/stat/regions', element: <ServerStatRegionsPage /> },
  { path: '/servers/server/stat/providers', element: <ServerStatProvidersPage /> },
  { path: '/servers/server/stat/clients', element: <ServerStatClientsPage /> },
  { path: '/servers/server/stat/waf', element: <ServerStatWafPage /> },
  { path: '/servers/logs', element: <ServerLogsPage /> },
  { path: '/servers/logs/settings', element: <ServerLogsSettingsPage /> },
  { path: '/servers/metrics', element: <MetricsPage /> },
  { path: '/servers/metrics/item', element: <MetricItemPage /> },
  { path: '/servers/metrics/update', element: <MetricUpdatePage /> },
  { path: '/servers/metrics/stats', element: <MetricStatsPage /> },
  { path: '/servers/metrics/charts', element: <MetricChartsPage /> },
  { path: '/servers/metrics/charts/chart', element: <MetricChartPage /> },
  { path: '/servers/metrics/charts/update', element: <MetricChartUpdatePage /> },
  { path: '/servers/ipbox', element: <IpboxPage /> },
  { path: '/servers/iplists', element: <IpListsPage /> },
  { path: '/servers/iplists/lists', element: <IpListListsPage /> },
  { path: '/servers/iplists/list', element: <IpListDetailPage /> },
  { path: '/servers/iplists/items', element: <IpListItemsPage /> },
  { path: '/servers/iplists/update', element: <IpListUpdatePage /> },
  { path: '/servers/iplists/test', element: <IpListTestPage /> },
  { path: '/servers/iplists/import', element: <IpListImportPage /> },
  { path: '/servers/iplists/export', element: <IpListExportPage /> },
  { path: '/servers/iplists/selectPopup', element: <IpListSelectPopupPage /> },
  { path: '/servers/iplists/bindHTTPFirewallPopup', element: <IpListBindFirewallPopupPage /> },
  { path: '/servers/iplists/accessLogsPopup', element: <IpListAccessLogsPopupPage /> },
]
