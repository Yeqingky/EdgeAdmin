import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import {
  AccessLogDetailModal,
  AccessLogList,
  AccessLogPartitions,
  AccessLogSearchForm,
  FirstMenu,
  type AccessLog,
  type WafInfo,
} from './common'

interface LogsData {
  clusterId: number
  nodeId: number
  serverId: number
  day: string
  hour: string
  keyword: string
  ip: string
  domain: string
  accessLogs: AccessLog[]
  hasError: number
  hasWAF: number
  pageSize: number
  isSlowQuery: boolean
  slowQueryCost: string
  partition: number
  hasMore: boolean
  hasPrev: boolean
  nextRequestId: string
  lastRequestId: string
  regions?: Record<string, string>
  wafInfos?: Record<string, WafInfo>
}

interface AccessLogQueueConfig {
  percent: number
  countPerSecond: number
  maxLength: number
  enableAutoPartial: boolean
  rowsPerTable: number
}

export function ServerLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailRequestId, setDetailRequestId] = useState('')
  const [filters, setFilters] = useState(() => ({
    ip: searchParams.get('ip') || '',
    domain: searchParams.get('domain') || '',
    keyword: searchParams.get('keyword') || '',
    clusterId: Number(searchParams.get('clusterId') || 0) || 0,
    nodeId: Number(searchParams.get('nodeId') || 0) || 0,
  }))
  const [day, setDay] = useState(searchParams.get('day') || '')
  const [hour, setHour] = useState(searchParams.get('hour') || '')

  const hasError = Number(searchParams.get('hasError') || 0) || 0
  const hasWAF = Number(searchParams.get('hasWAF') || 0) || 0
  const partition = Number(searchParams.get('partition') ?? -1)

  const query = useQuery({
    queryKey: ['servers-core', 'logs', searchParams.toString()],
    queryFn: () =>
      apiGet<LogsData>('/servers/logs', {
        clusterId: searchParams.get('clusterId') || 0,
        nodeId: searchParams.get('nodeId') || 0,
        day: searchParams.get('day') || '',
        hour: searchParams.get('hour') || '',
        keyword: searchParams.get('keyword') || '',
        ip: searchParams.get('ip') || '',
        domain: searchParams.get('domain') || '',
        hasError,
        hasWAF,
        partition,
        requestId: searchParams.get('requestId') || '',
        pageSize: searchParams.get('pageSize') || 0,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

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

  const baseQuery: Record<string, string | number> = {
    clusterId: searchParams.get('clusterId') || 0,
    nodeId: searchParams.get('nodeId') || 0,
    serverId: 0,
    day: data.day,
    keyword: filters.keyword,
    ip: filters.ip,
    domain: filters.domain,
    hour: searchParams.get('hour') || '',
    pageSize: searchParams.get('pageSize') || '',
    hasError,
    hasWAF,
  }

  return (
    <div>
      <FirstMenu
        items={[
          {
            name: '所有日志',
            href: '',
            active: hasError === 0 && hasWAF === 0,
            onClick: () => updateParams({ hasError: undefined, hasWAF: undefined }),
          },
          { name: '错误日志', href: '', active: hasError > 0, onClick: () => updateParams({ hasError: 1, hasWAF: undefined }) },
          { name: 'WAF日志', href: '', active: hasWAF > 0, onClick: () => updateParams({ hasWAF: 1, hasError: undefined }) },
        ]}
      >
        <span className="item disabled">|</span>
        <a className="item" href="/servers/logs/settings">
          设置
        </a>
      </FirstMenu>

      <AccessLogSearchForm
        ip={filters.ip}
        domain={filters.domain}
        keyword={filters.keyword}
        clusterId={filters.clusterId}
        nodeId={filters.nodeId}
        onChange={(values) => setFilters((current) => ({ ...current, ...values }))}
        onSubmit={() => updateParams({ ...filters, day, hour })}
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
        day={data.day}
        partition={partition}
        currentQuery={baseQuery}
        onSelect={(value) => updateParams({ partition: value })}
      />

      {data.isSlowQuery ? (
        <div className="ui warning message">
          看起来你的访问日志查询非常慢（{data.slowQueryCost}s），建议
          {data.domain.length === 0 ? ' 1）指定具体域名查询；2）' : ''}
          通过添加新的 <a href="/db">[日志节点]</a> 来分散存储访问日志。
        </div>
      ) : null}

      <AccessLogList
        accessLogs={data.accessLogs || []}
        regions={data.regions}
        wafInfos={data.wafInfos}
        keyword={filters.keyword}
        showServerLink
        onShowDetail={setDetailRequestId}
      />

      {(data.accessLogs || []).length > 0 ? (
        <div>
          {data.hasPrev && data.lastRequestId ? (
            <a href="" onClick={(event) => { event.preventDefault(); updateParams({ requestId: data.lastRequestId }) }}>
              上一页
            </a>
          ) : (
            <span className="disabled">上一页</span>
          )}
          <span className="disabled">&nbsp; | &nbsp;</span>
          {data.hasMore && data.nextRequestId ? (
            <a href="" onClick={(event) => { event.preventDefault(); updateParams({ requestId: data.nextRequestId }) }}>
              下一页
            </a>
          ) : (
            <span className="disabled">下一页</span>
          )}
          <span style={{ marginLeft: '1em' }}>
            每页
            <select
              className="ui dropdown"
              value={searchParams.get('pageSize') || ''}
              onChange={(event) => updateParams({ pageSize: event.target.value })}
              style={{ marginLeft: '0.3em' }}
            >
              <option value="">默认</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </span>
        </div>
      ) : null}

      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}

export function ServerLogsSettingsPage() {
  const toast = useToast()
  const [config, setConfig] = useState<AccessLogQueueConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'logs-settings'],
    queryFn: () => apiGet<{ config: AccessLogQueueConfig }>('/servers/logs/settings'),
  })

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
    }
  }, [query.data])

  if (query.isLoading || !config) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    if (!config) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/logs/settings', {
        csrfToken: await getCsrfToken(),
        percent: config.percent,
        countPerSecond: config.countPerSecond,
        maxLength: config.maxLength,
        enableAutoPartial: config.enableAutoPartial ? 1 : '',
        rowsPerTable: config.rowsPerTable,
      })
      toast('保存成功，将会在一分钟之内生效')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: '所有日志', href: '/servers/logs' },
          { name: '错误日志', href: '/servers/logs?hasError=1' },
          { name: 'WAF日志', href: '/servers/logs?hasWAF=1' },
        ]}
      >
        <span className="item disabled">|</span>
        <a className="item active" href="/servers/logs/settings">
          设置
        </a>
      </FirstMenu>

      <div className="margin" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h3>存储队列设置</h3>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">采样率</td>
              <td>
                <div className="ui input right labeled">
                  <input
                    type="text"
                    size={3}
                    maxLength={3}
                    style={{ width: '4em' }}
                    value={config.percent}
                    onChange={(event) => setConfig({ ...config, percent: Number(event.target.value) || 0 })}
                  />
                  <span className="ui label">%</span>
                </div>
                <p className="comment">表示将写入{config.percent}%的访问日志数据；此设置不影响WAF相关日志。</p>
              </td>
            </tr>
            <tr>
              <td>写入速度</td>
              <td>
                <div className="ui input right labeled">
                  <input
                    type="text"
                    size={6}
                    maxLength={6}
                    style={{ width: '6em' }}
                    value={config.countPerSecond}
                    onChange={(event) => setConfig({ ...config, countPerSecond: Number(event.target.value) || 0 })}
                  />
                  <span className="ui label">条/秒</span>
                </div>
                <p className="comment">单个API节点每秒写入的访问日志数量；0表示不限制。</p>
              </td>
            </tr>
            <tr>
              <td>队列长度</td>
              <td>
                <input
                  type="text"
                  size={6}
                  maxLength={6}
                  style={{ width: '6em' }}
                  value={config.maxLength}
                  onChange={(event) => setConfig({ ...config, maxLength: Number(event.target.value) || 0 })}
                />
                <p className="comment">等待写入的队列最大长度，超出此长度的访问日志将被丢弃；0表示不限制。</p>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>自动分表设置</h3>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">启用自动分表</td>
              <td>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    id="logs-enable-auto-partial"
                    checked={config.enableAutoPartial}
                    onChange={(event) => setConfig({ ...config, enableAutoPartial: event.target.checked })}
                  />
                  <label htmlFor="logs-enable-auto-partial" />
                </div>
                <p className="comment">启用后，可以将单天访问日志自动存储到多个数据表中，以提升查询速度。</p>
              </td>
            </tr>
            {config.enableAutoPartial ? (
              <tr>
                <td>单表最多行数</td>
                <td>
                  <input
                    type="text"
                    style={{ width: '8em' }}
                    maxLength={16}
                    value={config.rowsPerTable}
                    onChange={(event) => setConfig({ ...config, rowsPerTable: Number(event.target.value) || 0 })}
                  />
                  <p className="comment">单个数据表最多能存储的最多行数。</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
