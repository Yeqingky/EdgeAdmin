import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import {
  AccessLogDetailModal,
  AccessLogList,
  AccessLogPartitions,
  AccessLogSearchForm,
  FirstMenu,
  ServerPageLayout,
  ServerTopMenu,
  type AccessLog,
  type LeftMenuItem,
  type ServerBrief,
  type WafInfo,
} from './common'

interface LogPageData {
  serverId: number
  server: ServerBrief
  clusterAccessLogIsOn: boolean
  serverAccessLogIsOn: boolean
  accessLogs?: AccessLog[]
  regions?: Record<string, string>
  wafInfos?: Record<string, WafInfo>
  hasMore?: boolean
  hasPrev?: boolean
  nextRequestId?: string
  lastRequestId?: string
  requestId?: string
  hasError?: number
  hasWAF?: number
  day?: string
  hour?: string
  keyword?: string
  ip?: string
  domain?: string
  clusterId?: number
  nodeId?: number
  partition?: number
  pageSize?: number
}

interface LogFilters {
  ip: string
  domain: string
  keyword: string
  clusterId: number
  nodeId: number
}

function logMenuItems(serverId: number, current: 'index' | 'today' | 'history'): LeftMenuItem[] {
  return [
    { name: '即时', url: `/servers/server/log?serverId=${serverId}`, isActive: current === 'index' },
    { name: '今天', url: `/servers/server/log/today?serverId=${serverId}`, isActive: current === 'today' },
    { name: '历史', url: `/servers/server/log/history?serverId=${serverId}`, isActive: current === 'history' },
  ]
}

function LogWarnings({ data }: { data: LogPageData }) {
  return (
    <>
      {!data.clusterAccessLogIsOn ? (
        <div className="ui warning message">
          当前集群已经设置不允许网站记录访问日志，可以在&quot;集群设置&quot; -- &quot;网站设置&quot;中修改此选项。
        </div>
      ) : null}
      {!data.serverAccessLogIsOn ? (
        <div className="ui warning message">
          当前网站尚未启用访问日志，可以在{' '}
          <a href={`/servers/server/settings/accessLog?serverId=${data.serverId}`}>[这里]</a> 修改。
        </div>
      ) : null}
    </>
  )
}

function readFilters(params: URLSearchParams): LogFilters {
  return {
    ip: params.get('ip') || '',
    domain: params.get('domain') || '',
    keyword: params.get('keyword') || '',
    clusterId: Number(params.get('clusterId') || 0) || 0,
    nodeId: Number(params.get('nodeId') || 0) || 0,
  }
}

function PageSizeSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <span style={{ marginLeft: '1em' }}>
      每页
      <select className="ui dropdown" value={value} onChange={(event) => onChange(event.target.value)} style={{ marginLeft: '0.3em' }}>
        <option value="">默认</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </span>
  )
}

function PagerLinks({
  hasPrev,
  hasMore,
  onPrev,
  onNext,
}: {
  hasPrev: boolean
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div>
      {hasPrev ? (
        <a href="" onClick={(event) => { event.preventDefault(); onPrev() }}>
          上一页
        </a>
      ) : (
        <span className="disabled">上一页</span>
      )}
      <span className="disabled">&nbsp; | &nbsp;</span>
      {hasMore ? (
        <a href="" onClick={(event) => { event.preventDefault(); onNext() }}>
          下一页
        </a>
      ) : (
        <span className="disabled">下一页</span>
      )}
    </div>
  )
}

function LogTabs({
  hasError,
  hasWAF,
  onChange,
}: {
  hasError: number
  hasWAF: number
  onChange: (patch: { hasError?: number; hasWAF?: number }) => void
}) {
  return (
    <FirstMenu
      items={[
        {
          name: '所有日志',
          href: '',
          active: hasError === 0 && hasWAF === 0,
          onClick: () => onChange({ hasError: undefined, hasWAF: undefined }),
        },
        { name: '错误日志', href: '', active: hasError > 0, onClick: () => onChange({ hasError: 1, hasWAF: undefined }) },
        { name: 'WAF日志', href: '', active: hasWAF > 0, onClick: () => onChange({ hasWAF: 1, hasError: undefined }) },
      ]}
    />
  )
}

