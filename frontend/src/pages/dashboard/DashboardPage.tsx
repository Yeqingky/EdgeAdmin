import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { formatBytes, formatNumber, splitBytes } from '../../utils/format'

interface TrafficStat {
  bytes: number
  cachedBytes: number
  countRequests: number
  attackBytes: number
  day?: string
  hour?: string
  countIPs?: number
}

interface DashboardData {
  dashboard: {
    defaultClusterId: number
    countServers: number
    countNodeClusters: number
    countNodes: number
    countOfflineNodes: number
    countUsers: number
    countAPINodes: number
    countOfflineAPINodes: number
    countDBNodes: number
    canGoServers: boolean
    canGoNodes: boolean
    canGoSettings: boolean
    canGoUsers: boolean
    diskUsageWarning?: string
  }
  todayTraffic: string
  todayTrafficUnit: string
  todayCountIPs: number
  hourlyTrafficStats: TrafficStat[]
  dailyTrafficStats: TrafficStat[]
  nodeUpgradeInfo: { count: number; version: string }
  apiNodeUpgradeInfo: { count: number; version: string }
  topDomainStats: { serverId: number; domain: string; countRequests: number; bytes: number }[]
  metricCharts: {
    chart: { id: number; name: string }
    item: { id: number; name: string; period: string; periodUnit: string; valueType: string; valueTypeName: string }
    stats: { time: string; value: number; count: number; total: number }[]
  }[]
  localLowerVersionAPINode?: { exePath: string; runtimeVersion: string; fileVersion: string }
  countWeakAdmins: number
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiPost<DashboardData>('/dashboard'),
  })
  const [trafficTab, setTrafficTab] = useState<'hourly' | 'daily'>('hourly')

  if (query.isLoading) {
    return <LoadingBlock text="数据加载中..." />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const dashboard = data.dashboard

  return (
    <div>
      {dashboard.defaultClusterId > 0 && dashboard.countNodes === 0 ? (
        <div className="ui icon message warning">
          <AlertTriangle size={20} />
          <a href={`/clusters/cluster/createNode?clusterId=${dashboard.defaultClusterId}`}>
            还没有在集群中添加节点，现在去添加？添加节点后才可部署网站。
          </a>
        </div>
      ) : null}

      {data.nodeUpgradeInfo.count > 0 ? (
        <div className="ui icon message error">
          <AlertTriangle size={20} />
          <a href="/clusters">
            升级提醒：有 {data.nodeUpgradeInfo.count} 个边缘节点需要升级到 v{data.nodeUpgradeInfo.version} 版本，系统正在尝试自动升级，请耐心等待...
          </a>
        </div>
      ) : null}

      {data.apiNodeUpgradeInfo.count > 0 ? (
        <div className="ui icon message error">
          <AlertTriangle size={20} />
          <a href="/settings/api">
            升级提醒：有 {data.apiNodeUpgradeInfo.count} 个API节点需要升级到 v{data.apiNodeUpgradeInfo.version} 版本；如果已经升级，请尝试重启API节点进程。
          </a>
        </div>
      ) : null}

      {data.localLowerVersionAPINode ? (
        <div className="ui icon message error">
          <AlertTriangle size={20} />
          <span>
            升级提醒：发现一个正在使用的本地API节点版本需要升级，文件位置：{data.localLowerVersionAPINode.exePath}，当前版本：v
            {data.localLowerVersionAPINode.runtimeVersion}。
          </span>
        </div>
      ) : null}

      {dashboard.diskUsageWarning ? (
        <div className="ui icon message error">
          <AlertTriangle size={20} />
          <span dangerouslySetInnerHTML={{ __html: dashboard.diskUsageWarning }} />
        </div>
      ) : null}

      {data.countWeakAdmins > 0 ? (
        <div className="ui icon message error">
          <AlertTriangle size={20} />
          <a href="/admins?hasWeakPassword=1">
            安全提醒：有 {data.countWeakAdmins} 个管理员登录账号正在使用弱密码，请及时修改密码，避免产生安全风险。
          </a>
        </div>
      ) : null}

      <div className="dashboard-grid">
        <StatCard title="集群" value={dashboard.countNodeClusters} link={dashboard.canGoNodes ? '/clusters' : undefined} />
        <StatCard
          title="边缘节点"
          value={dashboard.countNodes}
          extra={dashboard.countOfflineNodes > 0 ? `${dashboard.countOfflineNodes} 离线` : undefined}
          link={dashboard.canGoNodes ? '/clusters' : undefined}
        />
        <StatCard
          title="API节点"
          value={dashboard.countAPINodes}
          extra={dashboard.countOfflineAPINodes > 0 ? `${dashboard.countOfflineAPINodes} 离线` : undefined}
          link={dashboard.canGoSettings ? '/settings/api' : undefined}
        />
        <StatCard title="用户" value={dashboard.countUsers} link={dashboard.canGoUsers ? '/users' : undefined} />
        <StatCard title="网站" value={dashboard.countServers} link={dashboard.canGoServers ? '/servers' : undefined} />
        <StatCard title="当天独立IP" value={data.todayCountIPs > 0 ? formatNumber(data.todayCountIPs) : '尚无数据'} />
        <StatCard title="当天流量" value={`${data.todayTraffic}${data.todayTrafficUnit}`} />
      </div>

      <div className="dashboard-charts">
        <div className="chart-panel wide">
          <div className="ui menu text blue">
            <a
              href=""
              className={`item${trafficTab === 'hourly' ? ' active' : ''}`}
              onClick={(event) => {
                event.preventDefault()
                setTrafficTab('hourly')
              }}
            >
              24小时流量趋势
            </a>
            <a
              href=""
              className={`item${trafficTab === 'daily' ? ' active' : ''}`}
              onClick={(event) => {
                event.preventDefault()
                setTrafficTab('daily')
              }}
            >
              15天流量趋势
            </a>
          </div>
          <div className="ui divider" />
          <TrafficChart stats={trafficTab === 'hourly' ? data.hourlyTrafficStats : data.dailyTrafficStats} />
        </div>

        <div className="chart-panel">
          <h4>域名访问排行 <span>（24小时）</span></h4>
          <div className="ui divider" />
          <TopDomainsChart stats={data.topDomainStats} />
        </div>

        {data.metricCharts?.map((chart) => (
          <div className="chart-panel" key={chart.chart.id}>
            <h4>{chart.chart.name}</h4>
            <div className="ui divider" />
            <MetricChart stats={chart.stats} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ title, value, extra, link }: { title: string; value: string | number; extra?: string; link?: string }) {
  return (
    <div className="ui column">
      <h4>
        {title}
        {link ? (
          <a href={`${link}`} className="stat-link">
            <ArrowRight size={13} />
          </a>
        ) : null}
      </h4>
      <div className="value">
        <span>{value}</span>
        {extra ? <span className="red"> / {extra}</span> : null}
      </div>
    </div>
  )
}

function TrafficChart({ stats }: { stats: TrafficStat[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }
    const chart = echarts.init(ref.current)
    const maxBytes = Math.max(...stats.map((stat) => stat.bytes), 1)
    const axis = splitBytes(maxBytes)
    const divider = maxBytes / Number(axis.value || 1)
    chart.setOption({
      xAxis: {
        type: 'category',
        data: stats.map((stat) => (stat.hour != null ? stat.hour : stat.day)),
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => `${value}${axis.unit}` },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: { dataIndex: number }) => {
          const stat = stats[params.dataIndex]
          const cachedRatio = stat.bytes > 0 ? Math.round((stat.cachedBytes * 10000) / stat.bytes) / 100 : 0
          return `${stat.day || ''} ${stat.hour != null ? `${stat.hour}时` : ''}<br/>总流量：${formatBytes(stat.bytes)}<br/>缓存流量：${formatBytes(
            stat.cachedBytes,
          )}<br/>缓存命中率：${cachedRatio}%`
        },
      },
      grid: { left: 50, top: 40, right: 20, bottom: 20 },
      series: [
        {
          name: '总流量',
          type: 'line',
          smooth: true,
          areaStyle: {},
          data: stats.map((stat) => stat.bytes / divider),
        },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [stats])

  return <div className="chart-box" ref={ref} />
}

function TopDomainsChart({ stats }: { stats: DashboardData['topDomainStats'] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) {
      return
    }
    const chart = echarts.init(ref.current)
    chart.setOption({
      grid: { left: 90, top: 20, right: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: stats.map((stat) => stat.domain) },
      tooltip: {
        formatter: (params: { dataIndex: number }) => {
          const stat = stats[params.dataIndex]
          return `${stat.domain}<br/>请求数：${formatNumber(stat.countRequests)}<br/>流量：${formatBytes(stat.bytes)}`
        },
      },
      series: [
        {
          type: 'bar',
          data: stats.map((stat) => stat.countRequests),
        },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [stats])
  if (stats.length === 0) {
    return <p className="comment">暂时没有数据。</p>
  }
  return <div className="chart-box" ref={ref} />
}

function MetricChart({ stats }: { stats: { time: string; value: number }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) {
      return
    }
    const chart = echarts.init(ref.current)
    chart.setOption({
      grid: { left: 50, top: 30, right: 20, bottom: 30 },
      xAxis: { type: 'category', data: stats.map((stat) => stat.time) },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'axis' },
      series: [{ type: 'line', smooth: true, data: stats.map((stat) => stat.value) }],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [stats])
  return <div className="chart-box" ref={ref} />
}
