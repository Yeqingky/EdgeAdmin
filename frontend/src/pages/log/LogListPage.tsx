import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { LogTabs } from './LogTabs'

interface LogItem {
  id: number
  description: string
  userName: string
  userId: number
  createdTime: string
  level: string
  ip: string
  region: string
  action: string
}

export function LogListPage() {
  const [params, setParams] = useSearchParams()
  const dayFrom = params.get('dayFrom') || ''
  const dayTo = params.get('dayTo') || ''
  const keyword = params.get('keyword') || ''
  const level = params.get('level') || ''
  const userType = params.get('userType') || ''
  const [form, setForm] = useState({ dayFrom, dayTo, keyword, level, userType })
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()

  const query = useQuery({
    queryKey: ['logs', dayFrom, dayTo, keyword, level, userType],
    queryFn: () => apiGet<{ logs: LogItem[]; page: string; logConfig: { canDelete: boolean } }>('/log', { dayFrom, dayTo, keyword, level, userType }),
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
    for (const [key, value] of Object.entries(form)) {
      if (value) {
        next.set(key, value)
      }
    }
    setParams(next)
  }

  async function remove(log: LogItem) {
    if (!(await confirm({ message: '确定要删除此日志吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    await apiPost('/log/delete', { logId: log.id })
    toast('删除成功')
    await queryClient.invalidateQueries({ queryKey: ['logs'] })
  }

  function exportExcel() {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(form)) {
      if (value) {
        search.set(key, value)
      }
    }
    window.location.href = `/log/exportExcel?${search.toString()}`
  }

  return (
    <div>
      <LogTabs active="list" />
      <form className="ui form" onSubmit={submit} autoComplete="off">
        <div className="ui fields inline">
          <div className="ui field"><input type="date" style={{ width: '10em' }} value={form.dayFrom} onChange={(event) => setForm({ ...form, dayFrom: event.target.value })} /></div>
          <div className="ui field"><input type="date" style={{ width: '10em' }} value={form.dayTo} onChange={(event) => setForm({ ...form, dayTo: event.target.value })} /></div>
          <div className="ui field"><input type="text" style={{ width: '10em' }} placeholder="关键词" value={form.keyword} onChange={(event) => setForm({ ...form, keyword: event.target.value })} /></div>
          <div className="ui field">
            <select className="ui dropdown" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="">[级别]</option><option value="info">信息</option><option value="warn">警告</option><option value="error">错误</option>
            </select>
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={form.userType} onChange={(event) => setForm({ ...form, userType: event.target.value })}>
              <option value="">[用户类型]</option><option value="admin">管理员</option><option value="user">用户</option>
            </select>
          </div>
          <div className="ui field"><button className="ui button" type="submit">查询</button></div>
          {dayFrom || dayTo || keyword || level ? (
            <div className="ui field">
              <a href="#/log" onClick={(event) => { event.preventDefault(); setForm({ dayFrom: '', dayTo: '', keyword: '', level: '', userType: '' }); setParams(new URLSearchParams()) }}>[清除条件]</a>
            </div>
          ) : null}
          <div className="ui field"><a href="" onClick={(event) => { event.preventDefault(); exportExcel() }}><Download size={13} /> [导出到Excel]</a></div>
        </div>
      </form>

      {query.data.logs.length === 0 ? <p className="comment">暂时还没有日志。</p> : null}
      {query.data.logs.map((log) => (
        <table className={`ui table selectable${log.level === 'error' ? ' red' : ''}`} key={log.id}>
          <tbody>
            <tr className={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : undefined}>
              <td>
                {log.createdTime}
                <span className="grey">
                  {log.userName ? ` | ${log.userId > 0 ? '用户 | ' : ''}${log.userName}` : ''} | {log.ip}
                  {log.region ? ` | ${log.region}` : ''} &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); setExpanded((value) => ({ ...value, [log.id]: !value[log.id] })) }}>...</a>
                  {expanded[log.id] ? <span> {log.action}</span> : null}
                </span>
                {query.data.logConfig.canDelete ? (
                  <span style={{ float: 'right' }}>
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); void remove(log) }}><Trash2 size={13} /></a>
                  </span>
                ) : null}
              </td>
            </tr>
            <tr className={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : undefined}>
              <td>{log.description}</td>
            </tr>
          </tbody>
        </table>
      ))}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
