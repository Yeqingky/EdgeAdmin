import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'

interface Option {
  id: number
  name: string
}

interface LogItem {
  id: number
  level: string
  message: string
  createdAt: string
}

interface LogsData {
  nodes: Option[]
  tunnelNodeId: number
  logs: LogItem[]
  page: number
}

export function TunnelLogsPage() {
  const [searchParams] = useSearchParams()
  const [nodeId, setNodeId] = useState(Number(searchParams.get('tunnelNodeId') || 0))
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['tunnel-logs', nodeId, page],
    queryFn: () => apiGet<LogsData>('/tunnels/logs', { tunnelNodeId: nodeId, page }),
    refetchInterval: 5000,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  return (
    <div>
      <div className="ui menu text blue second-menu">
        <a className="item" href="/tunnels/nodes">隧道节点</a>
        <a className="item active" href="/tunnels/logs">运行日志</a>
      </div>
      <div className="ui form">
        <div className="ui field">
          <select
            className="ui dropdown"
            value={data.tunnelNodeId}
            onChange={(event) => {
              const value = Number(event.target.value)
              setNodeId(value)
              setPage(1)
            }}
          >
            {data.nodes.length === 0 ? <option value={0}>暂无隧道节点</option> : null}
            {data.nodes.map((node) => (
              <option key={node.id} value={node.id}>{node.name}</option>
            ))}
          </select>
        </div>
      </div>
      <table className="ui table celled">
        <thead>
          <tr>
            <th style={{ width: '8em' }}>时间</th>
            <th style={{ width: '6em' }}>级别</th>
            <th>内容</th>
          </tr>
        </thead>
        <tbody>
          {data.logs.length === 0 ? (
            <tr><td colSpan={3}>暂无日志</td></tr>
          ) : data.logs.map((log) => (
            <tr key={log.id}>
              <td>{log.createdAt}</td>
              <td>{log.level}</td>
              <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ui pagination menu">
        <a className={`item${page <= 1 ? ' disabled' : ''}`} href="" onClick={(event) => { event.preventDefault(); setPage(Math.max(1, page - 1)) }}>上一页</a>
        <span className="item">{page}</span>
        <a className="item" href="" onClick={(event) => { event.preventDefault(); setPage(page + 1) }}>下一页</a>
      </div>
    </div>
  )
}
