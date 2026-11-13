import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, parseId } from '../shared'

async function postWithCsrf(url: string, params: Record<string, unknown>) {
  const csrfToken = await getCsrfToken()
  return apiPost(url, { ...params, csrfToken })
}

function PolicyMenu({ clusterId, active }: { clusterId: number; active: 'setting' | 'status' }) {
  return (
    <div className="ui menu text blue first-menu">
      <a className={`item${active === 'setting' ? ' active' : ''}`} href={`/clusters/cluster/settings/services?clusterId=${clusterId}`}>
        设置
      </a>
      <a className={`item${active === 'status' ? ' active' : ''}`} href={`/clusters/cluster/settings/services/status?clusterId=${clusterId}`}>
        状态
      </a>
    </div>
  )
}

export function ClusterSettingsCachePage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-cache', clusterId],
    queryFn: () => apiGet<{ cachePolicy: { id: number; name: string; isOn: boolean } | null }>('/clusters/cluster/settings/cache', { clusterId }),
    enabled: clusterId > 0,
  })
  const policiesQuery = useQuery({
    queryKey: ['cache-policies'],
    queryFn: () => apiGet<{ cachePolicies: { id: number; name: string }[] }>('/servers/components/cache/selectPopup', { pageSize: 1000 }),
  })
  const [cachePolicyId, setCachePolicyId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.cachePolicy) {
      setCachePolicyId(query.data.cachePolicy.id)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/cache">
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await postWithCsrf('/clusters/cluster/settings/cache', { clusterId, cachePolicyId })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="选择缓存策略 *">
            <Select value={cachePolicyId} onChange={(event) => setCachePolicyId(Number(event.target.value))}>
              <option value="0">[请选择]</option>
              {policiesQuery.data?.cachePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </Select>
            <p className="comment">部署在当前集群上的所有网站都会自动使用此策略,只是服务可以自定义是否开启.</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

export function ClusterSettingsWafPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-waf', clusterId],
    queryFn: () => apiGet<{ firewallPolicy: { id: number; name: string; isOn: boolean } | null }>('/clusters/cluster/settings/waf', { clusterId }),
    enabled: clusterId > 0,
  })
  const policiesQuery = useQuery({
    queryKey: ['waf-policies'],
    queryFn: () => apiGet<{ policies: { id: number; name: string }[] }>('/servers/components/waf/selectPopup', { pageSize: 1000 }),
  })
  const [policyId, setPolicyId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.firewallPolicy) {
      setPolicyId(query.data.firewallPolicy.id)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/waf">
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await postWithCsrf('/clusters/cluster/settings/waf', { clusterId, httpFirewallPolicyId: policyId })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="选择WAF策略 *">
            <Select value={policyId} onChange={(event) => setPolicyId(Number(event.target.value))}>
              <option value="0">[请选择]</option>
              {policiesQuery.data?.policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </Select>
            <p className="comment">部署在当前集群上的所有网站都会自动使用此策略,只是网站可以自定义是否开启.</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

interface SizeCapacity {
  count: number
  unit: string
}

interface WebPPolicy {
  isOn: boolean
  quality: number
  requireCache: boolean
  minLength: SizeCapacity
  maxLength: SizeCapacity
}

const sizeUnits = ['byte', 'kb', 'mb', 'gb', 'tb']

export function ClusterSettingsWebpPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-webp', clusterId],
    queryFn: () => apiGet<{ webpPolicy: WebPPolicy }>('/clusters/cluster/settings/webp', { clusterId }),
    enabled: clusterId > 0,
  })
  const [policy, setPolicy] = useState<WebPPolicy | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setPolicy(query.data.webpPolicy)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !policy) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/webp">
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await postWithCsrf('/clusters/cluster/settings/webp', {
              clusterId,
              isOn: policy.isOn ? 1 : '',
              quality: policy.quality,
              requireCache: policy.requireCache ? 1 : '',
              minLengthJSON: JSON.stringify(policy.minLength),
              maxLengthJSON: JSON.stringify(policy.maxLength),
            })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="启用WebP功能">
            <Checkbox label="" checked={policy.isOn} onChange={(value) => setPolicy({ ...policy, isOn: value })} />
            <p className="comment">选中后,表示当前集群下的网站可以使用WebP转换功能.</p>
          </FormRow>
          {policy.isOn ? (
            <>
              <FormRow title="图片质量">
                <div className="ui input right labeled">
                  <TextInput
                    type="text"
                    style={{ width: '5em' }}
                    maxLength={4}
                    value={String(policy.quality)}
                    onChange={(event) => setPolicy({ ...policy, quality: Number(event.target.value) || 0 })}
                  />
                  <span className="ui label">%</span>
                </div>
                <p className="comment">取值在0到100之间,0表示自动调节.</p>
              </FormRow>
              <FormRow title="需要满足缓存条件">
                <Checkbox label="" checked={policy.requireCache} onChange={(value) => setPolicy({ ...policy, requireCache: value })} />
                <p className="comment">选中后,表示图片URL需要满足缓存条件后才会转换.</p>
              </FormRow>
              <FormRow title="可转换的最小尺寸">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      style={{ width: '6em' }}
                      value={String(policy.minLength.count)}
                      onChange={(event) => setPolicy({ ...policy, minLength: { ...policy.minLength, count: Number(event.target.value) || 0 } })}
                    />
                  </div>
                  <div className="ui field">
                    <Select value={policy.minLength.unit} onChange={(event) => setPolicy({ ...policy, minLength: { ...policy.minLength, unit: event.target.value } })}>
                      {sizeUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit.toUpperCase()}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <p className="comment">不低于此尺寸的图像文件才会转换.</p>
              </FormRow>
              <FormRow title="可转换的最大尺寸">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      style={{ width: '6em' }}
                      value={String(policy.maxLength.count)}
                      onChange={(event) => setPolicy({ ...policy, maxLength: { ...policy.maxLength, count: Number(event.target.value) || 0 } })}
                    />
                  </div>
                  <div className="ui field">
                    <Select value={policy.maxLength.unit} onChange={(event) => setPolicy({ ...policy, maxLength: { ...policy.maxLength, unit: event.target.value } })}>
                      {sizeUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit.toUpperCase()}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <p className="comment">不高于此尺寸的图像文件才会转换.</p>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

export function ClusterSettingsServicesPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-services', clusterId],
    queryFn: () => apiGet<{ systemdIsOn: boolean }>('/clusters/cluster/settings/services', { clusterId }),
    enabled: clusterId > 0,
  })
  const [systemdIsOn, setSystemdIsOn] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setSystemdIsOn(query.data.systemdIsOn)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/services">
      <PolicyMenu clusterId={clusterId} active="setting" />
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await postWithCsrf('/clusters/cluster/settings/services', { clusterId, systemdIsOn: systemdIsOn ? 1 : '' })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="自动加入Systemd服务">
            <Checkbox label="" checked={systemdIsOn} onChange={setSystemdIsOn} />
            <p className="comment">加入后可以利用systemd对节点进程进行管理,并可自动随开机启动.</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

