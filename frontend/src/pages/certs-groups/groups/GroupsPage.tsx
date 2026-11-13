import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { PageHeader } from '../../../components/PageHeader'
import { Modal, postForm } from '../shared'

interface ServerGroupRow {
  id: number
  name: string
  countServers: number
}

interface GroupsData {
  groups: ServerGroupRow[]
}

export function GroupsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [createVisible, setCreateVisible] = useState(false)

  const query = useQuery({
    queryKey: ['server-groups'],
    queryFn: () => apiGet<GroupsData>('/servers/groups', {}),
  })

  const remove = useMutation({
    mutationFn: (groupId: number) => apiPost('/servers/groups/group/delete', { groupId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['server-groups'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const sort = useMutation({
    mutationFn: (groupIds: number[]) => postForm('/servers/groups/sort', { groupIds }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-groups'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const groups = query.data.groups

  async function deleteGroup(group: ServerGroupRow) {
    if (!(await confirm({ message: '确定要删除这个分组吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(group.id)
  }

  function move(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= groups.length) {
      return
    }
    const next = groups.slice()
    const current = next[index]
    next[index] = next[target]
    next[target] = current
    sort.mutate(next.map((group) => group.id))
  }

  return (
    <div>
      <PageHeader items={[{ name: '列表', href: '#/servers/groups', active: true }]}>
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreateVisible(true)
          }}
        >
          [创建]
        </a>
      </PageHeader>

      {groups.length === 0 ? <p className="comment">暂时还没有分组。</p> : null}

      {groups.length > 0 ? (
        <div>
          <div className="margin" />
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '3em' }} />
                <th>分组名称</th>
                <th className="center width10">服务数量</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={group.id}>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button className="ui button tiny basic" type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                      ↑
                    </button>
                    <button className="ui button tiny basic" type="button" disabled={index === groups.length - 1} onClick={() => move(index, 1)}>
                      ↓
                    </button>
                  </td>
                  <td>
                    <a href={`#/servers/groups/group?groupId=${group.id}`}>{group.name}</a>
                  </td>
                  <td className="center">
                    {group.countServers > 0 ? (
                      <a href={`#/servers?groupId=${group.id}`}>{group.countServers}</a>
                    ) : (
                      <span className="disabled">0</span>
                    )}
                  </td>
                  <td>
                    <a href={`#/servers/groups/group?groupId=${group.id}`}>详情</a> &nbsp;{' '}
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteGroup(group)
                      }}
                    >
                      删除
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {groups.length > 0 ? <p className="comment">可以点击箭头调整分组顺序（对应拖拽排序）。</p> : null}

      {createVisible ? (
        <Modal title="创建分组" onClose={() => setCreateVisible(false)} width="36em">
          <GroupCreateForm onDone={() => setCreateVisible(false)} />
        </Modal>
      ) : null}
    </div>
  )
}

export function GroupCreateForm({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const mutation = useMutation({
    mutationFn: () => apiPost<{ group: ServerGroupRow }>('/servers/groups/createPopup', { name }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-groups'] })
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入分组名称', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">分组名称 *</td>
            <td>
              <input type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}
