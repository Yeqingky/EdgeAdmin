import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { GroupCreateForm } from './GroupsPage'

export function GroupCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <h3>创建分组</h3>
      <GroupCreateForm onDone={() => navigate('/servers/groups')} />
    </div>
  )
}

interface GroupOption {
  id: number
  name: string
}

interface SelectGroupsData {
  groups: GroupOption[]
}

export function GroupSelectPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const selectedGroupIds = searchParams.get('selectedGroupIds') || ''
  const [groupId, setGroupId] = useState(0)

  const query = useQuery({
    queryKey: ['group-select', selectedGroupIds],
    queryFn: () => apiGet<SelectGroupsData>('/servers/groups/selectPopup', { selectedGroupIds }),
  })

  const mutation = useMutation({
    mutationFn: () => {
      if (groupId <= 0) {
        throw new Error('请选择要使用的分组')
      }
      return apiPost('/servers/groups/selectPopup', { groupId })
    },
    onSuccess: () => {
      toast('选择成功')
      navigate(-1)
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

  return (
    <div>
      <h3>选择分组</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">选择分组</td>
              <td>
                {groups.length > 0 ? (
                  <div>
                    {groups.map((group) => (
                      <a
                        key={group.id}
                        href=""
                        className={`ui label small basic${group.id === groupId ? ' blue' : ''}`}
                        style={{ marginBottom: '0.5em' }}
                        onClick={(event) => {
                          event.preventDefault()
                          setGroupId(group.id)
                        }}
                      >
                        {group.name}
                      </a>
                    ))}
                    <p className="comment">点击可以选中要使用的分组.</p>
                  </div>
                ) : (
                  <p className="comment">暂时还没有可以使用的分组.</p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
            确定
          </button>
        </div>
      </form>
    </div>
  )
}
