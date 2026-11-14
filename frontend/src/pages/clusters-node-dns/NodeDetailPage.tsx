import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { NodeMenu } from './NodeMenu'
import { formatCapacity, formatDay, isIPv6, postForm, type NodeDetailData } from './shared'

export function NodeDetailPage() {
  const session = useSession()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [moreOpsVisible, setMoreOpsVisible] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)

  const query = useQuery({
    queryKey: ['node-detail', clusterId, nodeId],
    queryFn: () => apiGet<NodeDetailData>('/clusters/cluster/node/detail', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
    refetchInterval: 30000,
  })

  async function runAction(url: string, successMessage: string) {
    try {
      await postForm(url, { nodeId })
      toast(successMessage)
      await queryClient.invalidateQueries({ queryKey: ['node-detail', clusterId, nodeId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const startNode = useMutation({
    mutationFn: () => postForm('/clusters/cluster/node/start', { nodeId }),
    onSuccess: async () => {
      setStarting(false)
      toast('启动成功')
      await queryClient.invalidateQueries({ queryKey: ['node-detail', clusterId, nodeId] })
    },
    onError: (error: Error) => {
      setStarting(false)
      toast(error.message, 'error')
    },
  })

  const stopNode = useMutation({
    mutationFn: () => postForm('/clusters/cluster/node/stop', { nodeId }),
    onSuccess: async () => {
      setStopping(false)
      toast('执行成功')
      await queryClient.invalidateQueries({ queryKey: ['node-detail', clusterId, nodeId] })
    },
    onError: (error: Error) => {
      setStopping(false)
      toast(error.message, 'error')
    },
  })

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const node = data.node
  const status = node.status
  const frpsStatus = status?.frps
  const isPlus = session.data?.teaIsPlus ?? false
  const isActive = status?.isActive ?? false

  async function uninstallNode() {
    if (!(await confirm({ message: '确定要卸载当前节点吗?此操作将会删除节点上除缓存以外的相关文件.', danger: true, confirmText: '卸载' }))) {
      return
    }
    await runAction('/clusters/cluster/node/uninstall', '执行成功')
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={node} active="node" />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">节点名称</td>
            <td>{node.name}</td>
          </tr>
          <tr>
            <td>启用状态</td>
            <td>
              <StatusLabel isOn={node.isOn} />
            </td>
          </tr>
          <tr>
            <td>所属集群</td>
            <td>
              {node.cluster ? <span className="ui label tiny basic">{node.cluster.name}</span> : null}
              {(node.secondaryClusters || []).map((cluster) => (
                <span key={cluster.id} className="ui label tiny basic grey">
                  {cluster.name}
                </span>
              ))}
            </td>
          </tr>
          {node.isBackupForCluster || node.isBackupForGroup ? (
            <tr>
              <td>备用节点</td>
              <td>
                {node.isBackupForCluster ? <span className="ui label basic small">集群备用节点</span> : null}
                {node.isBackupForGroup ? <span className="ui label basic small">分组备用节点</span> : null}
                &nbsp;{' '}
                <Link to={`/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${node.id}`} style={{ fontSize: '0.8em' }}>
                  [修改]
                </Link>
              </td>
            </tr>
          ) : null}
          {node.offlineDay ? (
            <tr>
              <td>租期结束日期</td>
              <td>
                {formatDay(node.offlineDay)} &nbsp;{' '}
                <Link to={`/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${node.id}`} style={{ fontSize: '0.8em' }}>
                  [修改]
                </Link>
                {node.isOffline ? (
                  <p className="comment">
                    <span className="red">已到期</span>
                  </p>
                ) : null}
              </td>
            </tr>
          ) : null}
          <tr>
            <td>IP地址</td>
            <td>
              {node.ipAddresses.length === 0 ? <span className="disabled">暂时还没有填写IP地址.</span> : null}
              {node.ipAddresses.map((address) => (
                <div key={address.id} className="ui label small basic" style={{ marginBottom: '0.3em' }}>
                  {isIPv6(address.ip) ? <span className="grey">[IPv6]</span> : null} {address.ip}
                  {address.originIP && address.originIP.length > 0 && address.originIP !== address.ip ? (
                    <span className="small red">(原:{address.originIP})</span>
                  ) : null}
                  {address.name ? (
                    <span className="small grey">
                      (备注:{address.name}
                      {!address.canAccess ? ',不公开访问' : ''})
                    </span>
                  ) : null}
                  {!address.name && !address.canAccess ? <span className="small grey">(不公开访问)</span> : null}
                  {address.isOn === false ? <span className="small red">[off]</span> : null}
                  {address.isUp === false ? <span className="small red">[down]</span> : null}
                  {address.thresholds && address.thresholds.length > 0 ? <span className="small">[阈值]</span> : null}
                  {address.clusters && address.clusters.length > 0 ? (
                    <span>
                      &nbsp; <span className="small grey">专属集群:[</span>
                      <span className="small grey">{address.clusters.map((cluster) => cluster.name).join(',')}</span>
                      <span className="small grey">]</span>
                    </span>
                  ) : null}
                </div>
              ))}
            </td>
          </tr>
          {node.routes && node.routes.length > 0 ? (
            <tr>
              <td>DNS线路</td>
              <td>
                {node.routes.map((route) => (
                  <span key={`${route.domainName}-${route.code}`} className="ui label tiny basic">
                    {route.name} <span className="grey small">({route.domainName})</span>
                  </span>
                ))}
              </td>
            </tr>
          ) : null}
          {node.records && node.records.length > 0 ? (
            <tr>
              <td>DNS记录</td>
              <td>
                <div style={{ opacity: data.dnsIsExcludingLnNode ? 0.5 : 1 }}>
                  <table className="ui table celled">
                    <thead>
                      <tr>
                        <th>集群</th>
                        <th>记录名</th>
                        <th>记录类型</th>
                        <th>线路</th>
                        <th>记录值</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {node.records.map((record, index) => (
                        <tr key={`${record.name}-${record.value}-${index}`}>
                          <td>{record.clusterName}</td>
                          <td>{record.name}</td>
                          <td>{record.type}</td>
                          <td>{record.route ? <span>{record.route}</span> : <span className="disabled">默认</span>}</td>
                          <td>{record.value}</td>
                          <td>
                            {record.isBackup ? (
                              <span className="red">备用节点</span>
                            ) : record.isOffline ? (
                              <span className="red">已下线</span>
                            ) : (
                              '正常'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.dnsIsExcludingLnNode ? (
                    <p className="comment">通过设置A记录可以将集群上的服务请求转发到不同线路的节点上.</p>
                  ) : null}
                </div>
                {data.dnsIsExcludingLnNode ? (
                  <p className="comment">
                    <span className="red">
                      当前集群DNS已设置不解析Ln节点,所以当前节点不会加入DNS解析;如需加入,请修改"集群设置" -- "DNS设置" -- "更多选项" -- "包含Ln节点".
                    </span>
                  </p>
                ) : null}
                {!node.isInstalled ? (
                  <p className="comment">
                    <span className="red">
                      当前节点尚未完成安装,DNS解析记录将不会生效,
                      <Link to={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`}>[点此安装]</Link>.
                    </span>
                  </p>
                ) : null}
              </td>
            </tr>
          ) : null}
          <tr>
            <td>所属区域</td>
            <td>{node.region ? <span className="ui label small basic">{node.region.name}</span> : <span className="disabled">没有设置区域.</span>}</td>
          </tr>
          <tr>
            <td>所属分组</td>
            <td>{node.group ? <span className="ui label small basic">{node.group.name}</span> : <span className="disabled">没有设置分组.</span>}</td>
          </tr>
          {isPlus ? (
            <tr>
              <td>级别</td>
              <td>
                <span className={node.levelInfo && node.levelInfo.code > 1 ? 'blue' : undefined}>{node.levelInfo ? node.levelInfo.name : '-'}</span>
                {node.level > 1 && node.lnAddrs && node.lnAddrs.length > 0 ? (
                  <span>
                    &nbsp; &nbsp;
                    {node.lnAddrs.map((addr) => (
                      <span key={addr} className="ui label tiny basic">
                        {addr}
                      </span>
                    ))}
                  </span>
                ) : null}
                {node.level > 1 && node.lnAddrs && node.lnAddrs.length > 0 ? (
                  <p className="comment">指定了Ln节点访问地址.</p>
                ) : null}
              </td>
            </tr>
          ) : null}
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
        </tbody>
        {moreOptionsVisible ? (
          <tbody>
            <tr>
              <td>同步IP名单</td>
              <td>{node.enableIPLists ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
            </tr>
            <tr>
              <td>SSH主机地址</td>
              <td>{node.login?.params?.host ? node.login.params.host : <span className="disabled">尚未设置</span>}</td>
            </tr>
            <tr>
              <td>SSH主机端口</td>
              <td>
                {node.login?.params?.port && Number(node.login.params.port) > 0 ? (
                  node.login.params.port
                ) : (
                  <span className="disabled">尚未设置</span>
                )}
              </td>
            </tr>
            <tr>
              <td>SSH登录认证</td>
              <td>
                {node.login?.grant && node.login.grant.id > 0 ? (
                  <Link to={`/clusters/grants/grant?grantId=${node.login.grant.id}`}>
                    {node.login.grant.name}
                    <span className="small grey">({node.login.grant.methodName})</span>
                    {node.login.grant.username ? <span className="small grey">({node.login.grant.username})</span> : null}
                  </Link>
                ) : (
                  <span className="disabled">尚未设置</span>
                )}
              </td>
            </tr>
            <tr>
              <td>缓存硬盘容量</td>
              <td>
                {!node.maxCacheDiskCapacity || node.maxCacheDiskCapacity.count <= 0 ? (
                  <span className="disabled">没有限制</span>
                ) : (
                  formatCapacity(node.maxCacheDiskCapacity)
                )}
              </td>
            </tr>
            <tr>
              <td>硬盘预估写入最大速度</td>
              <td>
                {status && status.diskWritingSpeedMB && status.diskWritingSpeedMB > 0 ? (
                  <span>
                    &gt; {status.diskWritingSpeedMB}
                    {status.diskWritingSpeedMB > 1000
                      ? ' MiB/s 极快'
                      : status.diskWritingSpeedMB > 150
                        ? ' MiB/s 快'
                        : ' MiB/s 一般'}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
            <tr>
              <td>缓存内存容量</td>
              <td>
                {!node.maxCacheMemoryCapacity || node.maxCacheMemoryCapacity.count <= 0 ? (
                  <span className="disabled">没有限制</span>
                ) : (
                  formatCapacity(node.maxCacheMemoryCapacity)
                )}
              </td>
            </tr>
            <tr>
              <td>CPU线程数</td>
              <td>{node.maxCPU > 0 ? `${node.maxCPU}线程` : <span className="disabled">没有限制.</span>}</td>
            </tr>
            <tr>
              <td>API节点地址</td>
              <td>
                {node.apiNodeAddrs && node.apiNodeAddrs.length > 0 ? (
                  node.apiNodeAddrs.map((addr) => (
                    <span key={addr} className="ui label basic small">
                      {addr}
                    </span>
                  ))
                ) : (
                  <span className="disabled">使用全局设置</span>
                )}
              </td>
            </tr>
          </tbody>
        ) : null}
      </table>

      <div className="ui divider" />

      <h3>运行状态</h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">运行状态</td>
            <td>
              {isActive ? (
                <div>
                  <span className="green">运行中</span> &nbsp;
                  {!stopping ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setStopping(true)
                        stopNode.mutate()
                      }}
                    >
                      <span>[通过SSH停止]</span>
                    </a>
                  ) : (
                    <span>[停止中...]</span>
                  )}
                </div>
              ) : (
                <div>
                  <span className="red">已断开</span> &nbsp;
                  {node.isInstalled && !starting ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setStarting(true)
                        startNode.mutate()
                      }}
                    >
                      <span>[通过SSH启动]</span>
                    </a>
                  ) : null}
                  {node.isInstalled && starting ? <span>[启动中...]</span> : null}
                  {!node.isInstalled ? (
                    <Link to={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`}>
                      <span>去安装&gt;</span>
                    </Link>
                  ) : null}
                </div>
              )}
            </td>
          </tr>
        </tbody>
        {isActive ? (
          <tbody>
            <tr>
              <td>CPU用量</td>
              <td>
                {status?.cpuUsageText} &nbsp;
                {status && status.cpuPhysicalCount && status.cpuPhysicalCount > 0 ? (
                  <span className="small grey">
                    ({status.cpuPhysicalCount}核心/{status.cpuLogicalCount}线程)
                  </span>
                ) : null}
              </td>
            </tr>
            <tr>
              <td>内存用量</td>
              <td>{status?.memUsageText}</td>
            </tr>
            <tr>
              <td>连接数</td>
              <td>{status?.connectionCount ?? 0}</td>
            </tr>
            <tr>
              <td>负载</td>
              <td>
                {status?.load1m} &nbsp; {status?.load5m} &nbsp; {status?.load15m} &nbsp;
                <span className="small grey">(三个数字分别代表1分钟,5分钟,15分钟平均负载)</span>
              </td>
            </tr>
            <tr>
              <td>缓存用量</td>
              <td>
                硬盘:{status?.cacheTotalDiskSize} &nbsp; 内存:{status?.cacheTotalMemorySize}
              </td>
            </tr>
          </tbody>
        ) : null}
        <tbody>
          {status?.buildVersion ? (
            <tr>
              <td>版本</td>
              <td>
                v{status.buildVersion} &nbsp;
                {data.shouldUpgrade ? (
                  <Link to={`/clusters/cluster/upgradeRemote?clusterId=${clusterId}`}>
                    <span className="red">发现新版本v{data.newVersion} »</span>
                  </Link>
                ) : null}
              </td>
            </tr>
          ) : null}
          {status?.exePath ? (
            <tr>
              <td>主程序位置</td>
              <td>{status.exePath}</td>
            </tr>
          ) : null}
          <tr>
            <td>最近API连接状况</td>
            <td>
              {status && (status.apiSuccessPercent || 0) > 0 && (status.apiAvgCostSeconds || 0) > 0 ? (
                <span>
                  {(status.apiSuccessPercent || 0) <= 50 ? (
                    <span className="red">
                      连接错误异常严重({Math.round(100 - (status.apiSuccessPercent || 0))}%失败),请改善当前节点和API节点之间通讯
                    </span>
                  ) : (status.apiSuccessPercent || 0) <= 80 ? (
                    <span className="red">
                      连接错误较多({Math.round(100 - (status.apiSuccessPercent || 0))}%失败),请改善当前节点和API节点之间通讯
                    </span>
                  ) : (status.apiSuccessPercent || 0) < 100 ? (
                    <span className="orange">
                      有连接错误发生({Math.round(100 - (status.apiSuccessPercent || 0))}%失败),请改善当前节点和API节点之间通讯
                    </span>
                  ) : (status.apiAvgCostSeconds || 0) <= 1 ? (
                    <span className="green">连接良好</span>
                  ) : (status.apiAvgCostSeconds || 0) <= 5 ? (
                    <span className="orange">连接基本稳定(平均{Math.round(status.apiAvgCostSeconds || 0)}秒)</span>
                  ) : (status.apiAvgCostSeconds || 0) <= 10 ? (
                    <span className="orange">连接速度较慢(平均{Math.round(status.apiAvgCostSeconds || 0)}秒)</span>
                  ) : (
                    <span className="red">连接非常慢(平均{Math.round(status.apiAvgCostSeconds || 0)}秒),请改善当前节点和API节点之间通讯</span>
                  )}
                </span>
              ) : (
                <span className="disabled">尚未上报数据</span>
              )}
            </td>
          </tr>
          {data.nodeDatetime ? (
            <tr>
              <td>上次更新时间</td>
              <td>
                {data.nodeDatetime}
                {data.nodeTimeDiff > 30 ? (
                  <p className="comment">
                    <span className="red">当前节点时间与API节点时间相差 {data.nodeTimeDiff} 秒,请同步节点时间.</span>
                  </p>
                ) : null}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {isActive ? <p className="comment">每隔30秒钟更新一次运行状态.</p> : null}

      <h3>FRPS</h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>进程状态</td>
            <td>
              {!frpsStatus ? (
                <span className="disabled">尚未上报</span>
              ) : !isActive ? (
                <span className="disabled">节点离线</span>
              ) : !frpsStatus.isEnabled ? (
                <span className="disabled">未启用</span>
              ) : frpsStatus.isRunning ? (
                <span className="green">运行中</span>
              ) : (
                <span className="red">已停止</span>
              )}
            </td>
          </tr>
          <tr>
            <td>绑定地址</td>
            <td>{isActive && frpsStatus?.bindAddr ? frpsStatus.bindAddr : '-'}</td>
          </tr>
          <tr>
            <td>绑定端口</td>
            <td>{isActive && frpsStatus && frpsStatus.bindPort > 0 ? frpsStatus.bindPort : '-'}</td>
          </tr>
          <tr>
            <td>PID</td>
            <td>{isActive && frpsStatus?.isRunning && frpsStatus.pid > 0 ? frpsStatus.pid : '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="ui divider" />
      <h3>安装信息</h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>
              节点ID<em>(id)</em>
            </td>
            <td>{node.uniqueId}</td>
          </tr>
          <tr>
            <td>
              密钥<em>(secret)</em>
            </td>
            <td>{node.secret}</td>
          </tr>
          <tr>
            <td className="title">安装目录</td>
            <td>
              {node.installDir ? (
                node.installDir
              ) : (
                <span>使用集群设置</span>
              )}
            </td>
          </tr>
          <tr>
            <td>已安装</td>
            <td>
              {node.isInstalled ? (
                <span className="green">
                  已安装 &nbsp;{' '}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setMoreOpsVisible(!moreOpsVisible)
                    }}
                  >
                    <span className="small">[操作]</span>
                  </a>
                </span>
              ) : (
                <Link to={`/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${nodeId}`} title="点击进入安装界面">
                  <span className="red">未安装</span>
                </Link>
              )}
            </td>
          </tr>
          {moreOpsVisible && node.isInstalled ? (
            <tr>
              <td>操作</td>
              <td>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    void uninstallNode()
                  }}
                >
                  [卸载]
                </a>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
