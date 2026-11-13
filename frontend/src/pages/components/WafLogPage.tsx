import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { WafMenu } from './common'

interface WafLogAccessLog {
  requestId: string
  serverId: number
  remoteAddr: string
  timeLocal: string
  requestMethod: string
  scheme: string
  host: string
  requestURI: string
  proto: string
  status: number
  requestTime: number
  firewallPolicyId: number
  firewallRuleGroupId: number
  firewallRuleSetId: number
  firewallActions: string[] | null
  tags: string[] | null
  attrs: Record<string, string> | null
  node?: { id: number; name: string; nodeCluster?: { id: number } } | null
}

interface WafLogInfo {
  policy?: { id: number; name: string; serverId: number }
  group?: { id: number; name: string }
  set?: { id: number; name: string }
}

interface WafLogGroup {
  id: number
  name: string
}

interface WafLogData {
  path: string
  day: string
  groupId: number
  partition: number
  accessLogs: WafLogAccessLog[] | null
  hasMore: boolean
  nextRequestId: string
  hasPrev: boolean
  lastRequestId: string
  groups: WafLogGroup[]
  regions: Record<string, string> | null
  wafInfos: Record<string, WafLogInfo> | null
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

export function WafLogPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const day = searchParams.get('day') || ''
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const requestId = searchParams.get('requestId') || ''
  const partition = searchParams.get('partition') || '-1'
  const [dayInput, setDayInput] = useState(day)

  const query = useQuery({
    queryKey: ['waf-log', firewallPolicyId, day, groupId, requestId, partition],
    queryFn: () =>
      apiGet<WafLogData>('/servers/components/waf/log', {
        firewallPolicyId,
        day,
        groupId,
        requestId,
        partition: Number(partition),
      }),
    enabled: firewallPolicyId > 0,
  })

  useEffect(() => {
    setDayInput(day)
  }, [day])

  const partitionQuery = useQuery({
    queryKey: ['access-log-partitions', day],
    queryFn: () => apiPost<{ partitions: number[] }>('/servers/logs/partitionData', { day: day || '' }),
    enabled: firewallPolicyId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const accessLogs = data.accessLogs || []
  const regions = data.regions || {}
  const wafInfos = data.wafInfos || {}
  const partitions = [...(partitionQuery.data?.partitions || [])].reverse()

  function navigateLog(next: Record<string, string | number>) {
    const params = new URLSearchParams()
    params.set('firewallPolicyId', String(firewallPolicyId))
    params.set('day', String(next.day ?? data.day))
    params.set('groupId', String(next.groupId ?? groupId))
    const nextPartition = String(next.partition ?? partition)
    if (nextPartition !== '-1') {
      params.set('partition', nextPartition)
    }
    if (next.requestId) {
      params.set('requestId', String(next.requestId))
    }
    setSearchParams(params)
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="log"
      />

      <form
        className="ui form small"
        onSubmit={(event) => {
          event.preventDefault()
          navigateLog({ day: dayInput || data.day })
        }}
      >
        <div className="ui menu text blue first-menu" style={{ marginTop: '-1em' }}>
          <div className="item">
            <select className="ui dropdown" value={groupId} onChange={(event) => navigateLog({ groupId: event.target.value, requestId: '' })}>
              <option value={0}>[规则分组]</option>
              {data.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="item right">
            <div className="ui fields inline">
              <div className="ui field">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="选择日期"
                  style={{ width: '8em' }}
                  value={dayInput || data.day}
                  onChange={(event) => setDayInput(event.target.value)}
                />
              </div>
              <div className="ui field">
                <button className="ui button small" type="submit">
                  查找
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {partitions.length > 0 ? (
        <div style={{ marginBottom: '0.6em' }}>
          {partitions.map((item) => (
            <button
              key={item}
              type="button"
              className={`ui button tiny${String(item) === partition ? ' blue' : ''}`}
              onClick={() => navigateLog({ partition: item, requestId: '' })}
            >
              分区 {item}
            </button>
          ))}
        </div>
      ) : null}

      {accessLogs.length === 0 ? <p className="comment">暂时还没有日志.</p> : null}

      {accessLogs.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {accessLogs.map((accessLog) => {
              const region = regions[accessLog.remoteAddr] || ''
              const wafInfo = accessLog.firewallRuleSetId > 0 ? wafInfos[String(accessLog.firewallRuleSetId)] : undefined
              const cacheStatus = accessLog.attrs?.['cache.status']
              return (
                <tr key={accessLog.requestId}>
                  <td style={{ wordBreak: 'break-all', color: accessLog.status >= 400 ? '#dc143c' : undefined }}>
                    <div>
                      {accessLog.node?.nodeCluster ? (
                        <a
                          href={`/clusters/cluster/node?nodeId=${accessLog.node.id}&clusterId=${accessLog.node.nodeCluster.id}`}
                          className="grey"
                        >
                          [{accessLog.node.name}]
                        </a>
                      ) : null}
                      {region ? <span className="grey"> [{region}]</span> : null}
                      {accessLog.remoteAddr} [{accessLog.timeLocal}] <em>&quot;{accessLog.requestMethod} {accessLog.scheme}://{accessLog.host}{accessLog.requestURI} {accessLog.proto}&quot;</em>{' '}
                      {accessLog.status}
                      {cacheStatus === 'HIT' || cacheStatus === 'STALE' ? (
                        <span className="ui label tiny basic">cache {cacheStatus.toLowerCase()}</span>
                      ) : null}
                      {accessLog.firewallActions && accessLog.firewallActions.length > 0 ? (
                        <span className="ui label tiny basic">waf {accessLog.firewallActions.join(',')}</span>
                      ) : null}
                      {accessLog.tags && accessLog.tags.length > 0 ? <span className="ui label tiny basic">{accessLog.tags.join(',')}</span> : null}
                      {wafInfo && wafInfo.policy ? (
                        <span>
                          {' '}
                          <a
                            href={
                              wafInfo.policy.serverId === 0
                                ? `/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=inbound&groupId=${accessLog.firewallRuleGroupId}`
                                : `/servers/server/settings/waf/group?serverId=${accessLog.serverId}&firewallPolicyId=${firewallPolicyId}&type=inbound&groupId=${accessLog.firewallRuleGroupId}`
                            }
                          >
                            WAF -{wafInfo.group ? ` ${wafInfo.group.name} -` : ''}
                            {wafInfo.set ? ` ${wafInfo.set.name}` : ''}
                          </a>
                        </span>
                      ) : null}
                      {accessLog.requestTime ? <span> - 耗时:{(accessLog.requestTime * 1000).toFixed(3)} ms</span> : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {accessLogs.length > 0 ? (
        <div>
          {data.hasPrev ? (
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                navigateLog({ requestId: data.lastRequestId })
              }}
            >
              上一页
            </a>
          ) : (
            <span className="disabled">上一页</span>
          )}
          <span className="disabled">&nbsp; | &nbsp;</span>
          {data.hasMore ? (
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                navigateLog({ requestId: data.nextRequestId })
              }}
            >
              下一页
            </a>
          ) : (
            <span className="disabled">下一页</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
