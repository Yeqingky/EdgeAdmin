import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import type { EChartsOption } from 'echarts'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import {
  EChart,
  FirstMenu,
  ServerPageLayout,
  ServerTopMenu,
  bytesAxis,
  countAxis,
  formatBytes,
  formatNumber,
  type LeftMenuItem,
  type ServerBrief,
} from './common'

const defaultColor = '#9DD3E8'

interface StatPageBase {
  serverId: number
  server: ServerBrief
}

interface RequestStat {
  day: string
  minute?: string
  hour?: string
  bytes: number
  cachedBytes: number
  countRequests: number
  countCachedRequests: number
}

interface MinutelyData extends StatPageBase {
  minutelyStats: RequestStat[]
}

interface HourlyData extends StatPageBase {
  hourlyStats: RequestStat[]
}

interface DailyData extends StatPageBase {
  dailyStats: RequestStat[]
}

function statMenuItems(serverId: number, current: 'index' | 'region' | 'provider' | 'client' | 'waf'): LeftMenuItem[] {
  return [
    { name: '流量统计', url: `/servers/server/stat?serverId=${serverId}`, isActive: current === 'index' },
    { name: '地区排行', url: `/servers/server/stat/regions?serverId=${serverId}`, isActive: current === 'region' },
    { name: '运营商排行', url: `/servers/server/stat/providers?serverId=${serverId}`, isActive: current === 'provider' },
    { name: '客户端排行', url: `/servers/server/stat/clients?serverId=${serverId}`, isActive: current === 'client' },
    { name: 'WAF统计', url: `/servers/server/stat/waf?serverId=${serverId}`, isActive: current === 'waf' },
  ]
}

function requestsTabItems(serverId: number, active: 'minutely' | 'hourly' | 'daily') {
  return [
    { name: '即时', href: `/servers/server/stat?serverId=${serverId}`, active: active === 'minutely' },
    { name: '按小时', href: `/servers/server/stat/hourlyRequests?serverId=${serverId}`, active: active === 'hourly' },
    { name: '按天', href: `/servers/server/stat/dailyRequests?serverId=${serverId}`, active: active === 'daily' },
  ]
}

function requestTooltip(getText: (index: number, series: number) => string) {
  return (params: unknown) => {
    const item = params as { dataIndex: number; seriesIndex: number }
    return getText(item.dataIndex, item.seriesIndex)
  }
}

function requestsChartOption(stats: RequestStat[], labels: string[], tooltip: (index: number, series: number) => string): EChartsOption {
  const axis = countAxis(stats.map((stat) => Math.max(stat.countRequests, stat.countCachedRequests)))
  const unitSuffix = axis.unit
  return {
    xAxis: { type: 'category', data: labels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}${unitSuffix}` },
    },
    tooltip: { show: true, trigger: 'item', formatter: requestTooltip(tooltip) },
    grid: { left: 50, top: 40, right: 20, bottom: 40 },
    legend: { data: ['请求数', '缓存请求数'], bottom: 0 },
    animation: true,
    series: [
      {
        name: '请求数',
        type: 'line',
        smooth: true,
        data: stats.map((stat) => stat.countRequests / axis.divider),
        itemStyle: { color: defaultColor },
        areaStyle: { color: defaultColor },
      },
      {
        name: '缓存请求数',
        type: 'line',
        smooth: true,
        data: stats.map((stat) => stat.countCachedRequests / axis.divider),
        itemStyle: { color: '#61A0A8' },
        areaStyle: { color: '#61A0A8' },
      },
    ],
  }
}

function trafficChartOption(stats: RequestStat[], labels: string[], tooltip: (index: number, series: number) => string): EChartsOption {
  const axis = bytesAxis(stats.map((stat) => Math.max(stat.bytes, stat.cachedBytes)))
  return {
    xAxis: { type: 'category', data: labels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}${axis.unit}` },
    },
    tooltip: { show: true, trigger: 'item', formatter: requestTooltip(tooltip) },
    grid: { left: 50, top: 40, right: 20, bottom: 40 },
    legend: { data: ['流量', '缓存流量'], bottom: 0 },
    animation: true,
    series: [
      {
        name: '流量',
        type: 'line',
        smooth: true,
        data: stats.map((stat) => stat.bytes / axis.divider),
        itemStyle: { color: defaultColor },
        areaStyle: { color: defaultColor },
      },
      {
        name: '缓存流量',
        type: 'line',
        smooth: true,
        data: stats.map((stat) => stat.cachedBytes / axis.divider),
        itemStyle: { color: '#61A0A8' },
        areaStyle: { color: '#61A0A8' },
      },
    ],
  }
}

