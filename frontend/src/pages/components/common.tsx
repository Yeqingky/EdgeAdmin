import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiPost, apiPostForm } from '../../api/client'
import { PageHeader, type PageMenuItem } from '../../components/PageHeader'

export interface SizeCapacity {
  count: number
  unit: string
}

export interface TimeDuration {
  count: number
  unit: string
}

export interface ClusterOption {
  id: number
  name: string
}

export interface KeyValueOption {
  name: string
  value: string
}

const capacityUnitNames: Record<string, string> = {
  byte: 'B',
  kb: 'KiB',
  mb: 'MiB',
  gb: 'GiB',
  tb: 'TiB',
  pb: 'PiB',
  eb: 'EiB',
}

const durationUnitNames: Record<string, string> = {
  ms: '毫秒',
  second: '秒',
  minute: '分钟',
  hour: '小时',
  day: '天',
  week: '周',
}

export function capacityText(capacity?: SizeCapacity | null): string {
  if (!capacity || !capacity.count) {
    return ''
  }
  return `${capacity.count}${capacityUnitNames[capacity.unit] || capacity.unit.toUpperCase()}`
}

export function durationText(duration?: TimeDuration | null): string {
  if (!duration || !duration.count) {
    return ''
  }
  return `${duration.count}${durationUnitNames[duration.unit] || duration.unit}`
}

export function buildFormData(values: Record<string, unknown>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        form.append(key, String(item))
      }
      continue
    }
    if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0')
      continue
    }
    form.append(key, String(value))
  }
  return form
}

export async function postFormValues<T>(url: string, values: Record<string, unknown>): Promise<T> {
  return apiPostForm<T>(url, buildFormData(values))
}

export interface ActionResult<T> {
  code: number
  message: string
  data: T
}

/**
 * Executes a legacy POST action and returns the full JSON envelope, including
 * the `data` payload that is attached to failure responses (e.g. failKeys).
 */
export async function postActionResult<T>(url: string, values: Record<string, unknown>): Promise<ActionResult<T>> {
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: buildFormData(values),
  })
  if (resp.status === 401) {
    throw new Error('请先登录')
  }
  const text = await resp.text()
  try {
    return JSON.parse(text) as ActionResult<T>
  } catch {
    throw new Error(text || '请求失败')
  }
}

export function useClusters() {
  return useQuery({
    queryKey: ['cluster-options'],
    queryFn: () => apiPost<{ clusters: ClusterOption[] }>('/clusters/options'),
    staleTime: 60_000,
  })
}

export function ClusterComboBox({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const query = useClusters()
  const clusters = query.data?.clusters || []
  if (clusters.length === 0) {
    return null
  }
  return (
    <select className="ui dropdown" value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)}>
      <option value="">集群</option>
      {clusters.map((cluster) => (
        <option key={cluster.id} value={cluster.id}>
          {cluster.name}
        </option>
      ))}
    </select>
  )
}

export function CachePolicyMenu({
  cachePolicyId,
  cachePolicyName,
  active,
}: {
  cachePolicyId: number
  cachePolicyName?: string
  active: string
}) {
  const suffix = `cachePolicyId=${cachePolicyId}`
  const items: PageMenuItem[] = [
    { name: '策略列表', href: '/servers/components/cache', active: active === 'list' },
    { name: '[|]', href: undefined },
    {
      name: cachePolicyName || `策略 #${cachePolicyId}`,
      href: `/servers/components/cache/policy?${suffix}`,
      active: active === 'index',
    },
    { name: '测试', href: `/servers/components/cache/test?${suffix}`, active: active === 'test' },
    { name: '统计', href: `/servers/components/cache/stat?${suffix}`, active: active === 'stat' },
    { name: '清理', href: `/servers/components/cache/clean?${suffix}`, active: active === 'clean' },
    { name: '刷新', href: `/servers/components/cache/purge?${suffix}`, active: active === 'purge' },
    { name: '预热', href: `/servers/components/cache/fetch?${suffix}`, active: active === 'fetch' },
    { name: '修改', href: `/servers/components/cache/update?${suffix}`, active: active === 'update' },
  ]
  return (
    <PageHeader items={items}>
      <span className="item disabled">|</span>
      <span className="item">{cachePolicyName || ''}</span>
    </PageHeader>
  )
}

export function WafMenu({
  firewallPolicyId,
  firewallPolicyName,
  countInboundGroups,
  countOutboundGroups,
  active,
}: {
  firewallPolicyId: number
  firewallPolicyName?: string
  countInboundGroups?: number
  countOutboundGroups?: number
  active: string
}) {
  const suffix = `firewallPolicyId=${firewallPolicyId}`
  const items: PageMenuItem[] = [
    { name: '列表', href: '/servers/components/waf', active: active === 'list' },
    { name: '[|]', href: undefined },
    {
      name: firewallPolicyName || `策略 #${firewallPolicyId}`,
      href: `/servers/components/waf/policy?${suffix}`,
      active: active === 'index',
    },
    {
      name: `入站规则(${countInboundGroups || 0})`,
      href: `/servers/components/waf/groups?${suffix}&type=inbound`,
      active: active === 'inbound',
    },
    {
      name: `出站规则(${countOutboundGroups || 0})`,
      href: `/servers/components/waf/groups?${suffix}&type=outbound`,
      active: active === 'outbound',
    },
    { name: 'IP管理', href: `/servers/components/waf/ipadmin?${suffix}`, active: active === 'ipadmin' },
    { name: '拦截日志', href: `/servers/components/waf/log?${suffix}`, active: active === 'log' },
    { name: '导入', href: `/servers/components/waf/import?${suffix}`, active: active === 'import' },
    { name: '导出', href: `/servers/components/waf/export?${suffix}`, active: active === 'export' },
    { name: '修改', href: `/servers/components/waf/update?${suffix}`, active: active === 'update' },
  ]
  return <PageHeader items={items} />
}

