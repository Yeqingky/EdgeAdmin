import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LevelOption, LogsMenu, apiPostMulti, parseId } from './shared'

interface LogNode {
  id: number
  name: string
  cluster: { id: number; name: string }
}

interface LogRow {
  id: number
  tag: string
  description: string
  createdTime: string
  level: string
  isToday: boolean
  count: number
  isRead: boolean
  isFixed: boolean
  node: LogNode
  server: { id: number; name?: string }
}

interface LogsData {
  dayFrom: string
  dayTo: string
  keyword: string
  searchedKeyword: string
  level: string
  type: string
  tag: string
  clusterId: number
  nodeId: number
  tags: LevelOption[]
  countUnreadLogs: number
  countNeedFixLogs: number
  countLogs: number
  firstUnreadNode: { id: number; name: string } | null
  page: string
  logs: LogRow[]
}

const levelLabels: Record<string, string> = {
  error: '错误',
  warning: '警告',
  info: '信息',
  success: '成功',
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = searchParams.get('type') || ''
  const dayFrom = searchParams.get('dayFrom') || ''
  const dayTo = searchParams.get('dayTo') || ''
  const level = searchParams.get('level') || ''
  const tag = searchParams.get('tag') || ''
  const keyword = searchParams.get('keyword') || ''
  const clusterId = parseId(searchParams.get('clusterId'))
  const nodeId = parseId(searchParams.get('nodeId'))
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [dayFromInput, setDayFromInput] = useState(dayFrom)
  const [dayToInput, setDayToInput] = useState(dayTo)
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['cluster-logs', type, dayFrom, dayTo, level, tag, keyword, clusterId, nodeId],
    queryFn: () =>
      apiGet<LogsData>('/clusters/logs', {
        type,
        dayFrom,
        dayTo,
        level,
        tag,
        keyword,
        clusterId,
        nodeId,
      }),
  })
  const clustersQuery = useQuery({
    queryKey: ['cluster-options'],
    queryFn: () => apiGet<{ clusters: { id: number; name: string }[] }>('/clusters/selectPopup', { pageSize: 1000 }),
  })
  const nodesQuery = useQuery({
    queryKey: ['cluster-node-options', clusterId],
    queryFn: () => apiPost<{ nodes: { id: number; name: string }[] }>('/clusters/nodeOptions', { clusterId }),
    enabled: clusterId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  function updateParam(name: string, value: string | number) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(name, String(value))
    } else {
      next.delete(name)
    }
    setSearchParams(next)
  }

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: ['cluster-logs'] })
  }

  async function deleteLogs() {
    if (!(await confirm({ message: '确定要清除这些日志吗?', danger: true, confirmText: '清除' }))) {
      return
    }
    try {
      await apiPost('/clusters/logs/deleteAll', { dayFrom, dayTo, keyword, level, type, tag, clusterId, nodeId })
      toast('删除成功')
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (type) next.set('type', type)
    if (dayFromInput) next.set('dayFrom', dayFromInput)
    if (dayToInput) next.set('dayTo', dayToInput)
    if (level) next.set('level', level)
    if (tag) next.set('tag', tag)
    if (keywordInput) next.set('keyword', keywordInput)
    if (clusterId > 0) next.set('clusterId', String(clusterId))
    if (nodeId > 0) next.set('nodeId', String(nodeId))
    setSearchParams(next)
  }

  const hasFilter = dayFrom || dayTo || keyword || level || tag || clusterId > 0 || nodeId > 0
  const logIds = data.logs.map((log) => log.id)

  return (
    <div>
      <LogsMenu active={type === 'unread' ? 'unread' : type === 'needFix' ? 'needFix' : 'index'} countUnreadLogs={data.countUnreadLogs} countNeedFixLogs={data.countNeedFixLogs} />
      <div className="margin" />
      <form className="ui form" autoComplete="off" onSubmit={submit}>
        <input type="hidden" name="type" value={type} />
        <div className="ui fields">
          <div className="ui field">
            <input
              type="text"
              name="dayFrom"
              placeholder="开始日期"
              style={{ width: '8em' }}
              value={dayFromInput}
              onChange={(event) => setDayFromInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <input
              type="text"
              name="dayTo"
              placeholder="结束日期"
              style={{ width: '8em' }}
              value={dayToInput}
              onChange={(event) => setDayToInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <select className="ui dropdown" name="level" value={level} onChange={(event) => updateParam('level', event.target.value)}>
              <option value="">[级别]</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
              <option value="success">成功</option>
            </select>
          </div>
          <div className="ui field">
            <select className="ui dropdown" name="tag" value={tag} onChange={(event) => updateParam('tag', event.target.value)}>
              <option value="">[标签]</option>
              {data.tags.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <input
              type="text"
              name="keyword"
              style={{ width: '10em' }}
              placeholder="关键词"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={clusterId} onChange={(event) => updateParam('clusterId', Number(event.target.value))}>
              <option value="0">[所有集群]</option>
              {clustersQuery.data?.clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>
          {clusterId > 0 ? (
            <div className="ui field">
              <select className="ui dropdown" value={nodeId} onChange={(event) => updateParam('nodeId', Number(event.target.value))}>
                <option value="0">[所有节点]</option>
                {nodesQuery.data?.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="ui field">
            <button type="submit" className="ui button">
              查询
            </button>
          </div>
          {hasFilter ? (
            <div className="ui field">
              <a href={`/clusters/logs${type ? `?type=${type}` : ''}`}>[清除条件]</a>
            </div>
          ) : null}
        </div>
      </form>

      {type === 'unread' && data.logs.length > 0 ? (
        <div className="ui menu text blue second-menu">
          <a
            className="item"
            href=""
            onClick={(event) => {
              event.preventDefault()
              void apiPostMulti('/clusters/logs/readLogs', { logIds }).then(reload).catch((error: Error) => toast(error.message, 'error'))
            }}
          >
            [本页已读]
          </a>
          <a
            className="item"
            href=""
            onClick={(event) => {
              event.preventDefault()
              void apiPost('/clusters/logs/readAllLogs', {})
                .then(reload)
                .catch((error: Error) => toast(error.message, 'error'))
            }}
          >
            [全部已读]
          </a>
          {data.firstUnreadNode ? (
            <a
              className="item"
              href=""
              onClick={(event) => {
                event.preventDefault()
                void apiPostMulti('/clusters/logs/readLogs', { nodeId: [data.firstUnreadNode!.id] })
                  .then(reload)
                  .catch((error: Error) => toast(error.message, 'error'))
              }}
            >
              ["{data.firstUnreadNode.name}"节点已读]
            </a>
          ) : null}
        </div>
      ) : null}

      {type === 'needFix' && data.logs.length > 0 ? (
        <div>
          <div className="ui menu text blue second-menu">
            <a
              className="item"
              href=""
              onClick={(event) => {
                event.preventDefault()
                void apiPostMulti('/clusters/logs/fix', { logIds })
                  .then(reload)
                  .catch((error: Error) => toast(error.message, 'error'))
              }}
            >
              [本页已修复]
            </a>
            <a
              className="item"
              href=""
              onClick={(event) => {
                event.preventDefault()
                void apiPost('/clusters/logs/fixAll', {})
                  .then(reload)
                  .catch((error: Error) => toast(error.message, 'error'))
              }}
            >
              [全部已修复]
            </a>
          </div>
          <p className="ui message">已合并重复内容,当前显示数据和总数量可能不一致.</p>
        </div>
      ) : null}

      {data.logs.length === 0 ? (
        <p className="comment">
          暂时还没有{type === 'unread' ? '未读' : type === 'needFix' ? '需修复' : ''}日志.
        </p>
      ) : null}

      {data.countLogs > 0 && data.searchedKeyword ? (
        <div className="search-keyword-label">
          <div className="ui label basic small">
            正在搜索关键词"{data.searchedKeyword}",共{data.countLogs}条记录 &nbsp;{' '}
            <a href="" onClick={(event) => { event.preventDefault(); void deleteLogs() }}>
              <span className="small">[清除日志]</span>
            </a>
          </div>
        </div>
      ) : null}

      {data.logs.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th className="two wide">集群</th>
              <th className="two wide">节点</th>
              <th>信息</th>
              <th style={{ width: '5em' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a href={`/clusters/cluster?clusterId=${log.node.cluster.id}`}>{log.node.cluster.name}</a>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a href={`/clusters/cluster/node?clusterId=${log.node.cluster.id}&nodeId=${log.node.id}`}>{log.node.name}</a>
                </td>
                <td>
                  <span className={`ui label tiny ${log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : log.level === 'success' ? 'green' : 'blue'} basic`}>
                    {levelLabels[log.level] || log.level}
                  </span>
                  <span className="ui label tiny basic">{log.tag}</span>
                  {log.count > 1 ? <span className="ui label tiny basic">x{log.count}</span> : null}
                  <span>{log.description}</span>
                  <div className="comment">
                    {log.createdTime}
                    {log.isToday ? '(今天)' : ''}
                    {log.server.id > 0 && log.server.name ? ` · 网站:${log.server.name}` : ''}
                  </div>
                </td>
                <td>
                  {!log.isFixed ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void apiPostMulti('/clusters/logs/fix', { logIds: [log.id] })
                          .then(reload)
                          .catch((error: Error) => toast(error.message, 'error'))
                      }}
                    >
                      已修复
                    </a>
                  ) : null}
                  {log.isFixed && !log.isRead ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void apiPostMulti('/clusters/logs/readLogs', { logIds: [log.id] })
                          .then(reload)
                          .catch((error: Error) => toast(error.message, 'error'))
                      }}
                    >
                      已读
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />
    </div>
  )
}