export function ServerLogRealtimePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const filtersKey = searchParams.toString()
  const [filters, setFilters] = useState<LogFilters>(() => readFilters(searchParams))
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [regions, setRegions] = useState<Record<string, string>>({})
  const [wafInfos, setWafInfos] = useState<Record<string, WafInfo>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [detailRequestId, setDetailRequestId] = useState('')
  const pausedRef = useRef(false)
  pausedRef.current = !!detailRequestId

  const query = useQuery({
    queryKey: ['servers-core', 'server-log', serverId, filtersKey],
    enabled: serverId > 0,
    queryFn: () => apiGet<LogPageData>('/servers/server/log', { serverId, ...readFilters(searchParams) }),
  })

  useEffect(() => {
    if (serverId <= 0) {
      return
    }
    const params = new URLSearchParams(filtersKey)
    const currentFilters = readFilters(params)
    let cancelled = false
    let timer = 0
    let lastRequestId = params.get('requestId') || ''

    setAccessLogs([])
    setRegions({})
    setWafInfos({})

    const load = () => {
      if (cancelled) {
        return
      }
      if (pausedRef.current) {
        timer = window.setTimeout(load, 5000)
        return
      }
      apiPost<{
        accessLogs: AccessLog[]
        requestId: string
        hasMore: boolean
        regions?: Record<string, string>
        wafInfos?: Record<string, WafInfo>
      }>('/servers/server/log', {
        serverId,
        requestId: lastRequestId,
        ...currentFilters,
      })
        .then((resp) => {
          if (cancelled) {
            return
          }
          const logs = resp.accessLogs || []
          if (logs.length > 0) {
            setAccessLogs((current) => [...logs, ...current].slice(0, 100))
            setRegions((current) => ({ ...current, ...(resp.regions || {}) }))
            setWafInfos((current) => ({ ...current, ...(resp.wafInfos || {}) }))
          }
          lastRequestId = resp.requestId || lastRequestId
          setIsLoaded(true)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            timer = window.setTimeout(load, 5000)
          }
        })
    }

    load()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [serverId, filtersKey])

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  function applyFilters() {
    const next = new URLSearchParams(searchParams)
    next.set('serverId', String(serverId))
    for (const [key, value] of Object.entries({ ...filters })) {
      if (value === '' || value === 0) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    next.delete('requestId')
    setSearchParams(next)
  }

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="log" />
      <ServerPageLayout menu={logMenuItems(data.server.id, 'index')}>
        <LogWarnings data={data} />

        <AccessLogSearchForm
          ip={filters.ip}
          domain={filters.domain}
          keyword={filters.keyword}
          clusterId={filters.clusterId}
          nodeId={filters.nodeId}
          onChange={(values) => setFilters((current) => ({ ...current, ...values }))}
          onSubmit={applyFilters}
        />

        {isLoaded && accessLogs.length === 0 ? <p className="comment">今天暂时还没有访问日志。</p> : null}

        <AccessLogList
          accessLogs={accessLogs}
          regions={regions}
          wafInfos={wafInfos}
          keyword={filters.keyword}
          onShowDetail={setDetailRequestId}
        />

        {accessLogs.length > 0 ? <p className="comment">已加载最近100条日志，每5秒自动刷新。</p> : null}
      </ServerPageLayout>

      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}

