import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../../components/form'
import { PageHeader, SettingsTabs, SortArrow } from '../common'

/* ---------- config ---------- */

interface DBConfig {
  host: string
  port: string
  database: string
  username: string
  password: string
}

interface DatabaseData {
  error: string
  dbConfig?: DBConfig
}

export function DatabasePage() {
  const query = useQuery({
    queryKey: ['settings-database'],
    queryFn: () => apiGet<DatabaseData>('/settings/database'),
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
      <SettingsTabs kind="advanced" active="database" />
      <PageHeader
        items={[
          { name: '配置模板', href: '/settings/database', active: true },
          { name: '手动清理', href: '/settings/database/clean' },
          { name: '自动清理设置', href: '/settings/database/cleanSetting' },
        ]}
      />
      {data.error.length > 0 ? <p className="ui message error">{data.error}</p> : null}
      {data.error.length === 0 && data.dbConfig ? (
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">主机地址</td>
              <td>{data.dbConfig.host}</td>
            </tr>
            <tr>
              <td>数据库端口</td>
              <td>{data.dbConfig.port}</td>
            </tr>
            <tr>
              <td>数据库名称</td>
              <td>{data.dbConfig.database}</td>
            </tr>
            <tr>
              <td>用户名</td>
              <td>
                {data.dbConfig.username.length > 0 ? data.dbConfig.username : <span className="disabled">不使用用户名.</span>}
              </td>
            </tr>
            <tr>
              <td>密码</td>
              <td>
                {data.dbConfig.password.length > 0 ? data.dbConfig.password : <span className="disabled">不使用密码.</span>}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/* ---------- clean ---------- */

interface DBTable {
  name: string
  rows: number
  size: string
  canDelete: boolean
  canClean: boolean
  comment: string
}

type SortDirection = '' | 'asc' | 'desc'

export function DatabaseCleanPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const [orderTable, setOrderTable] = useState<SortDirection>('')
  const [orderSize, setOrderSize] = useState<SortDirection>('')

  const query = useQuery({
    queryKey: ['settings-database-clean', orderTable, orderSize],
    queryFn: () => apiPost<{ tables: DBTable[] }>('/settings/database/clean', { orderTable, orderSize }),
  })

  async function deleteTable(table: string) {
    if (!(await confirm({ message: `确定要删除此数据表吗?\n删除后数据不能恢复!`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/settings/database/deleteTable', { table })
      toast('操作成功')
      await query.refetch()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  async function truncateTable(table: string) {
    if (!(await confirm({ message: `确定要清空此数据表吗?\n清空后数据不能恢复!`, danger: true, confirmText: '清空' }))) {
      return
    }
    try {
      await apiPost('/settings/database/truncateTable', { table })
      toast('操作成功')
      await query.refetch()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  function toggleSort(current: SortDirection, setter: (value: SortDirection) => void) {
    setter(current === '' ? 'asc' : current === 'asc' ? 'desc' : '')
  }

  const tables = query.data?.tables ?? []
  const loading = query.isLoading || query.isFetching

  return (
    <div>
      <SettingsTabs kind="advanced" active="database" />
      <PageHeader
        items={[
          { name: '配置模板', href: '/settings/database' },
          { name: '手动清理', href: '/settings/database/clean', active: true },
          { name: '自动清理设置', href: '/settings/database/cleanSetting' },
        ]}
      />

      {loading ? <div className="ui message">正在加载中...</div> : null}

      {tables.length > 0 ? (
        <div className="ui message small warning">
          <p>请确认数据表用途后再执行相关操作.</p>
        </div>
      ) : null}

      {tables.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th>
                数据表名
                <SortArrow direction={orderTable || undefined} onClick={() => toggleSort(orderTable, setOrderTable)} />
              </th>
              <th>
                占用空间
                <SortArrow direction={orderSize || undefined} onClick={() => toggleSort(orderSize, setOrderSize)} />
              </th>
              <th>用途</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.name}>
                <td>{table.name}</td>
                <td>
                  {table.size}
                  {table.rows > 0 ? <span className="grey small">({table.rows}行)</span> : null}
                </td>
                <td>{table.comment}</td>
                <td>
                  {table.canDelete ? (
                    <a href="" onClick={(event) => { event.preventDefault(); void deleteTable(table.name) }}>
                      删除
                    </a>
                  ) : null}
                  {table.canDelete ? <span> &nbsp;</span> : null}
                  {table.canClean ? (
                    <a href="" onClick={(event) => { event.preventDefault(); void truncateTable(table.name) }}>
                      清空
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/* ---------- clean setting ---------- */

interface CleanDays {
  clean: { days: number }
}

interface DatabaseConfig {
  serverAccessLog: CleanDays
  httpCacheTask: CleanDays
  nodeTrafficDailyStat: CleanDays
  serverBandwidthStat: CleanDays
  serverDailyStat: CleanDays
  userBandwidthStat: CleanDays
  userPlanBandwidthStat: CleanDays
  nodeClusterTrafficDailyStat: CleanDays
  nodeTrafficHourlyStat: CleanDays
  serverDomainHourlyStat: CleanDays
  trafficDailyStat: CleanDays
  trafficHourlyStat: CleanDays
}

type CleanKey = keyof DatabaseConfig

const CLEAN_ITEMS: { key: CleanKey; title: string; more?: boolean }[] = [
  { key: 'serverAccessLog', title: '网站访问日志' },
  { key: 'serverBandwidthStat', title: '网站带宽统计', more: true },
  { key: 'userBandwidthStat', title: '用户带宽统计', more: true },
  { key: 'userPlanBandwidthStat', title: '用户套餐带宽统计', more: true },
  { key: 'serverDailyStat', title: '网站流量统计', more: true },
  { key: 'serverDomainHourlyStat', title: '网站按小时域名统计', more: true },
  { key: 'trafficDailyStat', title: '系统整体按天流量统计', more: true },
  { key: 'trafficHourlyStat', title: '系统整体按小时流量统计', more: true },
  { key: 'nodeClusterTrafficDailyStat', title: '集群按天流量统计', more: true },
  { key: 'nodeTrafficDailyStat', title: '节点按天流量统计', more: true },
  { key: 'nodeTrafficHourlyStat', title: '节点按小时流量统计', more: true },
  { key: 'httpCacheTask', title: '缓存任务', more: true },
]

export function DatabaseCleanSettingPage() {
  const toast = useToast()
  const [config, setConfig] = useState<DatabaseConfig | null>(null)
  const [moreVisible, setMoreVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const query = useQuery({
    queryKey: ['settings-database-clean-setting'],
    queryFn: () => apiGet<{ config: DatabaseConfig }>('/settings/database/cleanSetting'),
  })

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
    }
  }, [query.data])

  if (query.isLoading || !config) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  function updateDays(key: CleanKey, value: number) {
    setConfig((current) => {
      if (!current) {
        return current
      }
      return { ...current, [key]: { clean: { days: value } } }
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!config) {
      return
    }
    setSubmitting(true)
    try {
      const params: Record<string, unknown> = { csrfToken: await getCsrfToken() }
      const fieldNames: Record<CleanKey, string> = {
        serverAccessLog: 'serverAccessLogCleanDays',
        serverBandwidthStat: 'serverBandwidthStatCleanDays',
        userBandwidthStat: 'userBandwidthStatCleanDays',
        userPlanBandwidthStat: 'userPlanBandwidthStatCleanDays',
        serverDailyStat: 'serverDailyStatCleanDays',
        serverDomainHourlyStat: 'serverDomainHourlyStatCleanDays',
        trafficDailyStat: 'trafficDailyStatCleanDays',
        trafficHourlyStat: 'trafficHourlyStatCleanDays',
        nodeClusterTrafficDailyStat: 'nodeClusterTrafficDailyStatCleanDays',
        nodeTrafficDailyStat: 'nodeTrafficDailyStatCleanDays',
        nodeTrafficHourlyStat: 'nodeTrafficHourlyStatCleanDays',
        httpCacheTask: 'httpCacheTaskCleanDays',
      }
      for (const item of CLEAN_ITEMS) {
        params[fieldNames[item.key]] = config[item.key].clean.days
      }
      await apiPost('/settings/database/cleanSetting', params)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleItems = CLEAN_ITEMS.filter((item) => !item.more || moreVisible)

  return (
    <div>
      <SettingsTabs kind="advanced" active="database" />
      <PageHeader
        items={[
          { name: '配置模板', href: '/settings/database' },
          { name: '手动清理', href: '/settings/database/clean' },
          { name: '自动清理设置', href: '/settings/database/cleanSetting', active: true },
        ]}
      />
      <form className="ui form" onSubmit={submit}>
        {visibleItems.map((item, index) => (
          <div key={item.key}>
            {item.more && index === 1 ? <div className="ui divider" /> : null}
            <h4 style={{ marginTop: 0 }}>{item.title}</h4>
            <FormTable>
              <FormRow title="数据保存天数 *">
                <div className="ui input right labeled">
                  <input
                    type="text"
                    value={String(config[item.key].clean.days)}
                    style={{ width: '6em' }}
                    maxLength={6}
                    onChange={(event) => updateDays(item.key, Number(event.target.value) || 0)}
                  />
                  <span className="ui label">天</span>
                </div>
                {item.key === 'serverAccessLog' ? (
                  <p className="comment">天数包括当天.如果填0表示不自动清理.此设置也会同时作用于日志数据库.</p>
                ) : null}
              </FormRow>
            </FormTable>
            {item.key === 'serverAccessLog' && !moreVisible ? (
              <div>
                <a href="" onClick={(event) => { event.preventDefault(); setMoreVisible(true) }}>
                  更多设置
                </a>
                <div className="margin" />
              </div>
            ) : null}
          </div>
        ))}
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