function percentOf(part: number, total: number): string {
  if (total <= 0) {
    return '0'
  }
  return String(Math.round((part * 10000) / total) / 100)
}

function RankingChart({
  title,
  suffix,
  items,
  emptyText = '暂时还没有统计数据.',
}: {
  title: string
  suffix: string
  items: { name: string; count: number }[]
  emptyText?: string
}) {
  if (items.length === 0) {
    return <p className="comment">{emptyText}</p>
  }
  const axis = countAxis(items.map((item) => item.count))
  const option: EChartsOption = {
    xAxis: {
      type: 'category',
      data: items.map((item) => item.name),
      axisLabel: { interval: 0, rotate: items.length > 8 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}${axis.unit}` },
    },
    tooltip: {
      show: true,
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { dataIndex: number }
        return `${items[item.dataIndex].name}: ${formatNumber(items[item.dataIndex].count)}`
      },
    },
    grid: { left: 40, top: 10, right: 20, bottom: items.length > 8 ? 60 : 20 },
    animation: true,
    series: [
      {
        name: title,
        type: 'bar',
        data: items.map((item) => item.count / axis.divider),
        itemStyle: { color: defaultColor },
        barWidth: '10em',
      },
    ],
  }
  return (
    <>
      <h4>{title}</h4>
      <span className="grey small">{suffix}</span>
      <EChart option={option} />
    </>
  )
}

export function ServerStatPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-minutely', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<MinutelyData>('/servers/server/stat', { serverId }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const stats = (data.minutelyStats || []).filter((_, index) => index % 5 === 0)
  const labels = stats.map((stat) => stat.minute || '')

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'index')}>
        <FirstMenu items={requestsTabItems(data.server.id, 'minutely')} />
        <div className="ui column">
          <h4>请求数统计(即时)</h4>
          <EChart
            option={requestsChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} ${stat.minute}<br/>请求数: ${formatNumber(stat.countRequests)}`
              }
              return `${stat.day} ${stat.minute}<br/>缓存请求数: ${formatNumber(
                stat.countCachedRequests,
              )}<br/>命中率:${percentOf(stat.countCachedRequests, stat.countRequests)}%`
            })}
          />
          <h4>流量统计(即时)</h4>
          <EChart
            option={trafficChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} ${stat.minute}<br/>流量: ${formatBytes(stat.bytes)}`
              }
              return `${stat.day} ${stat.minute}<br/>缓存流量: ${formatBytes(
                stat.cachedBytes,
              )}<br/>命中率:${percentOf(stat.cachedBytes, stat.bytes)}%`
            })}
          />
        </div>
      </ServerPageLayout>
    </div>
  )
}

export function ServerStatHourlyRequestsPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-hourly', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<HourlyData>('/servers/server/stat/hourlyRequests', { serverId }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const stats = data.hourlyStats || []
  const labels = stats.map((stat) => stat.hour || '')

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'index')}>
        <FirstMenu items={requestsTabItems(data.server.id, 'hourly')} />
        <div className="ui column">
          <h4>请求数统计(小时)</h4>
          <EChart
            option={requestsChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} ${stat.hour} 请求数: ${formatNumber(stat.countRequests)}`
              }
              return `${stat.day} ${stat.hour} 缓存请求数: ${formatNumber(
                stat.countCachedRequests,
              )}, 命中率:${percentOf(stat.countCachedRequests, stat.countRequests)}%`
            })}
          />
          <h4>流量统计(小时)</h4>
          <EChart
            option={trafficChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} ${stat.hour} 流量: ${formatBytes(stat.bytes)}`
              }
              return `${stat.day} ${stat.hour} 缓存流量: ${formatBytes(
                stat.cachedBytes,
              )}, 命中率:${percentOf(stat.cachedBytes, stat.bytes)}%`
            })}
          />
        </div>
      </ServerPageLayout>
    </div>
  )
}

export function ServerStatDailyRequestsPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-daily', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<DailyData>('/servers/server/stat/dailyRequests', { serverId }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const stats = data.dailyStats || []
  const labels = stats.map((stat) => stat.day.substring(5))

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'index')}>
        <FirstMenu items={requestsTabItems(data.server.id, 'daily')} />
        <div className="ui column">
          <h4>请求数统计(按天)</h4>
          <EChart
            option={requestsChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} 请求数: ${formatNumber(stat.countRequests)}`
              }
              return `${stat.day} 缓存请求数: ${formatNumber(
                stat.countCachedRequests,
              )}, 命中率:${percentOf(stat.countCachedRequests, stat.countRequests)}%`
            })}
          />
          <h4>流量统计(按天)</h4>
          <EChart
            option={trafficChartOption(stats, labels, (index, series) => {
              const stat = stats[index]
              if (!stat) {
                return ''
              }
              if (series === 0) {
                return `${stat.day} 流量: ${formatBytes(stat.bytes)}`
              }
              return `${stat.day} 缓存流量: ${formatBytes(
                stat.cachedBytes,
              )}, 命中率:${percentOf(stat.cachedBytes, stat.bytes)}%`
            })}
          />
        </div>
      </ServerPageLayout>
    </div>
  )
}

