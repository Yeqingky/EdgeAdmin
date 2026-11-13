import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { GroupFirstMenu, type GroupBasic } from '../shared'

interface GroupUpdateData {
  group: GroupBasic
}

export function GroupUpdatePage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const [name, setName] = useState('')

  const query = useQuery({
    queryKey: ['server-group-update', groupId],
    queryFn: () => apiGet<GroupUpdateData>('/servers/groups/group/update', { groupId }),
    enabled: groupId > 0,
  })

  useEffect(() => {
    if (query.data) {
      setName(query.data.group.name)
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => apiPost('/servers/groups/group/update', { groupId, name }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-groups'] })
      await queryClient.invalidateQueries({ queryKey: ['server-group'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  const group = query.data.group

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入分组名称', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <div>
      <GroupFirstMenu group={group} active="update" />
      <form method="post" className="ui form" onSubmit={submit}>
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
    </div>
  )
}
