import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  Modal,
  NetworkAddressesEditor,
  ServerSettingsShell,
  StringListEditor,
  useServerId,
  type NetworkAddress,
  type ServerSettingsBase,
} from './shared'

interface HstsConfig {
  isOn: boolean
  maxAge: number
  includeSubDomains: boolean
  preload: boolean
  domains: string[] | null
}

interface SslPolicy {
  id: number
  isOn?: boolean
  certRefs?: { isOn: boolean; certId: number }[] | null
  certs?: { id: number; name?: string; dnsNames?: string[] | null }[] | null
  clientAuthType: number
  clientCARefs?: { isOn: boolean; certId: number }[] | null
  minVersion: string
  cipherSuitesIsOn: boolean
  cipherSuites: string[] | null
  hsts: HstsConfig | null
  http2Enabled: boolean
  http3Enabled: boolean
  ocspIsOn: boolean
}

interface HttpsData extends ServerSettingsBase {
  conflictingPorts: number[]
  serverType: string
  httpsConfig: {
    isOn: boolean
    addresses: NetworkAddress[] | null
    sslPolicy: SslPolicy | null
    supportsHTTP3: boolean
  } | null
  missingCertServerNames: string[]
}

interface CertPopupData {
  serverNames: string[]
  users: { id: number; description: string; email: string }[]
}

const DEFAULT_HSTS: HstsConfig = { isOn: false, maxAge: 31536000, includeSubDomains: false, preload: false, domains: [] }

const EMPTY_POLICY: SslPolicy = {
  id: 0,
  certRefs: [],
  clientAuthType: 0,
  minVersion: 'TLS 1.2',
  cipherSuitesIsOn: false,
  cipherSuites: [],
  hsts: DEFAULT_HSTS,
  http2Enabled: true,
  http3Enabled: false,
  ocspIsOn: false,
}

const CLIENT_AUTH_TYPES = [
  { value: 0, name: '不需要客户端证书' },
  { value: 1, name: '请求客户端证书,但不验证' },
  { value: 2, name: '要求客户端证书,但不验证' },
  { value: 3, name: '如果提供客户端证书,则验证' },
  { value: 4, name: '要求客户端证书并验证' },
]

