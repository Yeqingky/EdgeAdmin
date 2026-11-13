import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  MoreOptionsIndicator,
  ServerSettingsShell,
  useServerId,
  type ServerSettingsBase,
} from './shared'

interface ClusterOption {
  id: number
  name: string
}

interface UserInfo {
  id: number
  fullname: string
  username: string
}

interface PlanInfo {
  id: number
  name: string
  dayTo: string
}

interface ServerBasicInfo {
  id: number
  clusterId: number
  type: string
  name: string
  description: string
  isOn: boolean
  groups: { id: number; name: string }[]
  trafficLimitStatus?: { untilDay: string; planId: number; dateType: string; targetType: string } | null
}

interface BasicSettingsData extends ServerSettingsBase {
  clusters: ClusterOption[]
  user: UserInfo | null
  userPlan?: { id: number; dayTo: string }
  typeName: string
  server: ServerBasicInfo
}

interface PlansResponse {
  plans: PlanInfo[]
}

export function ServerBasicSettingsPage() {
  const serverId = useServerId()
  const session = useSession()
  const toast = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['server-settings-basic', serverId],
    queryFn: () => apiGet<BasicSettingsData>('/servers/server/settings', { serverId }),
    enabled: serverId > 0,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clusterId, setClusterId] = useState(0)
  const [oldClusterId, setOldClusterId] = useState(0)
  const [keepOldConfigs, setKeepOldConfigs] = useState(true)
  const [isOn, setIsOn] = useState(true)
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([])
  const [groupInput, setGroupInput] = useState('')
  const [userId, setUserId] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [userPlanId, setUserPlanId] = useState(0)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const data = query.data
    if (!data) {
      return
    }
    setName(data.server.name)
    setDescription(data.server.description || '')
    setClusterId(data.server.clusterId)
    setOldClusterId(data.server.clusterId)
    setIsOn(data.server.isOn)
    setGroups(data.server.groups || [])
    setUserId(data.user ? data.user.id : 0)
    setUserPlanId(data.userPlan ? data.userPlan.id : 0)
  }, [query.data])

  useEffect(() => {
    if (userId <= 0) {
      setPlans([])
      return
    }
    let canceled = false
    apiPost<PlansResponse>('/servers/users/plans', { userId, serverId })
      .then((resp) => {
        if (!canceled) {
          setPlans(resp.plans || [])
        }
      })
      .catch(() => {
        if (!canceled) {
          setPlans([])
        }
      })
    return () => {
      canceled = true
    }
  }, [userId, serverId])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const trafficLimitStatus = data.server.trafficLimitStatus

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('serverId', String(serverId))
      form.set('name', name)
      form.set('description', description)
      form.set('clusterId', String(clusterId))
      if (keepOldConfigs) {
        form.set('keepOldConfigs', '1')
      }
      if (isOn) {
        form.set('isOn', '1')
      }
      groups.forEach((group) => form.append('groupIds', String(group.id)))
      form.set('userId', String(userId))
      if (userId <= 0 && userPlanId > 0) {
        form.set('userPlanId', String(userPlanId))
      }
      await apiPostForm('/servers/server/settings', form)
      toast('保存成功,请等待节点配置刷新')
      await queryClient.invalidateQueries({ queryKey: ['server-settings-basic', serverId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell
      data={data}
      header={
        trafficLimitStatus ? (
          <div className="ui message warning">
            当前网站有流量限制(套餐{trafficLimitStatus.planId},有效期至{trafficLimitStatus.untilDay},限制类型:
            {trafficLimitStatus.targetType}).
          </div>
        ) : null
      }
    >
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="所属用户">
            {data.user ? (
              <span>
                {data.user.fullname} <span className="small">({data.user.username})</span>{' '}
                <a href={`/users/user?userId=${data.user.id}`}>查看</a>
              </span>
            ) : userId > 0 ? (
              <span>
                已指定用户ID:{userId}{' '}
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setUserId(0)
                  }}
                >
                  [取消]
                </a>
              </span>
            ) : (
              <span>
                <span className="disabled">没有指定用户</span> &nbsp;
                <span className="ui input">
                  <input
                    type="text"
                    value={userInput}
                    placeholder="用户ID"
                    style={{ width: '8em' }}
                    onChange={(event) => setUserInput(event.target.value)}
                  />
                </span>{' '}
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    const id = Number(userInput) || 0
                    if (id > 0) {
                      setUserId(id)
                    }
                  }}
                >
                  [指定用户]
                </a>
                <p className="comment">
                  <span className="red">此操作同时会将与当前网站相关联的证书等数据自动修改为此用户所属.</span>
                </p>
              </span>
            )}
          </FormRow>
          <FormRow title="网站名称 *">
            <TextInput type="text" name="name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
          </FormRow>
          {plans.length > 0 ? (
            <FormRow title="选择套餐">
              <Select name="userPlanId" value={userPlanId} onChange={(event) => setUserPlanId(Number(event.target.value))}>
                <option value={0}>[选择套餐]</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}({plan.dayTo})
                  </option>
                ))}
              </Select>
            </FormRow>
          ) : null}
          {plans.length === 0 && session.data?.teaIsPlus ? (
            <FormRow title="选择套餐">当前网站所属用户没有可用套餐.</FormRow>
          ) : null}
          <FormRow title={<span className={clusterId !== oldClusterId ? 'color-border' : ''}>部署的集群 *</span>}>
            <Select name="clusterId" value={clusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
              {data.clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </Select>
          </FormRow>
          {clusterId !== oldClusterId ? (
            <FormRow title={<span className="color-border">是否保留原集群配置</span>}>
              <Checkbox checked={keepOldConfigs} onChange={setKeepOldConfigs} />
              <p className="comment">
                选中表示在先前的集群节点上仍然保留当前网站的配置,直至节点配置全部刷新时才会删除;不选中,则表示立即删除原集群上关于当前网站的配置.
              </p>
            </FormRow>
          ) : null}
          <FormRow title="网站类型 *">{data.typeName}</FormRow>
          <FormRow title="选择分组">
            <div>
              {groups.map((group, index) => (
                <div key={`${group.id}-${index}`} className="ui label small basic">
                  {group.name} &nbsp;
                  <a
                    href=""
                    title="删除"
                    onClick={(event) => {
                      event.preventDefault()
                      setGroups(groups.filter((_, i) => i !== index))
                    }}
                  >
                    <Trash2 size={13} />
                  </a>
                </div>
              ))}
              {groups.length > 0 ? <div className="ui divider" /> : null}
              <span className="ui input">
                <input
                  type="text"
                  value={groupInput}
                  placeholder="分组ID"
                  style={{ width: '8em' }}
                  onChange={(event) => setGroupInput(event.target.value)}
                />
              </span>{' '}
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  const id = Number(groupInput) || 0
                  if (id > 0 && !groups.some((group) => group.id === id)) {
                    setGroups([...groups, { id, name: `分组 #${id}` }])
                  }
                  setGroupInput('')
                }}
              >
                [选择分组]
              </a>
            </div>
          </FormRow>
          <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
            <span />
          </FormRow>
          {moreOptions ? (
            <>
              <FormRow title="描述">
                <textarea name="description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
              </FormRow>
              <FormRow title="启用当前网站">
                <Checkbox checked={isOn} onChange={setIsOn} />
                <p className="comment">可以使用此选项整体关闭当前网站.</p>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
