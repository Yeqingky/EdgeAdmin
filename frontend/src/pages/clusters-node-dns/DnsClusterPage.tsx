import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { MenuLinks, Modal } from './ui'
import { UpdateClusterDNSForm, UpdateNodeDNSForm } from './dnsForms'
import { postForm, type DNSClusterPageData, type DNSTaskItem } from './shared'

export function DnsClusterPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const [updateClusterOpened, setUpdateClusterOpened] = useState(false)
  const [updatingNode, setUpdatingNode] = useState<{ nodeId: number; ipAddrId: number } | null>(null)
  const [syncing, setSyncing] = useState(false)

  const query = useQuery({
    queryKey: ['dns-cluster', clusterId],
    queryFn: () => apiGet<DNSClusterPageData>('/dns/clusters/cluster', { clusterId }),
    enabled: clusterId > 0,
  })

  if (!clusterId) {
    return <div className="ui negative message">缺少集群参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const dnsInfo = data.dnsInfo

  async function syncCluster() {
    if (!(await confirm({ message: '确定要执行数据同步吗?' }))) {
      return
    }
    setSyncing(true)
    try {
      await postForm('/dns/clusters/sync', { clusterId })
      toast('同步成功')
      await queryClient.invalidateQueries({ queryKey: ['dns-cluster', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function deleteTask(task: DNSTaskItem) {
    if (!(await confirm({ message: '确定要删除这个任务吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postForm('/dns/tasks/delete', { taskId: task.id })
      await queryClient.invalidateQueries({ queryKey: ['dns-cluster', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  function taskTypeName(type: string): string {
    if (type === 'clusterChange' || type === 'clusterNodesChange' || type === 'clusterRemoveDomain') {
      return '集群'
    }
    if (type === 'nodeChange') {
      return '节点'
    }
    if (type === 'serverChange') {
      return '网站'
    }
    if (type === 'domainChange') {
      return '域名'
    }
    return type
  }

  function taskTarget(task: DNSTaskItem): string {
    if ((task.type === 'clusterChange' || task.type === 'clusterNodesChange') && task.cluster) {
      return task.cluster.name
    }
    if (task.type === 'nodeChange' && task.node) {
      return task.node.name
    }
    if (task.type === 'serverChange' && task.server) {
      return task.server.name
    }
    if (task.type === 'domainChange' && task.domain) {
      return task.domain.name
    }
    return '-'
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns' },
          { name: data.cluster.name, to: `/dns/clusters/cluster?clusterId=${data.cluster.id}`, active: true },
        ]}
      />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">集群</td>
            <td>
              <Link to={`/clusters/cluster?clusterId=${data.cluster.id}`}>{data.cluster.name}</Link> »
            </td>
          </tr>
          <tr>
            <td>DNS子域名</td>
            <td>
              {dnsInfo.domainName ? (
                <span>
                  <var>{dnsInfo.dnsName}</var>.{dnsInfo.domainName}
                </span>
              ) : (
                <span className="disabled">没有设置</span>
              )}
              &nbsp;{' '}
              <a href="" onClick={(event) => { event.preventDefault(); setUpdateClusterOpened(true) }}>
                [修改]
              </a>
            </td>
          </tr>
          <tr>
            <td>DNS服务商</td>
            <td>
              {dnsInfo.providerName ? (
                <span>
                  <Link to={`/dns/providers/provider?providerId=${dnsInfo.providerId}`}>
                    {dnsInfo.providerTypeName} - {dnsInfo.providerName}
                  </Link>{' '}
                  »
                </span>
              ) : dnsInfo.domainName ? (
                <span className="disabled">没有设置</span>
              ) : (
                <span className="disabled">请先设置域名</span>
              )}
            </td>
          </tr>
          <tr>
            <td>自动设置CNAME记录</td>
            <td>
              {dnsInfo.cnameRecords.length === 0 ? (
                <span className="disabled">暂时还没有设置.</span>
              ) : (
                dnsInfo.cnameRecords.map((record) => (
                  <span key={record} className="ui label basic small">
                    {record}
                  </span>
                ))
              )}
            </td>
          </tr>
          {dnsInfo.domainName ? (
            <tr>
              <td>操作</td>
              <td>
                {syncing ? (
                  <span>DNS服务商同步中...</span>
                ) : data.dnsHasChanges ? (
                  <a href="" onClick={(event) => { event.preventDefault(); void syncCluster() }}>
                    检测到解析记录有变化,需要同步
                  </a>
                ) : (
                  <a href="" onClick={(event) => { event.preventDefault(); void syncCluster() }}>
                    DNS服务商同步
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
                  <td>{taskTarget(task)}</td>
                  <td>{taskTypeName(task.type)}</td>
                  <td style={{ wordBreak: 'break-word', width: '26em' }}>
                    {task.isDone ? <span className="red">{task.error}</span> : <span>正在同步...</span>}
                  </td>
                  <td>{task.updatedTime}</td>
                  <td>
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); void deleteTask(task) }}>
                      <Trash2 size={12} className="grey" />
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
              {data.issues.map((issue, index) => {
                const params = issue.params || {}
                const issueClusterId = Number(params.clusterId || 0)
                const issueClusterName = String(params.clusterName || '')
                return (
                  <tr key={`${issue.targetId}-${issue.type}-${index}`}>
                    <td>
                      {issue.type === 'cluster' ? (
                        <div>
                          集群 "{issue.target}"{' '}
                          <Link to={`/clusters/cluster?clusterId=${issue.targetId}`} target="_blank">
                            »
                          </Link>
                        </div>
                      ) : null}
                      {issue.type === 'node' ? (
                        <div>
                          集群 "{issueClusterName}" 节点 "{issue.target}"{' '}
                          <Link to={`/clusters/cluster/node?clusterId=${issueClusterId}&nodeId=${issue.targetId}`} target="_blank">
                            »
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span>{issue.description}</span>
                    </td>
                    <td>
                      {issue.type === 'cluster' ? (
                        <a href="" onClick={(event) => { event.preventDefault(); setUpdateClusterOpened(true) }}>
                          修复
                        </a>
                      ) : null}
                      {issue.type === 'node' ? (
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            setUpdatingNode({ nodeId: issue.targetId, ipAddrId: 0 })
                          }}
                        >
                          修复
                        </a>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="margin" />
        </div>
      ) : null}

      <p className="comment">下面的DNS解析记录也可以手工在DNS服务商提供的管理平台添加.</p>

      <h3>节点DNS解析记录 &nbsp; ({data.nodes.length}个)</h3>
      {data.nodes.length === 0 ? <p className="comment">暂时没有需要设置的DNS记录.</p> : null}
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
            {data.nodes.map((node, index) => (
              <tr key={`${node.id}-${node.route.code}-${index}`}>
                <td>
                  <Link to={`/clusters/cluster/node?clusterId=${node.clusterId}&nodeId=${node.id}`}>{node.name}</Link>
                </td>
                <td>
                  {dnsInfo.dnsName ? (
                    <span>{dnsInfo.dnsName}</span>
                  ) : (
                    <a href="" onClick={(event) => { event.preventDefault(); setUpdateClusterOpened(true) }}>
                      没有设置
                    </a>
                  )}
                </td>
                <td>{node.ipAddr.includes(':') ? 'AAAA' : 'A'}</td>
                <td>
                  {node.ipAddr ? (
                    <span>{node.ipAddr}</span>
                  ) : (
                    <a href="" title="点击设置" onClick={(event) => { event.preventDefault(); setUpdatingNode({ nodeId: node.id, ipAddrId: node.ipAddrId }) }}>
                      没有设置
                    </a>
                  )}
                </td>
                <td>
                  {node.route.code ? (
                    <span>{node.route.name}</span>
                  ) : (
                    <a href="" title="点击设置" onClick={(event) => { event.preventDefault(); setUpdatingNode({ nodeId: node.id, ipAddrId: node.ipAddrId }) }}>
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
                    <Link to={`/clusters/cluster/node/install?clusterId=${data.cluster.id}&nodeId=${node.id}`} title="节点未安装">
                      <span className="red">未安装</span>
                    </Link>
                  )}
                </td>
                <td>
                  <a href="" onClick={(event) => { event.preventDefault(); setUpdatingNode({ nodeId: node.id, ipAddrId: node.ipAddrId }) }}>
                    修改
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {dnsInfo.sharedCNAME ? (
        <p className="comment">
          所有网站共用CNAME:{dnsInfo.dnsName}.{dnsInfo.domainName || '根域名'}.
        </p>
      ) : (
        <>
      <h3>网站解析记录 &nbsp; ({data.servers.length}个)</h3>
      {data.servers.length === 0 ? <p className="comment">暂时没有需要设置的DNS记录.</p> : null}
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
                  <Link to={`/servers/server?serverId=${server.id}`}>{server.name}</Link>
                </td>
                <td>{server.dnsName}</td>
                <td>CNAME</td>
                <td>
                  {dnsInfo.domainName ? (
                    <span>
                      <var>{dnsInfo.dnsName}</var>.{dnsInfo.domainName}.
                    </span>
                  ) : (
                    <a href="" title="点击设置" onClick={(event) => { event.preventDefault(); setUpdateClusterOpened(true) }}>
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
        </>
      )}

      {updateClusterOpened ? (
        <Modal title="修改集群DNS设置" onClose={() => setUpdateClusterOpened(false)}>
          <UpdateClusterDNSForm
            clusterId={clusterId}
            onSaved={() => {
              setUpdateClusterOpened(false)
              void queryClient.invalidateQueries({ queryKey: ['dns-cluster', clusterId] })
            }}
          />
        </Modal>
      ) : null}

      {updatingNode ? (
        <Modal title="修改节点DNS设置" onClose={() => setUpdatingNode(null)}>
          <UpdateNodeDNSForm
            clusterId={clusterId}
            nodeId={updatingNode.nodeId}
            ipAddrId={updatingNode.ipAddrId}
            onSaved={() => {
              setUpdatingNode(null)
              void queryClient.invalidateQueries({ queryKey: ['dns-cluster', clusterId] })
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