interface RegionData extends StatPageBase {
  month: string
  statIsOn: boolean
  countryStats: { count: number; country: { id: number; name: string } }[]
  provinceStats: { count: number; country: { id: number; name: string }; province: { id: number; name: string } }[]
  cityStats: {
    count: number
    country: { id: number; name: string }
    province: { id: number; name: string }
    city: { id: number; name: string }
  }[]
}

function StatDisabledHint({ serverId }: { serverId: number }) {
  return (
    <p className="ui message">
      要想查看统计数据,需要先开启统计功能,<a href={`/servers/server/settings/stat?serverId=${serverId}`}>[点击这里]</a>修改配置.
    </p>
  )
}

export function ServerStatRegionsPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const month = searchParams.get('month') || ''
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-regions', serverId, month],
    enabled: serverId > 0,
    queryFn: () => apiGet<RegionData>('/servers/server/stat/regions', { serverId, month }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'region')}>
        {!data.statIsOn ? (
          <StatDisabledHint serverId={data.serverId} />
        ) : (
          <>
            <RankingChart
              title="地区排行"
              suffix="(按月)"
              items={data.countryStats.map((stat) => ({ name: stat.country.name, count: stat.count }))}
            />
            <RankingChart
              title="省市排行"
              suffix="(按月)"
              items={data.provinceStats.map((stat) => ({ name: `${stat.country.name} ${stat.province.name}`, count: stat.count }))}
            />
            <RankingChart
              title="城市排行"
              suffix="(按月)"
              items={data.cityStats.map((stat) => ({
                name: `${stat.country.name} ${stat.province.name} ${stat.city.name}`,
                count: stat.count,
              }))}
            />
          </>
        )}
      </ServerPageLayout>
    </div>
  )
}

interface ProviderData extends StatPageBase {
  month: string
  statIsOn: boolean
  providerStats: { count: number; provider: { id: number; name: string } }[]
}

export function ServerStatProvidersPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const month = searchParams.get('month') || ''
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-providers', serverId, month],
    enabled: serverId > 0,
    queryFn: () => apiGet<ProviderData>('/servers/server/stat/providers', { serverId, month }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'provider')}>
        {!data.statIsOn ? (
          <StatDisabledHint serverId={data.serverId} />
        ) : (
          <RankingChart
            title="运营商排行"
            suffix="(按月)"
            items={data.providerStats.map((stat) => ({ name: stat.provider.name, count: stat.count }))}
          />
        )}
      </ServerPageLayout>
    </div>
  )
}

interface ClientsData extends StatPageBase {
  month: string
  statIsOn: boolean
  systemStats: { count: number; system: { id: number; name: string } }[]
  browserStats: { count: number; browser: { id: number; name: string } }[]
}

export function ServerStatClientsPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const month = searchParams.get('month') || ''
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-clients', serverId, month],
    enabled: serverId > 0,
    queryFn: () => apiGet<ClientsData>('/servers/server/stat/clients', { serverId, month }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'client')}>
        {!data.statIsOn ? (
          <StatDisabledHint serverId={data.serverId} />
        ) : (
          <>
            <RankingChart
              title="操作系统排行"
              suffix="(按月)"
              items={data.systemStats.map((stat) => ({ name: stat.system.name, count: stat.count }))}
            />
            <RankingChart
              title="浏览器排行"
              suffix="(按月)"
              items={data.browserStats.map((stat) => ({ name: stat.browser.name, count: stat.count }))}
            />
          </>
        )}
      </ServerPageLayout>
    </div>
  )
}

interface WafData extends StatPageBase {
  countDailyLog: number
  countDailyBlock: number
  countDailyCaptcha: number
  countWeeklyBlock: number
  countMonthlyBlock: number
  groupStats: { group: { id: number; name: string }; count: number }[]
  logDailyStats: { day: string; count: number }[]
  blockDailyStats: { day: string; count: number }[]
  captchaDailyStats: { day: string; count: number }[]
}

