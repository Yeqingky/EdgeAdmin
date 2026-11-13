import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, GripVertical, Plus } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import { apiPostMulti, ClusterTabMenu, Modal, parseId, useClusterName } from './shared'

interface NodeGroup {
  id: number
  name: string
  countNodes: number
}

interface GroupsData {
  groups: NodeGroup[]
}

interface ClusterGroupSelectData {
  groups: { id: number; name: string }[]
}

export function ClusterGroupsPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const clusterName = useClusterName(clusterId)
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<NodeGroup | null>(null)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['cluster-groups', clusterId],
    queryFn: () => apiGet<GroupsData>('/clusters/cluster/groups', { clusterId }),
    enabled: clusterId > 0,
  })

  const remove = useMutation({
    mutationFn: (groupId: number) => apiPost('/clusters/cluster/groups/delete', { groupId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-groups', clusterId] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  useEffect(() => {
    if (creating) {
      setName('')
    }
  }, [creating])

  useEffect(() => {
    if (editing) {
      setName(editing.name)
    }
  }, [editing])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const groups = query.data.groups

  async function submit() {
    setSubmitting(true)
    try {
      if (editing) {
        await apiPost('/clusters/cluster/groups/updatePopup', { groupId: editing.id, name })
        toast('保存成功')
      } else {
        await apiPost('/clusters/cluster/groups/createPopup', { clusterId, name })
        toast('保存成功')
      }
      setCreating(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['cluster-groups', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...groups]
    const target = index + direction
    if (target < 0 || target >= next.length) {
      return
    }
    const item = next[index]
    next[index] = next[target]
    next[target] = item
    try {
      await apiPostMulti('/clusters/cluster/groups/sort', { groupIds: next.map((group) => group.id) })
      await queryClient.invalidateQueries({ queryKey: ['cluster-groups', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '排序失败', 'error')
    }
  }

  return (
    <div>
      <ClusterTabMenu clusterId={clusterId} clusterName={clusterName} active="group" />
      <div className="ui menu text blue first-menu">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreating(true)
            setEditing(null)
          }}
        >
          <Plus size={14} /> [创建分组]
        </a>
      </div>

      {groups.length === 0 ? <p className="comment">暂时还没有分组。</p> : null}
      {groups.length > 0 ? (
        <div>
          <div className="margin" />
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '3em' }} />
                <th>分组名称</th>
                <th className="center">节点数</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={group.id}>
                  <td style={{ textAlign: 'center' }}>
                    <GripVertical size={14} className="grey" />
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditing(group)
                        setCreating(false)
                      }}
                    >
                      {group.name}
                    </a>
                  </td>
                  <td className="center">
                    {group.countNodes > 0 ? (
                      <a href={`/clusters/cluster/nodes?clusterId=${clusterId}&groupId=${group.id}`}>{group.countNodes}</a>
                    ) : (
                      <span className="disabled">0</span>
                    )}
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditing(group)
                        setCreating(false)
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;{' '}
                    <a
                      href=""
                      onClick={async (event) => {
                        event.preventDefault()
                        if (await confirm({ message: '确定要删除这个分组吗？', danger: true, confirmText: '删除' })) {
                          remove.mutate(group.id)
                        }
                      }}
                    >
                      删除
                    </a>{' '}
                    &nbsp;
                    <a
                      href=""
                      title="上移"
                      onClick={(event) => {
                        event.preventDefault()
                        void move(index, -1)
                      }}
                    >
                      <ArrowUp size={13} />
                    </a>{' '}
                    <a
                      href=""
                      title="下移"
                      onClick={(event) => {
                        event.preventDefault()
                        void move(index, 1)
                      }}
                    >
                      <ArrowDown size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="comment">可以使用上下箭头排序。</p>
        </div>
      ) : null}

      {creating || editing ? (
        <Modal
          title={editing ? '修改分组' : '创建分组'}
          width="32em"
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        >
          <GroupForm
            name={name}
            submitting={submitting}
            onChange={setName}
            onSubmit={() => void submit()}
            onCancel={() => {
              setCreating(false)
              setEditing(null)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}

function GroupForm({
  name,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  name: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FormTable>
        <FormRow title="分组名称 *">
          <TextInput type="text" maxLength={50} value={name} onChange={(event) => onChange(event.target.value)} autoFocus />
        </FormRow>
      </FormTable>
      <SubmitButton submitting={submitting} />
      <button className="ui button" type="button" onClick={onCancel}>
        取消
      </button>
    </form>
  )
}

export function ClusterGroupCreatePopupPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div>
      <h3>创建分组</h3>
      <GroupForm
        name={name}
        submitting={submitting}
        onChange={setName}
        onCancel={() => {
          window.location.href = `/clusters/cluster/groups?clusterId=${clusterId}`
        }}
        onSubmit={() => {
          setSubmitting(true)
          apiPost('/clusters/cluster/groups/createPopup', { clusterId, name })
            .then(() => {
              toast('保存成功')
              window.location.href = `/clusters/cluster/groups?clusterId=${clusterId}`
            })
            .catch((error: Error) => toast(error.message, 'error'))
            .finally(() => setSubmitting(false))
        }}
      />
    </div>
  )
}

export function ClusterGroupUpdatePopupPage() {
  const [searchParams] = useSearchParams()
  const groupId = parseId(searchParams.get('groupId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-group', groupId],
    queryFn: () => apiGet<{ group: { id: number; name: string } }>('/clusters/cluster/groups/updatePopup', { groupId }),
    enabled: groupId > 0,
  })
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setName(query.data.group.name)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <h3>修改分组</h3>
      <GroupForm
        name={name}
        submitting={submitting}
        onChange={setName}
        onCancel={() => {
          window.location.href = '/clusters'
        }}
        onSubmit={() => {
          setSubmitting(true)
          apiPost('/clusters/cluster/groups/updatePopup', { groupId, name })
            .then(() => {
              toast('保存成功')
              window.location.href = '/clusters'
            })
            .catch((error: Error) => toast(error.message, 'error'))
            .finally(() => setSubmitting(false))
        }}
      />
    </div>
  )
}

export function ClusterGroupSelectPopupPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const query = useQuery({
    queryKey: ['cluster-groups-select', clusterId],
    queryFn: () => apiGet<ClusterGroupSelectData>('/clusters/cluster/groups/selectPopup', { clusterId }),
    enabled: clusterId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <h3>选择所属分组</h3>
      {query.data.groups.length === 0 ? (
        <p className="comment">当前集群下暂时还没有可以使用的分组。</p>
      ) : (
        <div>
          {query.data.groups.map((group) => (
            <a key={group.id} className="ui label small basic" style={{ marginBottom: '0.5em' }} href={`/clusters/cluster/nodes?clusterId=${clusterId}&groupId=${group.id}`}>
              {group.name}
            </a>
          ))}
          <p className="comment">点击可以进入按此分组筛选的节点列表。</p>
        </div>
      )}
    </div>
  )
}
