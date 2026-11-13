import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Settings } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { ClustersTopMenu, formatBits, formatCount, parseId } from './shared'

interface NodeIPAddress {
  id: number
  name: string
  ip: string
  canAccess: boolean
  isUp: boolean
  isOn: boolean
  clusters: { id: number; name: string }[]
}

interface NodeStatus {
  isActive: boolean
  updatedAt: number
  hostname: string
  cpuUsage: number
  cpuUsageText: string
  memUsage: number
  memUsageText: string
  trafficInBytes: number
  trafficOutBytes: number
  load1m: string
  countConnections: number
}

interface NodeRow {
  id: number
  name: string
  isInstalled: boolean
  isOn: boolean
  isUp: boolean
  isBackup: boolean
  offlineDay: string
  installStatus: { isRunning: boolean; isFinished: boolean; isOk: boolean; error: string }
  status: NodeStatus
  cluster: { id: number; name: string }
  secondaryClusters: { id: number; name: string; isOn: boolean }[]
  isSynced: boolean
  ipAddresses: NodeIPAddress[]
  group: { id: number; name: string } | null
  region: { id: number; name: string } | null
  dnsRouteNames: string[]
  level: number
}

interface NodeGroupOption {
  id: number
  name: string
  countNodes: number
}

interface ClustersNodesData {
  clusterId: number
  groupId: number
  regionId: number
  installState: number
  activeState: number
  keyword: string
  level: number
  hasOrder: boolean
  hasClusterDNS: boolean
  countAll: number
  totalNodeClusters: number
  totalNodes: number
  page: string
  nodes: NodeRow[]
  groups: NodeGroupOption[]
  regions: { id: number; name: string }[]
  levels: { code: string; name: string }[]
}

interface ClusterOption {
  id: number
  name: string
}

interface SelectClustersData {
  clusters: ClusterOption[]
}

const orderFields = [
  { key: 'cpuOrder', label: 'CPU' },
  { key: 'memoryOrder', label: '内存' },
  { key: 'trafficOutOrder', label: '下行带宽' },
  { key: 'connectionsOrder', label: '连接数' },
  { key: 'loadOrder', label: '负载' },
]

