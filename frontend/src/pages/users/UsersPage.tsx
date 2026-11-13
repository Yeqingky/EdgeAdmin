import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useSession } from '../../api/session'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { PageHeader } from '../../components/PageHeader'
import { StatusLabel } from '../../components/StatusLabel'

interface UserItem {
  id: number
  username: string
  isOn: boolean
  fullname: string
  email: string
  mobile: string
  tel: string
  createdTime: string
  cluster?: { id: number; name: string }
  registeredIP: string
  isVerified: boolean
  isRejected: boolean
  identityIsSubmitted: boolean
  verifiedMobile: string
}

interface UsersData {
  users: UserItem[]
  page: string
  keyword: string
  isVerifying: boolean
  mobileIsVerified: number
  countVerifyingUsers: number
}

export function UsersPage() {
  const session = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKeyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const verifying = searchParams.get('verifying') === '1'
  const [keyword, setKeyword] = useState(searchKeyword)

  const query = useQuery({
    queryKey: ['users', searchKeyword, page, verifying],
    queryFn: () =>
      apiGet<UsersData>('/users', {
        keyword: searchKeyword,
        page,
        verifying: verifying ? 1 : 0,
      }),
  })

  const remove = useMutation({
    mutationFn: (userId: number) => apiPost('/users/delete', { userId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (keyword) {
      next.set('keyword', keyword)
    }
    if (verifying) {
      next.set('verifying', '1')
    }
    setSearchParams(next)
  }

  async function deleteUser(user: UserItem) {
    if (!(await confirm({ message: `确定要删除用户 ${user.username} 吗？`, danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(user.id)
  }

  return (
    <div>
      <PageHeader
        items={[
          { name: '全部用户', active: !verifying, href: '/users' },
          { name: '待审核', active: verifying, hidden: !session.data?.teaIsPlus },
        ]}
      >
        <a className="item" href="/users/create" onClick={(event) => { event.preventDefault(); navigate('/users/create') }}>
          <Plus size={14} /> [创建用户]
        </a>
      </PageHeader>

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="用户名、全名、手机号..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {searchKeyword ? (
              <a
                href="/users"
                onClick={(event) => {
                  event.preventDefault()
                  setKeyword('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {data.users.length === 0 ? <p className="comment">暂时还没有用户。</p> : null}

      {data.users.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>用户名</th>
              <th>全名</th>
              <th>关联集群</th>
              <th>绑定手机号</th>
              <th>联系手机号</th>
              <th>注册时间</th>
              <th className="center" style={{ width: '6em' }}>状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td className={user.isOn ? undefined : 'disabled'}>
                  <a href={`/users/user?userId=${user.id}`}>{user.username}</a>
                  {!user.isVerified ? (
                    <div>
                      <a href={`/users/user?userId=${user.id}`}>
                        <span className="ui label red basic">信息未审核</span>
                      </a>
                    </div>
                  ) : null}
                  {user.isRejected ? (
                    <div>
                      <span className="ui label red basic">信息已拒绝</span>
                    </div>
                  ) : null}
                  {user.identityIsSubmitted ? (
                    <div>
                      <a href={`/users/identity?userId=${user.id}`}>
                        <span className="ui label red basic">实名未审核</span>
                      </a>
                    </div>
                  ) : null}
                </td>
                <td className={user.isOn ? undefined : 'disabled'}>{user.fullname}</td>
                <td>
                  {user.cluster ? (
                    <span>
                      {user.cluster.name}{' '}
                      <a href={`/clusters/cluster?clusterId=${user.cluster.id}`}>查看</a>
                    </span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className={user.isOn ? undefined : 'disabled'}>
                  {user.verifiedMobile ? user.verifiedMobile : <span className="disabled">-</span>}
                </td>
                <td className={user.isOn ? undefined : 'disabled'}>
                  {user.mobile ? user.mobile : <span className="disabled">-</span>}
                </td>
                <td className={user.isOn ? undefined : 'disabled'}>{user.createdTime}</td>
                <td className="center">
                  <StatusLabel isOn={user.isOn} />
                </td>
                <td>
                  <a href={`/users/user?userId=${user.id}`}>详情</a> &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteUser(user)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
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
