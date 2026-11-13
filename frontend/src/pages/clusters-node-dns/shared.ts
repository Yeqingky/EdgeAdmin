import { apiPostForm, getCsrfToken } from '../../api/client'

export interface ClusterRef {
  id: number
  name: string
}

export interface OptionRef {
  id: number
  name: string
}

export interface LevelInfo {
  code: number
  name: string
}

export interface SizeCapacity {
  count: number
  unit: string
}

export interface IPAddressItem {
  id: number
  name: string
  ip: string
  originIP?: string | null
  canAccess: boolean
  isOn?: boolean
  isUp?: boolean
  thresholds?: unknown[] | null
  clusters?: ClusterRef[]
}

export interface NodeInstallStatus {
  isRunning: boolean
  isFinished: boolean
  isOk?: boolean
  error?: string
  errorCode?: string
  updatedAt?: number
}

export interface NodeLoginParams {
  host?: string
  port?: number | string
  grantId?: number
}

export interface NodeGrantRef {
  id: number
  name: string
  method?: string
  methodName?: string
  username?: string
}

export interface NodeLoginRef {
  id: number
  name: string
  type: string
  params?: NodeLoginParams
  grant?: NodeGrantRef | null
}

export interface NodeStatus {
  isActive: boolean
  updatedAt: number
  hostname?: string
  cpuUsage: number
  cpuUsageText: string
  memUsage: number
  memUsageText: string
  trafficInBytes?: number
  trafficOutBytes?: number
  load1m?: string
  load5m?: string
  load15m?: string
  countConnections?: number
  connectionCount?: number
  buildVersion?: string
  cpuPhysicalCount?: number
  cpuLogicalCount?: number
  cacheTotalDiskSize?: string
  cacheTotalMemorySize?: string
  exePath?: string
  apiSuccessPercent?: number
  apiAvgCostSeconds?: number
  diskWritingSpeedMB?: number
}

export interface NodeListItem {
  id: number
  name: string
  isInstalled: boolean
  isOn: boolean
  isUp: boolean
  isBackup: boolean
  offlineDay: string
  installStatus: NodeInstallStatus
  status: NodeStatus
  cluster: ClusterRef
  secondaryClusters?: ClusterRef[] | null
  isSynced: boolean
  ipAddresses: IPAddressItem[]
  group?: OptionRef | null
  region?: OptionRef | null
  dnsRouteNames: string[]
  level: number
}

export interface NodesData {
  groupId: number
  regionId: number
  installState: number
  activeState: number
  keyword: string
  level: number
  hasOrder: boolean
  hasClusterDNS: boolean
  countAll: number
  page: string
  nodes: NodeListItem[]
  groups: OptionRef[]
  regions: OptionRef[]
  levels: LevelInfo[]
}

export interface NodeBase {
  id: number
  name: string
  isOn: boolean
  isUp?: boolean
  group?: OptionRef | null
  level: number
  bypassMobile?: number
}

export interface NodeDetail extends NodeBase {
  ipAddresses: IPAddressItem[]
  cluster?: ClusterRef | null
  secondaryClusters?: ClusterRef[] | null
  login?: NodeLoginRef | null
  installDir: string
  isInstalled: boolean
  uniqueId: string
  secret: string
  maxCPU: number
  records?: NodeDNSRecord[]
  routes?: NodeDNSRoute[]
  levelInfo?: LevelInfo
  lnAddrs?: string[] | null
  enableIPLists: boolean
  apiNodeAddrs?: string[]
  offlineDay?: string
  isOffline?: boolean
  isBackupForCluster?: boolean
  isBackupForGroup?: boolean
  status?: NodeStatus
  region?: OptionRef | null
  maxCacheDiskCapacity?: SizeCapacity
  maxCacheMemoryCapacity?: SizeCapacity
  cacheDiskDir?: string
  cacheDiskSubDirs?: CacheDir[]
}

export interface NodeDNSRecord {
  name: string
  type: string
  route: string
  value: string
  clusterName: string
  isBackup: boolean
  isOffline: boolean
}

export interface NodeDNSRoute {
  domainName: string
  code: string
  name: string
}