interface CheckResult {
  nodeId: number
  nodeName: string
  isOk: boolean
  message: string
  isPrior?: boolean
}

export function ClusterSettingsServicesStatusPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const [results, setResults] = useState<CheckResult[]>([])
  const [isRequesting, setIsRequesting] = useState(true)

  async function reload() {
    setIsRequesting(true)
    try {
      const resp = await apiPost<{ results: CheckResult[] }>('/clusters/cluster/settings/services/status', { clusterId })
      setResults(resp.results || [])
    } catch (error) {
      toast(error instanceof Error ? error.message : '检测失败', 'error')
    } finally {
      setIsRequesting(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId])

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/services">
      <PolicyMenu clusterId={clusterId} active="status" />
      {isRequesting ? <div className="ui message">正在节点服务状态检测中,请稍候...</div> : null}
      {!isRequesting ? (
        <div>
          {results.length === 0 ? (
            <div>暂时还没有节点.</div>
          ) : (
            <div>
              <div className="margin" />
              <table className="ui table selectable">
                <thead>
                  <tr>
                    <th>节点名</th>
                    <th>是否已启用服务</th>
                    <th>提示消息</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.nodeId}>
                      <td>{result.nodeName}</td>
                      <td>{result.isOk ? <span className="green">Y</span> : <span className="red">N</span>}</td>
                      <td>
                        <span className={result.isOk ? undefined : 'red'}>{result.message}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="comment">
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    void reload()
                  }}
                >
                  <RefreshCw size={13} /> [刷新]
                </a>
              </p>
            </div>
          )}
        </div>
      ) : null}
    </ClusterSettingsLayout>
  )
}

