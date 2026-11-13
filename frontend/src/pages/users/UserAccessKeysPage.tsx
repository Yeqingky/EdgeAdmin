import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { UserTabs } from './UserTabs'

interface AccessKey {
  id: number
  isOn: boolean
  uniqueId: string
  secret: string
  description: string
  accessedTime: string
}

export function UserAccessKeysPage() {
  const [params] = useSearchParams()
  const userId = Number(params.get('userId') || 0)
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['user-accesskeys', userId], queryFn: () => apiGet<{ accessKeys: AccessKey[] }>('/users/accesskeys', { userId }) })
  const [creating, setCreating] = useState(false)
  const [description, setDescription] = useState('')

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    try {
      await apiPost('/users/accesskeys/createPopup', { csrfToken: await getCsrfToken(), userId, description })
      toast('创建成功')
      setCreating(false)
      setDescription('')
      await queryClient.invalidateQueries({ queryKey: ['user-accesskeys', userId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    }
  }

  async function updateIsOn(accessKey: AccessKey, isOn: boolean) {
    await apiPost('/users/accesskeys/updateIsOn', { accessKeyId: accessKey.id, isOn: isOn ? 1 : '' })
    await queryClient.invalidateQueries({ queryKey: ['user-accesskeys', userId] })
  }

  async function remove(accessKey: AccessKey) {
    if (!(await confirm({ message: `确定要删除 AccessKey ${accessKey.uniqueId} 吗？`, danger: true, confirmText: '删除' }))) {
      return
    }
    await apiPost('/users/accesskeys/delete', { accessKeyId: accessKey.id })
    toast('删除成功')
    await queryClient.invalidateQueries({ queryKey: ['user-accesskeys', userId] })
  }

  return (
    <div>
      <UserTabs userId={userId} active="accessKey" />
      <div className="ui menu text blue first-menu">
        <a href="" className="item" onClick={(event) => { event.preventDefault(); setCreating(true) }}>[创建AccessKey]</a>
      </div>

      {query.data.accessKeys.length === 0 ? <p className="comment">暂时还没有AccessKey。</p> : null}

      {query.data.accessKeys.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th>AccessKey ID</th>
              <th>AccessKey密钥</th>
              <th>备注</th>
              <th>最后访问</th>
              <th>状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {query.data.accessKeys.map((accessKey) => (
              <tr key={accessKey.id}>
                <td className={accessKey.isOn ? undefined : 'disabled'}>{accessKey.uniqueId}</td>
                <td className={accessKey.isOn ? undefined : 'disabled'}>{accessKey.secret}</td>
                <td className={accessKey.isOn ? undefined : 'disabled'}>{accessKey.description}</td>
                <td className={accessKey.isOn ? undefined : 'disabled'}>
                  {accessKey.accessedTime || <span className="disabled">尚无访问</span>}
                </td>
                <td>{accessKey.isOn ? <span className="green">已启用</span> : <span className="disabled">已禁用</span>}</td>
                <td>
                  <a href="" onClick={(event) => { event.preventDefault(); void updateIsOn(accessKey, !accessKey.isOn) }}>
                    {accessKey.isOn ? '禁用' : '启用'}
                  </a>
                  &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void remove(accessKey) }}>删除</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {creating ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', width: '32em' }}>
            <div className="header">创建新AccessKey</div>
            <div className="content">
              <form className="ui form" onSubmit={create}>
                <div className="ui field">
                  <label>备注 *</label>
                  <textarea rows={2} value={description} maxLength={100} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </form>
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => setCreating(false)}>取消</button>
              <button className="ui button primary" onClick={(event) => void create(event)}>保存</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
