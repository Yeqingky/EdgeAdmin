import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, GripVertical, Plus } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { Modal, RegionsMenu, apiPostMulti, parseId } from './shared'

interface RegionRow {
  id: number
  isOn: boolean
  name: string
  description: string
  countNodes: number
}

interface RegionsData {
  regions: RegionRow[]
}

async function postWithCsrf(url: string, params: Record<string, unknown>) {
  const csrfToken = await getCsrfToken()
  return apiPost(url, { ...params, csrfToken })
}

export function RegionsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<RegionRow | null>(null)
  const query = useQuery({ queryKey: ['regions'], queryFn: () => apiGet<RegionsData>('/clusters/regions') })

  async function remove(regionId: number) {
    if (!(await confirm({ message: '确定要删除这个区域吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postWithCsrf('/clusters/regions/delete', { regionId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['regions'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const regions = query.data.regions

  async function move(index: number, direction: -1 | 1) {
    const next = [...regions]
    const target = index + direction
    if (target < 0 || target >= next.length) {
      return
    }
    const item = next[index]
    next[index] = next[target]
    next[target] = item
    try {
      const csrfToken = await getCsrfToken()
      await apiPostMulti('/clusters/regions/sort', { regionIds: next.map((region) => region.id), csrfToken: [csrfToken] })
      await queryClient.invalidateQueries({ queryKey: ['regions'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '排序失败', 'error')
    }
  }

  return (
    <div>
      <RegionsMenu active="index" />
      <div className="ui menu text blue second-menu">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreating(true)
            setEditing(null)
          }}
        >
          <Plus size={14} /> [创建区域]
        </a>
      </div>

      {regions.length === 0 ? <p className="comment">暂时还没有区域.</p> : null}
      {regions.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th style={{ width: '3em' }} />
              <th className="width10">区域名称</th>
              <th>区域说明</th>
              <th className="width10 center">节点数</th>
              <th className="width10">区域状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((region, index) => (
              <tr key={region.id}>
                <td style={{ textAlign: 'center' }}>
                  <GripVertical size={14} className="grey" />
                </td>
                <td className={region.isOn ? undefined : 'disabled'}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setEditing(region)
                      setCreating(false)
                    }}
                  >
                    {region.name}
                  </a>
                </td>
                <td>{region.description ? region.description : <span className="disabled">-</span>}</td>
                <td className="center">
                  <a href={`/clusters/regions/nodes?regionId=${region.id}`}>
                    <span className={region.countNodes === 0 ? 'disabled' : undefined}>{region.countNodes}</span>
                  </a>
                </td>
                <td>{region.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setEditing(region)
                      setCreating(false)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;{' '}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void remove(region.id)
                    }}
                  >
                    删除
                  </a>{' '}
                  &nbsp;
                  <a href="" title="上移" onClick={(event) => { event.preventDefault(); void move(index, -1) }}>
                    <ArrowUp size={13} />
                  </a>{' '}
                  <a href="" title="下移" onClick={(event) => { event.preventDefault(); void move(index, 1) }}>
                    <ArrowDown size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {regions.length > 0 ? <p className="comment">可以使用上下箭头排序.</p> : null}

      {creating || editing ? (
        <Modal
          title={editing ? '修改区域' : '创建区域'}
          width="36em"
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        >
          <RegionForm
            region={editing}
            onCancel={() => {
              setCreating(false)
              setEditing(null)
            }}
            onSaved={async () => {
              setCreating(false)
              setEditing(null)
              await queryClient.invalidateQueries({ queryKey: ['regions'] })
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}

function RegionForm({ region, onCancel, onSaved }: { region: RegionRow | null; onCancel: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const [name, setName] = useState(region?.name || '')
  const [description, setDescription] = useState(region?.description || '')
  const [isOn, setIsOn] = useState(region?.isOn ?? true)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (region) {
        await postWithCsrf('/clusters/regions/updatePopup', { regionId: region.id, name, description, isOn: isOn ? 1 : '' })
      } else {
        await postWithCsrf('/clusters/regions/createPopup', { name, description })
      }
      toast('保存成功')
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="区域名称 *">
          <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </FormRow>
        <FormRow title="区域说明">
          <textarea name="description" rows={3} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormRow>
        {region ? (
          <FormRow title="启用">
            <Checkbox label="" checked={isOn} onChange={setIsOn} />
          </FormRow>
        ) : null}
      </FormTable>
      <SubmitButton submitting={submitting} />
      <button className="ui button" type="button" onClick={onCancel} style={{ marginLeft: '0.5em' }}>
        取消
      </button>
    </form>
  )
}

interface RegionNodesData {
  regionId: number
  regions: { id: number; name: string }[]
  page: string
  hasNodesWithoutRegion: boolean
  nodes: { id: number; name: string; region: { id: number; name: string } | null; cluster: { id: number; name: string } | null }[]
}

export function RegionNodesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const regionId = parseId(searchParams.get('regionId'))
  const queryClient = useQueryClient()
  const [editingNode, setEditingNode] = useState<{ id: number; name: string; regionId: number } | null>(null)
  const query = useQuery({
    queryKey: ['region-nodes', regionId],
    queryFn: () => apiGet<RegionNodesData>('/clusters/regions/nodes', { regionId }),
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
      <RegionsMenu active="node" />
      {data.regions.length > 0 ? (
        <form
          className="ui form"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const next = new URLSearchParams()
            const value = String(form.get('regionId') || '0')
            if (value !== '0') {
              next.set('regionId', value)
            }
            setSearchParams(next)
          }}
        >
          <div className="margin" />
          <div className="ui fields inline">
            <div className="ui field">
              <select className="ui dropdown" name="regionId" defaultValue={regionId}>
                <option value="0">[所有区域]</option>
                {data.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="ui field">
              <button type="submit" className="ui button">
                搜索
              </button>
              &nbsp;
              {regionId > 0 ? <a href="/clusters/regions/nodes">[清除条件]</a> : null}
            </div>
          </div>
        </form>
      ) : null}

      {data.nodes.length === 0 ? (
        <p className="comment">
          <span>{regionId > 0 ? '当前区域下' : ''}暂时还没有节点.</span>
        </p>
      ) : null}

      {data.nodes.length > 0 ? (
        <div>
          <div className="margin" />
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th>节点</th>
                <th style={{ width: '30%' }}>集群</th>
                <th style={{ width: '30%' }}>区域</th>
                <th className="one op">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.nodes
                .filter((node) => node.cluster !== null)
                .map((node) => (
                  <tr key={node.id}>
                    <td>
                      <a href={`/clusters/cluster/node/detail?clusterId=${node.cluster!.id}&nodeId=${node.id}`}>{node.name}</a>
                    </td>
                    <td>{node.cluster ? node.cluster.name : <span className="disabled">-</span>}</td>
                    <td>{node.region ? node.region.name : <span className="disabled">尚未设置</span>}</td>
                    <td>
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setEditingNode({ id: node.id, name: node.name, regionId: node.region?.id || 0 })
                        }}
                      >
                        {node.region ? '修改' : '设置'}
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {data.hasNodesWithoutRegion ? <p className="comment">已经将未设置区域的节点排在了表格最前面.</p> : null}
        </div>
      ) : null}

      <LegacyPagination html={data.page} />

      {editingNode ? (
        <Modal title={editingNode.regionId > 0 ? '修改节点区域' : '设置节点区域'} width="34em" onClose={() => setEditingNode(null)}>
          <form
            className="ui form"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await postWithCsrf('/clusters/regions/updateNodeRegionPopup', { nodeId: editingNode.id, regionId: editingNode.regionId })
                setEditingNode(null)
                await queryClient.invalidateQueries({ queryKey: ['region-nodes'] })
              } catch (error) {
                // 保留弹窗,提示由提交按钮状态体现
                window.alert(error instanceof Error ? error.message : '保存失败')
              }
            }}
          >
            <FormTable>
              <FormRow title="节点">{editingNode.name}</FormRow>
              <FormRow title="区域 *">
                <Select value={editingNode.regionId} onChange={(event) => setEditingNode({ ...editingNode, regionId: Number(event.target.value) })}>
                  <option value="0">[选择区域]</option>
                  {data.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </Select>
              </FormRow>
            </FormTable>
            <SubmitButton />
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

export function RegionCreatePopupPage() {
  const toast = useToast()
  return (
    <div>
      <h3>创建区域</h3>
      <RegionForm
        region={null}
        onCancel={() => {
          window.location.href = '/clusters/regions'
        }}
        onSaved={async () => {
          toast('保存成功')
          window.location.href = '/clusters/regions'
        }}
      />
    </div>
  )
}

export function RegionUpdatePopupPage() {
  const [searchParams] = useSearchParams()
  const regionId = parseId(searchParams.get('regionId'))
  const query = useQuery({
    queryKey: ['region-edit', regionId],
    queryFn: () => apiGet<{ region: RegionRow }>('/clusters/regions/updatePopup', { regionId }),
    enabled: regionId > 0,
  })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>修改区域</h3>
      <RegionForm
        region={query.data.region}
        onCancel={() => {
          window.location.href = '/clusters/regions'
        }}
        onSaved={async () => {
          window.location.href = '/clusters/regions'
        }}
      />
    </div>
  )
}

interface UpdateNodeRegionData {
  node: { id: number; name: string }
  region: { id: number; name: string }
  regions: { id: number; name: string }[]
}

export function RegionUpdateNodeRegionPopupPage() {
  const [searchParams] = useSearchParams()
  const nodeId = parseId(searchParams.get('nodeId'))
  const regionId = parseId(searchParams.get('regionId'))
  const query = useQuery({
    queryKey: ['node-region-popup', nodeId, regionId],
    queryFn: () => apiGet<UpdateNodeRegionData>('/clusters/regions/updateNodeRegionPopup', { nodeId, regionId }),
    enabled: nodeId > 0,
  })
  const [selected, setSelected] = useState(regionId)
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setSelected(regionId)
  }, [regionId])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  return (
    <div>
      <h3>{data.region.id > 0 ? '修改节点区域' : '设置节点区域'}</h3>
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await postWithCsrf('/clusters/regions/updateNodeRegionPopup', { nodeId: data.node.id, regionId: selected })
            toast('保存成功')
            window.location.href = '/clusters/regions/nodes'
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="节点">{data.node.name}</FormRow>
          <FormRow title="区域 *">
            <Select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>
              <option value="0">[选择区域]</option>
              {data.regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}

export function RegionSelectPopupPage() {
  const [searchParams] = useSearchParams()
  const regionId = parseId(searchParams.get('regionId'))
  const query = useQuery({
    queryKey: ['region-select'],
    queryFn: () => apiGet<{ regions: { id: number; name: string }[] }>('/clusters/regions/selectPopup'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <h3>选择所属区域</h3>
      {query.data.regions.length === 0 ? (
        <p className="comment">暂时还没有可以使用的区域.</p>
      ) : (
        <div>
          {query.data.regions.map((region) => (
            <a
              key={region.id}
              href={`/clusters/regions/nodes?regionId=${region.id}`}
              className={`ui label small basic${region.id === regionId ? ' blue' : ''}`}
              style={{ marginBottom: '0.5em' }}
            >
              {region.name}
            </a>
          ))}
          <p className="comment">点击可以查看该区域下的节点.</p>
        </div>
      )}
    </div>
  )
}
