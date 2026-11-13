import { type FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { DbTabs } from './DbTabs'

interface LogItem {
  tag: string
  description: string
  createdTime: string
  level: string
  isToday: boolean
}

export function DbLogsPage() {
  const [params, setParams] = useSearchParams()
  const nodeId = Number(params.get('nodeId') || 0)
  const dayFrom = params.get('dayFrom') || ''
  const dayTo = params.get('dayTo') || ''
  const keyword = params.get('keyword') || ''
  const level = params.get('level') || ''
  const [form, setForm] = useState({ dayFrom, dayTo, keyword, level })

  const query = useQuery({
    queryKey: ['db-logs', nodeId, dayFrom, dayTo, keyword, level],
    queryFn: () => apiGet<{ logs: LogItem[]; page: string }>('/db/logs', { nodeId, dayFrom, dayTo, keyword, level }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('nodeId', String(nodeId))
    for (const [key, value] of Object.entries(form)) {
      if (value) {
        next.set(key, value)
      }
    }
    setParams(next)
  }

  return (
    <div>
      <DbTabs nodeId={nodeId} active="log" />
      <form className="ui form" onSubmit={submit} autoComplete="off">
        <div className="ui fields inline">
          <div className="ui field">
            <input type="date" value={form.dayFrom} style={{ width: '10em' }} onChange={(event) => setForm({ ...form, dayFrom: event.target.value })} />
          </div>
          <div className="ui field">
            <input type="date" value={form.dayTo} style={{ width: '10em' }} onChange={(event) => setForm({ ...form, dayTo: event.target.value })} />
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="">[级别]</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
              <option value="success">成功</option>
            </select>
          </div>
          <div className="ui field">
            <input type="text" style={{ width: '10em' }} placeholder="关键词" value={form.keyword} onChange={(event) => setForm({ ...form, keyword: event.target.value })} />
          </div>
          <div className="ui field"><button className="ui button" type="submit">查询</button></div>
          {dayFrom || dayTo || keyword || level ? (
            <div className="ui field">
              <a href={`/db/logs?nodeId=${nodeId}`} onClick={(event) => { event.preventDefault(); setForm({ dayFrom: '', dayTo: '', keyword: '', level: '' }); setParams(new URLSearchParams({ nodeId: String(nodeId) })) }}>
                [清除条件]
              </a>
            </div>
          ) : null}
        </div>
      </form>

      {query.data.logs.length === 0 ? <p className="comment">暂时还没有日志.</p> : (
        <table className="ui table selectable">
          <tbody>
            {query.data.logs.map((log, index) => (
              <tr key={`${log.createdTime}-${index}`}>
                <td>
                  <div>
                    <span className={`ui label ${log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : log.level === 'success' ? 'green' : 'blue'} basic tiny`}>
                      {log.tag || log.level}
                    </span>
                    <span style={{ marginLeft: '0.5em' }}>{log.isToday ? log.createdTime.substring(11) : log.createdTime}</span>
                  </div>
                  <div style={{ marginTop: '0.4em' }}>{log.description}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