export function IpAdminMenu({
  firewallPolicyId,
  subMenuItem,
}: {
  firewallPolicyId: number
  subMenuItem?: string
}) {
  const suffix = `firewallPolicyId=${firewallPolicyId}`
  const items: PageMenuItem[] = [
    {
      name: '国家/地区封禁',
      href: `/servers/components/waf/ipadmin?${suffix}`,
      active: subMenuItem === 'region',
    },
    {
      name: '省份封禁',
      href: `/servers/components/waf/ipadmin/provinces?${suffix}`,
      active: subMenuItem === 'province',
    },
    {
      name: '运营商封禁',
      href: `/servers/components/waf/ipadmin/providers?${suffix}`,
      active: subMenuItem === 'provider',
    },
    { name: '[|]', href: undefined },
    {
      name: '白名单',
      href: `/servers/components/waf/ipadmin/lists?${suffix}&type=white`,
      active: subMenuItem === 'white',
    },
    {
      name: '黑名单',
      href: `/servers/components/waf/ipadmin/lists?${suffix}&type=black`,
      active: subMenuItem === 'black',
    },
    {
      name: '灰名单',
      href: `/servers/components/waf/ipadmin/lists?${suffix}&type=grey`,
      active: subMenuItem === 'grey',
    },
    {
      name: 'IP检查',
      href: `/servers/components/waf/ipadmin/test?${suffix}`,
      active: subMenuItem === 'test',
    },
  ]
  return <PageHeader items={items} />
}

export function CacheBatchMenu({ active, countDoingTasks }: { active: 'purge' | 'fetch' | 'task'; countDoingTasks?: number }) {
  const items: PageMenuItem[] = [
    { name: '刷新缓存', href: '/servers/components/cache/batch', active: active === 'purge' },
    { name: '预热缓存', href: '/servers/components/cache/batch/fetch', active: active === 'fetch' },
    { name: '[|]', href: undefined },
    {
      name: `所有任务${countDoingTasks && countDoingTasks > 0 ? `(${countDoingTasks})` : ''}`,
      href: '/servers/components/cache/batch/tasks',
      active: active === 'task',
    },
  ]
  return <PageHeader items={items} />
}

export interface FailedKey {
  key: string
  reason: string
}

export interface NodeResult {
  nodeId: number
  nodeName: string
  isOk: boolean
  message: string
}

export function NodeResultLabels({ results }: { results: NodeResult[] }) {
  if (results.length === 0) {
    return <span className="red">此集群下没有任何可用的节点.</span>
  }
  return (
    <>
      {results.map((result) => (
        <div key={`${result.nodeId}-${result.nodeName}`} className={`ui label tiny ${result.isOk ? 'green' : 'red'}`} style={{ marginBottom: '0.5em' }}>
          {result.nodeName}:{result.message}
        </div>
      ))}
    </>
  )
}