export interface NodeDetailData {
  nodeId: number
  dnsIsExcludingLnNode: boolean
  nodeDatetime: string
  nodeTimeDiff: number
  shouldUpgrade: boolean
  newVersion: string
  node: NodeDetail
}

export interface CacheDir {
  path: string
}

export interface NodeCacheData {
  clusterId: number
  node: NodeBase & {
    maxCacheDiskCapacity: SizeCapacity
    cacheDiskDir: string
    cacheDiskSubDirs: CacheDir[] | null
    maxCacheMemoryCapacity: SizeCapacity
  }
  leftMenuItems?: unknown[]
}

export interface DnsRouteOption {
  domainId: number
  domainName: string
  code: string
  name: string
}

export interface NodeDNSData {
  clusterId: number
  node: NodeBase
  dnsRoutes: DnsRouteOption[]
  allDNSRoutes: DnsRouteOption[]
}

export interface NodeSSHData {
  clusterId: number
  node: NodeBase & { login: NodeLoginRef | null; loginId?: number }
  hostIsAutoFilled: boolean
}

export interface NodeSystemData {
  clusterId: number
  node: NodeBase & { maxCPU: number; bypassMobile: number; bypassMobileCheckbox: boolean }
  dnsResolverConfig: { type: string }
  apiNodeAddrs: NetworkAddressConfig[]
}

export interface NetworkAddressConfig {
  protocol: string
  host: string
  portRange: string
  minPort?: number
  maxPort?: number
}

export interface DDoSProtectionIP {
  ip: string
  description: string
}

export interface DDoSProtectionPort {
  port: number
  description: string
}

export interface DDoSTCPConfig {
  isPrior: boolean
  isOn: boolean
  maxConnections: number
  maxConnectionsPerIP: number
  newConnectionsRate: number
  newConnectionsRateBlockTimeout: number
  newConnectionsSecondlyRate: number
  newConnectionsSecondlyRateBlockTimeout: number
  allowIPList: DDoSProtectionIP[] | null
  ports: DDoSProtectionPort[] | null
}

export interface DDoSProtectionConfig {
  tcp: DDoSTCPConfig | null
}

export interface NodeDDoSData {
  clusterId: number
  node: NodeBase
  nodeId: number
  clusterDDoSProtectionIsOn: boolean
  config: DDoSProtectionConfig
  defaultConfigs: Record<string, number>
}

export interface NodeUpdateData {
  nodeId: number
  node: NodeBase & {
    ipAddresses: IPAddressItem[]
    cluster?: ClusterRef | null
    primaryCluster: ClusterRef | null
    secondaryClusters: ClusterRef[]
    enableIPLists: boolean
    lnAddrs: string[]
    region?: OptionRef | null
    group?: OptionRef | null
  }
  canUpdateLevel: boolean
}

export interface NodeDNSPopupData {
  nodeId: number
  ipAddr: string
  ipAddrId?: number
  routes: DnsRouteOption[]
  domainId: number
  domainName: string
  allRoutes: DnsRouteOption[]
}

export interface NodeLogItem {
  tag: string
  description: string
  createdTime: string
  level: string
  isToday: boolean
  count: number
  server: { id: number; name?: string }
}

export interface NodeLogsData {
  clusterId: number
  node: NodeBase
  tags: { code: string; name: string }[]
  nodeId: number
  dayFrom: string
  dayTo: string
  keyword: string
  level: string
  tag: string
  logs: NodeLogItem[]
  page: string
}

export interface InstallerFile {
  name: string
  os: string
  arch: string
  version: string
}

export interface NodeInstallData {
  clusterId: number
  node: NodeBase & {
    installDir: string
    isInstalled: boolean
    uniqueId: string
    secret: string
    cluster?: ClusterRef | null
  }
  nodeId: number
  exeRoot: string
  installStatus: NodeInstallStatus | null
  apiEndpoints: string
  installerFiles: InstallerFile[] | null
  sshAddr: string
}

export interface CreateNodeData {
  now: number
  dnsDomainId: number
  dnsRoutes: DnsRouteOption[]
  apiEndpoints: string
  installerFiles: InstallerFile[] | null
}

