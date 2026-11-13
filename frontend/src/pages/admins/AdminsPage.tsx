import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { StatusLabel } from '../../components/StatusLabel'

interface Admin {
  id: number
  isOn: boolean
  isSuper: boolean
  username: string
  fullname: string
  createdTime: string
  otpLoginIsOn: boolean
  canLogin: boolean
  hasWeakPassword: boolean
}

export function AdminsPage() {
  const [params, setParams] = useSearchParams()
  const keyword = params.get('keyword') || ''
  const hasWeakPassword = params.get('hasWeakPassword') === '1'
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [input, setInput] = useState(keyword)
  const query = useQuery({
    queryKey: ['admins', keyword, hasWeakPassword],
    queryFn: () => apiGet<{ admins: Admin[]; page: string }>('/admins', { keyword, hasWeakPassword: hasWeakPassword ? 1 : 0 }),
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
    if (input) {
      next.set('keyword', input)
    }
    setParams(next)
  }

  async function remove(admin: Admin) {
    if (!(await confirm({ message: `确定要删除管理员 ${admin.username} 吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/admins/delete', { adminId: admin.id })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['admins'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <div className="ui menu text blue first-menu">
        <a className="item" href="/admins/create"><Plus size={14} /> [创建管理员]</a>
      </div>

      {!hasWeakPassword ? (
        <form className="ui form" onSubmit={submit}>
          <div className="ui fields inline">
            <div className="ui field">
              <input type="text" placeholder="用户名,全名 ..." value={input} onChange={(event) => setInput(event.target.value)} />
            </div>
            <div className="ui field">
              <button className="ui button" type="submit">搜索</button>
              &nbsp;
              {keyword ? <a href="/admins" onClick={(event) => { event.preventDefault(); setInput(''); setParams(new URLSearchParams()) }}>[清除条件]</a> : null}
            </div>
          </div>
        </form>
      ) : null}

      {hasWeakPassword ? (
        <span className="ui label small basic blue">
          当前正在筛选弱密码管理员 <a href="/admins">×</a>
        </span>
      ) : null}

      {query.data.admins.length === 0 ? (
        <div>
          <div className="margin" />
          <p className="comment">暂时还没有{keyword ? '跟关键词匹配' : ''}管理员.</p>
        </div>
      ) : (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th>用户名</th>
              <th>全名</th>
              <th>允许登录</th>
              <th>OTP认证</th>
              <th className="center width10">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {query.data.admins.map((admin) => (
              <tr key={admin.id}>
                <td className={admin.isOn ? undefined : 'disabled'}>
                  <a href={`/admins/admin?adminId=${admin.id}`}>{admin.username}</a>
                  {admin.isSuper || admin.hasWeakPassword ? (
                    <div style={{ marginTop: '0.5em' }}>
                      {admin.isSuper ? <span className="ui label olive basic tiny">超级管理员</span> : null}
                      {admin.hasWeakPassword ? (
                        <a href={`/admins/update?adminId=${admin.id}`}>
                          <span className="ui label red basic tiny">弱密码</span>
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className={admin.isOn ? undefined : 'disabled'}>{admin.fullname}</td>
                <td>{admin.canLogin ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
                <td>{admin.otpLoginIsOn ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
                <td className="center"><StatusLabel isOn={admin.isOn} /></td>
                <td>
                  <a href={`/admins/admin?adminId=${admin.id}`}>详情</a> &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void remove(admin) }}>删除</a>
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
