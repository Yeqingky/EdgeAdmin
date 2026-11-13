import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts'
import { ChevronDown, ChevronUp, HelpCircle, Loader2, X } from 'lucide-react'
import { ApiError, UnauthorizedError, apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'

/* ------------------------------------------------------------------ */
/* 请求辅助                                                            */
/* ------------------------------------------------------------------ */

/** 以重复键的方式提交表单参数（等价于 legacy 的数组参数） */
export async function apiPostMulti<T = unknown>(
  url: string,
  entries: Array<[string, string | number]>,
): Promise<T> {
  const body = new URLSearchParams()
  for (const [key, value] of entries) {
    body.append(key, String(value))
  }
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  if (resp.status === 401) {
    throw new UnauthorizedError()
  }
  const contentType = resp.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new UnauthorizedError()
  }
  const data = (await resp.json()) as { code: number; message: string; data: T }
  if (data.code !== 200) {
    throw new ApiError(data.message || '请求失败', data.code)
  }
  return data.data
}

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export interface ServerBrief {
  id: number
  name: string
  clusterId: number
}

export interface ClusterOption {
  id: number
  name: string
}

export interface NodeOption {
  id: number
  name: string
}

export interface UserOption {
  id: number
  fullname: string
  username: string
  name: string
}

export interface WafInfo {
  policy?: { id: number; name: string; serverId: number }
  group?: { id: number; name: string }
  set?: { id: number; name: string }
}

export interface AccessLog {
  requestId: string
  serverId: number
  nodeId: number
  remoteAddr: string
  remotePort: number
  requestURI: string
  requestPath: string
  requestMethod: string
  requestTime: number
  requestBody?: string
  scheme: string
  proto: string
  bytesSent: number
  status: number
  statusMessage: string
  sentHeader?: Record<string, { values: string[] }>
  timeISO8601: string
  timeLocal: string
  timestamp: number
  host: string
  referer: string
  userAgent: string
  request: string
  contentType: string
  cookie?: Record<string, string>
  header?: Record<string, { values: string[] }>
  originAddress: string
  originStatus: number
  errors?: string[]
  attrs?: Record<string, string>
  firewallPolicyId?: number
  firewallRuleGroupId?: number
  firewallRuleSetId?: number
  firewallActions?: string[]
  tags?: string[]
  node?: { id: number; name: string; nodeCluster?: { id: number; name: string } }
}

export interface AccessLogsResponse {
  accessLogs: AccessLog[]
  regions?: Record<string, string>
  wafInfos?: Record<string, WafInfo>
  hasMore?: boolean
  hasPrev?: boolean
  requestId?: string
  nextRequestId?: string
  lastRequestId?: string
}

/* ------------------------------------------------------------------ */
/* 格式化                                                              */
/* ------------------------------------------------------------------ */

export function formatNumber(value: number): string {
  const text = String(value)
  const dotIndex = text.indexOf('.')
  if (dotIndex >= 0) {
    return `${formatNumber(Number(text.substring(0, dotIndex)))}${text.substring(dotIndex)}`
  }
  if (text.length <= 3) {
    return text
  }
  const pieces: string[] = []
  for (let i = 0; i < Math.floor(text.length / 3); i++) {
    const start = text.length - (i + 1) * 3
    pieces.push(text.substring(start, start + 3))
  }
  if (text.length % 3 !== 0) {
    pieces.push(text.substring(0, text.length % 3))
  }
  return pieces.reverse().join(', ')
}

export function formatCount(value: number): string {
  const n = Number(value) || 0
  let unit = ''
  let divider = 1
  if (n >= 1000 * 1000 * 1000) {
    unit = 'B'
    divider = 1000 * 1000 * 1000
  } else if (n >= 1000 * 1000) {
    unit = 'M'
    divider = 1000 * 1000
  } else if (n >= 1000) {
    unit = 'K'
    divider = 1000
  }
  if (divider === 1) {
    return String(n)
  }
  return `${Math.round((n * 100) / divider) / 100}${unit}`
}

export function formatBytes(bytes: number): string {
  const n = Math.ceil(Number(bytes) || 0)
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']
  let value = n
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  if (unit === 0) {
    return `${n}B`
  }
  return `${Math.round(value * 100) / 100}${units[unit]}`
}

