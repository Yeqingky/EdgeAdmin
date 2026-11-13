import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { postFormValues, WafMenu, type WafRule, type WafRuleMetadata, type WafRuleSetView } from './common'

interface RuleSetAction {
  code: string
  name: string
  category: string
  options: Record<string, unknown> | null
}

interface WafRuleSet extends Omit<WafRuleSetView, 'actions'> {
  actions: RuleSetAction[]
}

interface WafGroupDetail {
  id: number
  name: string
  description: string
  isOn: boolean
  code: string
}

interface WafGroupData {
  group: WafGroupDetail
  sets: WafRuleSet[] | null
  type: string
  firewallPolicyId: number
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

export function WafGroupPage({ firewallPolicyId, type, groupId }: { firewallPolicyId: number; type: string; groupId: number }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-group', firewallPolicyId, type, groupId],
    queryFn: () => apiGet<WafGroupData>('/servers/components/waf/group', { firewallPolicyId, type, groupId }),
    enabled: firewallPolicyId > 0 && groupId > 0,
  })
  const metadataQuery = useQuery({
    queryKey: ['waf-rule-metadata', type],
    queryFn: () => apiGet<WafRuleMetadata>('/servers/components/waf/createRulePopup', { type }),
    staleTime: 300_000,
  })
  const [sets, setSets] = useState<WafRuleSet[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (query.data) {
      setSets(query.data.sets || [])
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const checkpoints = metadataQuery.data?.checkpoints || []
  const operators = metadataQuery.data?.operators || []

  function ruleLabel(rule: WafRule) {
    const checkpoint = checkpoints.find(
      (item) => rule.param === `\${${item.prefix}}` || rule.param.startsWith(`\${${item.prefix}.`),
    )
    if (rule.isComposed) {
      return (
        <span>
          {checkpoint ? checkpoint.name : rule.param}
          {rule.checkpointOptions ? <span className="small grey"> {JSON.stringify(rule.checkpointOptions)}</span> : null}
        </span>
      )
    }
    return (
      <span>
        <span title={checkpoint?.description || ''}>{checkpoint ? checkpoint.name : rule.param}</span>
        <span className="small grey"> {rule.param}</span>
        {' <'}
        {operators.find((operator) => operator.code === rule.operator)?.name || rule.operator}
        {'> '}
        {rule.value ? rule.value : <span className="disabled">[空]</span>}
        {rule.isCaseInsensitive ? <span className="small grey"> [大小写不敏感]</span> : null}
        {rule.description ? <span className="grey small">（{rule.description}）</span> : null}
      </span>
    )
  }

  async function saveOrder(nextSets: WafRuleSet[]) {
    setSets(nextSets)
    try {
      await postFormValues('/servers/components/waf/sortSets', {
        groupId,
        setIds: nextSets.map((set) => set.id),
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
    const next = [...sets]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    setDragIndex(null)
    void saveOrder(next)
  }

  async function updateSetOn(set: WafRuleSet, isOn: boolean) {
    try {
      await postFormValues('/servers/components/waf/updateSetOn', { setId: set.id, isOn: isOn ? 1 : 0 })
      await queryClient.invalidateQueries({ queryKey: ['waf-group', firewallPolicyId, type, groupId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  async function deleteSet(set: WafRuleSet) {
    if (!(await confirm({ message: '确定要删除此规则集吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/waf/deleteSet', { groupId, setId: set.id })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-group', firewallPolicyId, type, groupId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const baseQuery = `firewallPolicyId=${firewallPolicyId}&groupId=${groupId}&type=${type}`

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active={type}
      />

      <h3>
        分组
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            navigate(`/servers/components/waf/updateGroupPopup?groupId=${groupId}&firewallPolicyId=${firewallPolicyId}&type=${type}`)
          }}
        >
          [修改]
        </a>
      </h3>
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">名称</td>
            <td>{data.group.name}</td>
          </tr>
          <tr>
            <td>代号</td>
            <td>{data.group.code ? data.group.code : <span className="disabled">没有设置。</span>}</td>
          </tr>
          <tr>
            <td>描述</td>
            <td>{data.group.description ? data.group.description : <span className="disabled">暂时还没有描述。</span>}</td>
          </tr>
          <tr>
            <td>启用状态</td>
            <td>
              <StatusLabel isOn={data.group.isOn} />
            </td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ paddingTop: '0.8em' }}>
        规则集
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            navigate(`/servers/components/waf/createSetPopup?${baseQuery}`)
          }}
        >
          [添加规则集]
        </a>{' '}
      </h3>
      {sets.length === 0 ? <p className="comment">暂时还没有规则。</p> : null}
      {sets.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '3em' }} />
              <th>规则集名称</th>
              <th>规则</th>
              <th className="center one wide">规则关系</th>
              <th>动作</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, index) => (
              <tr
                key={set.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropAt(index)}
              >
                <td style={{ textAlign: 'center' }}>
                  <GripVertical size={14} className="grey" style={{ cursor: 'move' }} />
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      navigate(`/servers/components/waf/updateSetPopup?${baseQuery}&setId=${set.id}`)
                    }}
                  >
                    <span className={set.isOn ? undefined : 'disabled'}>{set.name}</span>
                  </a>
                  <p style={{ marginTop: '0.5em' }}>
                    <StatusLabel isOn={set.isOn} />
                  </p>
                </td>
                <td>
                  {set.rules.length === 0 ? <span className="ui disabled">暂时还没有规则</span> : null}
                  {set.rules.map((rule, ruleIndex) => (
                    <div key={ruleIndex} style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
                      <span className="ui label small basic" style={{ lineHeight: 1.5 }}>
                        {ruleLabel(rule)}
                      </span>
                    </div>
                  ))}
                </td>
                <td className="center">
                  {set.connector.toUpperCase() === 'OR' ? '或' : '和'}
                  <span className="small grey">({set.connector.toUpperCase()})</span>
                </td>
                <td>
                  {set.actions.map((action, actionIndex) => (
                    <span key={`${action.code}-${actionIndex}`} className="ui label small basic" style={{ marginBottom: '0.2em' }}>
                      {action.name || action.code.toUpperCase()}
                    </span>
                  ))}
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      navigate(`/servers/components/waf/updateSetPopup?${baseQuery}&setId=${set.id}`)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  {set.isOn ? (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void updateSetOn(set, false)
                      }}
                    >
                      停用
                    </a>
                  ) : (
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void updateSetOn(set, true)
                      }}
                    >
                      <span className="red">启用</span>
                    </a>
                  )}{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteSet(set)
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

      {sets.length > 1 ? (
        <p className="comment">
          所有规则匹配顺序为从上到下，可以拖动左侧的 <GripVertical size={12} /> 排序。
        </p>
      ) : null}
    </div>
  )
}
