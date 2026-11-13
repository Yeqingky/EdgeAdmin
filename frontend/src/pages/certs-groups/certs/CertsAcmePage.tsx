import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import {
  AdminUserCell,
  Modal,
  StringListInput,
  UserSelector,
  postFormWithCsrf,
  type AdminUser,
} from '../shared'
import { CertDetailView } from './CertForms'
import { AcmeMenu } from './AcmeMenu'

interface AcmeTask {
  id: number
  authType: string
  acmeUser: {
    id: number
    email: string
    provider?: { name: string; code: string }
    account?: { id: number; name: string }
  }
  dnsProvider?: { id: number; name: string }
  dnsDomain: string
  domains: string[]
  autoRenew: boolean
  cert: { id: number; name: string; beginTime: string; endTime: string } | null
  log: { id: number; isOk: boolean; error: string; createdTime: string } | null
  user: AdminUser
}

interface AcmeIndexData {
  type: string
  keyword: string
  userType: string
  searchingUserId: number
  user: AdminUser
  countAll: number
  countAvailable: number
  countExpired: number
  count7Days: number
  count30Days: number
  page: string
  tasks: AcmeTask[]
}

export function CertsAcmePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()

  const type = searchParams.get('type') || ''
  const userType = searchParams.get('userType') || ''
  const keyword = searchParams.get('keyword') || ''
  const userId = Number(searchParams.get('userId') || 0) || 0
  const page = Number(searchParams.get('page') || 1) || 1

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [userIdInput, setUserIdInput] = useState(userId)
  const [updateTaskId, setUpdateTaskId] = useState(0)
  const [detailCertId, setDetailCertId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [runningTaskId, setRunningTaskId] = useState(0)

  useEffect(() => {
    setKeywordInput(keyword)
    setUserIdInput(userId)
  }, [keyword, userId])

  const query = useQuery({
    queryKey: ['certs-acme', type, userType, keyword, userId, page],
    queryFn: () => apiGet<AcmeIndexData>('/servers/certs/acme', { type, userType, keyword, userId, page }),
  })

  const removeTask = useMutation({
    mutationFn: (taskId: number) => apiPost('/servers/certs/acme/deleteTask', { taskId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['certs-acme'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const runTask = useMutation({
    mutationFn: (taskId: number) => {
      setRunningTaskId(taskId)
      return apiPost('/servers/certs/acme/run', { taskId })
    },
    onSuccess: async () => {
      toast('任务执行成功')
      await queryClient.invalidateQueries({ queryKey: ['certs-acme'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
    onSettled: () => setRunningTaskId(0),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  function buildQuery(overrides: Record<string, string | number>): URLSearchParams {
    const next = new URLSearchParams()
    const values: Record<string, string | number> = { type, userType, keyword, userId, ...overrides }
    for (const [key, value] of Object.entries(values)) {
      if (String(value).length > 0 && String(value) !== '0') {
        next.set(key, String(value))
      }
    }
    return next
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearchParams(buildQuery({ keyword: keywordInput, userId: userIdInput, page: 1 }))
  }

  async function deleteTask(taskId: number) {
    if (!(await confirm({ message: '确定要删除此任务吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    removeTask.mutate(taskId)
  }

  async function confirmRunTask(task: AcmeTask) {
    if (!(await confirm({ message: '确定要立即执行此任务吗?将会重新发起证书申请.' }))) {
      return
    }
    runTask.mutate(task.id)
  }

  const isRunning = runningTaskId > 0

  return (
    <div>
      <AcmeMenu active="task" />

      <div className="ui menu text blue">
        <a className={`item${type === '' ? ' active' : ''}`} href={`/servers/certs/acme?${buildQuery({ type: '' }).toString()}`}>
          所有任务({data.countAll})
        </a>
        <a
          className={`item${type === 'available' ? ' active' : ''}`}
          href={`/servers/certs/acme?${buildQuery({ type: 'available' }).toString()}`}
        >
          有效证书({data.countAvailable})
        </a>
        <a
          className={`item${type === 'expired' ? ' active' : ''}`}
          href={`/servers/certs/acme?${buildQuery({ type: 'expired' }).toString()}`}
        >
          过期证书<span className={data.countExpired > 0 ? 'red' : undefined}>({data.countExpired})</span>
        </a>
        <a className={`item${type === '7days' ? ' active' : ''}`} href={`/servers/certs/acme?${buildQuery({ type: '7days' }).toString()}`}>
          7天内过期<span className={data.count7Days > 0 ? 'red' : undefined}>({data.count7Days})</span>
        </a>
        <a
          className={`item${type === '30days' ? ' active' : ''}`}
          href={`/servers/certs/acme?${buildQuery({ type: '30days' }).toString()}`}
        >
          30天内过期({data.count30Days})
        </a>
      </div>

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="域名等关键词"
              style={{ width: '12em' }}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <UserSelector userId={userIdInput} onChange={setUserIdInput} />
          </div>
          <div className="ui field" />
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            {keyword.length > 0 || userId > 0 ? (
              <a
                href="/servers/certs/acme"
                onClick={(event) => {
                  event.preventDefault()
                  setKeywordInput('')
                  setUserIdInput(0)
                  setSearchParams(buildQuery({ keyword: '', userId: 0, page: 1 }))
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {data.searchingUserId === 0 ? (
        <div>
          <div className="ui menu text basic tiny blue" style={{ marginBottom: 0 }}>
            <a className={`item${userType === '' ? ' active' : ''}`} href={`/servers/certs/acme?${buildQuery({ userType: '' }).toString()}`}>
              管理员证书
            </a>
            <a
              className={`item${userType === 'user' ? ' active' : ''}`}
              href={`/servers/certs/acme?${buildQuery({ userType: 'user' }).toString()}`}
            >
              用户证书
            </a>
          </div>
          <div className="ui divider" style={{ marginTop: 0 }} />
        </div>
      ) : null}

      {data.tasks.length === 0 ? (
        <p className="comment">
          {data.searchingUserId > 0 ? '当前用户下' : ''}暂时还没有证书申请任务.
        </p>
      ) : null}

      {isRunning ? <div className="ui message blue">有任务在执行中,可能需要的时间较长,请耐心等待.</div> : null}

      {data.tasks.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>ACME用户</th>
              <th>证书域名</th>
              <th>到期时间</th>
              <th>更新时间</th>
              <th className="center" style={{ width: '6em' }}>
                自动续期
              </th>
              <th className="center" style={{ width: '6em' }}>
                关联证书
              </th>
              <th>所属用户</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.tasks.map((task) => (
              <tr key={task.id} className={runningTaskId === task.id ? 'warning' : undefined}>
                <td>
                  {task.acmeUser.email}
                  <div>
                    {task.authType === 'dns' ? <span className="ui label olive tiny basic">DNS</span> : null}
                    {task.authType === 'http' ? <span className="ui label olive tiny basic">HTTP</span> : null}
                    {task.acmeUser.provider ? <span className="ui label tiny basic">{task.acmeUser.provider.name}</span> : null}
                    {task.acmeUser.account ? <span className="ui label tiny basic">{task.acmeUser.account.name}</span> : null}
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {task.domains.map((domain) => (
                    <div key={domain}>
                      <span className="ui label small basic">{domain}</span>
                    </div>
                  ))}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {task.cert ? task.cert.endTime : <span className="disabled">-</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {task.log ? (
                    task.log.isOk ? (
                      <span className="green">{task.log.createdTime}</span>
                    ) : (
                      <a
                        href=""
                        className="red"
                        title="任务执行失败,点击查看详情"
                        onClick={(event) => {
                          event.preventDefault()
                          setErrorMessage(task.log?.error || '')
                        }}
                      >
                        {task.log.createdTime}
                      </a>
                    )
                  ) : (
                    <span className="disabled">尚未执行</span>
                  )}
                </td>
                <td className="center">{task.autoRenew ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
                <td className="center">
                  {task.cert ? (
                    <a
                      href=""
                      title="查看关联证书"
                      onClick={(event) => {
                        event.preventDefault()
                        setDetailCertId(task.cert ? task.cert.id : 0)
                      }}
                    >
                      查看
                    </a>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td>
                  <AdminUserCell user={task.user} />
                </td>
                <td>
                  <a
                    href=""
                    className={isRunning ? 'disabled' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      if (!isRunning) {
                        setUpdateTaskId(task.id)
                      }
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    className={isRunning ? 'disabled' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      if (!isRunning) {
                        void confirmRunTask(task)
                      }
                    }}
                  >
                    执行
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    className={isRunning ? 'disabled' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      if (!isRunning) {
                        void deleteTask(task.id)
                      }
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

      {updateTaskId > 0 ? (
        <Modal title="修改申请任务" onClose={() => setUpdateTaskId(0)} width="45em">
          <UpdateAcmeTaskForm taskId={updateTaskId} onDone={() => setUpdateTaskId(0)} />
        </Modal>
      ) : null}

      {detailCertId > 0 ? (
        <Modal title="证书详情" onClose={() => setDetailCertId(0)} width="52em">
          <CertDetailView certId={detailCertId} />
        </Modal>
      ) : null}

      {errorMessage.length > 0 ? (
        <Modal title="任务执行失败" onClose={() => setErrorMessage('')} width="40em">
          <p className="red">{errorMessage}</p>
        </Modal>
      ) : null}
    </div>
  )
}

interface AcmeProviderOption {
  id: number
  name: string
  typeName: string
}

interface UpdateTaskData {
  task: {
    id: number
    authType: string
    acmeUser: { id: number }
    dnsDomain: string
    domains: string[]
    autoRenew: boolean
    isOn: boolean
    authURL: string
    dnsProvider: { id: number }
  }
  providers: AcmeProviderOption[]
}

export function UpdateAcmeTaskForm({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['acme-task-update', taskId],
    queryFn: () => apiGet<UpdateTaskData>('/servers/certs/acme/updateTaskPopup', { taskId }),
  })
  const [dnsProviderId, setDnsProviderId] = useState(0)
  const [dnsDomain, setDnsDomain] = useState('')
  const [domains, setDomains] = useState<string[]>([])
  const [autoRenew, setAutoRenew] = useState(true)
  const [authURL, setAuthURL] = useState('')

  useEffect(() => {
    if (query.data) {
      const task = query.data.task
      setDnsProviderId(task.dnsProvider ? task.dnsProvider.id : 0)
      setDnsDomain(task.dnsDomain || '')
      setDomains(task.domains || [])
      setAutoRenew(task.autoRenew)
      setAuthURL(task.authURL || '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => {
      if (!query.data) {
        throw new Error('任务加载失败')
      }
      return postFormWithCsrf('/servers/certs/acme/updateTaskPopup', {
        taskId,
        authType: query.data.task.authType,
        acmeUserId: query.data.task.acmeUser.id,
        dnsProviderId,
        dnsDomain,
        domainsJSON: JSON.stringify(domains),
        autoRenew,
        authURL,
      })
    },
    onSuccess: async () => {
      toast('保存成功,如果证书域名发生了改变,请重新执行生成新证书')
      await queryClient.invalidateQueries({ queryKey: ['certs-acme'] })
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
  const task = query.data.task

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          {task.authType === 'dns' ? (
            <tr>
              <td className="title">选择DNS服务商 *</td>
              <td>
                <select className="ui dropdown auto-width" value={String(dnsProviderId)} onChange={(event) => setDnsProviderId(Number(event.target.value))}>
                  <option value="0">[请选择]</option>
                  {query.data.providers.map((provider) => (
                    <option key={provider.id} value={String(provider.id)}>
                      {provider.name}({provider.typeName})
                    </option>
                  ))}
                </select>
                <p className="comment">用于自动创建域名解析记录.</p>
              </td>
            </tr>
          ) : null}
          {task.authType === 'dns' ? (
            <tr>
              <td className="title">顶级域名 *</td>
              <td>
                <input type="text" maxLength={100} value={dnsDomain} onChange={(event) => setDnsDomain(event.target.value)} />
                <p className="comment">用于在DNS服务商账号中操作解析记录的域名,比如 example.com,不要输入二级或别的多级域名.</p>
              </td>
            </tr>
          ) : null}
          <tr>
            <td className="title">证书域名列表 *</td>
            <td>
              <StringListInput values={domains} onChange={setDomains} placeholder="example.com,*.example.com" />
              <p className="comment">
                需要申请的证书中包含的域名列表
                {task.authType === 'dns' ? ',所有域名必须是同一个顶级域名' : ''}
                {task.authType === 'http' ? '使用HTTP认证方式时,域名中不能含有通配符' : ''}.多个域名用英文逗号分隔.
              </p>
            </td>
          </tr>
          <tr>
            <td>自动续期</td>
            <td>
              <div className="ui checkbox">
                <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} />
                <label />
              </div>
              <p className="comment">选中后,表示在免费证书临近到期之前尝试自动续期.</p>
            </td>
          </tr>
          <tr>
            <td>回调URL</td>
            <td>
              <input type="text" maxLength={200} value={authURL} onChange={(event) => setAuthURL(event.target.value)} />
              <p className="comment">将认证数据以JSON的方式POST到此URL上,可以依此生成认证文件或者设置DNS域名解析;仅适用于未绑定当前CDN系统的域名.</p>
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