export function formatBits(bits: number): string {
  const n = Math.ceil(Number(bits) || 0)
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps']
  let value = n
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  if (unit === 0) {
    return `${n}bps`
  }
  return `${Math.round(value * 100) / 100}${units[unit]}`
}

export function countAxis(values: number[]): { unit: string; divider: number } {
  const max = values.length > 0 ? Math.max(...values) : 0
  if (max >= 1000 * 1000 * 1000) {
    return { unit: 'B', divider: 1000 * 1000 * 1000 }
  }
  if (max >= 1000 * 1000) {
    return { unit: 'M', divider: 1000 * 1000 }
  }
  if (max >= 1000) {
    return { unit: 'K', divider: 1000 }
  }
  return { unit: '', divider: 1 }
}

export function bytesAxis(values: number[]): { unit: string; divider: number } {
  const max = values.length > 0 ? Math.max(...values) : 0
  const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E']
  let divider = 1
  let unit = 'B'
  for (let i = units.length - 1; i >= 1; i--) {
    const value = Math.pow(1024, i)
    if (max >= value) {
      divider = value
      unit = units[i]
      break
    }
  }
  return { unit, divider }
}

/** 与 legacy teaweb.match 类似的模糊匹配（忽略大小写） */
export function matchKeyword(value: string, keyword: string): boolean {
  if (!keyword) {
    return true
  }
  return value.toLowerCase().includes(keyword.toLowerCase())
}

export function formatCost(seconds: number | undefined): string {
  if (seconds == null) {
    return '0'
  }
  const milliseconds = (seconds * 1000).toString()
  const pieces = milliseconds.split('.')
  if (pieces.length < 2) {
    return milliseconds
  }
  return `${pieces[0]}.${pieces[1].substring(0, 3)}`
}

export function humanTime(timestamp: number): string {
  if (!timestamp) {
    return ''
  }
  const elapsed = Math.ceil(Date.now() / 1000) - timestamp
  if (elapsed < 0) {
    return ''
  }
  if (elapsed < 60) {
    return `${elapsed}秒前`
  }
  if (elapsed < 3600) {
    return `${Math.ceil(elapsed / 60)}分钟前`
  }
  if (elapsed < 3600 * 24) {
    return `${Math.ceil(elapsed / 3600)}小时前`
  }
  return ''
}

/** 将 yyyymmdd 转成 yyyy-mm-dd */
export function formatDay(day: string): string {
  if (day.length !== 8) {
    return day
  }
  return `${day.substring(0, 4)}-${day.substring(4, 6)}-${day.substring(6, 8)}`
}

/* ------------------------------------------------------------------ */
/* 基础组件                                                            */
/* ------------------------------------------------------------------ */

export interface MenuItemDef {
  name: ReactNode
  href?: string
  active?: boolean
  hidden?: boolean
  onClick?: () => void
}

export function FirstMenu({ items, children }: { items?: MenuItemDef[]; children?: ReactNode }) {
  return (
    <div className="ui menu text blue first-menu">
      {items?.map((item, index) =>
        item.hidden ? null : (
          <a
            key={index}
            className={`item${item.active ? ' active' : ''}`}
            href={item.href || ''}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault()
                item.onClick()
              } else if (!item.href) {
                event.preventDefault()
              }
            }}
          >
            {item.name}
          </a>
        ),
      )}
      {children}
    </div>
  )
}

export function DividerItem() {
  return <span className="item disabled">|</span>
}

export function MoreAngle({ open, onClick, children }: { open: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <a className="item" href="" onClick={(event) => { event.preventDefault(); onClick() }}>
      {children}
      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </a>
  )
}

export function Tip({ content }: { content: string }) {
  return (
    <span title={content} style={{ cursor: 'help', marginLeft: '0.3em' }}>
      <HelpCircle size={13} />
    </span>
  )
}

export function Modal({
  title,
  children,
  onClose,
  width = '44em',
  maxHeight = '80vh',
  footer,
}: {
  title?: ReactNode
  children: ReactNode
  onClose: () => void
  width?: string
  maxHeight?: string
  footer?: ReactNode
}) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex', zIndex: 10000 }}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', width, maxWidth: '95vw' }}
      >
        <div className="header">
          <span>{title}</span>
          <button className="ui button tiny" style={{ float: 'right' }} onClick={onClose} type="button">
            <X size={14} />
          </button>
        </div>
        <div className="content" style={{ maxHeight, overflowY: 'auto' }}>
          {children}
        </div>
        {footer ? <div className="actions">{footer}</div> : null}
      </div>
    </div>
  )
}