export interface CreatedNode {
  id: number
  name: string
  uniqueId: string
  secret: string
  addresses: string[]
  login: NodeLoginRef
  grant: NodeGrantRef | null
}

export interface CreateNodeResult {
  nodeId: number
  node: CreatedNode
}

export interface UpgradeNodeItem {
  id: number
  name: string
  os: string
  arch: string
  oldVersion: string
  newVersion: string
  login: NodeLoginRef | null
  loginParams: NodeLoginParams
  addresses: IPAddressItem[]
  installStatus: NodeInstallStatus | null
}

export interface UpgradeRemoteData {
  clusterId: number
  nodes: UpgradeNodeItem[]
}

export interface InstallStatusResult {
  status?: NodeInstallStatus | null
  installStatus?: NodeInstallStatus | null
  isInstalled?: boolean
}

export async function postForm(url: string, params: Record<string, unknown>, useCsrf = false): Promise<void> {
  const form = new FormData()
  if (useCsrf) {
    form.set('csrfToken', await getCsrfToken())
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        form.append(key, String(item))
      }
    } else if (typeof value === 'boolean') {
      form.set(key, value ? '1' : '0')
    } else {
      form.set(key, String(value))
    }
  }
  await apiPostForm(url, form)
}

export function isIPv6(ip: string): boolean {
  return ip.includes(':')
}

const UNIT_FACTORS: Record<string, number> = {
  byte: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024,
  pb: 1024 * 1024 * 1024 * 1024 * 1024,
  eb: 1024 * 1024 * 1024 * 1024 * 1024 * 1024,
}

export function formatCapacity(capacity?: SizeCapacity | null): string {
  if (!capacity || !capacity.count || capacity.count <= 0) {
    return ''
  }
  const factor = UNIT_FACTORS[capacity.unit] || 1
  return formatBytes(capacity.count * factor)
}

export function formatBytes(bytes?: number): string {
  const value = bytes || 0
  if (value <= 0) {
    return '0B'
  }
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let current = value
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index++
  }
  return `${current.toFixed(index === 0 ? 0 : 2)}${units[index]}`
}

export function formatBits(bitsPerSecond: number, decimals = 2): string {
  if (!bitsPerSecond || bitsPerSecond <= 0) {
    return '0bps'
  }
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
  let current = bitsPerSecond
  let index = 0
  while (current >= 1000 && index < units.length - 1) {
    current /= 1000
    index++
  }
  return `${current.toFixed(decimals)}${units[index]}`
}

export function formatCount(count: number): string {
  if (!count) {
    return '0'
  }
  return count.toLocaleString('en-US')
}

export function analysisOfLevel(level: number): LevelInfo {
  if (level === 2) {
    return { code: 2, name: 'L2节点' }
  }
  return { code: 1, name: '边缘节点' }
}

export function formatDay(day?: string): string {
  if (!day || day.length !== 8) {
    return day || ''
  }
  return `${day.substring(0, 4)}-${day.substring(4, 6)}-${day.substring(6, 8)}`
}

export function logLevelClass(level: string): string {
  switch (level) {
    case 'error':
      return 'red'
    case 'warning':
      return 'orange'
    case 'success':
      return 'green'
    default:
      return ''
  }
}

export interface DNSClusterItem {
  id: number
  name: string
  dnsName: string
  domainId: number
  domainName: string
  providerId: number
  providerName: string
  providerTypeName: string
}

export interface DNSIndexData {
  keyword: string
  page: string
  clusters: DNSClusterItem[]
}

export interface DNSTaskItem {
  id: number
  type: string
  isDone: boolean
  isOk: boolean
  error: string
  updatedTime: string
  cluster?: ClusterRef | null
  node?: { id: number; name: string } | null
  server?: { id: number; name: string } | null
  domain?: { id: number; name: string } | null
}

export interface DNSIssue {
  target: string
  targetId: number
  type: string
  description: string
  params?: Record<string, unknown>
}

export interface DNSClusterNodeRecord {
  id: number
  name: string
  ipAddr: string
  ipAddrId: number
  route: { name: string; code: string }
  clusterId: number
  isResolved: boolean
  isInstalled: boolean
  isBackup: boolean
  isOffline: boolean
}