export function ClustersNodesPage() {
  const session = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const groupId = parseId(searchParams.get('groupId'))
  const regionId = parseId(searchParams.get('regionId'))
  const installState = parseId(searchParams.get('installedState'))
  const activeState = parseId(searchParams.get('activeState'))
  const level = parseId(searchParams.get('level'))
  const keyword = searchParams.get('keyword') || ''
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [expandedIPs, setExpandedIPs] = useState<Record<number, boolean>>({})

  const orderParams: Record<string, string> = {}
  for (const field of orderFields) {
    const value = searchParams.get(field.key)
    if (value) {
      orderParams[field.key] = value
    }
  }

  const query = useQuery({
    queryKey: ['clusters-nodes', clusterId, groupId, regionId, installState, activeState, keyword, level, orderParams],
    queryFn: () =>
      apiGet<ClustersNodesData>('/clusters/nodes', {
        clusterId,
        groupId,
        regionId,
        installedState: installState,
        activeState,
        keyword,
        level,
        ...orderParams,
      }),
  })

  const clusterOptions = useQuery({
    queryKey: ['cluster-options'],
    queryFn: () => apiGet<SelectClustersData>('/clusters/selectPopup', { pageSize: 1000 }),
  })

  const groupsQuery = useQuery({
    queryKey: ['cluster-groups', clusterId],
    queryFn: () => apiGet<{ groups: NodeGroupOption[] }>('/clusters/cluster/groups', { clusterId }),
    enabled: clusterId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (clusterId > 0) next.set('clusterId', String(clusterId))
    if (groupId > 0) next.set('groupId', String(groupId))
    if (regionId > 0) next.set('regionId', String(regionId))
    if (installState > 0) next.set('installedState', String(installState))
    if (activeState > 0) next.set('activeState', String(activeState))
    if (level > 0) next.set('level', String(level))
    if (keywordInput) next.set('keyword', keywordInput)
    setSearchParams(next)
  }

  function selectParam(name: string, value: number) {
    const next = new URLSearchParams(searchParams)
    if (value > 0) {
      next.set(name, String(value))
    } else {
      next.delete(name)
    }
    setSearchParams(next)
  }

  function sortHref(key: string) {
    const next = new URLSearchParams(searchParams)
    const current = next.get(key)
    for (const field of orderFields) {
      next.delete(field.key)
    }
    next.set(key, current === 'asc' ? 'desc' : 'asc')
    return `/clusters/nodes?${next.toString()}`
  }

  const hasFilter =
    clusterId > 0 || regionId > 0 || groupId > 0 || installState > 0 || activeState > 0 || keyword.length > 0 || level > 0 || data.hasOrder

  return (
    <div>
      <ClustersTopMenu active="node" counts={{ totalNodeClusters: data.totalNodeClusters, totalNodes: data.totalNodes }} />

      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <div className="ui fields inline">
          <div className="ui field">
            <select className="ui dropdown" name="clusterId" value={clusterId} onChange={(event) => selectParam('clusterId', Number(event.target.value))}>
              <option value="0">[选择集群]</option>
              {clusterOptions.data?.clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>
          {(groupsQuery.data?.groups.length ?? 0) > 0 ? (
            <div className="ui field">
              <select className="ui dropdown" name="groupId" value={groupId} onChange={(event) => selectParam('groupId', Number(event.target.value))}>
                <option value="0">[全部分组]</option>
                {groupsQuery.data?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {data.regions.length > 0 ? (
            <div className="ui field">
              <select className="ui dropdown" name="regionId" value={regionId} onChange={(event) => selectParam('regionId', Number(event.target.value))}>
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
            <select className="ui dropdown" name="activeState" value={activeState} onChange={(event) => selectParam('activeState', Number(event.target.value))}>
              <option value="0">[在线状态]</option>
              <option value="1">在线</option>
              <option value="2">不在线</option>
            </select>
          </div>
          <div className="ui field">
            <select className="ui dropdown" name="installedState" value={installState} onChange={(event) => selectParam('installedState', Number(event.target.value))}>
              <option value="0">[安装状态]</option>
              <option value="1">已安装</option>
              <option value="2">未安装</option>
            </select>
          </div>
          {session.data?.teaIsPlus && data.levels.length > 0 ? (
            <div className="ui field">
              <select className="ui dropdown" name="level" value={level} onChange={(event) => selectParam('level', Number(event.target.value))}>
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
            <input
              type="text"
              name="keyword"
              placeholder="关键词"
              style={{ width: '10em' }}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>{' '}
            &nbsp;
            {hasFilter ? <a href="/clusters/nodes">[清除条件]</a> : null}
          </div>
        </div>
      </form>

      {data.nodes.length === 0 ? <p className="comment">暂时还没有节点。</p> : null}

      {data.nodes.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>节点名称</th>
              <th>IP</th>
              <th className="width10">DNS线路</th>
              {orderFields.map((field) => (
                <th key={field.key} className="value-column center">
                  <a href={sortHref(field.key)}>
                    {field.label}
                    {orderParams[field.key] === 'asc' ? <ArrowUp size={12} /> : null}
                    {orderParams[field.key] === 'desc' ? <ArrowDown size={12} /> : null}
                  </a>
                </th>
              ))}
              <th className="width6 center">状态</th>
              <th className="one op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.nodes.map((node) => (
              <tr key={node.id}>
                <td className="node-name-td">
                  <a href={`/clusters/cluster/node?clusterId=${node.cluster.id}&nodeId=${node.id}`}>
                    {node.name}
                    {node.level > 1 ? (
                      <sup>
                        <span className="blue"> &nbsp;L{node.level}</span>
                      </sup>
                    ) : null}
                  </a>
                  <a href={`/clusters/cluster/node/settings/schedule?clusterId=${node.cluster.id}&nodeId=${node.id}`}>
                    {node.isBackup ? (
                      <sup>
                        <span className="blue"> &nbsp;备用</span>
                      </sup>
                    ) : null}
                    {node.offlineDay ? (
                      <sup>
                        <span className="blue">
                          {' '}
                          &nbsp;到
                          {node.offlineDay.substring(0, 4)}-{node.offlineDay.substring(4, 6)}-{node.offlineDay.substring(6, 8)}
                        </span>
                      </sup>
                    ) : null}
                  </a>
                  <a href={`/clusters/cluster/node/update?clusterId=${node.cluster.id}&nodeId=${node.id}`} title="设置">
                    <Settings size={13} style={{ color: 'grey' }} />
                  </a>
                  {node.region ? (
                    <div>
                      <span className="ui label tiny basic grey">区域：{node.region.name}</span>
                    </div>
                  ) : null}
                  {node.group ? (
                    <div>
                      <span className="ui label tiny basic grey">分组：{node.group.name}</span>
                    </div>
                  ) : null}
                  {node.secondaryClusters && node.secondaryClusters.length > 0 ? (
                    <div>
                      {node.secondaryClusters.map((cluster) => (
                        <span key={cluster.id} className="ui label tiny basic">
                          {cluster.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td>
                  {node.ipAddresses.length === 0 ? (
                    <span className="disabled">-</span>
                  ) : (
                    <div className="address-box">
                      {node.ipAddresses.slice(0, expandedIPs[node.id] ? undefined : 2).map((addr) => (
                        <div key={addr.id} style={{ marginBottom: '0.3em' }}>
                          <div className="ui label tiny basic">
                            {addr.ip}
                            {addr.name ? (
                              <span className="small">
                                （{addr.name}
                                {!addr.canAccess ? '，不公开访问' : ''}）
                              </span>
                            ) : null}
                            {!addr.name && !addr.canAccess ? <span className="small">（不公开访问）</span> : null}
                          </div>
                        </div>
                      ))}
                      {node.ipAddresses.length > 2 ? (
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            setExpandedIPs((current) => ({ ...current, [node.id]: !current[node.id] }))
                          }}
                        >
                          <span className="small grey">{expandedIPs[node.id] ? '...收起' : '更多IP...'}</span>
                        </a>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="routes-box">
                  {node.dnsRouteNames.length > 0 ? (
                    <div>
                      {node.dnsRouteNames.map((routeName) => (
                        <div key={routeName}>
                          <span className="ui label tiny basic">
                            {routeName}
                          </span>
                        </div>
                      ))}
                      <a href={`/clusters/cluster/node/updateDNSPopup?clusterId=${node.cluster.id}&nodeId=${node.id}`} className="small">
                        [修改]
                      </a>
                    </div>
                  ) : data.hasClusterDNS ? (
                    <a href={`/clusters/cluster/node/updateDNSPopup?clusterId=${node.cluster.id}&nodeId=${node.id}`} className="small">
                      [设置]
                    </a>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive ? (
                    <span className={node.status.cpuUsage > 0.5 ? 'red' : undefined}>{node.status.cpuUsageText}</span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive ? (
                    <span className={node.status.memUsage > 0.8 ? 'red' : undefined}>{node.status.memUsageText}</span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive && node.status.trafficOutBytes > 0 ? (
                    formatBits((node.status.trafficOutBytes * 8) / 60, 2)
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">
                  {node.status.isActive && node.status.countConnections > 0 ? (
                    formatCount(node.status.countConnections)
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td className="center">{node.status.isActive ? node.status.load1m : <span className="disabled">-</span>}</td>
                <td className="center">
                  {!node.isUp ? (
                    <div>
                      <span className="red">健康问题下线</span>
                      <div>
                        <a href="">[上线]</a>
                      </div>
                    </div>
                  ) : !node.isOn ? (
                    <span className="ui label grey basic">已禁用</span>
                  ) : node.isInstalled ? (
                    node.status.isActive ? (
                      node.isSynced ? (
                        <span className="green">运行中</span>
                      ) : (
                        <span className="red">同步中</span>
                      )
                    ) : node.status.updatedAt > 0 ? (
                      <span className="red">已断开</span>
                    ) : (
                      <span className="red">未连接</span>
                    )
                  ) : (
                    <div>
                      {node.installStatus.isRunning ? (
                        <span className="red">安装中</span>
                      ) : (
                        <a
                          className="red"
                          href={`/clusters/cluster/node/install?clusterId=${node.cluster.id}&nodeId=${node.id}`}
                          title={node.installStatus.isFinished && !node.installStatus.isOk ? '点击看安装错误' : '点击进安装界面'}
                        >
                          {node.installStatus.isFinished && !node.installStatus.isOk ? '安装出错' : '未安装'}
                        </a>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <a href={`/clusters/cluster/node?clusterId=${node.cluster.id}&nodeId=${node.id}`}>详情</a>
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
