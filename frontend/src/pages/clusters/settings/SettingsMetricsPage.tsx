import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { ClusterSettingsLayout, Modal, parseId } from '../shared'

interface MetricKey {
  name?: string
  code?: string
}

interface MetricItem {
  id: number
  name: string
  code: string
  isOn: boolean
  period: number
  periodUnit: string
  periodUnitName: string
  keys: MetricKey[] | null
  value: string
  valueName: string
  category: string
  isPublic: boolean
  isChecked?: boolean
}

interface MetricsData {
  category: string
  items: MetricItem[]
}

export function ClusterSettingsMetricsPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const category = searchParams.get('category') || 'http'
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const query = useQuery({
    queryKey: ['cluster-metrics', clusterId, category],
    queryFn: () => apiGet<MetricsData>('/clusters/cluster/settings/metrics', { clusterId, category }),
    enabled: clusterId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function remove(itemId: number) {
    if (!(await confirm({ message: '确定要删除此指标吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/clusters/cluster/settings/metrics/delete', { clusterId, itemId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-metrics', clusterId, category] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/metrics">
      <div className="ui menu text blue first-menu">
        <a className={`item${category === 'http' ? ' active' : ''}`} href={`/clusters/cluster/settings/metrics?category=http&clusterId=${clusterId}`}>
          HTTP
        </a>
        <span className="disabled item">|</span>
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setShowCreate(true)
          }}
        >
          <Plus size={14} /> [添加指标]
        </a>
        <span className="disabled item">|</span>
        <span className="item">在这里设置的指标,会自动应用到部署在当前集群上的所有网站上.</span>
      </div>

      {data.items.length === 0 ? <p className="comment">暂时还没有添加指标.</p> : null}
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
                  {item.name}
                  {item.isPublic || item.code ? (
                    <div style={{ marginTop: '0.3em' }}>
                      {item.isPublic ? <span className="ui label olive tiny basic">公用</span> : null}
                      {item.code ? <span className="ui label olive tiny basic">内置</span> : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  {(item.keys || []).map((key, index) => (
                    <div key={`${key.code || key.name || 'key'}-${index}`} style={{ marginTop: '0.2em', marginBottom: '0.2em' }}>
                      <span className="ui label tiny basic">{key.name || key.code}</span>
                    </div>
                  ))}
                </td>
                <td>
                  {item.period} {item.periodUnitName}
                </td>
                <td>
                  <span className="ui label small basic">{item.valueName}</span>
                </td>
                <td>{item.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void remove(item.id)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showCreate ? (
        <Modal title="可以添加的指标" onClose={() => setShowCreate(false)}>
          <MetricCreateForm
            clusterId={clusterId}
            category={category}
            onClose={() => setShowCreate(false)}
            onChanged={async () => {
              await queryClient.invalidateQueries({ queryKey: ['cluster-metrics', clusterId, category] })
            }}
          />
        </Modal>
      ) : null}
    </ClusterSettingsLayout>
  )
}

interface MetricCreateData {
  category: string
  clusterId: number
  page: string
  items: MetricItem[]
}

function MetricCreateForm({
  clusterId,
  category,
  onClose,
  onChanged,
}: {
  clusterId: number
  category: string
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-metric-create', clusterId, category],
    queryFn: () => apiGet<MetricCreateData>('/clusters/cluster/settings/metrics/createPopup', { clusterId, category }),
  })
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function toggle(item: MetricItem) {
    const isChecked = checked[item.id] ?? item.isChecked
    try {
      if (isChecked) {
        await apiPost('/clusters/cluster/settings/metrics/delete', { clusterId, itemId: item.id })
      } else {
        await apiPost('/clusters/cluster/settings/metrics/createPopup', { clusterId, itemId: item.id })
      }
      setChecked((current) => ({ ...current, [item.id]: !isChecked }))
      await onChanged()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <div>
      {data.items.length === 0 ? <p className="comment">暂时还没有可用的指标.</p> : null}
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
            {data.items.map((item) => {
              const isChecked = checked[item.id] ?? item.isChecked
              return (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    {item.isPublic || item.code ? (
                      <div style={{ marginTop: '0.3em' }}>
                        {item.isPublic ? <span className="ui label olive tiny basic">公用</span> : null}
                        {item.code ? <span className="ui label olive tiny basic">内置</span> : null}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {(item.keys || []).map((key, index) => (
                      <div key={`${key.code || key.name || 'key'}-${index}`} style={{ marginTop: '0.2em', marginBottom: '0.2em' }}>
                        <span className="ui label tiny basic">{key.name || key.code}</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    {item.period} {item.periodUnitName}
                  </td>
                  <td>
                    <span className="ui label small basic">{item.valueName}</span>
                  </td>
                  <td>{item.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                  <td>
                    {!isChecked ? (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void toggle(item)
                        }}
                      >
                        添加
                      </a>
                    ) : (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void toggle(item)
                        }}
                      >
                        <span className="grey">已添加</span>
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data.page} />
      <button className="ui button" type="button" onClick={onClose} style={{ marginTop: '0.8em' }}>
        完成
      </button>
    </div>
  )
}

export function ClusterSettingsMetricCreatePopupPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const category = searchParams.get('category') || 'http'
  return (
    <div>
      <h3>可以添加的指标</h3>
      <MetricCreateForm
        clusterId={clusterId}
        category={category}
        onClose={() => {
          window.location.href = `/clusters/cluster/settings/metrics?clusterId=${clusterId}&category=${category}`
        }}
        onChanged={async () => undefined}
      />
    </div>
  )
}
