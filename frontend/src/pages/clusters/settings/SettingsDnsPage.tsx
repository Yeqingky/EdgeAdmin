import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, apiPostMulti, parseId } from '../shared'

interface DnsSettingsData {
  hasDomains: boolean
  domainId: number
  domainName: string
  dnsName: string
  nodesAutoSync: boolean
  serversAutoSync: boolean
  domainProvider: { id: number; name: string }
  cnameRecords: string[]
  ttl: number
  cnameAsDomain: boolean
  includingLnNodes: boolean
}

export function ClusterSettingsDnsPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const queryClient = useQueryClient()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-dns', clusterId],
    queryFn: () => apiGet<DnsSettingsData>('/clusters/cluster/settings/dns', { clusterId }),
    enabled: clusterId > 0,
  })
  const domainsQuery = useQuery({
    queryKey: ['domain-options'],
    queryFn: () => apiPost<{ domains: { id: number; name: string }[] }>('/dns/domainOptions', {}),
  })

  const [domainId, setDomainId] = useState(0)
  const [dnsName, setDnsName] = useState('')
  const [nodesAutoSync, setNodesAutoSync] = useState(false)
  const [serversAutoSync, setServersAutoSync] = useState(false)
  const [cnameRecords, setCnameRecords] = useState<string[]>([])
  const [ttl, setTtl] = useState('0')
  const [cnameAsDomain, setCnameAsDomain] = useState(false)
  const [includingLnNodes, setIncludingLnNodes] = useState(false)
  const [confirmResetDomain, setConfirmResetDomain] = useState(false)
  const [newRecord, setNewRecord] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setDomainId(query.data.domainId)
      setDnsName(query.data.dnsName)
      setNodesAutoSync(query.data.nodesAutoSync)
      setServersAutoSync(query.data.serversAutoSync)
      setCnameRecords(query.data.cnameRecords || [])
      setTtl(String(query.data.ttl || 0))
      setCnameAsDomain(query.data.cnameAsDomain)
      setIncludingLnNodes(query.data.includingLnNodes)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const domainName = domainsQuery.data?.domains.find((domain) => domain.id === domainId)?.name || ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const csrfToken = await getCsrfToken()
      await apiPostMulti('/clusters/cluster/settings/dns', {
        clusterId: [clusterId],
        dnsDomainId: [domainId],
        dnsName: [dnsName],
        nodesAutoSync: [nodesAutoSync ? '1' : ''],
        serversAutoSync: [serversAutoSync ? '1' : ''],
        cnameRecords,
        ttl: [ttl],
        cnameAsDomain: [cnameAsDomain ? '1' : ''],
        includingLnNodes: [includingLnNodes ? '1' : ''],
        confirmResetDomain: [confirmResetDomain ? '1' : ''],
        csrfToken: [csrfToken],
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-settings-dns', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function randomName() {
    try {
      const resp = await apiPost<{ name: string }>('/clusters/cluster/settings/dns/randomName', {})
      setDnsName(resp.name)
    } catch (error) {
      toast(error instanceof Error ? error.message : '生成失败', 'error')
    }
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/dns">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="选择主域名 *">
            {data.hasDomains ? (
              <>
                <Select value={domainId} onChange={(event) => setDomainId(Number(event.target.value))}>
                  <option value="0">[不使用主域名]</option>
                  {domainsQuery.data?.domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </Select>
                <p className="comment">用于生成集群节点和网站的CNAME和DNS解析记录，修改后将自动删除旧域名中的相关记录。</p>
              </>
            ) : (
              <span>
                没有可用的域名，请在 <a href="/dns/providers">[域名解析]</a> 中添加。
              </span>
            )}
          </FormRow>
          {data.domainId > 0 && domainId === 0 ? (
            <FormRow title="不使用主域名">
              <Checkbox label="" checked={confirmResetDomain} onChange={setConfirmResetDomain} />
              <p className="comment">选中后，表示确认当前集群不使用主域名；否则必须选择一个主域名。</p>
            </FormRow>
          ) : null}
          <FormRow title="DNS子域名 *">
            <div className="ui input right labeled">
              <TextInput type="text" maxLength={64} style={{ width: '12em' }} value={dnsName} onChange={(event) => setDnsName(event.target.value)} />
              <span className="ui label">{domainName ? `.${domainName}` : '.主域名'}</span>
            </div>
            <p className="comment">
              当前集群的子域名，和主域名一起组成集群节点的子域名，修改后将自动删除旧域名中的相关记录。
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  void randomName()
                }}
              >
                [随机生成]
              </a>
              。
            </p>
          </FormRow>
          <FormRow title="自动设置CNAME记录">
            <div>
              {cnameRecords.map((record, index) => (
                <span key={`${record}-${index}`} className="ui label basic small" style={{ marginBottom: '0.4em' }}>
                  {record}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setCnameRecords(cnameRecords.filter((_, itemIndex) => itemIndex !== index))
                    }}
                  >
                    <X size={12} />
                  </a>
                </span>
              ))}
            </div>
            <div className="ui action input" style={{ marginTop: '0.5em' }}>
              <input
                type="text"
                placeholder="记录名"
                value={newRecord}
                onChange={(event) => setNewRecord(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (newRecord.trim()) {
                      setCnameRecords([...cnameRecords, newRecord.trim()])
                      setNewRecord('')
                    }
                  }
                }}
              />
              <button
                type="button"
                className="ui button"
                onClick={() => {
                  if (newRecord.trim()) {
                    setCnameRecords([...cnameRecords, newRecord.trim()])
                    setNewRecord('')
                  }
                }}
              >
                <Plus size={13} /> 添加
              </button>
            </div>
            <p className="comment">除集群已创建的网站之外，自动解析到集群的CNAME记录，比如 www。</p>
          </FormRow>
          <FormRow title="允许通过CNAME访问网站">
            <Checkbox label="" checked={cnameAsDomain} onChange={setCnameAsDomain} />
            <p className="comment">选中后，表示允许使用CNAME直接访问网站；如果取消选中，则表示CNAME只作为DNS解析记录使用。</p>
          </FormRow>
          <FormRow title="包含Ln节点">
            <Checkbox label="" checked={includingLnNodes} onChange={setIncludingLnNodes} />
            <p className="comment">选中后，表示域名解析中包含L2及以上级别节点。</p>
          </FormRow>
          <FormRow title="解析记录TTL">
            <div className="ui input right labeled">
              <TextInput type="text" maxLength={6} style={{ width: '6em' }} value={ttl} onChange={(event) => setTtl(event.target.value)} />
              <span className="ui label">秒</span>
            </div>
            <p className="comment">每个DNS服务商或者账号的TTL限制各有不同，0表示使用默认。</p>
          </FormRow>
          <FormRow title="同步节点DNS状态">
            <Checkbox label="" checked={nodesAutoSync} onChange={setNodesAutoSync} />
          </FormRow>
          <FormRow title="同步网站DNS状态">
            <Checkbox label="" checked={serversAutoSync} onChange={setServersAutoSync} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}

