import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { Modal, postFormWithCsrf } from '../shared'
import { AcmeMenu } from './AcmeMenu'

interface AcmeAccountRow {
  id: number
  isOn: boolean
  name: string
  eabKid: string
  eabKey: string
  provider?: { name: string; code: string; requireEAB: boolean }
}

interface AcmeAccountsData {
  accounts: AcmeAccountRow[]
  page: string
}

export function AcmeAccountsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [createVisible, setCreateVisible] = useState(false)
  const [updateAccountId, setUpdateAccountId] = useState(0)

  const query = useQuery({
    queryKey: ['acme-accounts'],
    queryFn: () => apiGet<AcmeAccountsData>('/servers/certs/acme/accounts', {}),
  })

  const remove = useMutation({
    mutationFn: (accountId: number) => apiPost('/servers/certs/acme/accounts/delete', { accountId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-accounts'] })
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

  async function deleteAccount(account: AcmeAccountRow) {
    if (!(await confirm({ message: '确定要删除此账号吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(account.id)
  }

  return (
    <div>
      <AcmeMenu active="account" />
      <div className="ui menu text blue">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreateVisible(true)
          }}
        >
          [创建账号]
        </a>
      </div>

      {data.accounts.length === 0 ? <p className="comment">暂时还没有服务商账号。</p> : null}

      {data.accounts.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>名称</th>
              <th>证书服务商</th>
              <th className="four wide">EAB Kid</th>
              <th className="four wide">EBA HMAC Key</th>
              <th className="two wide">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setUpdateAccountId(account.id)
                    }}
                  >
                    {account.name}
                  </a>
                </td>
                <td>{account.provider ? account.provider.name : null}</td>
                <td>{account.eabKid ? account.eabKid : <span className="disabled">-</span>}</td>
                <td>{account.eabKey ? account.eabKey : <span className="disabled">-</span>}</td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setUpdateAccountId(account.id)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteAccount(account)
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
        <Modal title="添加账号" onClose={() => setCreateVisible(false)} width="40em">
          <AcmeAccountCreateForm onDone={() => setCreateVisible(false)} />
        </Modal>
      ) : null}
      {updateAccountId > 0 ? (
        <Modal title="修改账号" onClose={() => setUpdateAccountId(0)} width="40em">
          <AcmeAccountUpdateForm accountId={updateAccountId} onDone={() => setUpdateAccountId(0)} />
        </Modal>
      ) : null}
    </div>
  )
}

interface ProviderFull {
  name: string
  code: string
  description?: string
  requireEAB?: boolean
  eabDescription?: string
}

interface CreateAccountData {
  providerCode: string
  providers: ProviderFull[]
}

export function AcmeAccountCreateForm({ providerCode: initialCode = '', onDone }: { providerCode?: string; onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [providerCode, setProviderCode] = useState(initialCode)
  const [eabKid, setEabKid] = useState('')
  const [eabKey, setEabKey] = useState('')

  const query = useQuery({
    queryKey: ['acme-account-create', initialCode],
    queryFn: () => apiGet<CreateAccountData>('/servers/certs/acme/accounts/createPopup', { providerCode: initialCode }),
  })

  useEffect(() => {
    if (query.data && !providerCode && query.data.providerCode) {
      setProviderCode(query.data.providerCode)
    }
  }, [query.data, providerCode])

  const mutation = useMutation({
    mutationFn: () => postFormWithCsrf('/servers/certs/acme/accounts/createPopup', { name, providerCode, eabKid, eabKey }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-accounts'] })
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
  const selectedProvider = query.data.providers.find((provider) => provider.code === providerCode)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入账号名称', 'error')
      return
    }
    if (!providerCode) {
      toast('请选择服务商', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>账号名称 *</td>
            <td>
              <input type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
              <p className="comment">为当前账号起一个容易识别的名称。</p>
            </td>
          </tr>
          <tr>
            <td className="title">证书服务商 *</td>
            <td>
              <select className="ui dropdown auto-width" value={providerCode} onChange={(event) => setProviderCode(event.target.value)}>
                <option value="">[选择服务商]</option>
                {query.data.providers.map((provider) => (
                  <option key={provider.code} value={provider.code}>
                    {provider.name}
                  </option>
                ))}
              </select>
              {selectedProvider && selectedProvider.description ? <p className="comment">{selectedProvider.description}</p> : null}
            </td>
          </tr>
          {selectedProvider && selectedProvider.requireEAB ? (
            <>
              <tr>
                <td>EAB Kid *</td>
                <td>
                  <input type="text" maxLength={100} value={eabKid} onChange={(event) => setEabKid(event.target.value)} />
                  {selectedProvider.eabDescription ? <p className="comment">{selectedProvider.eabDescription}</p> : null}
                </td>
              </tr>
              <tr>
                <td>EAB HMAC Key *</td>
                <td>
                  <input type="text" maxLength={300} value={eabKey} onChange={(event) => setEabKey(event.target.value)} />
                </td>
              </tr>
            </>
          ) : null}
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

interface UpdateAccountData {
  account: {
    id: number
    name: string
    isOn: boolean
    providerCode: string
    eabKid: string
    eabKey: string
    provider?: ProviderFull
  }
}

export function AcmeAccountUpdateForm({ accountId, onDone }: { accountId: number; onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['acme-account-update', accountId],
    queryFn: () => apiGet<UpdateAccountData>('/servers/certs/acme/accounts/updatePopup', { accountId }),
  })
  const [name, setName] = useState('')
  const [eabKid, setEabKid] = useState('')
  const [eabKey, setEabKey] = useState('')

  useEffect(() => {
    if (query.data) {
      setName(query.data.account.name)
      setEabKid(query.data.account.eabKid || '')
      setEabKey(query.data.account.eabKey || '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => {
      if (!query.data) {
        throw new Error('账号加载失败')
      }
      return postFormWithCsrf('/servers/certs/acme/accounts/updatePopup', {
        accountId,
        name,
        providerCode: query.data.account.providerCode,
        eabKid,
        eabKey,
      })
    },
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['acme-accounts'] })
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
  const account = query.data.account

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>账号名称 *</td>
            <td>
              <input type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td className="title">证书服务商 *</td>
            <td>
              {account.provider ? (
                <span>
                  {account.provider.name}
                  {account.provider.description ? <p className="comment">{account.provider.description}</p> : null}
                </span>
              ) : (
                <span className="disabled">服务商已失效</span>
              )}
            </td>
          </tr>
          {account.provider && account.provider.requireEAB ? (
            <>
              <tr>
                <td>EAB Kid *</td>
                <td>
                  <input type="text" maxLength={100} value={eabKid} onChange={(event) => setEabKid(event.target.value)} />
                  {account.provider.eabDescription ? <p className="comment">{account.provider.eabDescription}</p> : null}
                </td>
              </tr>
              <tr>
                <td>EAB HMAC Key *</td>
                <td>
                  <input type="text" maxLength={300} value={eabKey} onChange={(event) => setEabKey(event.target.value)} />
                </td>
              </tr>
            </>
          ) : null}
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
