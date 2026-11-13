import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EChartsOption } from 'echarts'
import { Trash2, X } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { EChart, FirstMenu, Modal, apiPostMulti, type MenuItemDef } from './common'

/* ------------------------------------------------------------------ */
/* 类型与常量                                                          */
/* ------------------------------------------------------------------ */

interface MetricItem {
  id: number
  name: string
  code: string
  isOn: boolean
  keys: string[]
  value: string
  valueName: string
  period: number
  periodUnit: string
  periodUnitName: string
  category: string
  isPublic: boolean
  countCharts: number
  expiresPeriod: number
}

interface MetricItemData {
  item: MetricItem
}

const metricKeys: { code: string; name: string }[] = [
  { code: '${remoteAddr}', name: '客户端地址(IP)' },
  { code: '${rawRemoteAddr}', name: '直接客户端地址(IP)' },
  { code: '${remoteUser}', name: '客户端用户名' },
  { code: '${requestURI}', name: '请求URI' },
  { code: '${requestPath}', name: '请求路径' },
  { code: '${requestURL}', name: '完整URL' },
  { code: '${requestMethod}', name: '请求方法' },
  { code: '${scheme}', name: '请求协议Scheme' },
  { code: '${requestPathExtension}', name: '文件扩展名' },
  { code: '${requestPathLowerExtension}', name: '小写文件扩展名' },
  { code: '${host}', name: '主机名' },
  { code: '${proto}', name: 'HTTP协议' },
  { code: '${arg.NAME}', name: 'URL参数值' },
  { code: '${referer}', name: '请求来源URL' },
  { code: '${referer.host}', name: '请求来源URL域名' },
  { code: '${header.NAME}', name: 'Header值' },
  { code: '${cookie.NAME}', name: 'Cookie值' },
  { code: '${status}', name: '状态码' },
  { code: '${response.contentType}', name: '响应的Content-Type值' },
]

const metricValues: { code: string; name: string }[] = [
  { code: '${countRequest}', name: '请求数' },
  { code: '${countConnection}', name: '连接数' },
  { code: '${countTrafficOut}', name: '下行流量' },
  { code: '${countTrafficIn}', name: '上行流量' },
]

const periodUnits: { code: string; name: string }[] = [
  { code: 'month', name: '月' },
  { code: 'week', name: '周' },
  { code: 'day', name: '天' },
  { code: 'hour', name: '小时' },
  { code: 'minute', name: '分钟' },
]

const chartTypes: { code: string; name: string; description: string }[] = [
  { code: 'bar', name: '柱图', description: '通过柱图展示各个对象的排行.' },
  { code: 'pie', name: '饼图', description: '通过饼图展示各个对象的占比.' },
  { code: 'timeBar', name: '时间柱图', description: '通过柱图展示各个对象在不同时间段的变化.' },
  { code: 'timeLine', name: '时间线图', description: '通过线图展示各个对象在不同时间段的变化.' },
  { code: 'table', name: '表格', description: '以表格的形式展示数据.' },
]

function keyName(code: string): string {
  const def = metricKeys.find((item) => item.code === code)
  if (def) {
    return def.name
  }
  const prefix = code.split('.')[0]
  const parent = metricKeys.find((item) => item.code.startsWith(prefix) && item.code.endsWith('.NAME'))
  if (parent) {
    return `${parent.name}(${code.substring(code.indexOf('.') + 1, code.length - 1)})`
  }
  return code
}

/* ------------------------------------------------------------------ */
/* 指标表单                                                            */
/* ------------------------------------------------------------------ */

interface MetricFormValues {
  name: string
  keys: string[]
  period: number
  periodUnit: string
  value: string
  expiresPeriod: number
  isPublic: boolean
  isOn: boolean
}

