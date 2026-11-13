import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { ClusterTabMenu, parseId, useClusterName } from './shared'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

interface LeftMenuItem {
  name: string
  url: string
  isActive?: boolean
}

function InstallLeftMenu({ items }: { items: LeftMenuItem[] }) {
  return (
    <div className="ui menu text blue vertical small">
      {items.map((item) => (
        <a key={item.url} className={`item${item.isActive ? ' active' : ''}`} href={`${item.url}`}>
          {item.name}
        </a>
      ))}
    </div>
  )
}

function InstallLayout({ items, children }: { items: LeftMenuItem[]; children: React.ReactNode }) {
  return (
    <div className="ui grid">
      <div className="four wide column">
        <InstallLeftMenu items={items} />
      </div>
      <div className="twelve wide column">{children}</div>
    </div>
  )
}

export function ClusterIndexRedirectPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  return <Navigate to={`/clusters/cluster/nodes?clusterId=${clusterId}`} replace />
}

export function ClusterDeletePage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const clusterName = useClusterName(clusterId)
  const confirm = useConfirm()
  const toast = useToast()
  const remove = useMutation({
    mutationFn: () => apiPost('/clusters/cluster/delete', { clusterId }),
    onSuccess: () => {
      toast('删除成功')
      window.location.href = '/clusters'
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  return (
    <div>
      <div className="ui menu text blue second-menu">
        <a className="item" href={`/clusters/cluster?clusterId=${clusterId}`}>
          {clusterName}
        </a>
        <span className="disabled item" style={{ padding: 0 }}>
          &raquo;
        </span>
        <span className="item active">删除</span>
      </div>
      <div className="buttons-box">
        <button
          className="ui button red"
          type="button"
          onClick={async () => {
            if (await confirm({ message: '确定要删除当前集群吗?', danger: true, confirmText: '删除' })) {
              remove.mutate()
            }
          }}
        >
          删除当前集群
        </button>
      </div>
    </div>
  )
}

interface BatchData {
  leftMenuItems: LeftMenuItem[]
}

export function ClusterCreateBatchPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const query = useQuery({
    queryKey: ['cluster-createBatch', clusterId],
    queryFn: () => apiGet<BatchData>('/clusters/cluster/createBatch', { clusterId }),
  })
  const groupsQuery = useQuery({
    queryKey: ['cluster-groups', clusterId],
    queryFn: () => apiGet<{ groups: { id: number; name: string }[] }>('/clusters/cluster/groups', { clusterId }),
  })
  const regionsQuery = useQuery({
    queryKey: ['region-options'],
    queryFn: () => apiGet<{ regions: { id: number; name: string }[] }>('/clusters/regions/selectPopup'),
  })
  const toast = useToast()
  const clusterName = useClusterName(clusterId)
  const [ipList, setIpList] = useState('')
  const [groupId, setGroupId] = useState(0)
  const [regionId, setRegionId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function submit() {
    setSubmitting(true)
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/clusters/cluster/createBatch', { clusterId, groupId, regionId, ipList, csrfToken })
      toast('创建成功')
      setIpList('')
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <ClusterTabMenu clusterId={clusterId} clusterName={clusterName} active="create" />
      <InstallLayout items={data.leftMenuItems}>
        <form
          className="ui form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <FormTable>
            <FormRow title="节点IP列表">
              <textarea name="ipList" rows={20} placeholder="IP列表,每行一个IP" value={ipList} onChange={(event) => setIpList(event.target.value)} autoFocus />
              <p className="comment">每行一个节点IP.</p>
            </FormRow>
            <FormRow title="所属分组">
              <Select value={groupId} onChange={(event) => setGroupId(Number(event.target.value))}>
                <option value="0">[不使用分组]</option>
                {groupsQuery.data?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow title="所属区域">
              <Select value={regionId} onChange={(event) => setRegionId(Number(event.target.value))}>
                <option value="0">[不使用区域]</option>
                {regionsQuery.data?.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </Select>
            </FormRow>
          </FormTable>
          <SubmitButton submitting={submitting} />
        </form>
      </InstallLayout>
    </div>
  )
}

interface InstallNodesData {
  leftMenuItems: LeftMenuItem[]
  cluster: { uniqueId: string; secret: string; endpoints: string }
}

export function ClusterInstallNodesPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const clusterName = useClusterName(clusterId)
  const query = useQuery({
    queryKey: ['cluster-installNodes', clusterId],
    queryFn: () => apiGet<InstallNodesData>('/clusters/cluster/installNodes', { clusterId }),
  })
  const configContent = useMemo(() => {
    if (!query.data) {
      return ''
    }
    return `rpc.endpoints: [ ${query.data.cluster.endpoints} ]\nclusterId: "${query.data.cluster.uniqueId}"\nsecret: "${query.data.cluster.secret}"\n`
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  function download() {
    const blob = new Blob([configContent], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'api_cluster.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <ClusterTabMenu clusterId={clusterId} clusterName={clusterName} active="install" />
      <InstallLayout items={query.data.leftMenuItems}>
        <p>
          在官网下载节点安装包,然后通过修改节点安装包中的 <span className="ui label tiny">configs/api_cluster.yaml</span>
          (如果此配置文件尚未创建,你需要先创建)为以下内容,启动后会自动注册节点.
        </p>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">配置文件</td>
              <td>
                api_cluster.yaml &nbsp;{' '}
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    download()
                  }}
                >
                  [下载]
                </a>
              </td>
            </tr>
            <tr>
              <td className="title">配置内容</td>
              <td>
                <pre className="pre-box">{configContent}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </InstallLayout>
    </div>
  )
}

interface NotInstalledNode {
  id: number
  isOn: boolean
  name: string
  addresses: { id: number; ip: string; canAccess: boolean }[]
  login: { type: string } | null
  loginParams: { host?: string; port?: number }
  installStatus: { isRunning: boolean; isFinished: boolean; isOk?: boolean; error?: string }
}

interface InstallListData {
  leftMenuItems: LeftMenuItem[]
  nodes: NotInstalledNode[]
}

export function ClusterInstallManualPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const clusterName = useClusterName(clusterId)
  const query = useQuery({
    queryKey: ['cluster-installManual', clusterId],
    queryFn: () => apiGet<InstallListData>('/clusters/cluster/installManual', { clusterId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  return (
    <div>
      <ClusterTabMenu clusterId={clusterId} clusterName={clusterName} active="install" />
      <InstallLayout items={data.leftMenuItems}>
        {data.nodes.length === 0 ? <p className="comment">暂时没有需要远程安装的节点.</p> : null}
        {data.nodes.length > 0 ? (
          <div>
            <h3>所有未安装节点</h3>
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th>节点名</th>
                  <th>访问IP</th>
                  <th>SSH地址</th>
                  <th className="four wide">节点状态</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.nodes.map((node) => (
                  <tr key={node.id}>
                    <td>
                      <a href={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`}>{node.name}</a>
                    </td>
                    <td>
                      {node.addresses
                        .filter((addr) => addr.canAccess)
                        .map((addr) => (
                          <span key={addr.id} className="ui label tiny">
                            {addr.ip}
                          </span>
                        ))}
                    </td>
                    <td>
                      {node.login?.type === 'ssh' && node.loginParams.host ? (
                        <span>
                          {node.loginParams.host}:{node.loginParams.port}
                        </span>
                      ) : (
                        <span className="disabled">没有设置</span>
                      )}
                    </td>
                    <td>
                      <span className="disabled">等待安装</span>
                    </td>
                    <td>
                      <a href={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`}>手动安装</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </InstallLayout>
    </div>
  )
}

interface InstallStatus {
  isRunning: boolean
  isFinished: boolean
  isOk: boolean
  error: string
  errorCode: string
}

export function ClusterInstallRemotePage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const clusterName = useClusterName(clusterId)
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cluster-installRemote', clusterId],
    queryFn: () => apiGet<InstallListData>('/clusters/cluster/installRemote', { clusterId }),
  })
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [installing, setInstalling] = useState<Record<number, boolean>>({})
  const [statuses, setStatuses] = useState<Record<number, InstallStatus>>({})

  useEffect(() => {
    if (!query.data) {
      return
    }
    const initial: Record<number, InstallStatus> = {}
    for (const node of query.data.nodes) {
      if (node.installStatus) {
        initial[node.id] = {
          isRunning: node.installStatus.isRunning,
          isFinished: node.installStatus.isFinished,
          isOk: node.installStatus.isOk ?? false,
          error: node.installStatus.error ?? '',
          errorCode: '',
        }
      }
    }
    setStatuses(initial)
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const checkedIds = Object.keys(checked).filter((key) => checked[Number(key)])

  async function refreshStatus(nodeId: number) {
    const resp = await apiPost<{ status: InstallStatus | null }>('/clusters/cluster/installStatus', { nodeId })
    if (resp.status) {
      setStatuses((current) => ({ ...current, [nodeId]: resp.status! }))
    }
    return resp.status
  }

  async function installNode(nodeId: number) {
    setInstalling((current) => ({ ...current, [nodeId]: true }))
    try {
      await apiPost('/clusters/cluster/installRemote', { nodeId })
      for (let i = 0; i < 120; i++) {
        const status = await refreshStatus(nodeId)
        if (status && !status.isRunning) {
          break
        }
        await delay(1000)
      }
      await queryClient.invalidateQueries({ queryKey: ['cluster-installRemote'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '安装失败', 'error')
    } finally {
      setInstalling((current) => ({ ...current, [nodeId]: false }))
    }
  }

  return (
    <div>
      <ClusterTabMenu clusterId={clusterId} clusterName={clusterName} active="install" />
      <InstallLayout items={data.leftMenuItems}>
        {data.nodes.length === 0 ? <p className="comment">暂时没有需要远程安装的节点.</p> : null}
        {data.nodes.length > 0 ? (
          <div>
            <h3>
              所有未安装节点{' '}
              {checkedIds.length > 0 ? (
                <button
                  className="ui button primary tiny"
                  onClick={() => {
                    for (const id of checkedIds) {
                      void installNode(Number(id))
                    }
                  }}
                >
                  批量安装({checkedIds.length})
                </button>
              ) : null}
            </h3>
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th style={{ width: '3em' }}>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={checkedIds.length === data.nodes.length && data.nodes.length > 0}
                        onChange={(event) => {
                          const next: Record<number, boolean> = {}
                          for (const node of data.nodes) {
                            next[node.id] = event.target.checked
                          }
                          setChecked(next)
                        }}
                      />
                      <label />
                    </div>
                  </th>
                  <th>节点名</th>
                  <th>访问IP</th>
                  <th>SSH地址</th>
                  <th className="four wide">节点状态</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.nodes.map((node) => {
                  const status = statuses[node.id]
                  return (
                    <tr key={node.id}>
                      <td>
                        {!status || !status.isOk ? (
                          <div className="ui checkbox">
                            <input
                              type="checkbox"
                              checked={!!checked[node.id]}
                              onChange={(event) => setChecked((current) => ({ ...current, [node.id]: event.target.checked }))}
                            />
                            <label />
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <a href={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`}>{node.name}</a>
                      </td>
                      <td>
                        {node.addresses
                          .filter((addr) => addr.canAccess)
                          .map((addr) => (
                            <span key={addr.id} className="ui label tiny basic">
                              {addr.ip}
                            </span>
                          ))}
                      </td>
                      <td>
                        {node.login?.type === 'ssh' && node.loginParams.host ? (
                          <span>
                            {node.loginParams.host}:{node.loginParams.port}
                          </span>
                        ) : (
                          <span className="disabled">没有设置</span>
                        )}
                      </td>
                      <td>
                        {status && (status.isRunning || status.isFinished) ? (
                          <div>
                            {status.isRunning ? <div className="blue">安装中...</div> : null}
                            {status.isFinished ? (
                              <div>
                                {status.isOk ? <span className="green">已安装成功</span> : <span className="red">安装过程中发生错误:{status.error}</span>}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="disabled">等待安装</span>
                        )}
                      </td>
                      <td>
                        {!installing[node.id] ? (
                          <a
                            href=""
                            onClick={(event) => {
                              event.preventDefault()
                              void installNode(node.id)
                            }}
                          >
                            安装
                          </a>
                        ) : (
                          <span className="disabled">安装中...</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="comment">
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  void queryClient.invalidateQueries({ queryKey: ['cluster-installRemote'] })
                }}
              >
                <RefreshCw size={13} /> [刷新]
              </a>
            </p>
          </div>
        ) : null}
      </InstallLayout>
    </div>
  )
}

interface UpdateNodeSSHData {
  node: { id: number; name: string }
  clusterId: number
  loginId: number
  params: { host: string; port: number | string; grantId: number }
  grant: { id: number; name: string; method: string; methodName: string } | null
}

export function ClusterUpdateNodeSSHPage() {
  const [searchParams] = useSearchParams()
  const nodeId = parseId(searchParams.get('nodeId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-updateNodeSSH', nodeId],
    queryFn: () => apiGet<UpdateNodeSSHData>('/clusters/cluster/updateNodeSSH', { nodeId }),
    enabled: nodeId > 0,
  })
  const grantsQuery = useQuery({
    queryKey: ['grant-options'],
    queryFn: () => apiGet<{ grants: { id: number; name: string; username: string }[] }>('/clusters/grants/selectPopup'),
  })
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [grantId, setGrantId] = useState(0)
  const [suggestPorts, setSuggestPorts] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const clusterId = parseId(searchParams.get('clusterId')) || query.data?.clusterId || 0
  const clusterName = useClusterName(clusterId)

  useEffect(() => {
    if (query.data) {
      setHost(query.data.params.host || '')
      setPort(String(query.data.params.port || ''))
      setGrantId(query.data.params.grantId || 0)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function loadSuggestPorts(value: string) {
    if (!value) {
      setSuggestPorts([])
      return
    }
    try {
      const resp = await apiPost<{ ports: number[]; availablePorts: number[] }>('/clusters/cluster/suggestLoginPorts', { host: value })
      setSuggestPorts((resp.availablePorts || []).slice(0, 6))
      if (!port && resp.ports && resp.ports.length > 0) {
        setPort(String(resp.ports[0]))
      }
    } catch {
      setSuggestPorts([])
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      await apiPost('/clusters/cluster/updateNodeSSH', {
        nodeId: query.data!.node.id,
        loginId: query.data!.loginId,
        sshHost: host,
        sshPort: port,
        grantId,
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <ClusterTabMenu clusterId={query.data.clusterId} clusterName={clusterName} active="install" />
      <div className="margin" />
      <h3>修改节点"{query.data.node.name}"的SSH登录信息</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <FormRow title="SSH主机地址 *">
            <TextInput
              type="text"
              maxLength={64}
              value={host}
              onChange={(event) => {
                setHost(event.target.value)
                void loadSuggestPorts(event.target.value)
              }}
            />
            <p className="comment">比如192.168.1.100</p>
          </FormRow>
          <FormRow title="SSH主机端口 *">
            <TextInput type="text" maxLength={5} style={{ width: '6em' }} value={port} onChange={(event) => setPort(event.target.value)} />
            {suggestPorts.length > 0 ? (
              <div style={{ marginTop: '0.5em' }}>
                {suggestPorts.map((item) => (
                  <a
                    key={item}
                    href=""
                    className="ui label small basic"
                    onClick={(event) => {
                      event.preventDefault()
                      setPort(String(item))
                    }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            ) : null}
            <p className="comment">比如22.</p>
          </FormRow>
          <FormRow title="SSH登录认证 *">
            <Select value={grantId} onChange={(event) => setGrantId(Number(event.target.value))}>
              <option value="0">[请选择]</option>
              {grantsQuery.data?.grants.map((grant) => (
                <option key={grant.id} value={grant.id}>
                  {grant.name}
                  {grant.username ? `(${grant.username})` : ''}
                </option>
              ))}
            </Select>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
