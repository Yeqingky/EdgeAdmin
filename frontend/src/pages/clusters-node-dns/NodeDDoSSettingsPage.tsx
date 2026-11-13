import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { MenuLinks } from './ui'
import { postForm, type DDoSProtectionConfig, type DDoSProtectionIP, type DDoSProtectionPort, type DDoSTCPConfig, type NodeDDoSData } from './shared'

interface CheckResult {
  isOk: boolean
  message: string
}

interface StatusData {
  results: CheckResult[]
}

const EMPTY_TCP: DDoSTCPConfig = {
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

export function NodeDDoSSettingsPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-settings-ddos', clusterId, nodeId],
    queryFn: () => apiGet<NodeDDoSData>('/clusters/cluster/node/settings/ddos-protection', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [tcp, setTcp] = useState<DDoSTCPConfig>(EMPTY_TCP)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [portDraft, setPortDraft] = useState({ port: '', description: '' })
  const [ipDraft, setIpDraft] = useState({ ip: '', description: '' })

  useEffect(() => {
    if (query.data && !initialized) {
      setTcp(query.data.config.tcp || { ...EMPTY_TCP })
      setInitialized(true)
    }
  }, [query.data, initialized])

  useEffect(() => {
    if (!initialized || nodeId <= 0) {
      return
    }
    void apiPost<StatusData>('/clusters/cluster/node/settings/ddos-protection/status', { nodeId })
      .then((result) => {
        if (result.results && result.results.length > 0) {
          setCheckResult(result.results[0])
        }
      })
      .catch(() => {
        // ignore
      })
  }, [initialized, nodeId])

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数.</div>
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <LoadingBlock />
  }
  if (!query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const defaults = data.defaultConfigs || {}

  function update<K extends keyof DDoSTCPConfig>(key: K, value: DDoSTCPConfig[K]) {
    setTcp((current) => {
      const next: DDoSTCPConfig = { ...current }
      next[key] = value
      return next
    })
  }

  const ports = tcp.ports || []
  const ipList = tcp.allowIPList || []

  function addPort() {
    const port = parseInt(portDraft.port, 10)
    if (isNaN(port) || port <= 0 || port > 65535) {
      toast('请输入正确的端口号', 'error')
      return
    }
    if (ports.some((item) => item.port === port)) {
      toast('端口号已经存在', 'error')
      return
    }
    update('ports', [...ports, { port, description: portDraft.description }])
    setPortDraft({ port: '', description: '' })
  }

  function addIP() {
    const ip = ipDraft.ip.trim()
    if (!ip) {
      toast('请输入IP地址', 'error')
      return
    }
    update('allowIPList', [...ipList, { ip, description: ipDraft.description }])
    setIpDraft({ ip: '', description: '' })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const config: DDoSProtectionConfig = { tcp }
      await postForm('/clusters/cluster/node/settings/ddos-protection', { nodeId, ddosProtectionJSON: JSON.stringify(config) }, true)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={data.node} active="update" />
      <MenuLinks
        items={[
          { name: '基本设置', to: `/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DNS设置', to: `/clusters/cluster/node/settings/dns?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '缓存设置', to: `/clusters/cluster/node/settings/cache?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DDoS防护', to: `/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
          { name: 'SSH设置', to: `/clusters/cluster/node/settings/ssh?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '系统设置', to: `/clusters/cluster/node/settings/system?clusterId=${clusterId}&nodeId=${nodeId}` },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <p className="comment">
          功能说明:此功能为<strong>试验性质</strong>,目前仅能防御简单的DDoS攻击,试验期间建议仅在被攻击时启用,仅支持已安装<code>nftables v0.9</code>
          以上的Linux系统.
        </p>

        {data.clusterDDoSProtectionIsOn ? <div className="ui message">当前节点所在集群已设置DDoS防护.</div> : null}

        <h4>TCP设置</h4>
        <FormTable>
          <FormRow title="打开独立配置">
            <Checkbox checked={tcp.isPrior} onChange={(checked) => update('isPrior', checked)} />
            <p className="comment">
              <strong>{tcp.isPrior ? '[已打开]' : ''}</strong> 打开后可以覆盖父级或子级配置.
            </p>
          </FormRow>
          {tcp.isPrior ? (
            <FormRow title="启用DDoS防护">
              <Checkbox checked={tcp.isOn} onChange={(checked) => update('isOn', checked)} />
            </FormRow>
          ) : null}
          {tcp.isOn && tcp.isPrior ? (
            <>
              <FormRow title="单节点TCP最大连接数">
                <NumericInput value={tcp.maxConnections} onChange={(value) => update('maxConnections', value)} />
                <p className="comment">单个节点可以接受的TCP最大连接数.如果为0,则默认为{defaults.tcpMaxConnections}.</p>
              </FormRow>
              <FormRow title="单IP TCP最大连接数">
                <NumericInput value={tcp.maxConnectionsPerIP} onChange={(value) => update('maxConnectionsPerIP', value)} />
                <p className="comment">
                  单个IP可以连接到节点的TCP最大连接数.如果为0,则默认为{defaults.tcpMaxConnectionsPerIP};最小值为
                  {defaults.tcpMinConnectionsPerIP}.
                </p>
              </FormRow>
              <FormRow title="单IP TCP新连接速率(分钟)">
                <div className="ui fields inline">
                  <div className="ui field">
                    <NumericInput value={tcp.newConnectionsRate} onChange={(value) => update('newConnectionsRate', value)} />
                    <span className="small grey">个新连接/每分钟</span>
                  </div>
                  <div className="ui field">屏蔽</div>
                  <div className="ui field">
                    <NumericInput value={tcp.newConnectionsRateBlockTimeout} onChange={(value) => update('newConnectionsRateBlockTimeout', value)} />
                    <span className="small grey">秒</span>
                  </div>
                </div>
                <p className="comment">
                  单个IP每分钟可以创建TCP新连接的数量.如果为0,则默认为{defaults.tcpNewConnectionsMinutelyRate};最小值为
                  {defaults.tcpNewConnectionsMinMinutelyRate}.如果没有填写屏蔽时间,则只丢弃数据包.
                </p>
              </FormRow>
              <FormRow title="单IP TCP新连接速率(秒钟)">
                <div className="ui fields inline">
                  <div className="ui field">
                    <NumericInput value={tcp.newConnectionsSecondlyRate} onChange={(value) => update('newConnectionsSecondlyRate', value)} />
                    <span className="small grey">个新连接/每秒钟</span>
                  </div>
                  <div className="ui field">屏蔽</div>
                  <div className="ui field">
                    <NumericInput
                      value={tcp.newConnectionsSecondlyRateBlockTimeout}
                      onChange={(value) => update('newConnectionsSecondlyRateBlockTimeout', value)}
                    />
                    <span className="small grey">秒</span>
                  </div>
                </div>
                <p className="comment">
                  单个IP每秒钟可以创建TCP新连接的数量.如果为0,则默认为{defaults.tcpNewConnectionsSecondlyRate};最小值为
                  {defaults.tcpNewConnectionsMinSecondlyRate}.如果没有填写屏蔽时间,则只丢弃数据包.
                </p>
              </FormRow>
              <FormRow title="TCP端口列表">
                <div>
                  {ports.map((item: DDoSProtectionPort, index: number) => (
                    <span key={`${item.port}-${index}`} className="ui label tiny basic" style={{ marginBottom: '0.4em' }}>
                      {item.port}
                      {item.description ? <span className="grey small">({item.description})</span> : null}
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          update('ports', ports.filter((_, itemIndex) => itemIndex !== index))
                        }}
                      >
                        &nbsp;×
                      </a>
                    </span>
                  ))}
                  <div className="ui fields inline" style={{ marginTop: '0.4em' }}>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="端口"
                        style={{ width: '6em' }}
                        value={portDraft.port}
                        onChange={(event) => setPortDraft({ ...portDraft, port: event.target.value })}
                      />
                    </div>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="说明"
                        value={portDraft.description}
                        onChange={(event) => setPortDraft({ ...portDraft, description: event.target.value })}
                      />
                    </div>
                    <div className="ui field">
                      <button className="ui button tiny" type="button" onClick={addPort}>
                        添加
                      </button>
                    </div>
                  </div>
                </div>
                <p className="comment">在这些端口上使用当前配置.默认为80和443两个端口.</p>
              </FormRow>
              <FormRow title="IP白名单">
                <div>
                  {ipList.map((item: DDoSProtectionIP, index: number) => (
                    <span key={`${item.ip}-${index}`} className="ui label tiny basic" style={{ marginBottom: '0.4em' }}>
                      {item.ip}
                      {item.description ? <span className="grey small">({item.description})</span> : null}
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          update('allowIPList', ipList.filter((_, itemIndex) => itemIndex !== index))
                        }}
                      >
                        &nbsp;×
                      </a>
                    </span>
                  ))}
                  <div className="ui fields inline" style={{ marginTop: '0.4em' }}>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="IP地址"
                        value={ipDraft.ip}
                        onChange={(event) => setIpDraft({ ...ipDraft, ip: event.target.value })}
                      />
                    </div>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="说明"
                        value={ipDraft.description}
                        onChange={(event) => setIpDraft({ ...ipDraft, description: event.target.value })}
                      />
                    </div>
                    <div className="ui field">
                      <button className="ui button tiny" type="button" onClick={addIP}>
                        添加
                      </button>
                    </div>
                  </div>
                </div>
                <p className="comment">在白名单中的IP不受当前设置的限制.</p>
              </FormRow>
            </>
          ) : null}
        </FormTable>

        {checkResult && checkResult.isOk ? <p className="ui message green">节点检查结果:{checkResult.message}</p> : null}
        {checkResult && !checkResult.isOk ? <p className="ui message red">节点检查结果:有错误发生:{checkResult.message}</p> : null}

        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}

function NumericInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(value > 0 ? String(value) : '')
  return (
    <input
      type="text"
      maxLength={6}
      size={6}
      style={{ width: '6em' }}
      value={text}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        const parsed = parseInt(next, 10)
        onChange(isNaN(parsed) ? 0 : parsed)
      }}
    />
  )
}
