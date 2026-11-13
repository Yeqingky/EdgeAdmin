import { useSearchParams } from 'react-router-dom'
import type { AppRoute } from '../types'
import { CacheListPage } from './CacheListPage'
import { CacheCreatePage } from './CacheCreatePage'
import { CachePolicyDetailPage } from './CachePolicyDetailPage'
import { CacheUpdatePage } from './CacheUpdatePage'
import { CacheCleanPage, CacheFetchPage, CachePurgePage, CacheSelectPage, CacheStatPage, CacheTestPage } from './CacheActionPages'
import { CacheBatchFetchPage, CacheBatchPurgePage, CacheBatchTaskPage, CacheBatchTasksPage } from './CacheBatchPages'
import { LogPage } from './LogPage'
import { WafListPage, WafSelectPage } from './WafListPage'
import { WafCreatePage } from './WafCreatePage'
import { WafPolicyPage } from './WafPolicyPage'
import { WafUpdatePage } from './WafUpdatePage'
import { WafGroupsPage } from './WafGroupsPage'
import { WafGroupPage } from './WafGroupPage'
import { WafCreateGroupPage, WafUpdateGroupPage } from './WafGroupFormPages'
import { WafCreateRulePage, WafCreateSetPage, WafSetCodePage, WafUpdateSetPage } from './WafSetFormPages'
import { WafLogPage } from './WafLogPage'
import { WafExportPage, WafImportPage, WafTestPage } from './WafTransferPages'
import {
  WafIpAdminProvincesPage,
  WafIpAdminProvidersPage,
  WafIpAdminRegionPage,
} from './WafIpAdminRegionPages'
import { WafIpAdminListsPage, WafIpAdminTestPage, WafIpAdminUpdateIPPage } from './WafIpAdminListsPages'

function CachePolicyRoute({ page }: { page: 'policy' | 'update' | 'clean' | 'purge' | 'fetch' | 'stat' | 'test' }) {
  const [searchParams] = useSearchParams()
  const cachePolicyId = Number(searchParams.get('cachePolicyId') || 0) || 0
  switch (page) {
    case 'policy':
      return <CachePolicyDetailPage cachePolicyId={cachePolicyId} />
    case 'update':
      return <CacheUpdatePage cachePolicyId={cachePolicyId} />
    case 'clean':
      return <CacheCleanPage cachePolicyId={cachePolicyId} />
    case 'purge':
      return <CachePurgePage cachePolicyId={cachePolicyId} />
    case 'fetch':
      return <CacheFetchPage cachePolicyId={cachePolicyId} />
    case 'stat':
      return <CacheStatPage cachePolicyId={cachePolicyId} />
    case 'test':
      return <CacheTestPage cachePolicyId={cachePolicyId} />
  }
}

function WafPolicyRoute({ page }: { page: 'policy' | 'update' | 'log' | 'export' | 'import' | 'test' }) {
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  switch (page) {
    case 'policy':
      return <WafPolicyPage firewallPolicyId={firewallPolicyId} />
    case 'update':
      return <WafUpdatePage firewallPolicyId={firewallPolicyId} />
    case 'log':
      return <WafLogPage firewallPolicyId={firewallPolicyId} />
    case 'export':
      return <WafExportPage firewallPolicyId={firewallPolicyId} />
    case 'import':
      return <WafImportPage firewallPolicyId={firewallPolicyId} />
    case 'test':
      return <WafTestPage firewallPolicyId={firewallPolicyId} />
  }
}

function WafGroupsRoute() {
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const type = searchParams.get('type') || 'inbound'
  return <WafGroupsPage firewallPolicyId={firewallPolicyId} type={type} />
}

function WafGroupRoute() {
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const type = searchParams.get('type') || 'inbound'
  return <WafGroupPage firewallPolicyId={firewallPolicyId} type={type} groupId={groupId} />
}

function CacheBatchTaskRoute() {
  const [searchParams] = useSearchParams()
  const taskId = Number(searchParams.get('taskId') || 0) || 0
  return <CacheBatchTaskPage taskId={taskId} />
}