export function FailedKeyList({ failKeys }: { failKeys: FailedKey[] }) {
  if (failKeys.length === 0) {
    return null
  }
  return (
    <div>
      {failKeys.map((failKey) => (
        <div key={failKey.key}>
          <span className="red">
            {failKey.key}: {failKey.reason}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CapacityInput({
  value,
  onChange,
  units = ['byte', 'kb', 'mb', 'gb', 'tb'],
}: {
  value: SizeCapacity | null
  onChange: (value: SizeCapacity) => void
  units?: string[]
}) {
  const current = value || { count: 0, unit: 'gb' }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="number"
          min={0}
          style={{ width: '10em' }}
          value={current.count}
          onChange={(event) => onChange({ ...current, count: Number(event.target.value) || 0 })}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={current.unit} onChange={(event) => onChange({ ...current, unit: event.target.value })}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {capacityUnitNames[unit] || unit.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function DurationInput({
  value,
  onChange,
  units = ['second', 'minute', 'hour', 'day'],
}: {
  value: TimeDuration | null
  onChange: (value: TimeDuration) => void
  units?: string[]
}) {
  const current = value || { count: 0, unit: 'minute' }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="number"
          min={0}
          style={{ width: '10em' }}
          value={current.count}
          onChange={(event) => onChange({ ...current, count: Number(event.target.value) || 0 })}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={current.unit} onChange={(event) => onChange({ ...current, unit: event.target.value })}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {durationUnitNames[unit] || unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export interface CacheRef {
  isOn: boolean
  cachePolicyId?: number
  key?: string
  life?: TimeDuration | null
  status?: number[]
  methods?: string[]
  minSize?: SizeCapacity | null
  maxSize?: SizeCapacity | null
  isReverse?: boolean
  [key: string]: unknown
}

export interface CachePolicyOptions {
  dir?: string
  memoryPolicy?: { capacity?: SizeCapacity | null } | null
  openFileCache?: { isOn?: boolean; max?: number } | null
  enableSendfile?: boolean
  minFreeSize?: SizeCapacity | null
  enableMMAP?: boolean
  enableIncompletePartialContent?: boolean
  [key: string]: unknown
}

export interface CachePolicy {
  id: number
  isOn: boolean
  name: string
  description?: string
  capacity?: SizeCapacity | null
  maxSize?: SizeCapacity | null
  type: string
  options?: CachePolicyOptions | null
  cacheRefs?: CacheRef[] | null
  syncCompressionCache?: boolean
  fetchTimeout?: TimeDuration | null
}

export interface CachePolicyTypeOption {
  type: string
  name: string
}

export interface WafModeInfo {
  code: string
  name: string
  description: string
}

export interface WafGroupSummary {
  name: string
  isOn: boolean
}

export interface WafUpgradeItem {
  name: string
  isOn: boolean
}

export interface WafGroup {
  id: number
  name: string
  code: string
  isOn: boolean
  description: string
  countSets: number
  isTemplate: boolean
  canDelete: boolean
}

export interface WafRule {
  id?: number
  isOn?: boolean
  param: string
  paramFilters?: unknown[] | null
  operator: string
  value: string
  isCaseInsensitive?: boolean
  isComposed?: boolean
  checkpointOptions?: Record<string, unknown> | null
  description?: string
}

export interface WafActionConfig {
  code: string
  options?: Record<string, unknown> | null
}

export interface WafRuleSetView {
  id: number
  name: string
  isOn: boolean
  connector: string
  ignoreLocal?: boolean
  ignoreSearchEngine?: boolean
  rules: WafRule[]
  actions: WafActionConfig[]
}

export interface WafCheckpointOption {
  type: string
  name: string
  code: string
  value?: string
  comment?: string
  placeholder?: string
  rightLabel?: string
  size?: number
  maxLength?: number
  options?: { name: string; value: string }[] | null
}

export interface WafCheckpoint {
  name: string
  prefix: string
  description: string
  hasParams: boolean
  params?: KeyValueOption[] | null
  options?: WafCheckpointOption[] | null
  isComposed: boolean
  dataType: string
}

export interface WafOperator {
  name: string
  code: string
  description: string
  case: string
  dataType: string
}

export interface WafRuleMetadata {
  checkpoints: WafCheckpoint[]
  operators: WafOperator[]
}

export interface WafPolicyDetail {
  id: number
  name: string
  isOn: boolean
  description: string
  mode: string
  modeInfo: WafModeInfo | null
  groups: WafGroupSummary[]
  blockOptions: Record<string, unknown> | null
  pageOptions: Record<string, unknown> | null
  captchaOptions: Record<string, unknown> | null
  jsCookieOptions: Record<string, unknown> | null
  useLocalFirewall: boolean
  synFlood: Record<string, unknown> | null
  log: WafPolicyLogConfig | null
  maxRequestBodySize: number
  maxRequestBodySizeFormat: string
  denyCountryHTML: string
  denyProvinceHTML: string
}

export interface WafPolicyLogConfig {
  isOn: boolean
  requestBody: boolean
  regionDenying: boolean
  isPrior?: boolean
}

export interface WafPolicyUpdatable extends WafPolicyDetail {
  mode: string
}

export interface WafPolicyForSet {
  id: number
  name: string
  serverId: number
  inbound?: { groups?: WafRuleSetGroup[] } | null
  outbound?: { groups?: WafRuleSetGroup[] } | null
}

export interface WafRuleSetGroup {
  id: number
  name: string
  sets?: WafRuleSetView[] | null
}

export function WafActionName(code: string): string {
  switch (code) {
    case 'log':
      return '记录'
    case 'block':
      return '阻止'
    case 'captcha':
      return 'Captcha人机识别'
    case 'js_cookie':
      return 'JS Cookie验证'
    case 'notify':
      return '告警'
    case 'get_302':
      return 'GET 302重定向'
    case 'post_307':
      return 'POST 307重定向'
    case 'record_ip':
      return '记录IP'
    case 'tag':
      return '标签'
    case 'page':
      return '显示网页'
    case 'redirect':
      return '跳转'
    case 'allow':
      return '允许'
    case 'go_group':
      return '跳转分组'
    case 'go_set':
      return '跳转规则集'
    default:
      return code.toUpperCase()
  }
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h4>{title}</h4>
      {children}
    </>
  )
}

export const EVENT_LEVELS = [
  { code: 'debug', name: '调试' },
  { code: 'notice', name: '通知' },
  { code: 'warning', name: '警告' },
  { code: 'error', name: '错误' },
  { code: 'critical', name: '严重' },
  { code: 'fatal', name: '致命' },
]