export function ServerHttpsSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-https', serverId],
    queryFn: () => apiGet<HttpsData>('/servers/server/settings/https', { serverId }),
    enabled: serverId > 0,
  })
  const [isOn, setIsOn] = useState(false)
  const [addresses, setAddresses] = useState<NetworkAddress[]>([])
  const [policy, setPolicy] = useState<SslPolicy>(EMPTY_POLICY)
  const [supportsHTTP3, setSupportsHTTP3] = useState(false)
  const [requestCertVisible, setRequestCertVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const data = query.data
    if (!data) {
      return
    }
    setIsOn(data.httpsConfig?.isOn ?? false)
    setAddresses(data.httpsConfig?.addresses || [])
    setSupportsHTTP3(!!data.httpsConfig?.supportsHTTP3)
    setPolicy({
      ...EMPTY_POLICY,
      ...(data.httpsConfig?.sslPolicy || {}),
      hsts: { ...DEFAULT_HSTS, ...(data.httpsConfig?.sslPolicy?.hsts || {}) },
      certRefs: data.httpsConfig?.sslPolicy?.certRefs || [],
      certs: data.httpsConfig?.sslPolicy?.certs || [],
      cipherSuites: data.httpsConfig?.sslPolicy?.cipherSuites || [],
    })
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数.</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const hsts = policy.hsts || DEFAULT_HSTS

  function updatePolicy<K extends keyof SslPolicy>(key: K, value: SslPolicy[K]) {
    setPolicy((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/https', {
        serverId,
        isOn: isOn ? 1 : '',
        addresses: JSON.stringify(addresses.map((address) => ({ ...address, protocol: address.protocol || 'https' }))),
        sslPolicyJSON: JSON.stringify(policy),
      })
      toast('保存成功,请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <p className="comment">提醒:HTTP/2,证书等信息修改后,可能需要清空浏览器缓存后才能浏览效果.</p>
      {isOn && data.missingCertServerNames.length > 0 ? (
        <div className="ui message warning">
          警告:当前网站绑定的以下域名尚未配置证书,将无法通过HTTPS协议访问:{data.missingCertServerNames.join(',')} .
        </div>
      ) : null}
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="启用HTTPS">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
          {isOn ? (
            <FormRow title="绑定端口 *">
              <div>
                {addresses.length === 0 ? <span className="red">还没有添加端口绑定,会导致HTTPS服务无法访问.</span> : null}
                <NetworkAddressesEditor addresses={addresses} onChange={setAddresses} protocol="https" />
                {data.conflictingPorts.length > 0 ? (
                  <p className="comment">
                    <span className="red">
                      配置错误:
                      {data.conflictingPorts.map((port, index) => (
                        <span key={port}>
                          {port}
                          {index !== data.conflictingPorts.length - 1 ? ',' : ''}
                        </span>
                      ))}
                      {data.conflictingPorts.length > 1 ? '等' : ''}
                      端口同HTTP设置的端口冲突,请删除HTTP或HTTPS中的相关端口.
                    </span>
                  </p>
                ) : null}
              </div>
            </FormRow>
          ) : null}
        </FormTable>

        {isOn ? (
          <>
            <h4>SSL配置</h4>
            <FormTable>
              <FormRow title="证书">
                <div>
                  {(policy.certs || []).length > 0 ? (
                    (policy.certs || []).map((cert) => (
                      <div key={cert.id} className="ui label small basic">
                        {cert.name || `证书 #${cert.id}`}
                      </div>
                    ))
                  ) : (
                    <span className="disabled">还没有绑定证书.</span>
                  )}
                  <div style={{ marginTop: '0.6em' }}>
                    <a href="" onClick={(event) => { event.preventDefault(); setRequestCertVisible(true) }}>
                      [申请免费证书]
                    </a>{' '}
                    &nbsp;
                    <a href={`/servers/certs?serverId=${serverId}`}>[管理证书]</a>
                  </div>
                </div>
              </FormRow>
              <FormRow title="启用HTTP/2">
                <Checkbox checked={policy.http2Enabled} onChange={(checked) => updatePolicy('http2Enabled', checked)} />
              </FormRow>
              <FormRow title="启用HTTP/3">
                <Checkbox checked={policy.http3Enabled} onChange={(checked) => updatePolicy('http3Enabled', checked)} />
                {!supportsHTTP3 ? <p className="comment">当前集群不支持HTTP/3,需要更新节点或者开启集群的HTTP/3支持.</p> : null}
              </FormRow>
              <FormRow title="支持的最小TLS版本">
                <Select value={policy.minVersion} onChange={(event) => updatePolicy('minVersion', event.target.value)}>
                  {['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'].map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow title="OCSP">
                <Checkbox checked={policy.ocspIsOn} onChange={(checked) => updatePolicy('ocspIsOn', checked)} />
                <p className="comment">选中后启用OCSP Stapling.</p>
              </FormRow>
              <FormRow title="客户端认证">
                <Select value={policy.clientAuthType} onChange={(event) => updatePolicy('clientAuthType', Number(event.target.value))}>
                  {CLIENT_AUTH_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow title="自定义加密算法套件">
                <Checkbox checked={policy.cipherSuitesIsOn} onChange={(checked) => updatePolicy('cipherSuitesIsOn', checked)} />
                {policy.cipherSuitesIsOn ? (
                  <StringListEditor
                    values={policy.cipherSuites || []}
                    onChange={(values) => updatePolicy('cipherSuites', values)}
                    placeholder="比如 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
                    width="28em"
                  />
                ) : null}
              </FormRow>
            </FormTable>

            <h4>HSTS</h4>
            <FormTable>
              <FormRow title="启用HSTS">
                <Checkbox checked={hsts.isOn} onChange={(checked) => updatePolicy('hsts', { ...hsts, isOn: checked })} />
              </FormRow>
              {hsts.isOn ? (
                <>
                  <FormRow title="有效时间">
                    <div className="ui right labeled input" style={{ width: '10em' }}>
                      <input type="text" value={String(hsts.maxAge)} onChange={(event) => updatePolicy('hsts', { ...hsts, maxAge: Number(event.target.value) || 0 })} />
                      <span className="ui label">秒</span>
                    </div>
                  </FormRow>
                  <FormRow title="包含子域名">
                    <Checkbox checked={hsts.includeSubDomains} onChange={(checked) => updatePolicy('hsts', { ...hsts, includeSubDomains: checked })} />
                  </FormRow>
                  <FormRow title="Preload">
                    <Checkbox checked={hsts.preload} onChange={(checked) => updatePolicy('hsts', { ...hsts, preload: checked })} />
                  </FormRow>
                  <FormRow title="限定域名">
                    <StringListEditor values={hsts.domains || []} onChange={(values) => updatePolicy('hsts', { ...hsts, domains: values })} placeholder="比如 example.com" />
                  </FormRow>
                </>
              ) : null}
            </FormTable>
          </>
        ) : null}

        <SubmitButton submitting={submitting} />
      </form>

      {requestCertVisible ? (
        <RequestCertModal
          serverId={serverId}
          onClose={() => setRequestCertVisible(false)}
          onSaved={() => {
            setRequestCertVisible(false)
            toast('任务提交成功,请等待证书申请完成')
            window.location.reload()
          }}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

function RequestCertModal({ serverId, onClose, onSaved }: { serverId: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-request-cert', serverId],
    queryFn: () => apiGet<CertPopupData>('/servers/server/settings/https/requestCertPopup', { serverId }),
  })
  const [serverNames, setServerNames] = useState<string[]>([])
  const [userId, setUserId] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [asyncCreateCert, setAsyncCreateCert] = useState(false)
  const [providerCode, setProviderCode] = useState('letsencrypt')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setServerNames(query.data.serverNames || [])
    }
  }, [query.data])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      serverNames.forEach((name) => form.append('serverNames', name))
      if (userId > 0) {
        form.set('userId', String(userId))
      } else if (userEmail.length > 0) {
        form.set('userEmail', userEmail)
      }
      if (asyncCreateCert) {
        form.set('asyncCreateCert', '1')
        form.set('providerCode', providerCode)
      }
      await apiPostForm('/servers/server/settings/https/requestCertPopup', form)
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '申请失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="申请免费证书" onClose={onClose} width="40em">
      {query.isLoading ? (
        <LoadingBlock />
      ) : (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="证书包含的域名 *">
              <div>
                {serverNames.length === 0 ? <span className="disabled">还没有需要申请证书的域名,暂时不能申请.</span> : null}
                {serverNames.map((name, index) => (
                  <div key={`${name}-${index}`} className="ui tiny basic label">
                    {name}{' '}
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); setServerNames(serverNames.filter((_, i) => i !== index)) }}>
                      <Trash2 size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </FormRow>
            {!asyncCreateCert ? (
              <FormRow title="证书用户 *">
                {(query.data?.users || []).length > 0 ? (
                  <div>
                    <Select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
                      <option value={0}>[请选择]</option>
                      {(query.data?.users || []).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                          {user.description}
                        </option>
                      ))}
                    </Select>
                    <p className="comment">用来申请证书的用户.</p>
                  </div>
                ) : (
                  <div>
                    <TextInput type="text" maxLength={100} placeholder="用户E-mail" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
                    <p className="comment">用来申请证书的用户邮箱,可以任意填写,只要格式正确即可.</p>
                  </div>
                )}
              </FormRow>
            ) : null}
            <FormRow title="异步申请证书">
              <Checkbox label="启用" checked={asyncCreateCert} onChange={setAsyncCreateCert} />
              <p className="comment">建议域名多的时候勾选,异步并发执行证书申请,申请成功后会自动绑定到服务</p>
            </FormRow>
            {asyncCreateCert ? (
              <FormRow title="证书类型">
                <Select value={providerCode} onChange={(event) => setProviderCode(event.target.value)}>
                  <option value="letsencrypt">Let&apos;s Encrypt</option>
                </Select>
                <p className="comment">选择证书类型.</p>
              </FormRow>
            ) : null}
          </FormTable>
          <SubmitButton submitting={submitting}>提交</SubmitButton>
        </form>
      )}
    </Modal>
  )
}