export function LoadingError({ text = '加载失败' }: { text?: string }) {
  return <div className="ui negative message">{text}</div>
}

export function InlineLoading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="loading-block">
      <Loader2 className="spin" size={16} />
      <span>{text}</span>
    </div>
  )
}

/** Keyword 高亮 */
export function Keyword({ word, children }: { word?: string; children: ReactNode }) {
  const text = typeof children === 'string' ? children : ''
  if (!word || !text) {
    return <>{children}</>
  }
  const index = text.toLowerCase().indexOf(word.toLowerCase())
  if (index < 0) {
    return <>{children}</>
  }
  return (
    <>
      {text.substring(0, index)}
      <span style={{ background: '#fbbd08', color: '#000' }}>{text.substring(index, index + word.length)}</span>
      {text.substring(index + word.length)}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 图表                                                                */
/* ------------------------------------------------------------------ */

export function EChart({
  option,
  height = '22em',
}: {
  option: echarts.EChartsOption
  height?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
    chartRef.current?.resize()
  }, [option])

  return <div ref={ref} className="chart-box" style={{ height }} />
}

/* ------------------------------------------------------------------ */
/* 选项数据                                                            */
/* ------------------------------------------------------------------ */

export function useClusterOptions(enabled = true) {
  return useQuery({
    queryKey: ['servers-core', 'clusters'],
    enabled,
    queryFn: () => apiPost<{ clusters: ClusterOption[] }>('/clusters/options'),
    select: (data) => data.clusters || [],
  })
}

export function useNodeOptions(clusterId: number) {
  return useQuery({
    queryKey: ['servers-core', 'nodes', clusterId],
    enabled: clusterId > 0,
    queryFn: () => apiPost<{ nodes: NodeOption[] }>('/clusters/nodeOptions', { clusterId }),
    select: (data) => data.nodes || [],
  })
}

export function useUserOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['servers-core', 'users'],
    enabled,
    queryFn: () => apiPost<{ users: UserOption[] }>('/servers/users/options'),
    select: (data) => data.users || [],
  })
}

/* ------------------------------------------------------------------ */
/* 网站页面布局                                                        */
/* ------------------------------------------------------------------ */

export interface LeftMenuItem {
  name: string
  url?: string
  isActive?: boolean
  isOn?: boolean
  isOff?: boolean
  separator?: boolean
}

export function ServerPageLayout({ menu, children }: { menu: LeftMenuItem[]; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '1em', alignItems: 'flex-start' }}>
      <div style={{ width: '10em', flex: '0 0 10em' }}>
        <div className="ui menu text blue vertical small">
          {menu.map((item, index) =>
            item.separator ? (
              <div key={index} className="item separator" />
            ) : (
              <a
                key={index}
                className={`item${item.isActive ? ' active' : ''}${item.isOn || item.isOff ? ' off' : ''}`}
                href={`${item.url || ''}`}
                style={{ lineHeight: 1.3 }}
              >
                {item.name}
                {item.isOff ? <var>关</var> : null}
                {item.isOn ? <var>开</var> : null}
              </a>
            ),
          )}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 网站顶部菜单                                                        */
/* ------------------------------------------------------------------ */

export function ServerTopMenu({
  serverId,
  serverName,
  current,
  children,
}: {
  serverId: number
  serverName: string
  current: 'log' | 'stat' | 'delete' | 'settings'
  children?: ReactNode
}) {
  const labels: Record<typeof current, string> = {
    log: '日志',
    stat: '统计',
    delete: '删除',
    settings: '设置',
  }
  const paths: Record<typeof current, string> = {
    log: '/servers/server/log',
    stat: '/servers/server/stat',
    delete: '/servers/server/delete',
    settings: '/servers/server/settings',
  }
  return (
    <FirstMenu>
      <a className="item" href="/servers">网站列表</a>
      <DividerItem />
      <a className="item active" href={`${paths[current]}?serverId=${serverId}`}>
        &quot;{serverName}&quot;{labels[current]}
      </a>
      <DividerItem />
      <a className="item" href={`/servers/server/settings?serverId=${serverId}`}>
        设置
      </a>
      <a className="item" href={`/servers/server/delete?serverId=${serverId}`}>
        删除
      </a>
      {children}
    </FirstMenu>
  )
}

