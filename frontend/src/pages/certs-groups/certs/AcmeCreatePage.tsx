import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Modal, UserSelector, postForm } from '../shared'
import { AcmeMenu } from './AcmeMenu'
import { AcmeUserCreateForm } from './AcmeUsersPage'
import { CertDetailView } from './CertForms'

interface CreatePageData {
  providers: { name: string; code: string }[]
  dnsProviders: { id: number; name: string; typeName: string }[]
}

interface AcmeUserOption {
  id: number
  description: string
  email: string
  providerCode: string
}

type Step = 'prepare' | 'user' | 'dns' | 'finish'

export function AcmeCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<Step>('prepare')
  const [authType, setAuthType] = useState('http')
  const [platformUserId, setPlatformUserId] = useState(0)
  const [authURL, setAuthURL] = useState('')
  const [users, setUsers] = useState<AcmeUserOption[]>([])
  const [providerCode, setProviderCode] = useState('')
  const [acmeUserId, setAcmeUserId] = useState(0)
  const [dnsProviderId, setDnsProviderId] = useState(0)
  const [dnsDomain, setDnsDomain] = useState('')
  const [domainsInput, setDomainsInput] = useState('')
  const [autoRenew, setAutoRenew] = useState(true)
  const [isRequesting, setIsRequesting] = useState(false)
  const [taskId, setTaskId] = useState(0)
  const [certId, setCertId] = useState(0)
  const [userModalVisible, setUserModalVisible] = useState(false)

  const query = useQuery({
    queryKey: ['acme-create'],
    queryFn: () => apiGet<CreatePageData>('/servers/certs/acme/create', {}),
  })

  const createUserOptions = useMutation({
    mutationFn: () => apiPost<{ users: AcmeUserOption[] }>('/servers/certs/acme/userOptions', { platformUserId }),
    onSuccess: (data) => setUsers(data.users || []),
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const submitTask = useMutation({
    mutationFn: () => {
      const domains = domainsInput
        .split(',')
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0)
      return postForm<{ taskId: number }>('/servers/certs/acme/create', {
        platformUserId,
        taskId,
        authType,
        acmeUserId,
        dnsProviderId,
        dnsDomain,
        domains,
        autoRenew,
        authURL,
      })
    },
    onError: (error: Error) => {
      setIsRequesting(false)
      toast(error.message, 'error')
    },
  })

  const runTask = useMutation({
    mutationFn: (newTaskId: number) => apiPost<{ certId: number }>('/servers/certs/acme/run', { taskId: newTaskId }),
    onError: (error: Error) => {
      setIsRequesting(false)
      toast(error.message, 'error')
    },
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const providerUsers = users.filter((user) => user.providerCode === providerCode)

  function doPrepare() {
    setStep('user')
    createUserOptions.mutate()
  }

  function doUser() {
    if (!providerCode) {
      toast('请选择一个证书服务商', 'error')
      return
    }
    if (!acmeUserId) {
      toast('请选择一个申请证书的用户', 'error')
      return
    }
    setStep('dns')
  }

  async function doDNS() {
    setIsRequesting(true)
    try {
      const created = await submitTask.mutateAsync()
      setTaskId(created.taskId)
      const runResult = await runTask.mutateAsync(created.taskId)
      setCertId(runResult.certId)
      setStep('finish')
    } catch {
      // errors are surfaced by the mutation handlers
    } finally {
      setIsRequesting(false)
    }
  }

  const steps: { key: Step; name: string }[] = [
    { key: 'prepare', name: '选择申请方式' },
    { key: 'user', name: '选择ACME用户' },
    { key: 'dns', name: '填写域名信息' },
    { key: 'finish', name: '完成' },
  ]

  return (
    <div>
      <AcmeMenu active="create" />
      <div className="margin" />

      <div className="ui form">
        <div className="ui steps fluid small">
          {steps.map((item) => (
            <div key={item.key} className={`ui step${step === item.key ? ' active' : ''}`}>
              {item.name}
            </div>
          ))}
        </div>

        {step === 'prepare' ? (
          <div>
            <table className="ui table definition selectable">
              <tbody>
                <tr>
                  <td className="title">认证方式 *</td>
                  <td>
                    <div style={{ marginBottom: '1em' }}>
                      <div className="ui radio checkbox" style={{ marginRight: '1em' }}>
                        <input type="radio" name="authType" checked={authType === 'http'} onChange={() => setAuthType('http')} />
                        <label>使用HTTP认证</label>
                      </div>
                      <div className="ui radio checkbox">
                        <input type="radio" name="authType" checked={authType === 'dns'} onChange={() => setAuthType('dns')} />
                        <label>使用DNS认证</label>
                      </div>
                    </div>
                    {authType === 'http' ? (
                      <p className="comment">
                        使用HTTP认证的方式请求网址<code>/.well-known/acme-challenge/令牌</code>校验，该方式要求需要实现将域名解析到集群上，之后系统会自动生成网址信息；这种方式不支持泛域名证书的申请。
                      </p>
                    ) : (
                      <p className="comment">
                        我们在申请免费证书的过程中需要自动增加或修改相关域名的TXT记录，请先确保你已经在"域名解析" --{' '}
                        <a href="#/dns/providers" target="_blank" rel="noreferrer">
                          "DNS服务商"
                        </a>{' '}
                        中已经添加了对应的DNS服务商账号。
                      </p>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>选择平台用户</td>
                  <td>
                    <UserSelector userId={platformUserId} onChange={setPlatformUserId} emptyLabel="[不指定]" />
                    <p className="comment">可选项，选择证书所属用户，如果没有选择，则视为管理员所有。</p>
                  </td>
                </tr>
                <tr>
                  <td>回调URL</td>
                  <td>
                    <input type="text" maxLength={200} value={authURL} onChange={(event) => setAuthURL(event.target.value)} />
                    <p className="comment">将认证数据以JSON的方式POST到此URL上，可以依此生成认证文件或者设置DNS域名解析；仅适用于未绑定当前CDN系统的域名。</p>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '1em' }}>
              <button type="button" className="ui button primary" onClick={doPrepare}>
                下一步
              </button>
            </div>
          </div>
        ) : null}

        {step === 'user' ? (
          <div>
            <table className="ui table definition selectable">
              <tbody>
                <tr>
                  <td className="title">选择证书服务商 *</td>
                  <td>
                    <select
                      className="ui dropdown auto-width"
                      value={providerCode}
                      onChange={(event) => {
                        setProviderCode(event.target.value)
                        setAcmeUserId(0)
                      }}
                    >
                      <option value="">[选择服务商]</option>
                      {data.providers.map((provider) => (
                        <option key={provider.code} value={provider.code}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                {providerCode ? (
                  <tr>
                    <td className="title">选择ACME用户 *</td>
                    <td>
                      {users.length > 0 ? (
                        <div className="ui fields inline">
                          <div className="ui field">
                            <select className="ui dropdown" value={String(acmeUserId)} onChange={(event) => setAcmeUserId(Number(event.target.value))}>
                              <option value="0">[请选择]</option>
                              {providerUsers.map((user) => (
                                <option key={user.id} value={String(user.id)}>
                                  {user.email}
                                  {user.description}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="ui field">
                            <a
                              href=""
                              onClick={(event) => {
                                event.preventDefault()
                                setUserModalVisible(true)
                              }}
                            >
                              [新创建]
                            </a>
                          </div>
                        </div>
                      ) : (
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            setUserModalVisible(true)
                          }}
                        >
                          {platformUserId > 0 ? '当前平台用户下' : ''}暂时还没有ACME用户，点此创建
                        </a>
                      )}
                      <p className="comment">选择一个作为申请证书的用户。</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div style={{ marginTop: '1em' }}>
              <button type="button" className="ui button" onClick={() => setStep('prepare')}>
                上一步
              </button>
              <button type="button" className="ui button primary" onClick={doUser}>
                下一步
              </button>
            </div>
          </div>
        ) : null}

        {step === 'dns' ? (
          <div>
            <table className="ui table definition selectable">
              <tbody>
                {authType === 'dns' ? (
                  <tr>
                    <td className="title">选择DNS服务商 *</td>
                    <td>
                      {data.dnsProviders.length > 0 ? (
                        <select className="ui dropdown auto-width" value={String(dnsProviderId)} onChange={(event) => setDnsProviderId(Number(event.target.value))}>
                          <option value="0">[请选择]</option>
                          {data.dnsProviders.map((provider) => (
                            <option key={provider.id} value={String(provider.id)}>
                              {provider.name}（{provider.typeName}）
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          暂时没有DNS服务商，
                          <a href="#/dns/providers">[去添加]</a>。
                        </span>
                      )}
                      <p className="comment">用于自动创建域名解析记录。</p>
                    </td>
                  </tr>
                ) : null}
                {authType === 'dns' ? (
                  <tr>
                    <td>顶级域名 *</td>
                    <td>
                      <input type="text" maxLength={100} value={dnsDomain} onChange={(event) => setDnsDomain(event.target.value)} />
                      <p className="comment">用于在DNS服务商账号中操作解析记录的域名，比如 example.com，不要输入二级或别的多级域名。</p>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="title">证书域名列表 *</td>
                  <td>
                    <input
                      type="text"
                      value={domainsInput}
                      placeholder="example.com,*.example.com"
                      onChange={(event) => setDomainsInput(event.target.value)}
                    />
                    <p className="comment">
                      需要申请的证书中包含的域名列表，多个域名用英文逗号分隔
                      {authType === 'dns' ? '，所有域名必须是同一个顶级域名' : ''}
                      {authType === 'http' ? '，使用HTTP认证方式时，域名中不能含有通配符' : ''}。
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
                    <p className="comment">选中后，表示在免费证书临近到期之前尝试自动续期。</p>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '1em' }}>
              <button type="button" className="ui button" onClick={() => setStep('user')}>
                上一步
              </button>
              {isRequesting ? (
                <button type="button" className="ui button primary disabled">
                  提交中，要花费的时间较长，请耐心等待...
                </button>
              ) : (
                <button type="button" className="ui button primary" onClick={() => void doDNS()}>
                  下一步
                </button>
              )}
            </div>
          </div>
        ) : null}

        {step === 'finish' ? (
          <div>
            <div className="success-box">
              <p>
                <span className="green">恭喜，证书申请成功！</span>你可以在证书列表里看到刚申请的证书。
              </p>
            </div>
            <div style={{ marginTop: '1em' }}>
              <button type="button" className="ui button primary" onClick={() => navigate('/servers/certs/acme')}>
                返回
              </button>
            </div>
            {certId > 0 ? (
              <div style={{ marginTop: '1em' }}>
                <CertDetailView certId={certId} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {userModalVisible ? (
        <Modal title="创建ACME用户" onClose={() => setUserModalVisible(false)} width="44em">
          <AcmeUserCreateForm
            platformUserId={platformUserId}
            providerCode={providerCode}
            onDone={(user) => {
              setUserModalVisible(false)
              if (user) {
                const description = user.description.length > 0 ? `（${user.description}）` : ''
                setUsers((current) => [{ ...user, description }, ...current])
                setAcmeUserId(user.id)
              }
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
