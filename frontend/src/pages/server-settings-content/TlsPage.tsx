import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import {
  NetworkAddressesEditor,
  ServerSettingsShell,
  StringListEditor,
  useServerId,
  type NetworkAddress,
  type ServerSettingsBase,
} from './shared'

interface TlsPolicy {
  id: number
  isOn?: boolean
  certRefs?: { isOn: boolean; certId: number }[] | null
  certs?: { id: number; name?: string; dnsNames?: string[] | null }[] | null
  clientAuthType: number
  clientCARefs?: { isOn: boolean; certId: number }[] | null
  minVersion: string
  cipherSuitesIsOn: boolean
  cipherSuites: string[] | null
  hsts: { isOn: boolean; maxAge: number; includeSubDomains: boolean; preload: boolean; domains: string[] | null } | null
  http2Enabled: boolean
  http3Enabled: boolean
  ocspIsOn: boolean
}

interface TlsData extends ServerSettingsBase {
  serverType: string
  tlsConfig: { isOn: boolean; listen: NetworkAddress[] | null; sslPolicy: TlsPolicy | null } | null
}

const DEFAULT_POLICY: TlsPolicy = {
  id: 0,
  certRefs: [],
  clientAuthType: 0,
  minVersion: 'TLS 1.2',
  cipherSuitesIsOn: false,
  cipherSuites: [],
  hsts: { isOn: false, maxAge: 31536000, includeSubDomains: false, preload: false, domains: [] },
  http2Enabled: true,
  http3Enabled: false,
  ocspIsOn: false,
}

const CLIENT_AUTH_TYPES = [
  { value: 0, name: '不需要客户端证书' },
  { value: 1, name: '请求客户端证书，但不验证' },
  { value: 2, name: '要求客户端证书，但不验证' },
  { value: 3, name: '如果提供客户端证书，则验证' },
  { value: 4, name: '要求客户端证书并验证' },
]

export function ServerTlsSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-tls', serverId],
    queryFn: () => apiGet<TlsData>('/servers/server/settings/tls', { serverId }),
    enabled: serverId > 0,
  })
  const [addresses, setAddresses] = useState<NetworkAddress[]>([])
  const [policy, setPolicy] = useState<TlsPolicy>(DEFAULT_POLICY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const data = query.data
    if (!data) {
      return
    }
    setAddresses(data.tlsConfig?.listen || [])
    setPolicy({
      ...DEFAULT_POLICY,
      ...(data.tlsConfig?.sslPolicy || {}),
      hsts: { ...DEFAULT_POLICY.hsts!, ...(data.tlsConfig?.sslPolicy?.hsts || {}) },
      certs: data.tlsConfig?.sslPolicy?.certs || [],
      certRefs: data.tlsConfig?.sslPolicy?.certRefs || [],
      cipherSuites: data.tlsConfig?.sslPolicy?.cipherSuites || [],
    })
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const hsts = policy.hsts || DEFAULT_POLICY.hsts!

  function update<K extends keyof TlsPolicy>(key: K, value: TlsPolicy[K]) {
    setPolicy((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/tls', {
        serverId,
        serverType: data.serverType,
        addresses: JSON.stringify(addresses.map((address) => ({ ...address, protocol: address.protocol || 'tls' }))),
        sslPolicyJSON: JSON.stringify(policy),
      })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="绑定端口 *">
            <NetworkAddressesEditor addresses={addresses} onChange={setAddresses} protocol="tls" supportRange />
          </FormRow>
        </FormTable>

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
                <span className="disabled">还没有绑定证书。</span>
              )}
              <div style={{ marginTop: '0.6em' }}>
                <a href={`/servers/certs?serverId=${serverId}`}>[管理证书]</a>
              </div>
            </div>
          </FormRow>
          <FormRow title="支持的最小TLS版本">
            <Select value={policy.minVersion} onChange={(event) => update('minVersion', event.target.value)}>
              {['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'].map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow title="OCSP">
            <Checkbox checked={policy.ocspIsOn} onChange={(checked) => update('ocspIsOn', checked)} />
          </FormRow>
          <FormRow title="客户端认证">
            <Select value={policy.clientAuthType} onChange={(event) => update('clientAuthType', Number(event.target.value))}>
              {CLIENT_AUTH_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow title="自定义加密算法套件">
            <Checkbox checked={policy.cipherSuitesIsOn} onChange={(checked) => update('cipherSuitesIsOn', checked)} />
            {policy.cipherSuitesIsOn ? (
              <StringListEditor
                values={policy.cipherSuites || []}
                onChange={(values) => update('cipherSuites', values)}
                placeholder="比如 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
                width="28em"
              />
            ) : null}
          </FormRow>
          <FormRow title="启用HSTS">
            <Checkbox checked={hsts.isOn} onChange={(checked) => update('hsts', { ...hsts, isOn: checked })} />
          </FormRow>
          {hsts.isOn ? (
            <>
              <FormRow title="HSTS有效时间">
                <div className="ui right labeled input" style={{ width: '10em' }}>
                  <input type="text" value={String(hsts.maxAge)} onChange={(event) => update('hsts', { ...hsts, maxAge: Number(event.target.value) || 0 })} />
                  <span className="ui label">秒</span>
                </div>
              </FormRow>
              <FormRow title="HSTS包含子域名">
                <Checkbox checked={hsts.includeSubDomains} onChange={(checked) => update('hsts', { ...hsts, includeSubDomains: checked })} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