function MetricFormFields({
  values,
  onChange,
  showIsOn,
}: {
  values: MetricFormValues
  onChange: (patch: Partial<MetricFormValues>) => void
  showIsOn?: boolean
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [keyCode, setKeyCode] = useState('')
  const [subKey, setSubKey] = useState('')

  function addKey() {
    if (!keyCode) {
      return
    }
    let code = keyCode
    if (code.includes('.NAME')) {
      if (!subKey) {
        return
      }
      code = code.replace('.NAME', `.${subKey}`)
    }
    onChange({ keys: [...values.keys, code] })
    setKeyCode('')
    setSubKey('')
    setIsAdding(false)
  }

  return (
    <table className="ui table definition selectable">
      <tbody>
        <tr>
          <td className="title">指标名称 *</td>
          <td>
            <input
              type="text"
              maxLength={100}
              value={values.name}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </td>
        </tr>
        <tr>
          <td>统计对象 *</td>
          <td>
            {values.keys.map((key, index) => (
              <span key={`${key}-${index}`} className="ui label small basic" style={{ marginBottom: '0.4em' }}>
                {keyName(key)}
                <a
                  href=""
                  title="删除"
                  style={{ marginLeft: '0.4em' }}
                  onClick={(event) => {
                    event.preventDefault()
                    onChange({ keys: values.keys.filter((_, i) => i !== index) })
                  }}
                >
                  <X size={11} />
                </a>
              </span>
            ))}
            {isAdding ? (
              <div className="ui fields inline" style={{ marginTop: '0.5em' }}>
                <div className="ui field">
                  <select className="ui dropdown" value={keyCode} onChange={(event) => setKeyCode(event.target.value)}>
                    <option value="">[选择对象]</option>
                    {metricKeys.map((def) => (
                      <option key={def.code} value={def.code}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                </div>
                {keyCode.includes('.NAME') ? (
                  <div className="ui field">
                    <input
                      type="text"
                      placeholder="参数名"
                      size={15}
                      value={subKey}
                      onChange={(event) => setSubKey(event.target.value)}
                    />
                  </div>
                ) : null}
                <div className="ui field">
                  <button className="ui button small" type="button" onClick={addKey}>
                    确定
                  </button>
                  <button className="ui button small basic" type="button" onClick={() => setIsAdding(false)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <a href="" onClick={(event) => { event.preventDefault(); setIsAdding(true) }}>
                [添加对象]
              </a>
            )}
          </td>
        </tr>
        <tr>
          <td>统计周期 *</td>
          <td>
            <div className="ui fields inline">
              <div className="ui field">
                <input
                  type="text"
                  style={{ width: '6em' }}
                  maxLength={4}
                  value={values.period}
                  onChange={(event) => onChange({ period: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="ui field">
                <select
                  className="ui dropdown"
                  value={values.periodUnit}
                  onChange={(event) => onChange({ periodUnit: event.target.value })}
                >
                  {periodUnits.map((unit) => (
                    <option key={unit.code} value={unit.code}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td>统计数值 *</td>
          <td>
            <select className="ui dropdown auto-width" value={values.value} onChange={(event) => onChange({ value: event.target.value })}>
              {metricValues.map((def) => (
                <option key={def.code} value={def.code}>
                  {def.name}
                </option>
              ))}
            </select>
          </td>
        </tr>
        <tr>
          <td>数据保留周期</td>
          <td>
            <input
              type="text"
              size={4}
              maxLength={4}
              value={values.expiresPeriod}
              onChange={(event) => onChange({ expiresPeriod: Number(event.target.value) || 0 })}
            />
            <p className="comment">自动删除此周期以外的数据.单位和统计周期一致.不填或者为0,表示自动计算.</p>
          </td>
        </tr>
        <tr>
          <td>公用</td>
          <td>
            <div className="ui checkbox">
              <input
                type="checkbox"
                id="metric-is-public"
                checked={values.isPublic}
                onChange={(event) => onChange({ isPublic: event.target.checked })}
              />
              <label htmlFor="metric-is-public" />
            </div>
            <p className="comment">选中表示所有集群自动使用此指标.</p>
          </td>
        </tr>
        {showIsOn ? (
          <tr>
            <td>启用当前指标</td>
            <td>
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  id="metric-is-on"
                  checked={values.isOn}
                  onChange={(event) => onChange({ isOn: event.target.checked })}
                />
                <label htmlFor="metric-is-on" />
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

function MetricItemMenu({ item, current }: { item: MetricItem; current: 'item' | 'update' | 'chart' | 'stat' }) {
  const items: MenuItemDef[] = [
    { name: '指标列表', href: '/servers/metrics' },
    { name: `"${item.name}"详情`, href: `/servers/metrics/item?itemId=${item.id}`, active: current === 'item' },
    { name: '修改', href: `/servers/metrics/update?itemId=${item.id}`, active: current === 'update' },
    { name: `图表(${item.countCharts})`, href: `/servers/metrics/charts?itemId=${item.id}`, active: current === 'chart' },
    { name: '数据', href: `/servers/metrics/stats?itemId=${item.id}`, active: current === 'stat' },
  ]
  return <FirstMenu items={items} />
}

/* ------------------------------------------------------------------ */
/* 指标列表                                                            */
/* ------------------------------------------------------------------ */

interface MetricsListData {
  category: string
  page: string
  items: MetricItem[]
}

interface CreateMetricModalProps {
  category: string
  onClose: () => void
  onCreated: () => void
}

function CreateMetricModal({ category, onClose, onCreated }: CreateMetricModalProps) {
  const toast = useToast()
  const [values, setValues] = useState<MetricFormValues>({
    name: '',
    keys: [],
    period: 1,
    periodUnit: 'day',
    value: metricValues[0].code,
    expiresPeriod: 0,
    isPublic: true,
    isOn: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!values.name) {
      setError('请输入指标名称')
      return
    }
    if (values.keys.length === 0) {
      setError('请选择指标统计的对象')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/metrics/createPopup', {
        csrfToken: await getCsrfToken(),
        category,
        name: values.name,
        keysJSON: JSON.stringify(values.keys),
        periodJSON: JSON.stringify({ period: values.period, unit: values.periodUnit }),
        value: values.value,
        isPublic: values.isPublic ? 1 : '',
        expiresPeriod: values.expiresPeriod,
      })
      toast('保存成功')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`创建${category.toUpperCase()}统计指标`}
      onClose={onClose}
      width="44em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      {error ? <div className="ui negative message">{error}</div> : null}
      <MetricFormFields
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      />
    </Modal>
  )
}

export function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || 'http'
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'metrics', category, searchParams.toString()],
    queryFn: () => apiGet<MetricsListData>('/servers/metrics', { category, page: searchParams.get('page') || 1 }),
  })

  const remove = useMutation({
    mutationFn: (itemId: number) => apiPost('/servers/metrics/delete', { itemId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'metrics'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function deleteItem(item: MetricItem) {
    if (!(await confirm({ message: '确定要删除此指标吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(item.id)
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: 'HTTP', href: '/servers/metrics?category=http', active: category === 'http' },
        ]}
      >
        <span className="item disabled">|</span>
        <a className="item" href="" onClick={(event) => { event.preventDefault(); setShowCreate(true) }}>
          [创建指标]
        </a>
        <span className="item disabled">|</span>
        <span className="item" title="在这里创建一些指标后,可以在集群中使用这些指标,从而实现阈值,图表等功能">
          ?
        </span>
      </FirstMenu>

      {data.items.length === 0 ? <p className="comment">暂时还没有指标.</p> : null}

      {data.items.length > 0 ? (
        <table className="ui table celled selectable">
          <thead>
            <tr>
              <th>指标名称</th>
              <th>统计对象</th>
              <th>统计周期</th>
              <th className="three wide">统计数值</th>
              <th className="two wide">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href={`/servers/metrics/item?itemId=${item.id}`}>{item.name}</a>
                  {item.isPublic || item.code.length > 0 ? (
                    <div style={{ marginTop: '0.3em' }}>
                      {item.isPublic ? <span className="ui label olive tiny basic">公用</span> : null}
                      {item.code.length > 0 ? <span className="ui label olive tiny basic">内置</span> : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  {(item.keys || []).map((key) => (
                    <div key={key} style={{ marginTop: '0.3em', marginBottom: '0.3em' }}>
                      <span className="ui label small basic">{keyName(key)}</span>
                    </div>
                  ))}
                </td>
                <td>
                  {item.period} {item.periodUnitName}
                </td>
                <td>
                  <span className="ui label small basic">{item.valueName}</span>
                </td>
                <td>
                  {item.isOn ? (
                    <span className="ui label green basic">已启用</span>
                  ) : (
                    <span className="ui label grey basic">已禁用</span>
                  )}
                </td>
                <td>
                  <a href={`/servers/metrics/item?itemId=${item.id}`}>详情</a> &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void deleteItem(item) }}>
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {showCreate ? (
        <CreateMetricModal
          category={category}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['servers-core', 'metrics'] })
            setSearchParams(new URLSearchParams(searchParams))
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 指标详情 / 修改 / 数据                                              */
/* ------------------------------------------------------------------ */

interface MetricItemPageData {
  item: MetricItem
  clusters: { id: number; name: string }[]
}

export function MetricItemPage() {
  const [searchParams] = useSearchParams()
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'metric-item', itemId],
    enabled: itemId > 0,
    queryFn: () => apiGet<MetricItemPageData>('/servers/metrics/item', { itemId }),
  })

  if (itemId <= 0) {
    return <div className="ui negative message">请选择要查看的指标.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const { item, clusters } = query.data

  return (
    <div>
      <MetricItemMenu item={item} current="item" />
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">指标名称</td>
            <td>{item.name}</td>
          </tr>
          <tr>
            <td>状态</td>
            <td>
              {item.isOn ? (
                <span className="ui label green basic">已启用</span>
              ) : (
                <span className="ui label grey basic">已禁用</span>
              )}
            </td>
          </tr>
          <tr>
            <td>统计对象</td>
            <td>
              {(item.keys || []).map((key) => (
                <span key={key} style={{ marginRight: '0.5em' }}>
                  <span className="ui label small basic">{keyName(key)}</span>
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td>统计周期</td>
            <td>
              {item.period} {item.periodUnitName}
            </td>
          </tr>
          <tr>
            <td>统计数值</td>
            <td>
              <span className="ui label small basic">{item.valueName}</span>
            </td>
          </tr>
          <tr>
            <td>数据保留周期</td>
            <td>
              {item.expiresPeriod > 0 ? <span>{item.expiresPeriod}</span> : <span>自动</span>}
              {item.expiresPeriod > 0 ? <p className="comment">单位和统计周期一致.</p> : null}
            </td>
          </tr>
          <tr>
            <td>公用</td>
            <td>{item.isPublic ? <span className="green">公用</span> : <span className="disabled">非公用</span>}</td>
          </tr>
          <tr>
            <td>内置</td>
            <td>{item.code.length > 0 ? <span className="green">内置</span> : <span className="disabled">自建</span>}</td>
          </tr>
        </tbody>
      </table>

      <h4>绑定此指标的集群</h4>
      {clusters.length === 0 ? <p className="comment">暂时还没有集群使用此策略.</p> : null}
      {clusters.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td>
                  {cluster.name}
                  <a href={`/clusters/cluster?clusterId=${cluster.id}`} style={{ marginLeft: '0.3em' }}>
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export function MetricUpdatePage() {
  const [searchParams] = useSearchParams()
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState<MetricFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'metric-item', itemId],
    enabled: itemId > 0,
    queryFn: () => apiGet<MetricItemData>('/servers/metrics/update', { itemId }),
  })

  if (query.data && !values) {
    const item = query.data.item
    setValues({
      name: item.name,
      keys: item.keys || [],
      period: item.period,
      periodUnit: item.periodUnit,
      value: item.value,
      expiresPeriod: item.expiresPeriod,
      isPublic: item.isPublic,
      isOn: item.isOn,
    })
  }

  if (itemId <= 0) {
    return <div className="ui negative message">请选择要修改的指标.</div>
  }
  if (query.isLoading || !query.data || !values) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const item = query.data.item

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/metrics/update', {
        csrfToken: await getCsrfToken(),
        itemId,
        name: values.name,
        keysJSON: JSON.stringify(values.keys),
        periodJSON: JSON.stringify({ period: values.period, unit: values.periodUnit }),
        expiresPeriod: values.expiresPeriod,
        value: values.value,
        isOn: values.isOn ? 1 : '',
        isPublic: values.isPublic ? 1 : '',
      })
      toast('保存成功')
      navigate(`/servers/metrics/item?itemId=${itemId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <MetricItemMenu item={item} current="update" />
      <div className="ui warning message">修改统计对象,统计周期,统计数值等任一参数时,将重新记录数据.</div>
      <form className="ui form" onSubmit={(event) => void submit(event)}>
        <MetricFormFields
          values={values}
          onChange={(patch) => setValues((current) => (current ? { ...current, ...patch } : current))}
          showIsOn
        />
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

interface MetricStat {
  id: number
  time: string
  keys: string
  value: number
  ratio: string
  cluster: { id: number; name: string }
  node: { id: number; name: string }
  server: { id: number; name: string }
}

interface MetricStatsData {
  item: MetricItem
  stats: MetricStat[]
  page: string
}

export function MetricStatsPage() {
  const [searchParams] = useSearchParams()
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'metric-stats', itemId, searchParams.toString()],
    enabled: itemId > 0,
    queryFn: () =>
      apiGet<MetricStatsData>('/servers/metrics/stats', { itemId, page: searchParams.get('page') || 1 }),
  })

  if (itemId <= 0) {
    return <div className="ui negative message">请选择要查看的指标.</div>
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
      <MetricItemMenu item={data.item} current="stat" />
      {data.stats.length === 0 ? <p className="comment">暂时还没有统计数据.</p> : null}
      {data.stats.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>指标对象</th>
              <th>指标值</th>
              <th>占比</th>
              <th>时间</th>
              <th>集群</th>
              <th>节点</th>
              <th>网站</th>
            </tr>
          </thead>
          <tbody>
            {data.stats.map((stat) => (
              <tr key={stat.id}>
                <td>{stat.keys}</td>
                <td>{stat.value}</td>
                <td>{stat.ratio}%</td>
                <td>{stat.time}</td>
                <td>{stat.cluster.name}</td>
                <td>{stat.node.name}</td>
                <td>
                  {stat.server.name}
                  <a href={`/servers/server/stat?serverId=${stat.server.id}`} style={{ marginLeft: '0.3em' }}>
                    ↗
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

/* ------------------------------------------------------------------ */
/* 指标图表                                                            */
/* ------------------------------------------------------------------ */

interface MetricChart {
  id: number
  name: string
  type: string
  typeName: string
  isOn: boolean
  widthDiv: number
  maxItems: number
  ignoreEmptyKeys: boolean
  ignoredKeys: string[]
}

interface ChartsListData {
  item: MetricItem
  charts: MetricChart[]
  page: string
}

interface ChartData {
  item: MetricItem
  chart: MetricChart
}

interface ChartFormValues {
  name: string
  type: string
  maxItems: number
  ignoreEmptyKeys: boolean
  ignoredKeysText: string
  isOn: boolean
}

const emptyChartForm: ChartFormValues = {
  name: '',
  type: chartTypes[0].code,
  maxItems: 0,
  ignoreEmptyKeys: false,
  ignoredKeysText: '',
  isOn: true,
}

function ChartFormFields({
  values,
  onChange,
  showIsOn,
}: {
  values: ChartFormValues
  onChange: (patch: Partial<ChartFormValues>) => void
  showIsOn?: boolean
}) {
  const currentType = chartTypes.find((item) => item.code === values.type)
  return (
    <table className="ui table definition selectable">
      <tbody>
        <tr>
          <td className="title">图表名称 *</td>
          <td>
            <input
              type="text"
              maxLength={100}
              value={values.name}
              onChange={(event) => onChange({ name: event.target.value })}
            />
            <p className="comment">也会作为有些图表的标题.</p>
          </td>
        </tr>
        <tr>
          <td>图表类型 *</td>
          <td>
            <select className="ui dropdown auto-width" value={values.type} onChange={(event) => onChange({ type: event.target.value })}>
              {chartTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
            {currentType ? <p className="comment">{currentType.description}</p> : null}
          </td>
        </tr>
        {showIsOn ? (
          <tr>
            <td>启用当前图表</td>
            <td>
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  id="chart-is-on"
                  checked={values.isOn}
                  onChange={(event) => onChange({ isOn: event.target.checked })}
                />
                <label htmlFor="chart-is-on" />
              </div>
            </td>
          </tr>
        ) : null}
        <tr>
          <td>对象数限制</td>
          <td>
            <input
              type="text"
              maxLength={2}
              style={{ width: '4em' }}
              value={values.maxItems}
              onChange={(event) => onChange({ maxItems: Number(event.target.value) || 0 })}
            />
            <p className="comment">在图表中能显示的最多对象数,0表示不限制.</p>
          </td>
        </tr>
        <tr>
          <td>忽略空值对象</td>
          <td>
            <div className="ui checkbox">
              <input
                type="checkbox"
                id="chart-ignore-empty"
                checked={values.ignoreEmptyKeys}
                onChange={(event) => onChange({ ignoreEmptyKeys: event.target.checked })}
              />
              <label htmlFor="chart-ignore-empty" />
            </div>
            <p className="comment">选中后,空的对象值不会在图表中出现.</p>
          </td>
        </tr>
        <tr>
          <td>忽略其他对象</td>
          <td>
            <textarea
              rows={3}
              placeholder="每行一个对象"
              value={values.ignoredKeysText}
              onChange={(event) => onChange({ ignoredKeysText: event.target.value })}
            />
            <p className="comment">这些对象不会在图表中出现.</p>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

interface CreateChartModalProps {
  itemId: number
  onClose: () => void
  onCreated: () => void
}

function CreateChartModal({ itemId, onClose, onCreated }: CreateChartModalProps) {
  const toast = useToast()
  const [values, setValues] = useState<ChartFormValues>(emptyChartForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!values.name) {
      setError('请输入图表名称')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const entries: Array<[string, string | number]> = [
        ['csrfToken', await getCsrfToken()],
        ['itemId', itemId],
        ['name', values.name],
        ['type', values.type],
        ['maxItems', values.maxItems],
        ['ignoreEmptyKeys', values.ignoreEmptyKeys ? 1 : ''],
      ]
      for (const key of values.ignoredKeysText.split('\n')) {
        const trimmed = key.trim()
        if (trimmed) {
          entries.push(['ignoredKeys', trimmed])
        }
      }
      await apiPostMulti('/servers/metrics/charts/createPopup', entries)
      toast('保存成功')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="创建图表"
      onClose={onClose}
      width="44em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      {error ? <div className="ui negative message">{error}</div> : null}
      <ChartFormFields values={values} onChange={(patch) => setValues((current) => ({ ...current, ...patch }))} />
    </Modal>
  )
}

export function MetricChartsPage() {
  const [searchParams] = useSearchParams()
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'metric-charts', itemId, searchParams.toString()],
    enabled: itemId > 0,
    queryFn: () =>
      apiGet<ChartsListData>('/servers/metrics/charts', { itemId, page: searchParams.get('page') || 1 }),
  })

  const remove = useMutation({
    mutationFn: (chartId: number) => apiPost('/servers/metrics/charts/delete', { chartId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'metric-charts'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (itemId <= 0) {
    return <div className="ui negative message">请选择要查看的指标.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function deleteChart(chart: MetricChart) {
    if (!(await confirm({ message: '确定要删除这个图表吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(chart.id)
  }

  return (
    <div>
      <MetricItemMenu item={data.item} current="chart" />
      <FirstMenu>
        <a className="item" href="" onClick={(event) => { event.preventDefault(); setShowCreate(true) }}>
          [创建图表]
        </a>
      </FirstMenu>

      {data.charts.length === 0 ? <p className="comment">暂时还没有图表.</p> : null}
      {data.charts.length > 0 ? (
        <table className="ui table celled selectable">
          <thead>
            <tr>
              <th>图表名称</th>
              <th>类型</th>
              <th className="two wide">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.charts.map((chart) => (
              <tr key={chart.id}>
                <td>{chart.name}</td>
                <td>{chart.typeName}</td>
                <td>
                  {chart.isOn ? (
                    <span className="ui label green basic">已启用</span>
                  ) : (
                    <span className="ui label grey basic">已禁用</span>
                  )}
                </td>
                <td>
                  <a href={`/servers/metrics/charts/chart?chartId=${chart.id}`}>详情</a> &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void deleteChart(chart) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data.page} />

      {showCreate ? (
        <CreateChartModal
          itemId={itemId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['servers-core', 'metric-charts'] })
          }}
        />
      ) : null}
    </div>
  )
}

interface TestStat {
  keys: string[]
  value: number
  total: number
  time: string
}

function MetricChartPreview({ chart, stats }: { chart: MetricChart; stats: TestStat[] }) {
  if (chart.type === 'table') {
    return (
      <table className="ui table selectable celled">
        <thead>
          <tr>
            <th>对象</th>
            <th>数值</th>
            <th>占比</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, index) => (
            <tr key={index}>
              <td>{stat.keys.join(', ')}</td>
              <td>{stat.value}</td>
              <td>{stat.total > 0 ? `${Math.round((stat.value * 10000) / stat.total) / 100}%` : '0%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (chart.type === 'pie') {
    const option: EChartsOption = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: stats.map((stat) => ({ name: stat.keys.join(', '), value: stat.value })),
        },
      ],
    }
    return <EChart option={option} />
  }

  if (chart.type === 'timeBar' || chart.type === 'timeLine') {
    const option: EChartsOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: stats.map((stat) => stat.time) },
      yAxis: { type: 'value' },
      series: [
        {
          type: chart.type === 'timeBar' ? 'bar' : 'line',
          smooth: true,
          data: stats.map((stat) => stat.value),
        },
      ],
    }
    return <EChart option={option} />
  }

  const option: EChartsOption = {
    tooltip: { trigger: 'item' },
    xAxis: { type: 'category', data: stats.map((stat) => stat.keys.join(', ')) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: stats.map((stat) => stat.value), barWidth: '10em' }],
  }
  return <EChart option={option} />
}

export function MetricChartPage() {
  const [searchParams] = useSearchParams()
  const chartId = Number(searchParams.get('chartId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'metric-chart', chartId],
    enabled: chartId > 0,
    queryFn: () => apiGet<ChartData>('/servers/metrics/charts/chart', { chartId }),
  })

  if (chartId <= 0) {
    return <div className="ui negative message">请选择要查看的图表.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const { chart, item } = query.data
  const testingStats: TestStat[] = [12, 34, 56, 78, 45, 90].map((value, index) => {
    const total = 315
    const date = new Date()
    let time = ''
    switch (item.periodUnit) {
      case 'month':
        date.setMonth(date.getMonth() - (5 - index))
        time = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'week':
        time = `${date.getFullYear()}${String(50 + index - 6).padStart(2, '0')}`
        break
      case 'day':
        date.setDate(date.getDate() - (5 - index))
        time = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
        break
      case 'hour':
        date.setHours(date.getHours() - (5 - index))
        time = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}`
        break
      default:
        date.setMinutes(date.getMinutes() - (5 - index))
        time = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
        break
    }
    return { keys: [`对象${index + 1}`], value, total, time }
  })

  return (
    <div>
      <MetricItemMenu item={item} current="chart" />
      <FirstMenu
        items={[
          { name: '图表列表', href: `/servers/metrics/charts?itemId=${item.id}` },
          { name: `详情"${chart.name}"`, href: `/servers/metrics/charts/chart?chartId=${chart.id}`, active: true },
          { name: '修改', href: `/servers/metrics/charts/update?chartId=${chart.id}` },
        ]}
      />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">图表名称</td>
            <td>{chart.name}</td>
          </tr>
          <tr>
            <td>状态</td>
            <td>
              {chart.isOn ? (
                <span className="ui label green basic">已启用</span>
              ) : (
                <span className="ui label grey basic">已禁用</span>
              )}
            </td>
          </tr>
          <tr>
            <td>图表类型</td>
            <td>{chart.typeName}</td>
          </tr>
          <tr>
            <td>对象数限制</td>
            <td>{chart.maxItems <= 0 ? <span className="disabled">没有限制</span> : chart.maxItems}</td>
          </tr>
          <tr>
            <td>忽略空值对象</td>
            <td>{chart.ignoreEmptyKeys ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
          </tr>
          <tr>
            <td>忽略其他对象</td>
            <td>
              {(chart.ignoredKeys || []).length > 0 ? (
                (chart.ignoredKeys || []).map((key) => (
                  <span key={key} className="ui label basic small">
                    {key}
                  </span>
                ))
              ) : (
                <span className="disabled">没有要忽略的对象.</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <h4>图表示例</h4>
      <p className="comment">
        <span className="red">图中数据均为测试数据.</span>
      </p>
      <MetricChartPreview chart={chart} stats={testingStats} />
      <p className="comment">指标:{item.name}({item.valueName},每 {item.period}{item.periodUnitName})</p>
    </div>
  )
}

export function MetricChartUpdatePage() {
  const [searchParams] = useSearchParams()
  const chartId = Number(searchParams.get('chartId') || 0) || 0
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState<ChartFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'metric-chart', chartId],
    enabled: chartId > 0,
    queryFn: () => apiGet<ChartData>('/servers/metrics/charts/update', { chartId }),
  })

  if (query.data && !values) {
    const chart = query.data.chart
    setValues({
      name: chart.name,
      type: chart.type,
      maxItems: chart.maxItems,
      ignoreEmptyKeys: chart.ignoreEmptyKeys,
      ignoredKeysText: (chart.ignoredKeys || []).join('\n'),
      isOn: chart.isOn,
    })
  }

  if (chartId <= 0) {
    return <div className="ui negative message">请选择要修改的图表.</div>
  }
  if (query.isLoading || !query.data || !values) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const { item, chart } = query.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values) {
      return
    }
    setSubmitting(true)
    try {
      const entries: Array<[string, string | number]> = [
        ['csrfToken', await getCsrfToken()],
        ['chartId', chartId],
        ['name', values.name],
        ['type', values.type],
        ['maxItems', values.maxItems],
        ['ignoreEmptyKeys', values.ignoreEmptyKeys ? 1 : ''],
        ['isOn', values.isOn ? 1 : ''],
      ]
      for (const key of values.ignoredKeysText.split('\n')) {
        const trimmed = key.trim()
        if (trimmed) {
          entries.push(['ignoredKeys', trimmed])
        }
      }
      await apiPostMulti('/servers/metrics/charts/update', entries)
      toast('保存成功')
      navigate(`/servers/metrics/charts/chart?chartId=${chartId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <MetricItemMenu item={item} current="chart" />
      <FirstMenu
        items={[
          { name: '图表列表', href: `/servers/metrics/charts?itemId=${item.id}` },
          { name: `详情"${chart.name}"`, href: `/servers/metrics/charts/chart?chartId=${chart.id}` },
          { name: '修改', href: `/servers/metrics/charts/update?chartId=${chart.id}`, active: true },
        ]}
      />
      <form className="ui form" onSubmit={(event) => void submit(event)}>
        <ChartFormFields
          values={values}
          onChange={(patch) => setValues((current) => (current ? { ...current, ...patch } : current))}
          showIsOn
        />
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
      <p className="comment">
        指标:{item.name}(每 {item.period} {item.periodUnitName})
      </p>
    </div>
  )
}