export interface DNSClusterServerRecord {
  id: number
  name: string
  dnsName: string
  isResolved: boolean
}

export interface DNSClusterPageData {
  cluster: ClusterRef
  dnsInfo: {
    dnsName: string
    domainId: number
    domainName: string
    providerId: number
    providerName: string
    providerTypeName: string
    cnameRecords: string[]
  }
  nodes: DNSClusterNodeRecord[]
  servers: DNSClusterServerRecord[]
  dnsHasChanges: boolean
  issues: DNSIssue[]
  tasks: DNSTaskItem[]
}

export interface DNSProviderTypeOption {
  name: string
  code: string
  description?: string
  count?: number
}

export interface UpdateClusterDNSData {
  clusterId: number
  dnsName: string
  nodesAutoSync: boolean
  serversAutoSync: boolean
  domainId: number
  domain: string
  providerType: string
  providerId: number
  cnameRecords: string[]
  ttl: number
  cnameAsDomain: boolean
  includingLnNodes: boolean
  providerTypes: DNSProviderTypeOption[]
}

export interface DNSProviderItem {
  id: number
  name: string
  type: string
  typeName: string
  dataUpdatedTime: string
  countDomains: number
}

export interface DNSProvidersData {
  keyword: string
  domain: string
  providerType: string
  page: string
  providers: DNSProviderItem[]
  providerTypes: DNSProviderTypeOption[]
}

export interface DNSProviderDomainItem {
  id: number
  name: string
  isOn: boolean
  isUp: boolean
  isDeleted: boolean
  dataUpdatedTime: string
  countRoutes: number
  countServerRecords: number
  serversChanged: boolean
  countNodeRecords: number
  nodesChanged: boolean
  countClusters: number
  countAllNodes: number
  countAllServers: number
}

export interface DNSProviderAPIParams {
  [key: string]: string | number | boolean | null | undefined
}

export interface DNSProviderData {
  pageNo: number
  filter: string
  provider: {
    id: number
    name: string
    type: string
    typeName: string
    minTTL: number
    apiParams: DNSProviderAPIParams
    localEdgeDNS: { id?: number; name?: string } | null
  }
  page: string
  domains: DNSProviderDomainItem[]
}

export interface DNSProviderFormData {
  provider?: {
    id: number
    name: string
    type: string
    typeName: string
    minTTL: number
    params: DNSProviderAPIParams
  }
  types: DNSProviderTypeOption[]
  nsClusters: OptionRef[]
  paramCustomHTTPSecret?: string
}

export interface DNSDomainFormData {
  providerId?: number
  domainId?: number
  domain?: { id: number; name: string; isOn: boolean }
}

export interface DNSIssueNodePopupData {
  nodeId: number
  ipAddr: string
  ipAddrId: number
  routes: DnsRouteOption[]
  domainId: number
  domainName: string
  allRoutes: DnsRouteOption[]
}

export interface DNSTasksData {
  tasks: DNSTaskItem[]
}

export interface DNSTaskCheckData {
  isDoing: boolean
  hasError: boolean
}

export interface DNSIssuesData {
  issues: DNSIssue[]
}

export interface DNSRouteListData {
  routes: { name: string; code: string }[]
}

export interface DNSDomainClustersData {
  domain: string
  clusters: { id: number; name: string; dnsName: string; isOk: boolean }[]
}

export interface DNSDomainNodesData {
  domainId: number
  domain: string
  clusters: {
    id: number
    name: string
    dnsName: string
    nodes: { id: number; name: string; ipAddr: string; route: { name: string; code: string }; clusterId: number; isOk: boolean }[]
  }[]
}

export interface DNSDomainServersData {
  domainId: number
  domain: string
  clusters: {
    id: number
    name: string
    dnsName: string
    servers: { id: number; name: string; dnsName: string; isOk: boolean }[]
  }[]
}

export interface OptionsProviderData {
  providers: OptionRef[]
}

export interface OptionsDomainData {
  domains: OptionRef[]
}

export interface DomainSelectResult {
  domainId: number
  domainName: string
  providerName?: string
}

export interface SyncDomainResult {
  shouldFix?: boolean
}

export interface SyncDomainsResult {
  hasChanges: boolean
}