function WafIpAdminRoute({ page }: { page: 'region' | 'provinces' | 'providers' | 'lists' | 'test' }) {
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  switch (page) {
    case 'region':
      return <WafIpAdminRegionPage firewallPolicyId={firewallPolicyId} />
    case 'provinces':
      return <WafIpAdminProvincesPage firewallPolicyId={firewallPolicyId} />
    case 'providers':
      return <WafIpAdminProvidersPage firewallPolicyId={firewallPolicyId} />
    case 'lists':
      return <WafIpAdminListsPage firewallPolicyId={firewallPolicyId} />
    case 'test':
      return <WafIpAdminTestPage firewallPolicyId={firewallPolicyId} />
  }
}

export const routes: AppRoute[] = [
  { path: '/servers/components/cache', element: <CacheListPage /> },
  { path: '/servers/components/cache/createPopup', element: <CacheCreatePage /> },
  { path: '/servers/components/cache/policy', element: <CachePolicyRoute page="policy" /> },
  { path: '/servers/components/cache/update', element: <CachePolicyRoute page="update" /> },
  { path: '/servers/components/cache/clean', element: <CachePolicyRoute page="clean" /> },
  { path: '/servers/components/cache/purge', element: <CachePolicyRoute page="purge" /> },
  { path: '/servers/components/cache/fetch', element: <CachePolicyRoute page="fetch" /> },
  { path: '/servers/components/cache/stat', element: <CachePolicyRoute page="stat" /> },
  { path: '/servers/components/cache/test', element: <CachePolicyRoute page="test" /> },
  { path: '/servers/components/cache/selectPopup', element: <CacheSelectPage /> },

  { path: '/servers/components/cache/batch', element: <CacheBatchPurgePage /> },
  { path: '/servers/components/cache/batch/fetch', element: <CacheBatchFetchPage /> },
  { path: '/servers/components/cache/batch/tasks', element: <CacheBatchTasksPage /> },
  { path: '/servers/components/cache/batch/task', element: <CacheBatchTaskRoute /> },

  { path: '/servers/components/log', element: <LogPage /> },

  { path: '/servers/components/waf', element: <WafListPage /> },
  { path: '/servers/components/waf/createPopup', element: <WafCreatePage /> },
  { path: '/servers/components/waf/selectPopup', element: <WafSelectPage /> },
  { path: '/servers/components/waf/policy', element: <WafPolicyRoute page="policy" /> },
  { path: '/servers/components/waf/update', element: <WafPolicyRoute page="update" /> },
  { path: '/servers/components/waf/log', element: <WafPolicyRoute page="log" /> },
  { path: '/servers/components/waf/export', element: <WafPolicyRoute page="export" /> },
  { path: '/servers/components/waf/import', element: <WafPolicyRoute page="import" /> },
  { path: '/servers/components/waf/test', element: <WafPolicyRoute page="test" /> },
  { path: '/servers/components/waf/groups', element: <WafGroupsRoute /> },
  { path: '/servers/components/waf/group', element: <WafGroupRoute /> },
  { path: '/servers/components/waf/createGroupPopup', element: <WafCreateGroupPage /> },
  { path: '/servers/components/waf/updateGroupPopup', element: <WafUpdateGroupPage /> },
  { path: '/servers/components/waf/createSetPopup', element: <WafCreateSetPage /> },
  { path: '/servers/components/waf/updateSetPopup', element: <WafUpdateSetPage /> },
  { path: '/servers/components/waf/createRulePopup', element: <WafCreateRulePage /> },
  { path: '/servers/components/waf/setCodePopup', element: <WafSetCodePage /> },

  { path: '/servers/components/waf/ipadmin', element: <WafIpAdminRoute page="region" /> },
  { path: '/servers/components/waf/ipadmin/provinces', element: <WafIpAdminRoute page="provinces" /> },
  { path: '/servers/components/waf/ipadmin/providers', element: <WafIpAdminRoute page="providers" /> },
  { path: '/servers/components/waf/ipadmin/lists', element: <WafIpAdminRoute page="lists" /> },
  { path: '/servers/components/waf/ipadmin/test', element: <WafIpAdminRoute page="test" /> },
  { path: '/servers/components/waf/ipadmin/updateIPPopup', element: <WafIpAdminUpdateIPPage /> },
]