export function ServerStatWafPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'server-stat-waf', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<WafData>('/servers/server/stat/waf', { serverId }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const logStats = data.logDailyStats || []
  const blockStats = data.blockDailyStats || []
  const captchaStats = data.captchaDailyStats || []
  const totalStats = logStats.map((stat, index) => ({
    day: stat.day,
    count: stat.count + (blockStats[index]?.count || 0) + (captchaStats[index]?.count || 0),
  }))
  const dailyAxis = countAxis(totalStats.map((stat) => stat.count))
  const groupAxis = countAxis((data.groupStats || []).map((stat) => stat.count))
  const totalGroupCount = (data.groupStats || []).reduce((sum, stat) => sum + stat.count, 0)

  const dailyOption: EChartsOption = {
    xAxis: { type: 'category', data: totalStats.map((stat) => `${stat.day.substring(4, 6)}-${stat.day.substring(6)}`) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}${dailyAxis.unit}` },
    },
    tooltip: {
      show: true,
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { dataIndex: number }
        const index = item.dataIndex
        return `${logStats[index]?.day.substring(4, 6)}-${logStats[index]?.day.substring(6)}: 拦截: ${formatNumber(
          blockStats[index]?.count || 0,
        )}, 验证码: ${formatNumber(captchaStats[index]?.count || 0)}, 记录: ${formatNumber(logStats[index]?.count || 0)}`
      },
    },
    grid: { left: 40, top: 10, right: 20, bottom: 20 },
    animation: true,
    series: [
      {
        name: '全部',
        type: 'line',
        smooth: true,
        data: totalStats.map((stat) => stat.count / dailyAxis.divider),
        areaStyle: {},
        itemStyle: { color: defaultColor },
      },
      {
        name: '记录',
        type: 'line',
        smooth: true,
        data: logStats.map((stat) => stat.count / dailyAxis.divider),
        itemStyle: { color: '#879BD7' },
      },
      {
        name: '拦截',
        type: 'line',
        smooth: true,
        data: blockStats.map((stat) => stat.count / dailyAxis.divider),
        itemStyle: { color: '#F39494' },
      },
      {
        name: '验证码',
        type: 'line',
        smooth: true,
        data: captchaStats.map((stat) => stat.count / dailyAxis.divider),
        itemStyle: { color: '#FBD88A' },
      },
    ],
  }

  const groupOption: EChartsOption = {
    xAxis: {
      type: 'category',
      data: (data.groupStats || []).map((stat) => stat.group.name),
      axisLabel: { interval: 0, rotate: (data.groupStats || []).length > 8 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value}${groupAxis.unit}` },
    },
    tooltip: {
      show: true,
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { dataIndex: number }
        const stat = (data.groupStats || [])[item.dataIndex]
        if (!stat) {
          return ''
        }
        const percent = totalGroupCount > 0 ? `, 占比: ${percentOf(stat.count, totalGroupCount)}%` : ''
        return `${stat.group.name}: ${formatNumber(stat.count)}${percent}`
      },
    },
    grid: { left: 40, top: 10, right: 20, bottom: 20 },
    animation: true,
    series: [
      {
        name: '规则分组',
        type: 'bar',
        data: (data.groupStats || []).map((stat) => stat.count / groupAxis.divider),
        itemStyle: { color: defaultColor },
        barWidth: '10em',
      },
    ],
  }

  return (
    <div>
      <ServerTopMenu serverId={data.server.id} serverName={data.server.name} current="stat" />
      <ServerPageLayout withMenu menu={statMenuItems(data.server.id, 'waf')}>
        <div className="dashboard-grid">
          <div className="ui column">
            <h4>今日拦截</h4>
            <div className="value">
              <span>{formatNumber(data.countDailyBlock)}</span>次
            </div>
          </div>
          <div className="ui column">
            <h4>今日验证码验证</h4>
            <div className="value">
              <span>{formatNumber(data.countDailyCaptcha)}</span>次
            </div>
          </div>
          <div className="ui column">
            <h4>今日记录</h4>
            <div className="value">
              <span>{formatNumber(data.countDailyLog)}</span>次
            </div>
          </div>
          <div className="ui column">
            <h4>本周拦截</h4>
            <div className="value">
              <span>{formatNumber(data.countWeeklyBlock)}</span>次
            </div>
          </div>
          <div className="ui column">
            <h4>本月拦截</h4>
            <div className="value">
              <span>{formatNumber(data.countMonthlyBlock)}</span>次
            </div>
          </div>
        </div>

        <h4>
          近15日趋势 <span className="ui label tiny basic">全部</span> <span className="ui label tiny basic">拦截</span>{' '}
          <span className="ui label tiny basic">验证码</span> <span className="ui label tiny basic">记录</span>
        </h4>
        <EChart option={dailyOption} />
        <h4>拦截类型分布</h4>
        <EChart option={groupOption} />
      </ServerPageLayout>
    </div>
  )
}
