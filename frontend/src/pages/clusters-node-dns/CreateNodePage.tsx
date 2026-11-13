import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable } from '../../components/form'
import { ClusterSelector } from './NodeUpdatePage'
import { DnsRoutesSelector, GrantSelector, GroupSelector, IPAddressesEditor, RegionSelector } from './ui'
import {
  postForm,
  type ClusterRef,
  type CreateNodeData,
  type CreateNodeResult,
  type IPAddressItem,
  type InstallStatusResult,
  type NodeGrantRef,
  type OptionRef,
} from './shared'

interface SuggestPortsData {
  ports: number[]
  availablePorts: number[]
}

export function CreateNodePage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)

  const query = useQuery({
    queryKey: ['create-node', clusterId],
    queryFn: () => apiGet<CreateNodeData>('/clusters/cluster/createNode', { clusterId }),
    enabled: clusterId > 0,
  })

  const [step, setStep] = useState<'info' | 'install' | 'finish'>('info')
  const [name, setName] = useState('')
  const [ipAddresses, setIpAddresses] = useState<IPAddressItem[]>([])
  const [rosterRoutes, setRoutes] = useState<string[]>([])
  const [group, setGroup] = useState<OptionRef | null>(null)
  const [region, setRegion] = useState<OptionRef | null>(null)
  const [secondaryClusters, setSecondaryClusters] = useState<ClusterRef[]>([])
  const [clustersOpened, setClustersOpened] = useState(false)
  const [grant, setGrant] = useState<NodeGrantRef | null>(null)
  const [sshHost, setSshHost] = useState('')
  const [sshPort, setSshPort] = useState('')
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CreateNodeResult | null>(null)
  const [installMethod, setInstallMethod] = useState<'remote' | 'manual'>('remote')
  const [installing, setInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [suggestPorts, setSuggestPorts] = useState<number[]>([])
  const [installGrant, setInstallGrant] = useState<NodeGrantRef | null>(null)

  const defaultIP = useMemo(() => {
    const matched = name.match(/(\d{1,3}\.){3}\d{1,3}/)
    if (!matched) {
      return ''
    }
    const pieces = matched[0].split('.')
    if (pieces.length !== 4) {
      return ''
    }
    for (const piece of pieces) {
      const value = parseInt(piece, 10)
      if (isNaN(value) || value > 255) {
        return ''
      }
    }
    return matched[0]
  }, [name])

  useEffect(() => {
    if (!installing || !created) {
      return
    }
    let stopped = false
    const timer = window.setInterval(() => {
      void apiPost<InstallStatusResult>('/clusters/cluster/node/status', { nodeId: created.nodeId })
        .then((result) => {
          if (stopped) {
            return
          }
          if (result.isInstalled) {
            setInstalling(false)
            setIsInstalled(true)
            setStep('finish')
            return
          }
          const status = result.installStatus
          if (status && status.isFinished) {
            setInstalling(false)
            if (status.isOk) {
              setIsInstalled(true)
              setStep('finish')
            } else {
              toast(status.error || '安装失败', 'error')
            }
          }
        })
        .catch(() => {
          // ignore transient errors
        })
    }, 2000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [installing, created, toast])

  if (!clusterId) {
    return <div className="ui negative message">缺少集群参数。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const configContent = created
    ? `rpc.endpoints: [ ${data.apiEndpoints} ]\nnodeId: "${created.node.uniqueId}"\nsecret: "${created.node.secret}"`
    : ''

  async function submitInfo(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入节点名称', 'error')
      return
    }
    if (ipAddresses.length === 0 && !defaultIP) {
      toast('请至少输入一个IP地址', 'error')
      return
    }
    setSubmitting(true)
    try {
      const result = await apiPost<CreateNodeResult>('/clusters/cluster/createNode', {
        name: name.trim(),
        ipAddressesJSON: JSON.stringify(
          ipAddresses.length > 0
            ? ipAddresses
            : [
                {
                  ip: defaultIP,
                  canAccess: true,
                  isOn: true,
                  isUp: true,
                },
              ],
        ),
        clusterId,
        groupId: group ? group.id : 0,
        regionId: region ? region.id : 0,
        grantId: grant ? grant.id : 0,
        sshHost: sshHost.trim(),
        sshPort: Number(sshPort) || 0,
        dnsDomainId: data.dnsDomainId,
        dnsRoutesJSON: JSON.stringify(rosterRoutes),
        secondaryClusterIds: JSON.stringify(secondaryClusters.map((cluster) => cluster.id)),
      })
      setCreated(result)
      setInstallGrant(result.node.grant)
      setSshHost(result.node.addresses.length > 0 ? result.node.addresses[0] : result.node.login?.params?.host || '')
      const port = Number(result.node.login?.params?.port || 0)
      setSshPort(port > 0 ? String(port) : '')
      setStep('install')
      if (result.node.addresses.length > 0) {
        void loadSuggestPorts(result.node.addresses[0])
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadSuggestPorts(host: string) {
    if (!host) {
      return
    }
    try {
      const result = await apiPost<SuggestPortsData>('/clusters/cluster/suggestLoginPorts', { host })
      const ports = result.availablePorts || result.ports || []
      setSuggestPorts(ports)
      if (!sshPort && ports.length > 0) {
        setSshPort(String(ports[0]))
      }
    } catch {
      // ignore
    }
  }

  async function remoteInstall() {
    if (!created) {
      return
    }
    if (!sshHost.trim() || !sshPort || !installGrant || installGrant.id <= 0) {
      toast('请填写SSH主机地址、端口和登录认证', 'error')
      return
    }
    setInstalling(true)
    try {
      await postForm('/clusters/cluster/createNodeInstall', {
        nodeId: created.nodeId,
        sshHost: sshHost.trim(),
        sshPort: Number(sshPort) || 0,
        grantId: installGrant.id,
      })
      toast('已经开始安装，请稍候...')
    } catch (error) {
      setInstalling(false)
      toast(error instanceof Error ? error.message : '安装失败', 'error')
    }
  }

  function downloadConfig() {
    if (!configContent) {
      return
    }
    const blob = new Blob([configContent], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'api_node.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="ui steps small fluid">
        <div className={`ui step${step === 'info' ? ' active' : ''}`}>
          <div className="content">1. 填写节点信息</div>
        </div>
        <div className={`ui step${step === 'install' ? ' active' : ''}`}>
          <div className="content">2. 安装节点</div>
        </div>
        <div className={`ui step${step === 'finish' ? ' active' : ''}`}>
          <div className="content">3. 完成</div>
        </div>
      </div>

      {step === 'info' ? (
        <form className="ui form" onSubmit={submitInfo}>
          {data.quota.maxNodes > 0 && data.quota.leftNodes >= 0 ? (
            <div style={{ color: '#959da6', marginBottom: '1em' }}>
              当前授权最多节点数：{data.quota.maxNodes}个，剩余节点数：{data.quota.leftNodes}个。
            </div>
          ) : null}
          <FormTable>
            <FormRow title="节点名称 *">
              <input type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
            </FormRow>
            <FormRow title="IP地址 *">
              <IPAddressesEditor value={ipAddresses} onChange={setIpAddresses} />
              <p className="comment">
                用于访问节点和域名解析等
                {defaultIP ? (
                  <strong>
                    ，如果没有填写默认为{defaultIP}
                  </strong>
                ) : null}
                。
              </p>
            </FormRow>
            {data.dnsRoutes.length > 0 ? (
              <FormRow title="DNS线路">
                <DnsRoutesSelector allRoutes={data.dnsRoutes} value={rosterRoutes} onChange={setRoutes} />
                <p className="comment">当前节点对应的DNS线路，可用线路是根据集群设置的域名获取的，注意DNS服务商可能对这些线路有其他限制。</p>
              </FormRow>
            ) : null}
            <FormRow title="所属分组">
              <GroupSelector clusterId={clusterId} value={group} onChange={setGroup} />
              <p className="comment">用来筛选节点。</p>
            </FormRow>
            <FormRow title="所属区域">
              <RegionSelector value={region} onChange={setRegion} />
              <p className="comment">设置区域后可以根据区域进行流量统计和计费。</p>
            </FormRow>
            <FormRow title="所属从集群">
              {secondaryClusters.length > 0 ? (
                <div style={{ marginBottom: '0.5em' }}>
                  {secondaryClusters.map((cluster, index) => (
                    <span key={cluster.id} className="ui label basic small">
                      <span className="grey">{cluster.name}</span> &nbsp;
                      <a
                        href=""
                        title="删除"
                        onClick={(event) => {
                          event.preventDefault()
                          setSecondaryClusters(secondaryClusters.filter((_, itemIndex) => itemIndex !== index))
                        }}
                      >
                        ×
                      </a>
                    </span>
                  ))}
                </div>
              ) : null}
              <button className="ui button tiny" type="button" onClick={() => setClustersOpened(true)}>
                +
              </button>
            </FormRow>
            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setMoreOptionsVisible(!moreOptionsVisible)
                  }}
                >
                  {moreOptionsVisible ? '收起更多选项' : '更多选项'}
                </a>
              </td>
            </tr>
            {moreOptionsVisible ? (
              <>
                <FormRow title="SSH主机地址">
                  <input type="text" maxLength={64} value={sshHost} onChange={(event) => setSshHost(event.target.value)} />
                  <p className="comment">比如192.168.1.100，用于远程安装节点应用程序。</p>
                </FormRow>
                <FormRow title="SSH主机端口">
                  <input type="text" maxLength={5} style={{ width: '6em' }} value={sshPort} onChange={(event) => setSshPort(event.target.value)} />
                  <p className="comment">常见的比如22。</p>
                </FormRow>
                <FormRow title="SSH登录认证">
                  <GrantSelector clusterId={clusterId} value={grant} onChange={setGrant} />
                </FormRow>
              </>
            ) : null}
          </FormTable>
          <div style={{ marginTop: '1em' }}>
            <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
              下一步
            </button>
          </div>
        </form>
      ) : null}

      {step === 'install' && created ? (
        <div>
          <div className="ui tabular menu">
            <a href="" className={`item${installMethod === 'remote' ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); setInstallMethod('remote') }}>
              远程安装
            </a>
            <a href="" className={`item${installMethod === 'manual' ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); setInstallMethod('manual') }}>
              手动安装
            </a>
          </div>

          {installMethod === 'remote' ? (
            <div className="ui form">
              <FormTable>
                <FormRow title="SSH主机地址 *">
                  <input
                    type="text"
                    maxLength={64}
                    style={{ width: '16em' }}
                    value={sshHost}
                    onChange={(event) => {
                      setSshHost(event.target.value)
                      void loadSuggestPorts(event.target.value)
                    }}
                  />
                  {created.node.addresses.length > 1 ? (
                    <div style={{ marginTop: '1em' }}>
                      {created.node.addresses.map((address) => (
                        <a
                          key={address}
                          href=""
                          className="ui label small basic"
                          title="点击使用"
                          onClick={(event) => {
                            event.preventDefault()
                            setSshHost(address)
                            void loadSuggestPorts(address)
                          }}
                        >
                          {address}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className="comment">比如192.168.1.100，用于远程安装节点应用程序。</p>
                </FormRow>
                <FormRow title="SSH主机端口 *">
                  <input type="text" maxLength={5} style={{ width: '5em' }} value={sshPort} onChange={(event) => setSshPort(event.target.value)} />
                  {suggestPorts.length > 0 ? (
                    <p className="comment">
                      常用端口：
                      {suggestPorts.map((port) => (
                        <a
                          key={port}
                          href=""
                          className="ui label small basic"
                          style={{ marginLeft: '0.3em' }}
                          onClick={(event) => {
                            event.preventDefault()
                            setSshPort(String(port))
                          }}
                        >
                          {port}
                        </a>
                      ))}
                    </p>
                  ) : (
                    <p className="comment">常见的比如22。</p>
                  )}
                </FormRow>
                <FormRow title="SSH登录认证 *">
                  <GrantSelector clusterId={clusterId} value={installGrant} onChange={setInstallGrant} />
                </FormRow>
              </FormTable>

              {installing ? (
                <div className="ui segment">
                  <div className="blue">安装中...</div>
                </div>
              ) : null}

              <button className={`ui primary button${installing ? ' disabled' : ''}`} type="button" onClick={() => void remoteInstall()} disabled={installing}>
                {installing ? '正在安装' : '远程安装'}
              </button>
              &nbsp;&nbsp;
              <a href="" onClick={(event) => { event.preventDefault(); setStep('finish') }}>
                跳过安装
              </a>
            </div>
          ) : (
            <div>
              <div className="row">
                上传边缘节点程序到服务器并解压，然后在边缘节点安装目录下，复制<code>configs/api_node.template.yaml</code>为
                <code>configs/api_node.yaml</code>，修改文件里面的内容为以下内容：
              </div>
              <pre style={{ background: '#f7f7f7', padding: '1em', overflowX: 'auto' }}>{configContent}</pre>
              <div className="row">
                然后再使用<code>bin/edge-node start</code>命令启动节点。
              </div>
              <p>
                <a href="" onClick={(event) => { event.preventDefault(); downloadConfig() }}>
                  [下载配置文件]
                </a>
              </p>

              {data.installerFiles && data.installerFiles.length > 0 ? (
                <div>
                  <h4>边缘节点安装文件下载</h4>
                  <table className="ui table celled">
                    <thead>
                      <tr>
                        <th>文件名</th>
                        <th>操作系统</th>
                        <th>CPU架构</th>
                        <th>版本</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.installerFiles.map((file) => (
                        <tr key={file.name}>
                          <td>
                            <a href={`/clusters/cluster/downloadInstaller?name=${encodeURIComponent(file.name)}`} target="_blank" rel="noreferrer">
                              {file.name}
                            </a>
                          </td>
                          <td>{file.os}</td>
                          <td>{file.arch}</td>
                          <td>v{file.version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="ui divider" />
              <a href="" onClick={(event) => { event.preventDefault(); setStep('finish') }}>
                安装完成
              </a>
            </div>
          )}
        </div>
      ) : null}

      {step === 'finish' && created ? (
        <div>
          <div style={{ textAlign: 'center', fontSize: '1.4em', marginTop: '2.4em' }}>
            {isInstalled ? (
              <span className="green">"{created.node.name}"节点已被创建并安装成功。</span>
            ) : (
              <span className="green">"{created.node.name}"节点已创建成功。</span>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '3em' }}>
            <Link className="ui button primary" to={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${created.nodeId}`}>
              现在进入节点详情
            </Link>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1em' }}>
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setStep('info')
                setCreated(null)
                setName('')
                setIpAddresses([])
                setRoutes([])
                setGrant(null)
                setInstallGrant(null)
                setSshHost('')
                setSshPort('')
                setIsInstalled(false)
              }}
            >
              继续创建下一个节点
            </a>
          </div>
        </div>
      ) : null}

      {clustersOpened ? (
        <ClusterSelector
          primaryClusterId={clusterId}
          secondaryClusterIds={secondaryClusters.map((cluster) => cluster.id)}
          onClose={() => setClustersOpened(false)}
          onConfirm={(_primary, secondary) => {
            setSecondaryClusters(secondary)
            setClustersOpened(false)
          }}
        />
      ) : null}
    </div>
  )
}
