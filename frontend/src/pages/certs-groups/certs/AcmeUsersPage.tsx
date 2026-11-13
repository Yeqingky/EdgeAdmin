import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { Modal, postFormWithCsrf } from '../shared'
import { AcmeMenu } from './AcmeMenu'
import { AcmeAccountCreateForm } from './AcmeAccountsPage'

export interface AcmeUserRow {
  id: number
  email: string
  description: string
  createdTime: string
  provider?: { name: string; code: string }
  account?: { id: number; name: string }
}

interface AcmeUsersData {
  users: AcmeUserRow[]
  page: string
}

export function AcmeUsersPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [createVisible, setCreateVisible] = useState(false)
  const [updateUserId, setUpdateUserId] = useState(0)

  const query = useQuery({
    queryKey: ['acme-users'],
    queryFn: () => apiGet<AcmeUsersData>('/servers/certs/acme/users', {}),
  })

  const remove = useMutation({
    mutationFn: (userId: number) => apiPost('/servers/certs/acme/users/delete', { userId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-users'] })
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

  async function deleteUser(user: AcmeUserRow) {
    if (!(await confirm({ message: '确定要删除此用户吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(user.id)
  }

  return (
    <div>
      <AcmeMenu active="user" />
      <div className="ui menu text blue">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreateVisible(true)
          }}
        >
          [创建用户]
        </a>
        <span className="item">这里管理用于申请免费证书的用户信息</span>
      </div>

      {data.users.length === 0 ? <p className="comment">暂时还没有用户.</p> : null}

      {data.users.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th>用户Email</th>
              <th>备注</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setUpdateUserId(user.id)
                    }}
                  >
                    {user.email}
                  </a>
                  <div>
                    {user.provider ? <span className="ui label basic tiny">{user.provider.name}</span> : null}
                    {user.account ? <span className="ui label basic tiny">{user.account.name}</span> : null}
                  </div>
                </td>
                <td>{user.description ? user.description : <span className="disabled">-</span>}</td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setUpdateUserId(user.id)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteUser(user)
                    }}
                  >
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {createVisible ? (
        <Modal title="创建ACME用户" onClose={() => setCreateVisible(false)} width="44em">
          <AcmeUserCreateForm onDone={() => setCreateVisible(false)} />
        </Modal>
      ) : null}
      {updateUserId > 0 ? (
        <Modal title="修改ACME用户" onClose={() => setUpdateUserId(0)} width="44em">
          <AcmeUserUpdateForm userId={updateUserId} onDone={() => setUpdateUserId(0)} />
        </Modal>
      ) : null}
    </div>
  )
}

interface AcmeProviderInfo {
  code: string
  name: string
  requireEAB?: boolean
}

interface CreateUserData {
  platformUserId: number
  platformUser?: { id: number; username: string; fullname: string } | null
  providers: AcmeProviderInfo[]
}

interface AccountsData {
  accounts: { id: number; name: string }[]
}

export function AcmeUserCreateForm({
  platformUserId = 0,
  providerCode: initialProviderCode = '',
  onDone,
}: {
  platformUserId?: number
  providerCode?: string
  onDone: (user?: { id: number; description: string; email: string; providerCode: string }) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [providerCode, setProviderCode] = useState(initialProviderCode)
  const [accountId, setAccountId] = useState(0)
  const [description, setDescription] = useState('')
  const [accountVisible, setAccountVisible] = useState(false)

  const query = useQuery({
    queryKey: ['acme-user-create', platformUserId, initialProviderCode],
    queryFn: () => apiGet<CreateUserData>('/servers/certs/acme/users/createPopup', { platformUserId, providerCode: initialProviderCode }),
  })

  useEffect(() => {
    if (query.data && !providerCode && query.data.providers.length === 1) {
      setProviderCode(query.data.providers[0].code)
    }
  }, [query.data, providerCode])

  const accountsQuery = useQuery({
    queryKey: ['acme-accounts-with-code', providerCode],
    queryFn: () => apiPost<AccountsData>('/servers/certs/acme/users/accountsWithCode', { code: providerCode }),
    enabled: providerCode.length > 0,
  })

  const mutation = useMutation({
    mutationFn: () =>
      postFormWithCsrf<{ acmeUser: { id: number; description: string; email: string; providerCode: string } }>(
        '/servers/certs/acme/users/createPopup',
        {
          platformUserId,
          email,
          providerCode,
          accountId,
          description,
        },
      ),
    onSuccess: async (result) => {
      toast('创建成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-users'] })
      onDone(result.acmeUser)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const selectedProvider = query.data.providers.find((provider) => provider.code === providerCode)
  const accounts = accountsQuery.data?.accounts || []

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast('请输入邮箱', 'error')
      return
    }
    if (!providerCode) {
      toast('请选择所属服务商', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          {query.data.platformUser ? (
            <tr>
              <td>所属平台用户</td>
              <td>
                {query.data.platformUser.fullname}({query.data.platformUser.username})
              </td>
            </tr>
          ) : null}
          <tr>
            <td className="title">用户邮箱 *</td>
            <td>
              <input type="text" maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} />
              <p className="comment">用于自动注册用户的邮箱.</p>
            </td>
          </tr>
          <tr>
            <td>所属证书服务商 *</td>
            <td>
              <select
                className="ui dropdown auto-width"
                value={providerCode}
                onChange={(event) => {
                  setProviderCode(event.target.value)
                  setAccountId(0)
                }}
              >
                <option value="">[选择服务商]</option>
                {query.data.providers.map((provider) => (
                  <option key={provider.code} value={provider.code}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          {selectedProvider ? (
            <tr>
              <td>
                所属服务商账号 {selectedProvider.requireEAB ? '*' : <em>(可选)</em>}
              </td>
              <td>
                <div className="ui fields inline">
                  {accounts.length > 0 ? (
                    <div className="ui field">
                      <select className="ui dropdown auto-width" value={String(accountId)} onChange={(event) => setAccountId(Number(event.target.value))}>
                        <option value="0">[选择账号]</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={String(account.id)}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="ui field">
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setAccountVisible(true)
                      }}
                    >
                      [添加]
                    </a>
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
          <tr>
            <td>备注</td>
            <td>
              <textarea rows={3} maxLength={100} value={description} onChange={(event) => setDescription(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>

      {accountVisible ? (
        <Modal title="添加账号" onClose={() => setAccountVisible(false)} width="40em">
          <AcmeAccountCreateForm
            providerCode={providerCode}
            onDone={() => {
              setAccountVisible(false)
              void accountsQuery.refetch()
            }}
          />
        </Modal>
      ) : null}
    </form>
  )
}

interface UpdateUserData {
  user: {
    id: number
    email: string
    description: string
    provider?: { name: string; code: string }
    account?: { id: number; name: string }
  }
}

export function AcmeUserUpdateForm({ userId, onDone }: { userId: number; onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['acme-user-update', userId],
    queryFn: () => apiGet<UpdateUserData>('/servers/certs/acme/users/updatePopup', { userId }),
  })
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (query.data) {
      setDescription(query.data.user.description || '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => postFormWithCsrf('/servers/certs/acme/users/updatePopup', { userId, description }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-users'] })
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  const user = query.data.user

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">用户邮箱 *</td>
            <td>
              {user.email}
              <p className="comment">用于自动注册用户的邮箱,不允许修改.</p>
            </td>
          </tr>
          {user.provider ? (
            <tr>
              <td>所属证书服务商</td>
              <td>{user.provider.name}</td>
            </tr>
          ) : null}
          {user.account ? (
            <tr>
              <td>所属服务商账号</td>
              <td>{user.account.name}</td>
            </tr>
          ) : null}
          <tr>
            <td>备注</td>
            <td>
              <textarea rows={3} maxLength={100} value={description} onChange={(event) => setDescription(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}