interface DnsRecordNode {
  id: number
  name: string
  ipAddr: string
  ipAddrId: number
  route: { name: string; code: string }
  clusterId: number
  isResolved: boolean
  isInstalled: boolean
  isBackup: boolean
  isOffline: boolean
}

interface DnsRecordServer {
  id: number
  name: string
  dnsName: string
  isResolved: boolean
}

interface DnsTask {
  id: number
  type: string
  isDone: boolean
  isOk: boolean
  error: string
  updatedTime: string
  cluster: { id: number; name: string } | null
  node: { id: number; name: string } | null
  server: { id: number; name: string } | null
  domain: { id: number; name: string } | null
}

interface DnsIssue {
  target: string
  targetId: number
  type: string
  description: string
  params: Record<string, string>
}

interface DnsRecordsData {
  cluster: { id: number; name: string }
  dnsInfo: {
    dnsName: string
    domainId: number
    domainName: string
    providerId: number
    providerName: string
    providerTypeName: string
    cnameRecords: string[]
  }
  nodes: DnsRecordNode[]
  servers: DnsRecordServer[]
  dnsHasChanges: boolean
  issues: DnsIssue[]
  tasks: DnsTask[]
}

export function ClusterSettingsDnsRecordsPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-dns-records', clusterId],
    queryFn: () => apiGet<DnsRecordsData>('/clusters/cluster/settings/dns/records', { clusterId }),
    enabled: clusterId > 0,
  })
  const [isSyncing, setIsSyncing] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function syncCluster() {
    if (!(await confirm({ message: '确定要执行数据同步吗？' }))) {
      return
    }
    setIsSyncing(true)
    try {
      await apiPost('/dns/clusters/sync', { clusterId })
      toast('同步成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-settings-dns-records', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  async function deleteTask(taskId: number) {
    if (!(await confirm({ message: '确定要删除这个任务吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/dns/tasks/delete', { taskId })
      await queryClient.invalidateQueries({ queryKey: ['cluster-settings-dns-records', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const taskTypeLabel = (type: string) => {
    if (type === 'clusterChange' || type === 'clusterNodesChange') return '集群'
    if (type === 'nodeChange') return '节点'
    if (type === 'serverChange') return '网站'
    if (type === 'domainChange') return '域名'
    return type
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/dns">
      <div className="ui menu text blue first-menu">
        <a className="item" href={`/clusters/cluster/settings/dns?clusterId=${clusterId}`}>
          DNS设置
        </a>
        <a className="item active" href={`/clusters/cluster/settings/dns/records?clusterId=${clusterId}`}>
          解析记录
        </a>
      </div>

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">DNS子域名</td>
            <td>
              {data.dnsInfo.domainName ? (
                <span>
                  <var>{data.dnsInfo.dnsName}</var>.{data.dnsInfo.domainName}
                </span>
              ) : (
                <span className="disabled">没有设置</span>
              )}
            </td>
          </tr>
          <tr>
            <td>DNS服务商</td>
            <td>
              {data.dnsInfo.providerName ? (
                <a href={`/dns/providers/provider?providerId=${data.dnsInfo.providerId}`}>
                  {data.dnsInfo.providerTypeName} - {data.dnsInfo.providerName}
                </a>
              ) : data.dnsInfo.domainName ? (
                <span className="disabled">没有设置</span>
              ) : (
                <span className="disabled">请先设置域名</span>
              )}
            </td>
          </tr>
          <tr>
            <td>自动设置CNAME记录</td>
            <td>
              {data.dnsInfo.cnameRecords.length === 0 ? (
                <span className="disabled">暂时还没有设置。</span>
              ) : (
                data.dnsInfo.cnameRecords.map((record) => (
                  <span key={record} className="ui label basic small">
                    {record}
                  </span>
                ))
              )}
            </td>
          </tr>
          {data.dnsInfo.domainName ? (
            <tr>
              <td>操作</td>
              <td>
                {isSyncing ? (
                  <span>DNS服务商同步中...</span>
                ) : (
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void syncCluster()
                    }}
                  >
                    {data.dnsHasChanges ? <span className="red">检测到解析记录有变化，需要同步</span> : 'DNS服务商同步'}
                  </a>
                )}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {data.tasks.length > 0 ? (
        <div>
          <h3>正在执行的任务</h3>
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th>对象</th>
                <th>任务</th>
                <th>状态</th>
                <th>触发时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    {(task.type === 'clusterChange' || task.type === 'clusterNodesChange') && task.cluster ? task.cluster.name : null}
                    {task.type === 'nodeChange' && task.node ? task.node.name : null}
                    {task.type === 'serverChange' && task.server ? task.server.name : null}
                    {task.type === 'domainChange' && task.domain ? task.domain.name : null}
                  </td>
                  <td>{taskTypeLabel(task.type)}</td>
                  <td style={{ wordBreak: 'break-word', width: '26em' }}>
                    {task.isDone ? <span className="red">{task.error}</span> : <span>正在同步...</span>}
                  </td>
                  <td>{task.updatedTime}</td>
                  <td>
                    <a
                      href=""
                      title="删除"
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteTask(task.id)
                      }}
                    >
                      <X size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data.issues.length > 0 ? (
        <div>
          <h3>需要修复的问题</h3>
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>问题对象</th>
                <th>问题描述</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.issues.map((issue) => (
                <tr key={`${issue.type}-${issue.targetId}`}>
                  <td>
                    {issue.type === 'cluster' ? (
                      <div>
                        集群 "{issue.target}" <a href={`/clusters/cluster?clusterId=${issue.targetId}`}>查看</a>
                      </div>
                    ) : null}
                    {issue.type === 'node' ? (
                      <div>
                        集群 "{issue.params.clusterName}" 节点 "{issue.target}"{' '}
                        <a href={`/clusters/cluster/node?clusterId=${issue.params.clusterId}&nodeId=${issue.targetId}`}>查看</a>
                      </div>
                    ) : null}
                  </td>
                  <td>{issue.description}</td>
                  <td>
                    {issue.type === 'cluster' ? (
                      <a href={`/dns/updateClusterPopup?clusterId=${issue.targetId}`} className="red">
                        修复
                      </a>
                    ) : null}
                    {issue.type === 'node' ? (
                      <a href={`/dns/issues/updateNodePopup?clusterId=${issue.params.clusterId}&nodeId=${issue.targetId}&ipAddrId=0`} className="red">
                        修复
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="comment">下面的DNS解析记录也可以手工在DNS服务商提供的管理平台添加。</p>

      <h3>节点DNS解析记录 &nbsp; ({data.nodes.length}个)</h3>
      {data.nodes.length === 0 ? <p className="comment">暂时没有需要设置的DNS记录。</p> : null}
      {data.nodes.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>节点</th>
              <th>子域名</th>
              <th>记录类型</th>
              <th>记录值</th>
              <th>线路</th>
              <th>状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.nodes.map((node) => (
              <tr key={`${node.id}-${node.ipAddrId}-${node.route.code}`}>
                <td>
                  <a href={`/clusters/cluster/node?clusterId=${node.clusterId}&nodeId=${node.id}`}>{node.name}</a>
                </td>
                <td>
                  {data.dnsInfo.dnsName ? (
                    data.dnsInfo.dnsName
                  ) : (
                    <a href={`/clusters/cluster/settings/dns?clusterId=${data.cluster.id}`} className="red">
                      没有设置
                    </a>
                  )}
                </td>
                <td>{node.ipAddr.indexOf(':') > -1 ? 'AAAA' : 'A'}</td>
                <td>
                  {node.ipAddr ? (
                    node.ipAddr
                  ) : (
                    <a
                      href={`/dns/issues/updateNodePopup?clusterId=${node.clusterId}&nodeId=${node.id}&ipAddrId=${node.ipAddrId}`}
                      className="red"
                    >
                      没有设置
                    </a>
                  )}
                </td>
                <td>
                  {node.route.code ? (
                    node.route.name
                  ) : (
                    <a
                      href={`/dns/issues/updateNodePopup?clusterId=${node.clusterId}&nodeId=${node.id}&ipAddrId=${node.ipAddrId}`}
                      className="red"
                    >
                      没有设置
                    </a>
                  )}
                </td>
                <td>
                  {node.isBackup ? (
                    <span className="red">备用节点</span>
                  ) : node.isOffline ? (
                    <span className="red">已下线</span>
                  ) : node.isInstalled ? (
                    node.isResolved ? (
                      <span className="green">已解析</span>
                    ) : (
                      <span className="red">未解析</span>
                    )
                  ) : (
                    <a href={`/clusters/cluster/node/install?clusterId=${data.cluster.id}&nodeId=${node.id}`} className="red" title="节点未安装">
                      未安装
                    </a>
                  )}
                </td>
                <td>
                  <a href={`/dns/issues/updateNodePopup?clusterId=${node.clusterId}&nodeId=${node.id}&ipAddrId=${node.ipAddrId}`}>修改</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h3>网站解析记录 &nbsp; ({data.servers.length}个)</h3>
      {data.servers.length === 0 ? <p className="comment">暂时没有需要设置的DNS记录。</p> : null}
      {data.servers.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>网站</th>
              <th>子域名</th>
              <th>记录类型</th>
              <th>记录值</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {data.servers.map((server) => (
              <tr key={server.id}>
                <td>
                  <a href={`/servers/server?serverId=${server.id}`}>{server.name}</a>
                </td>
                <td>{server.dnsName}</td>
                <td>CNAME</td>
                <td>
                  {data.dnsInfo.domainName ? (
                    <span>
                      <var>{data.dnsInfo.dnsName}</var>.{data.dnsInfo.domainName}.
                    </span>
                  ) : (
                    <a href={`/clusters/cluster/settings/dns?clusterId=${data.cluster.id}`} className="red">
                      没有设置
                    </a>
                  )}
                </td>
                <td>{server.isResolved ? <span className="green">已解析</span> : <span className="red">未解析</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ClusterSettingsLayout>
  )
}
