import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  Comment,
  GroupConfigWarning,
  ServerSettingsShell,
  SubMenu,
  buildSettingsURL,
  useSearchInt,
  useSearchString,
} from './common'

interface FirewallPolicyInfo {
  id: number
  name: string
  isOn: boolean
  mode: string
  modeInfo: { code: string; name: string } | null
  captchaAction: { geeTestConfig?: { isOn?: boolean } | null } | null
}

interface FirewallConfig {
  isPrior: boolean
  isOn: boolean
  firewallPolicyId: number
  ignoreGlobalRules: boolean
  defaultCaptchaType: string
}

interface WafIndexData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  firewallConfig: FirewallConfig | null
  firewallPolicy: FirewallPolicyInfo | null
  firewallPolicyId: number
}

const CAPTCHA_TYPES = [
  { name: '验证码', code: 'default', description: '通过输入验证码来验证人机。' },
  { name: '点击验证', code: 'oneClick', description: '通过点击界面元素来验证人机。' },
  { name: '滑动解锁', code: 'slide', description: '通过滑动方块解锁来验证人机。' },
  { name: '极验-行为验', code: 'geetest', description: '使用极验-行为验提供的人机验证方式。' },
]

export function WafMenu({ serverId, firewallPolicyId, active }: { serverId: number; firewallPolicyId: number; active: string }) {
  const base = { serverId, firewallPolicyId }
  return (
    <SubMenu
      items={[
        { name: '设置', active: active === 'index', href: `${buildSettingsURL('/waf', base)}` },
        {
          name: '入站规则',
          active: active === 'inbound',
          href: `${buildSettingsURL('/waf/groups', { ...base, type: 'inbound' })}`,
        },
        {
          name: '出站规则',
          active: active === 'outbound',
          href: `${buildSettingsURL('/waf/groups', { ...base, type: 'outbound' })}`,
        },
        { name: '国家/地区封禁', active: active === 'country', href: `${buildSettingsURL('/waf/ipadmin/countries', base)}` },
        { name: '省份封禁', active: active === 'province', href: `${buildSettingsURL('/waf/ipadmin/provinces', base)}` },
        { name: '运营商封禁', active: active === 'provider', href: `${buildSettingsURL('/waf/ipadmin/providers', base)}` },
        { name: '白名单', active: active === 'allowList', href: `${buildSettingsURL('/waf/ipadmin/allowList', base)}` },
        { name: '黑名单', active: active === 'denyList', href: `${buildSettingsURL('/waf/ipadmin/denyList', base)}` },
        { name: '灰名单', active: active === 'greyList', href: `${buildSettingsURL('/waf/ipadmin/greyList', base)}` },
        { name: 'IP检查', active: active === 'test', href: `${buildSettingsURL('/waf/ipadmin/test', base)}` },
      ]}
    />
  )
}