export function ServerLogTodayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const [filters, setFilters] = useState<LogFilters>(() => readFilters(searchParams))
  const [detailRequestId, setDetailRequestId] = useState('')

  const hasError = Number(searchParams.get('hasError') || 0) || 0
  const hasWAF = Number(searchParams.get('hasWAF') || 0) || 0
  const partition = Number(searchParams.get('partition') ?? -1)

  const query = useQuery({
    queryKey: ['servers-core', 'server-log-today', serverId, searchParams.toString()],
    enabled: serverId > 0,
    queryFn: () =>
      apiGet<LogPageData>('/servers/server/log/today', {
        serverId,
        hasError,
        hasWAF,
        partition,
        requestId: searchParams.get('requestId') || '',
        pageSize: searchParams.get('pageSize') || 0,
        ...readFilters(searchParams),
      }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const baseQuery: Record<string, string | number> = {
    serverId,
    ...readFilters(searchParams),
    pageSize: searchParams.get('pageSize') || '',
    hasError,
    hasWAF,
  }

  function updateParams(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    next.delete('requestId')
    setSearchParams(next)
  }

  function applyFilters() {
    updateParams({ ...filters })
  }

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="log" />
      <ServerPageLayout menu={logMenuItems(data.server.id, 'today')}>
        <LogWarnings data={data} />

        <LogTabs hasError={hasError} hasWAF={hasWAF} onChange={updateParams} />

        <AccessLogSearchForm
          ip={filters.ip}
          domain={filters.domain}
          keyword={filters.keyword}
          clusterId={filters.clusterId}
          nodeId={filters.nodeId}
          onChange={(values) => setFilters((current) => ({ ...current, ...values }))}
          onSubmit={applyFilters}
        />

        <AccessLogPartitions
          day={data.day || ''}
          partition={partition}
          currentQuery={baseQuery}
          onSelect={(value) => updateParams({ partition: value })}
        />

        <AccessLogList
          accessLogs={data.accessLogs || []}
          regions={data.regions}
          wafInfos={data.wafInfos}
          keyword={filters.keyword}
          onShowDetail={setDetailRequestId}
          emptyText="今天暂时还没有访问日志。"
        />

        {(data.accessLogs || []).length > 0 ? (
          <div>
            <PagerLinks
              hasPrev={!!(data.hasPrev && data.lastRequestId)}
              hasMore={!!(data.hasMore && data.nextRequestId)}
              onPrev={() => updateParams({ requestId: data.lastRequestId })}
              onNext={() => updateParams({ requestId: data.nextRequestId })}
            />
            <PageSizeSelector
              value={searchParams.get('pageSize') || ''}
              onChange={(value) => updateParams({ pageSize: value })}
            />
          </div>
        ) : null}
      </ServerPageLayout>

      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}

export function ServerLogHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const [filters, setFilters] = useState<LogFilters>(() => readFilters(searchParams))
  const [day, setDay] = useState(searchParams.get('day') || '')
  const [hour, setHour] = useState(searchParams.get('hour') || '')
  const [detailRequestId, setDetailRequestId] = useState('')

  const hasError = Number(searchParams.get('hasError') || 0) || 0
  const hasWAF = Number(searchParams.get('hasWAF') || 0) || 0
  const partition = Number(searchParams.get('partition') ?? -1)

  const query = useQuery({
    queryKey: ['servers-core', 'server-log-history', serverId, searchParams.toString()],
    enabled: serverId > 0,
    queryFn: () =>
      apiGet<LogPageData>('/servers/server/log/history', {
        serverId,
        day: searchParams.get('day') || '',
        hour: searchParams.get('hour') || '',
        hasError,
        hasWAF,
        partition,
        requestId: searchParams.get('requestId') || '',
        pageSize: searchParams.get('pageSize') || 0,
        ...readFilters(searchParams),
      }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const baseQuery: Record<string, string | number> = {
    serverId,
    day: data.day || '',
    hour: searchParams.get('hour') || '',
    ...readFilters(searchParams),
    pageSize: searchParams.get('pageSize') || '',
    hasError,
    hasWAF,
  }

  function updateParams(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    next.delete('requestId')
    setSearchParams(next)
  }

  function applyFilters() {
    updateParams({ ...filters, day, hour })
  }

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="log" />
      <ServerPageLayout menu={logMenuItems(data.server.id, 'history')}>
        <LogWarnings data={data} />

        <LogTabs hasError={hasError} hasWAF={hasWAF} onChange={updateParams} />

        <AccessLogSearchForm
          ip={filters.ip}
          domain={filters.domain}
          keyword={filters.keyword}
          clusterId={filters.clusterId}
          nodeId={filters.nodeId}
          onChange={(values) => setFilters((current) => ({ ...current, ...values }))}
          onSubmit={applyFilters}
        >
          <div className="ui field">
            <div className="ui right labeled input">
              <input
                type="text"
                placeholder="选择日期"
                maxLength={10}
                style={{ width: '7.8em' }}
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
              <span className="ui label">日</span>
            </div>
          </div>
          <div className="ui field">
            <div className="ui right labeled input">
              <input
                type="text"
                maxLength={2}
                style={{ width: '3.5em' }}
                value={hour}
                onChange={(event) => setHour(event.target.value)}
              />
              <span className="ui label">时</span>
            </div>
          </div>
        </AccessLogSearchForm>

        <AccessLogPartitions
          day={data.day || ''}
          partition={partition}
          currentQuery={baseQuery}
          onSelect={(value) => updateParams({ partition: value })}
        />

        <AccessLogList
          accessLogs={data.accessLogs || []}
          regions={data.regions}
          wafInfos={data.wafInfos}
          keyword={filters.keyword}
          onShowDetail={setDetailRequestId}
        />

        {(data.accessLogs || []).length > 0 ? (
          <div>
            <PagerLinks
              hasPrev={!!(data.hasPrev && data.lastRequestId)}
              hasMore={!!(data.hasMore && data.nextRequestId)}
              onPrev={() => updateParams({ requestId: data.lastRequestId })}
              onNext={() => updateParams({ requestId: data.nextRequestId })}
            />
            <PageSizeSelector
              value={searchParams.get('pageSize') || ''}
              onChange={(value) => updateParams({ pageSize: value })}
            />
          </div>
        ) : null}
      </ServerPageLayout>

      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}
