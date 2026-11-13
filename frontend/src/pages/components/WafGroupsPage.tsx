import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { postFormValues, WafMenu, type WafGroup } from './common'

interface WafGroupsData {
  groups: WafGroup[]
  type: string
  firewallPolicyId: number
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

export function WafGroupsPage({ firewallPolicyId, type }: { firewallPolicyId: number; type: string }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-groups', firewallPolicyId, type],
    queryFn: () => apiGet<WafGroupsData>('/servers/components/waf/groups', { firewallPolicyId, type }),
    enabled: firewallPolicyId > 0,
  })
  const [groups, setGroups] = useState<WafGroup[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (query.data) {
      setGroups(query.data.groups || [])
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function saveOrder(nextGroups: WafGroup[]) {
    setGroups(nextGroups)
    try {
      await postFormValues('/servers/components/waf/sortGroups', {
        firewallPolicyId,
        type,
        groupIds: nextGroups.map((group) => group.id),
      })
      toast('排序保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '排序保存失败', 'error')
    }
  }

  function dropAt(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      return
    }
    const next = [...groups]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    setDragIndex(null)
    void saveOrder(next)
  }

  async function updateGroupOn(group: WafGroup, isOn: boolean) {
    try {
      await postFormValues('/servers/components/waf/updateGroupOn', { groupId: group.id, isOn: isOn ? 1 : 0 })
      await queryClient.invalidateQueries({ queryKey: ['waf-groups', firewallPolicyId, type] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  async function deleteGroup(group: WafGroup) {
    if (!(await confirm({ message: '确定要删除此规则分组吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/waf/deleteGroup', { firewallPolicyId, groupId: group.id })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-groups', firewallPolicyId, type] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active={type}
      />
      <div className="ui menu text blue second-menu" style={{ marginTop: '-1em' }}>
        <a
          className="item"
          href={`/servers/components/waf/createGroupPopup?firewallPolicyId=${firewallPolicyId}&type=${type}`}
          onClick={(event) => {
            event.preventDefault()
            navigate(`/servers/components/waf/createGroupPopup?firewallPolicyId=${firewallPolicyId}&type=${type}`)
          }}
        >
          [添加分组]
        </a>
      </div>

      {groups.length === 0 ? <p className="comment">暂时还没有规则分组。</p> : null}

      {groups.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '3em' }} />
              <th>规则分组</th>
              <th className="center">规则集</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr
                key={group.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropAt(index)}
              >
                <td style={{ textAlign: 'center' }}>
                  <span title="拖动排序"><GripVertical size={14} className="grey" style={{ cursor: 'move' }} /></span>
                </td>
                <td>
                  <a
                    href={`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${group.id}`}
                  >
                    <span className={group.isOn ? undefined : 'disabled'}>{group.name}</span>
                  </a>
                  {group.description ? (
                    <p className="comment" style={{ paddingBottom: 0 }}>
                      {group.description}
                    </p>
                  ) : null}
                  <p style={{ marginTop: '0.5em' }}>
                    {group.isOn ? <span className="ui label tiny basic green">启用</span> : <span className="ui label tiny basic red">停用</span>}
                    {group.isTemplate ? <span className="ui label basic tiny">预置</span> : <span className="ui label basic tiny">自定义</span>}
                    {group.code ? <span className="ui label basic tiny">代号：{group.code}</span> : null}
                  </p>
                </td>
                <td className="center">
                  <a
                    href={`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${group.id}`}
                  >
                    {group.countSets}
                  </a>
                </td>
                <td>
                  <a href={`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${group.id}`}>
                    详情
                  </a>{' '}
                  &nbsp;
                  {group.isOn ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void updateGroupOn(group, false)
                      }}
                    >
                      停用
                    </a>
                  ) : (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void updateGroupOn(group, true)
                      }}
                    >
                      启用
                    </a>
                  )}{' '}
                  &nbsp;
                  {group.canDelete ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteGroup(group)
                      }}
                    >
                      <Trash2 size={13} /> 删除
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {groups.length > 0 ? (
        <p className="comment">
          所有规则匹配顺序为从上到下，可以拖动左侧的 <GripVertical size={12} /> 排序。
        </p>
      ) : null}
    </div>
  )
}
