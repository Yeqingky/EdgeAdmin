import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { NodeMenu } from './NodeMenu'
import { logLevelClass, type NodeLogsData } from './shared'

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) {
    return <>{text}</>
  }
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const pieces: { text: string; matched: boolean }[] = []
  let index = 0
  while (index < text.length) {
    const found = lowerText.indexOf(lowerKeyword, index)
    if (found < 0) {
      pieces.push({ text: text.substring(index), matched: false })
      break
    }
    if (found > index) {
      pieces.push({ text: text.substring(index, found), matched: false })
    }
    pieces.push({ text: text.substring(found, found + keyword.length), matched: true })
    index = found + keyword.length
  }
  return (
    <>
      {pieces.map((piece, pieceIndex) =>
        piece.matched ? <span key={pieceIndex} className="ui label red basic tiny">{piece.text}</span> : <span key={pieceIndex}>{piece.text}</span>,
      )}
    </>
  )
}

export function NodeLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const dayFrom = searchParams.get('dayFrom') || ''
  const dayTo = searchParams.get('dayTo') || ''
  const level = searchParams.get('level') || ''
  const tag = searchParams.get('tag') || ''
  const keyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [draft, setDraft] = useState({ dayFrom, dayTo, level, tag, keyword })

  const query = useQuery({
    queryKey: ['node-logs', clusterId, nodeId, dayFrom, dayTo, level, tag, keyword, page],
    queryFn: () =>
      apiGet<NodeLogsData>('/clusters/cluster/node/logs', {
        clusterId,
        nodeId,
        dayFrom: dayFrom || undefined,
        dayTo: dayTo || undefined,
        level: level || undefined,
        tag: tag || undefined,
        keyword: keyword || undefined,
        page: page > 1 ? page : undefined,
      }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const hasFilters = dayFrom || dayTo || keyword || level || tag

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('clusterId', String(clusterId))
    next.set('nodeId', String(nodeId))
    if (draft.dayFrom) {
      next.set('dayFrom', draft.dayFrom)
    }
    if (draft.dayTo) {
      next.set('dayTo', draft.dayTo)
    }
    if (draft.level) {
      next.set('level', draft.level)
    }
    if (draft.tag) {
      next.set('tag', draft.tag)
    }
    if (draft.keyword) {
      next.set('keyword', draft.keyword)
    }
    setSearchParams(next)
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={data.node} active="log" />

      <form className="ui form" onSubmit={submit} autoComplete="off">
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="开始日期 (YYYY-MM-DD)"
              style={{ width: '10em' }}
              value={draft.dayFrom}
              onChange={(event) => setDraft({ ...draft, dayFrom: event.target.value })}
            />
          </div>
          <div className="ui field">
            <input
              type="text"
              placeholder="结束日期 (YYYY-MM-DD)"
              style={{ width: '10em' }}
              value={draft.dayTo}
              onChange={(event) => setDraft({ ...draft, dayTo: event.target.value })}
            />
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value })}>
              <option value="">[级别]</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
              <option value="success">成功</option>
            </select>
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })}>
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
              placeholder="关键词"
              style={{ width: '10em' }}
              value={draft.keyword}
              onChange={(event) => setDraft({ ...draft, keyword: event.target.value })}
            />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              查询
            </button>
          </div>
          {hasFilters ? (
            <div className="ui field">
              <Link to={`/clusters/cluster/node/logs?clusterId=${clusterId}&nodeId=${nodeId}`}>[清除条件]</Link>
            </div>
          ) : null}
        </div>
      </form>

      {data.logs.length === 0 ? <p className="comment">暂时还没有日志。</p> : null}

      {data.logs.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {data.logs.map((log, index) => (
              <tr key={`${log.createdTime}-${index}`}>
                <td>
                  <pre className="log-box" style={{ margin: 0, padding: 0 }}>
                    <span className={logLevelClass(log.level)}>
                      [{log.createdTime}]<HighlightText text={`[${log.tag}]${log.description}`} keyword={keyword} />
                    </span>{' '}
                    {log.count > 1 ? (
                      <span className={`ui label tiny${log.level === 'error' ? ' red' : log.level === 'warning' ? ' orange' : ''}`}>共{log.count}条</span>
                    ) : null}
                    {log.server && log.server.id > 0 ? (
                      <Link className="ui label tiny basic" to={`/servers/server?serverId=${log.server.id}`}>
                        {log.server.name}
                      </Link>
                    ) : null}
                  </pre>
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