/* ------------------------------------------------------------------ */
/* 访问日志                                                            */
/* ------------------------------------------------------------------ */

export function AccessLogBox({
  accessLog,
  keyword,
  showServerLink,
  onShowDetail,
}: {
  accessLog: AccessLog
  keyword?: string
  showServerLink?: boolean
  onShowDetail?: (requestId: string) => void
}) {
  const host = accessLog.host || ''
  let scheme = accessLog.scheme || ''
  const upgrade = accessLog.header?.Upgrade?.values
  if (upgrade && upgrade.includes('websocket')) {
    if (scheme === 'http') {
      scheme = 'ws'
    } else if (scheme === 'https') {
      scheme = 'wss'
    }
  }

  const tags = useMemo(() => {
    const list = accessLog.tags || []
    return list.filter((tag, index) => list.indexOf(tag) === index)
  }, [accessLog.tags])

  const cacheStatus = accessLog.attrs?.['cache.status']

  return (
    <div style={{ wordBreak: 'break-all', color: accessLog.status >= 400 ? '#dc143c' : undefined }}>
      <div>
        {accessLog.node && accessLog.node.nodeCluster ? (
          <a
            href={`/clusters/cluster/node?nodeId=${accessLog.node.id}&clusterId=${accessLog.node.nodeCluster.id}`}
            title="点击查看节点详情"
          >
            <span className="grey">
              [{accessLog.node.name}
              {accessLog.node.name.endsWith('节点') ? '' : '节点'}]
            </span>
          </a>
        ) : null}

        {showServerLink && accessLog.serverId > 0 ? (
          <a href={`/servers/server/log?serverId=${accessLog.serverId}`} title="点击到网站">
            <span className="grey">[网站]</span>
          </a>
        ) : null}
        {showServerLink && !(accessLog.serverId > 0) ? <span className="disabled">[网站]</span> : null}

        <span style={{ marginLeft: '0.3em' }}>
          <Keyword word={keyword}>{accessLog.remoteAddr}</Keyword>
        </span>{' '}
        [{accessLog.timeLocal}] <em>&quot;<Keyword word={keyword}>{accessLog.requestMethod}</Keyword>{' '}
        {scheme}://<Keyword word={keyword}>{host}</Keyword>
        <Keyword word={keyword}>{accessLog.requestURI}</Keyword>{' '}
        <a
          href={`${scheme}://${host}${accessLog.requestURI}`}
          target="_blank"
          rel="noreferrer"
          title="新窗口打开"
          className="disabled"
        >
          ↗
        </a>{' '}
        {accessLog.proto}&quot;</em>{' '}
        <Keyword word={keyword}>{String(accessLog.status)}</Keyword>
        {cacheStatus === 'HIT' || cacheStatus === 'STALE' ? (
          <span className="ui label tiny basic" style={{ marginLeft: '0.3em' }}>
            cache {cacheStatus.toLowerCase()}
          </span>
        ) : null}
        {accessLog.firewallActions && accessLog.firewallActions.length > 0 ? (
          <span className="ui label tiny basic" style={{ marginLeft: '0.3em' }}>
            waf {accessLog.firewallActions.join(',')}
          </span>
        ) : null}
        {tags.length > 0 ? (
          <span>
            {' '}
            -{' '}
            {tags.map((tag) => (
              <span key={tag} className="ui label tiny basic" style={{ marginLeft: '0.2em' }}>
                {tag}
              </span>
            ))}
          </span>
        ) : null}
        {accessLog.requestTime != null ? <span> - 耗时:{formatCost(accessLog.requestTime)} ms</span> : null}
        <span className="grey small" style={{ marginLeft: '0.4em' }}>
          {humanTime(accessLog.timestamp)}
        </span>
        <a
          href=""
          title="查看详情"
          style={{ marginLeft: '0.5em' }}
          onClick={(event) => {
            event.preventDefault()
            if (onShowDetail) {
              onShowDetail(accessLog.requestId)
            }
          }}
        >
          详情
        </a>
      </div>
    </div>
  )
}