interface TCPIPConfig {
  ip: string
}

interface TCPPortConfig {
  port: number
}

interface TCPConfig {
  isPrior: boolean
  isOn: boolean
  maxConnections: number
  maxConnectionsPerIP: number
  newConnectionsRate: number
  newConnectionsRateBlockTimeout: number
  newConnectionsSecondlyRate: number
  newConnectionsSecondlyRateBlockTimeout: number
  allowIPList: TCPIPConfig[] | null
  ports: TCPPortConfig[] | null
}

interface DDoSConfig {
  tcp: TCPConfig | null
}

export function ClusterSettingsDdosProtectionPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-ddos', clusterId],
    queryFn: () => apiGet<{ clusterId: number; config: DDoSConfig; defaultConfigs: unknown }>('/clusters/cluster/settings/ddos-protection', { clusterId }),
    enabled: clusterId > 0,
  })
  const [config, setConfig] = useState<DDoSConfig | null>(null)
  const [allowIPs, setAllowIPs] = useState('')
  const [ports, setPorts] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
      setAllowIPs((query.data.config.tcp?.allowIPList || []).map((item) => item.ip).join('\n'))
      setPorts((query.data.config.tcp?.ports || []).map((item) => item.port).join(','))
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const tcp: TCPConfig = config.tcp || {
    isPrior: false,
    isOn: false,
    maxConnections: 0,
    maxConnectionsPerIP: 0,
    newConnectionsRate: 0,
    newConnectionsRateBlockTimeout: 0,
    newConnectionsSecondlyRate: 0,
    newConnectionsSecondlyRateBlockTimeout: 0,
    allowIPList: [],
    ports: [],
  }

  const updateTcp = (patch: Partial<TCPConfig>) => setConfig({ ...config, tcp: { ...tcp, ...patch } })

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/ddos-protection">
      <div className="ui menu text blue first-menu">
        <a className="item active" href={`/clusters/cluster/settings/ddos-protection?clusterId=${clusterId}`}>
          设置
        </a>
        <a className="item" href={`/clusters/cluster/settings/ddos-protection/status?clusterId=${clusterId}`}>
          状态
        </a>
      </div>
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            const nextConfig: DDoSConfig = {
              tcp: {
                ...tcp,
                allowIPList: allowIPs
                  .split('\n')
                  .map((ip) => ip.trim())
                  .filter((ip) => ip.length > 0)
                  .map((ip) => ({ ip })),
                ports: ports
                  .split(',')
                  .map((port) => Number(port.trim()))
                  .filter((port) => port > 0)
                  .map((port) => ({ port })),
              },
            }
            await postWithCsrf('/clusters/cluster/settings/ddos-protection', {
              clusterId,
              ddosProtectionJSON: JSON.stringify(nextConfig),
            })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="启用DDoS防护">
            <Checkbox label="" checked={tcp.isOn} onChange={(value) => updateTcp({ isOn: value })} />
            <p className="comment">选中后,表示在当前集群节点上启用TCP层面的DDoS防护.</p>
          </FormRow>
          {tcp.isOn ? (
            <>
              <FormRow title="单节点最大连接数">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.maxConnections)}
                  onChange={(event) => updateTcp({ maxConnections: Number(event.target.value) || 0 })}
                />
                <p className="comment">0表示不限制.</p>
              </FormRow>
              <FormRow title="单IP最大连接数">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.maxConnectionsPerIP)}
                  onChange={(event) => updateTcp({ maxConnectionsPerIP: Number(event.target.value) || 0 })}
                />
              </FormRow>
              <FormRow title="单IP每分钟新连接数">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.newConnectionsRate)}
                  onChange={(event) => updateTcp({ newConnectionsRate: Number(event.target.value) || 0 })}
                />
                <p className="comment">0表示不限制.</p>
              </FormRow>
              <FormRow title="分钟级超限拦截时间">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.newConnectionsRateBlockTimeout)}
                  onChange={(event) => updateTcp({ newConnectionsRateBlockTimeout: Number(event.target.value) || 0 })}
                />
                <p className="comment">单位为秒.</p>
              </FormRow>
              <FormRow title="单IP每秒新连接数">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.newConnectionsSecondlyRate)}
                  onChange={(event) => updateTcp({ newConnectionsSecondlyRate: Number(event.target.value) || 0 })}
                />
              </FormRow>
              <FormRow title="秒级超限拦截时间">
                <TextInput
                  type="text"
                  style={{ width: '6em' }}
                  value={String(tcp.newConnectionsSecondlyRateBlockTimeout)}
                  onChange={(event) => updateTcp({ newConnectionsSecondlyRateBlockTimeout: Number(event.target.value) || 0 })}
                />
                <p className="comment">单位为秒.</p>
              </FormRow>
              <FormRow title="IP白名单">
                <textarea rows={4} placeholder="每行一个IP" value={allowIPs} onChange={(event) => setAllowIPs(event.target.value)} />
              </FormRow>
              <FormRow title="仅允许访问的端口">
                <TextInput type="text" placeholder="80,443" value={ports} onChange={(event) => setPorts(event.target.value)} />
                <p className="comment">多个端口使用英文逗号分隔.</p>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

export function ClusterSettingsDdosStatusPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const [results, setResults] = useState<CheckResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function reload() {
    setIsLoading(true)
    try {
      const resp = await apiPost<{ results: CheckResult[] }>('/clusters/cluster/settings/ddos-protection/status', { clusterId })
      setResults(resp.results || [])
    } catch (error) {
      toast(error instanceof Error ? error.message : '检查失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId])

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/ddos-protection">
      <div className="ui menu text blue first-menu">
        <a className="item" href={`/clusters/cluster/settings/ddos-protection?clusterId=${clusterId}`}>
          设置
        </a>
        <a className="item active" href={`/clusters/cluster/settings/ddos-protection/status?clusterId=${clusterId}`}>
          状态
        </a>
      </div>
      {isLoading ? <div className="ui message">检查中,请耐心等待完成...</div> : null}
      {!isLoading && results.length === 0 ? <p className="comment">当前集群下暂时还没有节点.</p> : null}
      {results.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th className="three wide">节点名称</th>
              <th>检查结果</th>
              <th className="two op">独立设置</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.nodeId}>
                <td>
                  <a href={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${result.nodeId}`}>{result.nodeName}</a>
                  {result.isPrior ? (
                    <div>
                      <a href={`/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${result.nodeId}`}>
                        <span className="ui label tiny basic grey">定制</span>
                      </a>
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={result.isOk ? 'green' : 'red'}>{result.message}</span>
                </td>
                <td>
                  <a href={`/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${result.nodeId}`}>设置</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="margin" />
      <a
        href=""
        onClick={(event) => {
          event.preventDefault()
          void reload()
        }}
      >
        <RefreshCw size={13} /> [刷新]
      </a>
    </ClusterSettingsLayout>
  )
}