export function WafIndexPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<FirewallConfig | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-waf', serverId],
    queryFn: () => apiGet<WafIndexData>('/servers/server/settings/waf', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: FirewallConfig = {
    isPrior: false,
    isOn: false,
    firewallPolicyId: data.firewallPolicyId,
    ignoreGlobalRules: false,
    defaultCaptchaType: 'none',
    ...(data.firewallConfig || {}),
    ...(config || {}),
  }

  const geetestIsOn = Boolean(data.firewallPolicy?.captchaAction?.geeTestConfig?.isOn)
  if (!geetestIsOn && current.defaultCaptchaType === 'geetest') {
    current.defaultCaptchaType = 'none'
  }

  function update<K extends keyof FirewallConfig>(key: K, value: FirewallConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/waf', { webId: data.webId, firewallJSON: JSON.stringify(current) })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCaptcha = CAPTCHA_TYPES.find((item) => item.code === current.defaultCaptchaType)

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <WafMenu serverId={serverId} firewallPolicyId={data.firewallPolicyId} active="index" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="全局WAF策略">
              {data.firewallPolicy ? (
                <div>
                  {data.firewallPolicy.name}{' '}
                  {data.firewallPolicy.modeInfo ? (
                    <span className="ui label tiny basic">{data.firewallPolicy.modeInfo.name}</span>
                  ) : null}
                  <Comment>当前网站所在集群的设置。</Comment>
                </div>
              ) : (
                <span className="red">当前集群没有设置WAF策略，当前配置无法生效。</span>
              )}
            </FormRow>
            <FormRow title="启用Web防火墙">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
              <Comment>选中后，表示启用当前网站的WAF功能。</Comment>
            </FormRow>
            {current.isOn ? (
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setMoreOptions(!moreOptions)
                    }}
                  >
                    [{moreOptions ? '收起更多选项' : '更多选项'}]
                  </a>
                </td>
              </tr>
            ) : null}
          </tbody>
          {current.isOn && moreOptions ? (
            <tbody>
              <FormRow title="人机识别验证方式">
                <Select
                  value={current.defaultCaptchaType}
                  onChange={(event) => update('defaultCaptchaType', event.target.value)}
                >
                  <option value="none">默认</option>
                  {CAPTCHA_TYPES.filter((item) => item.code !== 'geetest' || geetestIsOn).map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                {selectedCaptcha ? <Comment>{selectedCaptcha.description}</Comment> : null}
                <Comment>你需要在入站规则中添加规则集来决定哪些请求需要人机识别验证。</Comment>
              </FormRow>
              <FormRow title="启用系统全局规则">
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={!current.ignoreGlobalRules}
                    onChange={(event) => update('ignoreGlobalRules', !event.target.checked)}
                  />
                  <label></label>
                </div>
                <Comment>选中后，表示使用系统全局WAF策略中定义的规则。</Comment>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

interface GroupSummary {
  id: number
  name: string
  code: string
  isOn: boolean
  description: string
  countSets: number
  canDelete: boolean
}

interface WafGroupsData {
  firewallPolicyId: number
  type: string
  groups: GroupSummary[] | null
  wafIsOn: boolean
}

function GroupEditForm({
  firewallPolicyId,
  type,
  group,
  onSaved,
}: {
  firewallPolicyId: number
  type: string
  group?: GroupSummary
  onSaved: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(group?.name || '')
  const [code, setCode] = useState(group?.code || '')
  const [description, setDescription] = useState(group?.description || '')
  const [isOn, setIsOn] = useState(group?.isOn ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost(
        group ? '/servers/components/waf/updateGroupPopup' : '/servers/components/waf/createGroupPopup',
        {
          firewallPolicyId,
          type,
          groupId: group?.id || '',
          name,
          code,
          description,
          isOn: isOn ? 1 : 0,
        },
      )
      toast('保存成功')
      onSaved()
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <FormTable>
        <tbody>
          <FormRow title="名称 *">
            <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </FormRow>
          <FormRow title="代号">
            <TextInput type="text" maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} />
          </FormRow>
          <FormRow title="描述">
            <textarea rows={3} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormRow>
          <FormRow title="启用">
            <div className="ui checkbox">
              <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
              <label></label>
            </div>
          </FormRow>
        </tbody>
      </FormTable>
      {error ? <div className="ui negative message">{error}</div> : null}
      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function WafGroupsPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const type = useSearchString('type', 'inbound')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GroupSummary | null>(null)

  const query = useQuery({
    queryKey: ['server-settings-waf-groups', serverId, firewallPolicyId, type],
    queryFn: () => apiGet<WafGroupsData>('/servers/server/settings/waf/groups', { serverId, firewallPolicyId, type }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const groups = data.groups || []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['server-settings-waf-groups', serverId, firewallPolicyId, type] })
  }

  async function action(path: string, payload: Record<string, unknown>, message: string) {
    try {
      await apiPost(path, payload)
      toast(message)
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '操作失败', 'error')
    }
  }

  async function move(index: number, delta: number) {
    const next = [...groups]
    const target = index + delta
    if (target < 0 || target >= next.length) {
      return
    }
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    try {
      const form = new FormData()
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('type', type)
      next.forEach((group) => form.append('groupIds', String(group.id)))
      await apiPostForm('/servers/components/waf/sortGroups', form)
      toast('排序保存成功')
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '排序失败', 'error')
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active={type} />
      <div className="ui menu text blue second-menu">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreating(true)
          }}
        >
          [添加分组]
        </a>
      </div>
      {!data.wafIsOn ? (
        <div className="ui message warning">
          当前WAF未启用，设置将在
          <a href={`${buildSettingsURL('/waf', { serverId })}`}>[启用Web防火墙]</a>
          后生效。
        </div>
      ) : null}
      {groups.length === 0 ? <p className="comment">暂时还没有规则分组。</p> : null}
      {groups.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '3em' }}></th>
              <th>规则分组</th>
              <th className="center">规则集</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => {
              const href = buildSettingsURL('/waf/group', { serverId, firewallPolicyId, type, groupId: group.id })
              return (
                <tr key={group.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button className="ui button mini basic" type="button" disabled={index === 0} onClick={() => void move(index, -1)}>
                      ↑
                    </button>
                    <button
                      className="ui button mini basic"
                      type="button"
                      disabled={index === groups.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      ↓
                    </button>
                  </td>
                  <td>
                    <a href={`${href}`}>
                      <span className={group.isOn ? '' : 'disabled'}>{group.name}</span>
                    </a>
                    {group.description ? <p className="comment" style={{ paddingBottom: 0 }}>{group.description}</p> : null}
                    <p style={{ marginTop: '0.5em' }}>
                      {group.isOn ? (
                        <span className="ui label tiny basic green">启用</span>
                      ) : (
                        <span className="ui label tiny basic red">停用</span>
                      )}
                      <span className="ui label basic tiny">{group.code ? '预置' : '自定义'}</span>
                    </p>
                  </td>
                  <td className="center">
                    <a href={`${href}`}>{group.countSets}</a>
                  </td>
                  <td>
                    <a href={`${href}`}>详情</a> &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void action(
                          '/servers/components/waf/updateGroupOn',
                          { groupId: group.id, isOn: group.isOn ? 0 : 1 },
                          group.isOn ? '停用成功' : '启用成功',
                        )
                      }}
                    >
                      {group.isOn ? '停用' : '启用'}
                    </a>{' '}
                    &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditing(group)
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;
                    {group.canDelete ? (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void confirm({ message: '确定要删除此规则分组吗？', danger: true, confirmText: '删除' }).then((ok) => {
                            if (ok) {
                              void action(
                                '/servers/components/waf/deleteGroup',
                                { firewallPolicyId, groupId: group.id },
                                '删除成功',
                              )
                            }
                          })
                        }}
                      >
                        删除
                      </a>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}
      {groups.length > 1 ? <p className="comment">所有规则匹配顺序为从上到下，可以通过上下箭头排序。</p> : null}

      {creating || editing ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '40em' }}>
            <div className="header">{editing ? '修改分组' : '添加分组'}</div>
            <div className="content">
              <GroupEditForm
                firewallPolicyId={firewallPolicyId}
                type={type}
                group={editing || undefined}
                onSaved={() => {
                  setCreating(false)
                  setEditing(null)
                  void refresh()
                }}
              />
            </div>
            <div className="actions">
              <button
                className="ui button"
                onClick={() => {
                  setCreating(false)
                  setEditing(null)
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ServerSettingsShell>
  )
}

interface FirewallRule {
  param: string
  paramFilters?: unknown
  operator: string
  value: string
  isCaseInsensitive: boolean
  description: string
  isComposed: boolean
  err: string
}

interface FirewallAction {
  code: string
  name: string
  category: string
  options: unknown
}

interface FirewallSet {
  id: number
  name: string
  rules: FirewallRule[] | null
  isOn: boolean
  actions: FirewallAction[] | null
  connector: string
}

interface WafGroupData {
  type: string
  firewallPolicyId: number
  group: GroupSummary
  sets: FirewallSet[] | null
}

export function WafGroupPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const groupId = useSearchInt('groupId')
  const type = useSearchString('type', 'inbound')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [editingGroup, setEditingGroup] = useState(false)

  const query = useQuery({
    queryKey: ['server-settings-waf-group', firewallPolicyId, groupId, type],
    queryFn: () =>
      apiGet<WafGroupData>('/servers/server/settings/waf/group', {
        serverId,
        firewallPolicyId,
        groupId,
        type,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const sets = data.sets || []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['server-settings-waf-group', firewallPolicyId, groupId, type] })
  }

  async function action(path: string, payload: Record<string, unknown>, message: string) {
    try {
      await apiPost(path, payload)
      toast(message)
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '操作失败', 'error')
    }
  }

  async function move(index: number, delta: number) {
    const next = [...sets]
    const target = index + delta
    if (target < 0 || target >= next.length) {
      return
    }
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    try {
      const form = new FormData()
      form.set('groupId', String(groupId))
      next.forEach((set) => form.append('setIds', String(set.id)))
      await apiPostForm('/servers/components/waf/sortSets', form)
      toast('排序保存成功')
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '排序失败', 'error')
    }
  }

  function openSetForm(setId?: number) {
    const path = setId ? '/servers/components/waf/updateSetPopup' : '/servers/components/waf/createSetPopup'
    navigate(buildSettingsURL(path, { serverId, firewallPolicyId, groupId, type, setId }))
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active={type} />
      <h3>
        分组{' '}
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            setEditingGroup(true)
          }}
        >
          [修改]
        </a>
      </h3>
      <table className="ui table selectable definition">
        <tbody>
          <FormRow title="名称">{data.group.name}</FormRow>
          <FormRow title="描述">
            {data.group.description ? data.group.description : <span className="disabled">暂时还没有描述。</span>}
          </FormRow>
          <FormRow title="启用状态">
            {data.group.isOn ? (
              <span className="ui label green basic">已启用</span>
            ) : (
              <span className="ui label grey basic">已禁用</span>
            )}
          </FormRow>
        </tbody>
      </table>
      <h3 style={{ paddingTop: '0.8em' }}>
        规则集{' '}
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            openSetForm()
          }}
        >
          [添加规则集]
        </a>
      </h3>
      {sets.length === 0 ? <p className="comment">暂时还没有规则。</p> : null}
      {sets.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '3em' }}></th>
              <th>规则集名称</th>
              <th>规则</th>
              <th className="center" style={{ width: '6em' }}>
                规则关系
              </th>
              <th>动作</th>
              <th className="four op">操作</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, index) => (
              <tr key={set.id}>
                <td style={{ textAlign: 'center' }}>
                  <button className="ui button mini basic" type="button" disabled={index === 0} onClick={() => void move(index, -1)}>
                    ↑
                  </button>
                  <button
                    className="ui button mini basic"
                    type="button"
                    disabled={index === sets.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    ↓
                  </button>
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      openSetForm(set.id)
                    }}
                  >
                    <span className={set.isOn ? '' : 'disabled'}>{set.name}</span>
                  </a>
                  <p style={{ marginTop: '0.5em' }}>
                    {set.isOn ? (
                      <span className="ui label tiny basic green">启用</span>
                    ) : (
                      <span className="ui label tiny basic red">停用</span>
                    )}
                  </p>
                </td>
                <td>
                  {(set.rules || []).map((rule, i) => (
                    <div key={i} style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
                      <span className="ui label tiny basic">
                        {rule.param} {rule.operator} {rule.value}
                        {rule.err ? <span className="red">{rule.err}</span> : null}
                      </span>
                    </div>
                  ))}
                  {(set.rules || []).length === 0 ? <span className="ui disabled">暂时还没有规则</span> : null}
                </td>
                <td className="center">
                  {(set.rules || []).length > 1 ? (
                    <span>
                      {set.connector === 'OR' ? '或' : '和'} <span className="small grey">({set.connector})</span>
                    </span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td>
                  {(set.actions || []).map((action) => (
                    <span className="ui label tiny basic" key={action.code}>
                      {action.name || action.code}
                    </span>
                  ))}
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      openSetForm(set.id)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void action('/servers/components/waf/updateSetOn', { setId: set.id, isOn: set.isOn ? 0 : 1 }, set.isOn ? '停用成功' : '启用成功')
                    }}
                  >
                    {set.isOn ? '停用' : <span className="red">启用</span>}
                  </a>{' '}
                  &nbsp;
                  <a
                    href={`${buildSettingsURL('/servers/components/waf/setCodePopup', { setId: set.id })}`}
                  >
                    代码
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void confirm({ message: '确定要删除此规则集吗？', danger: true, confirmText: '删除' }).then((ok) => {
                        if (ok) {
                          void action('/servers/components/waf/deleteSet', { groupId, setId: set.id }, '删除成功')
                        }
                      })
                    }}
                  >
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {sets.length > 1 ? <p className="comment">所有规则匹配顺序为从上到下，可以通过上下箭头排序。</p> : null}

      {editingGroup ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '40em' }}>
            <div className="header">修改分组</div>
            <div className="content">
              <GroupEditForm
                firewallPolicyId={firewallPolicyId}
                type={type}
                group={data.group}
                onSaved={() => {
                  setEditingGroup(false)
                  void refresh()
                }}
              />
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => setEditingGroup(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ServerSettingsShell>
  )
}
