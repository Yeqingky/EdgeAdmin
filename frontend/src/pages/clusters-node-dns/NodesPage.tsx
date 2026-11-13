import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Settings } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { StatusLabel } from '../../components/StatusLabel'
import { MenuLinks } from './ui'
import { formatBits, formatCount, isIPv6, postForm, type NodesData } from './shared'

type OrderKey = 'cpuOrder' | 'memoryOrder' | 'trafficOutOrder' | 'connectionsOrder' | 'loadOrder'

export function NodesPage() {
  const session = useSession()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const groupId = searchParams.get('groupId') || '0'
  const regionId = searchParams.get('regionId') || '0'
  const installState = searchParams.get('installedState') || '0'
  const activeState = searchParams.get('activeState') || '0'
  const level = searchParams.get('level') || '0'
  const keyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const orderKeys: OrderKey[] = ['cpuOrder', 'memoryOrder', 'trafficOutOrder', 'connectionsOrder', 'loadOrder']
  const orders: Record<string, string> = {}
  for (const key of orderKeys) {
    const value = searchParams.get(key)
    if (value) {
      orders[key] = value
    }
  }
  const [keywordDraft, setKeywordDraft] = useState(keyword)

  const query = useQuery({
    queryKey: ['cluster-nodes', clusterId, groupId, regionId, installState, activeState, level, keyword, page, searchParams.toString()],
    queryFn: () =>
      apiGet<NodesData>('/clusters/cluster/nodes', {
        clusterId,
        groupId: groupId !== '0' ? groupId : undefined,
        regionId: regionId !== '0' ? regionId : undefined,
        installedState: installState !== '0' ? installState : undefined,
        activeState: activeState !== '0' ? activeState : undefined,
        level: level !== '0' ? level : undefined,
        keyword: keyword || undefined,
        page: page > 1 ? page : undefined,
        ...orders,
      }),
    enabled: clusterId > 0,
  })

  const updateIsOn = useMutation({
    mutationFn: (params: { nodeId: number; isOn: boolean }) => postForm('/clusters/cluster/node/updateIsOn', params),
    onSuccess: async () => {
      toast('操作成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-nodes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const deleteNode = useMutation({
    mutationFn: (nodeId: number) => postForm('/nodes/delete', { clusterId, nodeId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-nodes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const upNode = useMutation({
    mutationFn: (nodeId: number) => postForm('/clusters/cluster/node/up', { nodeId }),
    onSuccess: async () => {
      toast('执行成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-nodes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
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
  const isPlus = session.data?.teaIsPlus ?? false
  const hasFilters =
    groupId !== '0' || regionId !== '0' || installState !== '0' || activeState !== '0' || keyword !== '' || level !== '0' || Object.keys(orders).length > 0

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === '0') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    updateParams({ keyword: keywordDraft })
  }

  function toggleOrder(key: OrderKey) {
    const next = new URLSearchParams()
    next.set('clusterId', String(clusterId))
    for (const [name, value] of searchParams) {
      if (name !== 'page' && !orderKeys.includes(name as OrderKey)) {
        next.set(name, value)
      }
    }
    next.set(key, orders[key] === 'asc' ? 'desc' : 'asc')
    setSearchParams(next)
  }

  async function toggleNodeOn(nodeId: number, isOn: boolean) {
    if (!(await confirm({ message: `确定要${isOn ? '启用' : '停用'}此节点吗?` }))) {
      return
    }
    updateIsOn.mutate({ nodeId, isOn })
  }

  async function removeNode(nodeId: number) {
    if (!(await confirm({ message: '确定要从当前集群中删除这个节点吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    deleteNode.mutate(nodeId)
  }

  async function markUp(nodeId: number) {
    if (!(await confirm({ message: '确定要手动上线此节点吗?' }))) {
      return
    }
    upNode.mutate(nodeId)
  }

  function sortIcon(key: OrderKey) {
    const value = orders[key]
    if (value === 'asc') {
      return <ArrowUp size={12} />
    }
    if (value === 'desc') {
      return <ArrowDown size={12} />
    }
    return null
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有节点', to: `/clusters/cluster/nodes?clusterId=${clusterId}`, active: true },
          { name: '[创建节点]', to: `/clusters/cluster/createNode?clusterId=${clusterId}` },
          { name: '[批量创建]', to: `/clusters/cluster/createBatch?clusterId=${clusterId}` },
          { name: '远程安装', to: `/clusters/cluster/installRemote?clusterId=${clusterId}` },
          { name: '升级', to: `/clusters/cluster/upgradeRemote?clusterId=${clusterId}` },
        ]}
      />

      {data.countAll > 0 ? (
        <form className="ui form" onSubmit={submitSearch}>
          <div className="ui fields inline">
            {data.groups.length > 0 ? (
              <div className="ui field">
                <select className="ui dropdown" value={groupId} onChange={(event) => updateParams({ groupId: event.target.value })}>
                  <option value="0">[全部分组]</option>
                  {data.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {data.regions.length > 0 ? (
              <div className="ui field">
                <select className="ui dropdown" value={regionId} onChange={(event) => updateParams({ regionId: event.target.value })}>
                  <option value="0">[全部区域]</option>
                  {data.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="ui field">
              <select className="ui dropdown" value={activeState} onChange={(event) => updateParams({ activeState: event.target.value })}>
                <option value="0">[在线状态]</option>
                <option value="1">在线</option>
                <option value="2">不在线</option>
              </select>
            </div>
            <div className="ui field">
              <select className="ui dropdown" value={installState} onChange={(event) => updateParams({ installedState: event.target.value })}>
                <option value="0">[安装状态]</option>
                <option value="1">已安装</option>
                <option value="2">未安装</option>
              </select>
            </div>
            {isPlus && data.levels.length > 0 ? (
              <div className="ui field">
                <select className="ui dropdown" value={level} onChange={(event) => updateParams({ level: event.target.value })}>
                  <option value="0">[级别]</option>
                  {data.levels.map((levelInfo) => (
                    <option key={levelInfo.code} value={levelInfo.code}>
                      {levelInfo.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="ui field">
              <input type="text" placeholder="关键词" style={{ width: '10em' }} value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} />
            </div>
            <div className="ui field">
              <button className="ui button" type="submit">
                搜索
              </button>
              &nbsp;
              {hasFilters ? (
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setKeywordDraft('')
                    setSearchParams(new URLSearchParams({ clusterId: String(clusterId) }))
                  }}
                >
                  [清除条件]
                </a>
              ) : null}
            </div>
          </div>
        </form>
      ) : null}

      {data.countAll === 0 ? (
        <div className="ui message">
          <p>当前集群下还没有节点,至少添加一个节点后才能提供服务.</p>
          <Link to={`/clusters/cluster/createNode?clusterId=${clusterId}`}>[创建节点]</Link>
        </div>
      ) : null}

      {data.countAll > 0 && data.nodes.length === 0 ? <p className="comment">暂时还没有节点.</p> : null}

      {data.nodes.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>节点名称</th>
              <th>IP</th>
              <th className="width10">DNS线路</th>
              <th className="value-column center">
                CPU
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('cpuOrder') }}>{sortIcon('cpuOrder')}</a>
              </th>
              <th className="value-column center">
                内存
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('memoryOrder') }}>{sortIcon('memoryOrder')}</a>
              </th>
              <th className="value-column center">
                下行带宽
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('trafficOutOrder') }}>{sortIcon('trafficOutOrder')}</a>
              </th>
              <th className="value-column center">
                连接数
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('connectionsOrder') }}>{sortIcon('connectionsOrder')}</a>
              </th>
              <th className="value-column center">
                负载
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('loadOrder') }}>{sortIcon('loadOrder')}</a>
              </th>
              <th className="width6 center">状态</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.nodes.map((node) => (
              <tr key={node.id}>
                <td>
                  <Link to={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`}>
                    {node.name}
                    {node.level > 1 ? (
                      <sup>
                        <span className="blue"> &nbsp;L{node.level}</span>
                      </sup>
                    ) : null}
                  </Link>
                  <Link to={`/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${node.id}`} title="设置">
                    &nbsp; <Settings size={12} className="grey" />
                  </Link>
                  {node.region ? <div><span className="ui label tiny grey basic">区域:{node.region.name}</span></div> : null}
                  {node.group ? <div><span className="ui label tiny grey basic">分组:{node.group.name}</span></div> : null}
                  {node.secondaryClusters && node.secondaryClusters.length > 0 ? (
                    <div>
                      <span className="ui label tiny basic">{node.cluster.name}</span>
                      {node.secondaryClusters.map((cluster) => (
                        <span key={cluster.id} className="ui label tiny basic grey">
                          {cluster.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td>
                  {node.ipAddresses.length === 0 ? <span className="disabled">-</span> : null}
                  {node.ipAddresses.map((address) => (
                    <div key={address.id} className="ui label tiny basic" style={{ marginBottom: '0.3em' }}>
                      {isIPv6(address.ip) ? <span className="grey">[IPv6]</span> : null} {address.ip}
                      {address.name ? (
                        <span className="small">
                          ({address.name}
                          {!address.canAccess ? ',不公开访问' : ''})
                        </span>
                      ) : null}
                      {!address.name && !address.canAccess ? <span className="small">(不公开访问)</span> : null}
                      {address.isOn === false ? <span className="small red">[off]</span> : null}
                      {address.isUp === false ? <span className="small red">[down]</span> : null}
                      {address.clusters && address.clusters.length > 0 ? (
                        <div style={{ marginTop: '0.3em', fontWeight: 'normal' }}>
                          <span className="small grey">[{address.clusters.map((cluster) => cluster.name).join(',')}]</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </td>
                <td>
                  {node.dnsRouteNames.length > 0 ? (
                    <div>
                      {node.dnsRouteNames.map((routeName) => (
                        <div key={routeName}>
                          <span className="ui label tiny basic">{routeName}</span>
                        </div>
                      ))}
                      <Link className="small" to={`/clusters/cluster/node/updateDNSPopup?clusterId=${clusterId}&nodeId=${node.id}`}>
                        [修改]
                      </Link>
                    </div>
                  ) : data.hasClusterDNS ? (
                    <Link className="small" to={`/clusters/cluster/node/updateDNSPopup?clusterId=${clusterId}&nodeId=${node.id}`}>
                      [设置]
                    </Link>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive ? <span className={node.status.cpuUsage > 0.5 ? 'red' : undefined}>{node.status.cpuUsageText}</span> : <span className="disabled">-</span>}
                </td>
                <td className="center">
                  {node.status.isActive ? <span className={node.status.memUsage > 0.8 ? 'red' : undefined}>{node.status.memUsageText}</span> : <span className="disabled">-</span>}
                </td>
                <td className="center">
                  {node.status.isActive && (node.status.trafficOutBytes || 0) > 0 ? (
                    formatBits(((node.status.trafficOutBytes || 0) * 8) / 60, 2)
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive && (node.status.countConnections || 0) > 0 ? (
                    formatCount(node.status.countConnections || 0)
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive ? node.status.load1m : <span className="disabled">-</span>}
                </td>
                <td className="center">
                  {!node.isUp ? (
                    <div>
                      <span className="red">健康问题下线</span>
                      <div>
                        <a href="" onClick={(event) => { event.preventDefault(); void markUp(node.id) }}>
                          [上线]
                        </a>
                      </div>
                    </div>
                  ) : !node.isOn ? (
                    <StatusLabel isOn={node.isOn} />
                  ) : node.isInstalled ? (
                    node.status.isActive ? (
                      node.isSynced ? <span className="green">运行中</span> : <span className="red">同步中</span>
                    ) : node.status.updatedAt > 0 ? (
                      <span className="red">已断开</span>
                    ) : (
                      <span className="red">未连接</span>
                    )
                  ) : (
                    <span>
                      {node.installStatus.isRunning ? <span className="red">安装中</span> : null}
                      {node.installStatus.isFinished && !node.installStatus.isOk ? (
                        <Link to={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`} title="点击看安装错误">
                          <span className="red">安装出错</span>
                        </Link>
                      ) : null}
                      {!node.installStatus.isRunning && !(node.installStatus.isFinished && !node.installStatus.isOk) ? (
                        <Link to={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`} title="点击进安装界面">
                          <span className="red">未安装</span>
                        </Link>
                      ) : null}
                    </span>
                  )}
                </td>
                <td>
                  <Link to={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`}>详情</Link> &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); void toggleNodeOn(node.id, !node.isOn) }}>
                    {node.isOn ? '停用' : <span className="red">启用</span>}
                  </a>{' '}
                  &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); void removeNode(node.id) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />
    </div>
  )
}