export function AccessLogList({
  accessLogs,
  regions,
  wafInfos,
  keyword,
  showServerLink,
  onShowDetail,
  emptyText = '暂时还没有访问日志。',
}: {
  accessLogs: AccessLog[]
  regions?: Record<string, string>
  wafInfos?: Record<string, WafInfo>
  keyword?: string
  showServerLink?: boolean
  onShowDetail?: (requestId: string) => void
  emptyText?: string
}) {
  if (accessLogs.length === 0) {
    return <p className="comment">{emptyText}</p>
  }
  return (
    <table className="ui table selectable">
      <tbody>
        {accessLogs.map((accessLog) => (
          <tr key={accessLog.requestId}>
            <td>
              {regions && regions[accessLog.remoteAddr] ? (
                <div className="grey small">[{regions[accessLog.remoteAddr]}]</div>
              ) : null}
              {wafInfos && accessLog.firewallRuleSetId && wafInfos[accessLog.firewallRuleSetId] ? (
                <div className="grey small">
                  WAF:{' '}
                  {wafInfos[accessLog.firewallRuleSetId].group
                    ? `${wafInfos[accessLog.firewallRuleSetId].group?.name || ''} - `
                    : ''}
                  {wafInfos[accessLog.firewallRuleSetId].set?.name || ''}
                </div>
              ) : null}
              <AccessLogBox
                accessLog={accessLog}
                keyword={keyword}
                showServerLink={showServerLink}
                onShowDetail={onShowDetail}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface AccessLogDetailData {
  accessLog: AccessLog
  wafInfo?: WafInfo | null
  region?: { full: string; isp: string } | null
  requestBody?: string
  requestContentType?: string
}

export function AccessLogDetailModal({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'summary' | 'response' | 'request' | 'cookie' | 'client'>('summary')
  const query = useQuery({
    queryKey: ['servers-core', 'access-log-detail', requestId],
    queryFn: () => apiGet<AccessLogDetailData>('/servers/server/log/viewPopup', { requestId }),
  })

  const accessLog = query.data?.accessLog

  const requestHeaders = useMemo(() => {
    const header = accessLog?.header || {}
    return Object.keys(header)
      .map((name) => ({ name, values: header[name]?.values || [], isGeneral: !name.startsWith('X-') }))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  }, [accessLog?.header])

  const responseHeaders = useMemo(() => {
    const header = accessLog?.sentHeader || {}
    return Object.keys(header)
      .map((name) => ({ name, values: header[name]?.values || [], isGeneral: !name.startsWith('X-') }))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  }, [accessLog?.sentHeader])

  const cookies = useMemo(() => {
    const cookie = accessLog?.cookie || {}
    return Object.keys(cookie)
      .filter((name) => typeof cookie[name] === 'string')
      .map((name) => ({ name, value: cookie[name] }))
      .sort((a, b) => {
        if (a.name.startsWith('_')) {
          if (b.name.startsWith('_')) {
            return a.name < b.name ? -1 : 1
          }
          return -1
        }
        if (b.name.startsWith('_')) {
          return 1
        }
        return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
      })
  }, [accessLog?.cookie])

  const tabs: Array<{ key: typeof tab; name: string }> = [
    { key: 'summary', name: '综合信息' },
    { key: 'response', name: '响应数据（Response）' },
    { key: 'request', name: '请求数据（Request）' },
    { key: 'cookie', name: 'Cookie' },
    { key: 'client', name: '终端信息' },
  ]

  const wafInfo = query.data?.wafInfo
  const region = query.data?.region

  return (
    <Modal title="访问日志详情" onClose={onClose} width="60em" maxHeight="80vh">
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <LoadingError /> : null}
      {accessLog ? (
        <>
          <div className="ui menu tabular tiny">
            {tabs.map((item) => (
              <a
                key={item.key}
                className={`item${tab === item.key ? ' active' : ''}`}
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setTab(item.key)
                }}
              >
                {item.name}
              </a>
            ))}
          </div>

          {tab === 'summary' ? (
            <table className="ui table selectable small">
              <tbody>
                <tr>
                  <td style={{ width: '50%' }}>请求概要<em>(Request)</em>：{accessLog.request}</td>
                  <td>请求ID：{accessLog.requestId}</td>
                </tr>
                <tr>
                  <td>请求方法<em>(RequestMethod)</em>：{accessLog.requestMethod}</td>
                  <td>请求URI<em>(RequestURI)</em>：{accessLog.requestURI}</td>
                </tr>
                <tr>
                  <td>主机地址<em>(Host)</em>：{accessLog.host}</td>
                  <td>终端地址<em>(RemoteAddr:RemotePort)</em>：{accessLog.remoteAddr}:{accessLog.remotePort}</td>
                </tr>
                <tr>
                  <td>
                    请求来源<em>(Referer)</em>：
                    {accessLog.referer ? accessLog.referer : <span className="disabled">[没有设置]</span>}
                  </td>
                  <td>
                    终端信息<em>(UserAgent)</em>：
                    {accessLog.userAgent ? accessLog.userAgent : <span className="disabled">[没有设置]</span>}
                  </td>
                </tr>
                <tr>
                  <td>
                    状态<em>(StatusMessage)</em>：
                    <span className={accessLog.status >= 400 ? 'red' : 'green'}>
                      {accessLog.status} {accessLog.statusMessage}
                      {accessLog.originStatus >= 400 ||
                      (accessLog.originStatus > 0 && accessLog.originStatus !== accessLog.status) ? (
                        <span className="grey small">（源站{accessLog.originStatus}）</span>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    文件类型<em>(ContentType)</em>：
                    {accessLog.contentType ? accessLog.contentType : '-'}
                  </td>
                </tr>
                <tr>
                  <td>
                    下行流量<em>(BytesSent)</em>：
                    {accessLog.bytesSent != null ? (
                      <span>
                        {accessLog.bytesSent}
                        {accessLog.bytesSent > 0 ? (
                          <span className="grey small">（{formatBytes(accessLog.bytesSent)}）</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="disabled">0</span>
                    )}
                  </td>
                  <td>
                    源站地址：
                    {accessLog.originAddress ? accessLog.originAddress : <span className="disabled">未访问源站</span>}
                  </td>
                </tr>
                <tr>
                  <td>ISO8601时间：{accessLog.timeISO8601}</td>
                  <td>本地时间<em>(TimeLocal)</em>：{accessLog.timeLocal}</td>
                </tr>
                {wafInfo ? (
                  <tr>
                    <td className="color-border">WAF策略：{wafInfo.policy?.name}</td>
                    <td>WAF规则分组：{wafInfo.group ? wafInfo.group.name : '-'}</td>
                  </tr>
                ) : null}
                {wafInfo && wafInfo.set ? (
                  <tr>
                    <td className="color-border">
                      WAF规则集：
                      {wafInfo.policy && wafInfo.policy.serverId === 0 ? (
                        <a
                          href={`/servers/components/waf/group?firewallPolicyId=${accessLog.firewallPolicyId}&type=inbound&groupId=${accessLog.firewallRuleGroupId}`}
                        >
                          {wafInfo.set.name}
                        </a>
                      ) : (
                        <a
                          href={`/servers/server/settings/waf/group?serverId=${accessLog.serverId}&firewallPolicyId=${accessLog.firewallPolicyId}&type=inbound&groupId=${accessLog.firewallRuleGroupId}`}
                        >
                          {wafInfo.set.name}
                        </a>
                      )}
                    </td>
                    <td />
                  </tr>
                ) : null}
                {accessLog.errors && accessLog.errors.length > 0 ? (
                  <tr>
                    <td colSpan={2}>
                      {accessLog.errors.map((error, index) => (
                        <pre key={index}>
                          <span className="red">{error}</span>
                        </pre>
                      ))}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {tab === 'response' ? (
            <>
              <table className="ui table definition selectable small">
                <tbody>
                  <tr>
                    <td className="title">Status</td>
                    <td>
                      {accessLog.status} {accessLog.statusMessage}
                    </td>
                  </tr>
                </tbody>
              </table>
              {responseHeaders.length > 0 ? (
                <table className="ui table definition selectable small">
                  <tbody>
                    {responseHeaders.map((header) =>
                      header.values.map((value, index) => (
                        <tr key={`${header.name}-${index}`}>
                          <td className="title">
                            <span style={header.isGeneral ? undefined : { fontStyle: 'italic' }}>{header.name}</span>
                          </td>
                          <td>{value}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              ) : null}
            </>
          ) : null}

          {tab === 'request' ? (
            <table className="ui table definition selectable small">
              <tbody>
                {requestHeaders.map((header) =>
                  header.values.map((value, index) => (
                    <tr key={`${header.name}-${index}`}>
                      <td className="title">
                        <span style={header.isGeneral ? undefined : { fontStyle: 'italic' }}>{header.name}</span>
                      </td>
                      <td>{value}</td>
                    </tr>
                  )),
                )}
                {query.data?.requestBody && query.data.requestBody.length > 0 ? (
                  <>
                    <tr>
                      <td colSpan={2}>请求内容：</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <pre style={{ maxHeight: '14em', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                          {query.data.requestBody}
                        </pre>
                      </td>
                    </tr>
                  </>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {tab === 'cookie' ? (
            cookies.length === 0 ? (
              <p className="comment">暂时没有Cookie数据。</p>
            ) : (
              <table className="ui table definition selectable small">
                <tbody>
                  {cookies.map((cookie) => (
                    <tr key={cookie.name}>
                      <td className="title">{cookie.name}</td>
                      <td>{cookie.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}

          {tab === 'client' ? (
            <table className="ui table definition selectable small">
              <tbody>
                <tr>
                  <td className="title">
                    综合信息<em>(UserAgent)</em>
                  </td>
                  <td>{accessLog.userAgent ? accessLog.userAgent : <span className="disabled">[没有设置]</span>}</td>
                </tr>
                <tr>
                  <td>IP</td>
                  <td>{accessLog.remoteAddr}</td>
                </tr>
                {region ? (
                  <tr>
                    <td>区域</td>
                    <td>{region.full}</td>
                  </tr>
                ) : null}
                {region && region.isp ? (
                  <tr>
                    <td>ISP</td>
                    <td>{region.isp}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </>
      ) : null}
    </Modal>
  )
}

export function AccessLogSearchForm({
  ip,
  domain,
  keyword,
  clusterId,
  nodeId,
  onChange,
  onSubmit,
  children,
}: {
  ip: string
  domain: string
  keyword: string
  clusterId: number
  nodeId: number
  onChange: (values: { ip?: string; domain?: string; keyword?: string; clusterId?: number; nodeId?: number }) => void
  onSubmit: () => void
  children?: ReactNode
}) {
  const clustersQuery = useClusterOptions()
  const nodesQuery = useNodeOptions(clusterId)
  const clusters = clustersQuery.data || []
  const nodes = nodesQuery.data || []

  return (
    <form
      className="ui form small"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="ui fields inline">
        <div className="ui field">
          <div className="ui input left right labeled small">
            <span className="ui label basic" style={{ fontWeight: 'normal' }}>
              IP
            </span>
            <input
              type="text"
              placeholder="x.x.x.x"
              value={ip}
              size={15}
              onChange={(event) => onChange({ ip: event.target.value })}
            />
            <a
              className={`ui label basic${ip ? '' : ' disabled'}`}
              href=""
              onClick={(event) => {
                event.preventDefault()
                if (ip) {
                  onChange({ ip: '' })
                }
              }}
            >
              <X size={12} />
            </a>
          </div>
        </div>
        <div className="ui field">
          <div className="ui input left right labeled small">
            <span className="ui label basic" style={{ fontWeight: 'normal' }}>
              域名
            </span>
            <input
              type="text"
              placeholder="example.com"
              value={domain}
              size={15}
              onChange={(event) => onChange({ domain: event.target.value })}
            />
            <a
              className={`ui label basic${domain ? '' : ' disabled'}`}
              href=""
              onClick={(event) => {
                event.preventDefault()
                if (domain) {
                  onChange({ domain: '' })
                }
              }}
            >
              <X size={12} />
            </a>
          </div>
        </div>
        <div className="ui field">
          <div className="ui input left right labeled small">
            <span className="ui label basic" style={{ fontWeight: 'normal' }}>
              关键词
            </span>
            <input
              type="text"
              placeholder="路径、UserAgent、请求ID等..."
              value={keyword}
              size={30}
              onChange={(event) => onChange({ keyword: event.target.value })}
            />
            <a
              className={`ui label basic${keyword ? '' : ' disabled'}`}
              href=""
              onClick={(event) => {
                event.preventDefault()
                if (keyword) {
                  onChange({ keyword: '' })
                }
              }}
            >
              <X size={12} />
            </a>
          </div>
        </div>
        <div className="ui field">
          <Tip
            content={
              '一些特殊的关键词：单个状态码：status:200 / 状态码范围：status:500-504 / 查询IP：ip:192.168.1.100 / 查询路径部分：requestPath:/hello/world / 协议版本：proto:HTTP/1.1 / 协议：scheme:http / 请求方法：method:POST / 请求来源：referer:example.com'
            }
          />
        </div>
      </div>
      <div className="ui fields inline" style={{ marginTop: '0.5em' }}>
        {clusters.length > 0 ? (
          <div className="ui field">
            <select
              className="ui dropdown"
              value={clusterId}
              onChange={(event) => onChange({ clusterId: Number(event.target.value), nodeId: 0 })}
            >
              <option value={0}>[所有集群]</option>
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {clusterId > 0 && nodes.length > 0 ? (
          <div className="ui field">
            <select
              className="ui dropdown"
              value={nodeId}
              onChange={(event) => onChange({ nodeId: Number(event.target.value) })}
            >
              <option value={0}>[所有节点]</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {children}
        <div className="ui field">
          <button className="ui button small" type="submit">
            搜索日志
          </button>
        </div>
      </div>
    </form>
  )
}

export function AccessLogPartitions({
  day,
  partition,
  currentQuery,
  onSelect,
}: {
  day: string
  partition: number
  currentQuery: Record<string, string | number>
  onSelect: (partition: number) => void
}) {
  const [partitions, setPartitions] = useState<number[]>([])
  const [hasLogs, setHasLogs] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let cancelled = false
    apiPost<{ partitions: number[] }>('/servers/logs/partitionData', { day })
      .then((data) => {
        if (cancelled) {
          return
        }
        const list = (data.partitions || []).slice().reverse()
        setPartitions(list)
        if (list.length > 1) {
          list.forEach((code) => {
            apiPost<{ hasLogs: boolean }>('/servers/logs/hasLogs', { ...currentQuery, partition: code })
              .then((resp) => {
                if (!cancelled && resp.hasLogs) {
                  setHasLogs((current) => ({ ...current, [code]: true }))
                }
              })
              .catch(() => undefined)
          })
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [day])

  if (partitions.length <= 1) {
    return null
  }

  return (
    <div>
      <div className="ui divider" style={{ marginBottom: 0 }} />
      <div className="ui menu text small blue" style={{ marginBottom: 0, marginTop: 0 }}>
        {partitions.map((code) => (
          <a
            key={code}
            className={`item${partition === code ? ' active' : ''}`}
            href=""
            onClick={(event) => {
              event.preventDefault()
              onSelect(code)
            }}
          >
            分表{code + 1}
            {hasLogs[code] ? <span className="ui red circular label" style={{ marginLeft: '0.4em' }} /> : null}
          </a>
        ))}
      </div>
      <div className="ui divider" style={{ marginTop: 0 }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 通用小组件                                                          */
/* ------------------------------------------------------------------ */

export function StatusLabelOn({ isOn }: { isOn: boolean }) {
  return isOn ? (
    <span className="ui label green basic">已启用</span>
  ) : (
    <span className="ui label grey basic">已禁用</span>
  )
}

export function IPTypeLabel({ type }: { type: string }) {
  if (type === 'black') {
    return <span className="ui label tiny black">黑名单</span>
  }
  if (type === 'white') {
    return <span className="ui label tiny white">白名单</span>
  }
  if (type === 'grey') {
    return <span className="ui label tiny gray">灰名单</span>
  }
  return <span className="disabled">-</span>
}

export function SubmitBar({
  submitting,
  children = '保存',
  onClick,
}: {
  submitting?: boolean
  children?: ReactNode
  onClick?: () => void
}) {
  return (
    <div style={{ marginTop: '1em' }}>
      <button
        className={`ui button primary${submitting ? ' loading disabled' : ''}`}
        type={onClick ? 'button' : 'submit'}
        disabled={submitting}
        onClick={onClick}
      >
        {children}
      </button>
    </div>
  )
}
