import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { EVENT_LEVELS, postFormValues, type WafActionConfig, type WafPolicyForSet, type WafRule, type WafRuleSetView } from './common'
import { WafRuleEditor } from './WafRuleEditor'

interface ConnectorOption {
  name: string
  value: string
  description: string
}

interface ActionOption {
  name: string
  description: string
  code: string
}

interface SetFormData {
  groupId: number
  type: string
  firewallPolicy: WafPolicyForSet
  connectors: ConnectorOption[]
  actions: ActionOption[]
  isGlobalPolicy?: boolean
  setConfig?: WafRuleSetView
}

function ruleSummary(rule: WafRule): string {
  return `${rule.param} ${rule.operator} ${rule.value}`.trim()
}

function ActionFields({
  code,
  options,
  policy,
  onChange,
}: {
  code: string
  options: Record<string, unknown>
  policy: WafPolicyForSet
  onChange: (key: string, value: unknown) => void
}) {
  const groups = [...(policy.inbound?.groups || []), ...(policy.outbound?.groups || [])]
  if (code === 'block') {
    return (
      <>
        <div className="ui fields inline">
          <div className="ui field">
            <label>封禁时长（秒）</label>
            <input
              type="number"
              style={{ width: '8em' }}
              value={String(options.timeout ?? '')}
              onChange={(event) => onChange('timeout', Number(event.target.value) || 0)}
            />
          </div>
          <div className="ui field">
            <label>最大封禁时长（秒）</label>
            <input
              type="number"
              style={{ width: '8em' }}
              value={String(options.timeoutMax ?? '')}
              onChange={(event) => onChange('timeoutMax', Number(event.target.value) || 0)}
            />
          </div>
          <div className="ui field">
            <label>作用范围</label>
            <select className="ui dropdown" value={String(options.scope ?? 'global')} onChange={(event) => onChange('scope', event.target.value)}>
              <option value="global">全局</option>
              <option value="service">当前网站</option>
            </select>
          </div>
        </div>
        <textarea
          rows={2}
          placeholder="返回内容"
          value={String(options.body ?? '')}
          onChange={(event) => onChange('body', event.target.value)}
        />
      </>
    )
  }
  if (code === 'page') {
    return (
      <>
        <div className="ui fields inline">
          <div className="ui field">
            <label>状态码</label>
            <input
              type="number"
              style={{ width: '8em' }}
              value={String(options.status ?? '')}
              onChange={(event) => onChange('status', Number(event.target.value) || 0)}
            />
          </div>
        </div>
        <textarea
          rows={3}
          placeholder="页面内容"
          value={String(options.body ?? '')}
          onChange={(event) => onChange('body', event.target.value)}
        />
      </>
    )
  }
  if (code === 'captcha' || code === 'js_cookie' || code === 'get_302' || code === 'post_307') {
    return (
      <div className="ui fields inline">
        <div className="ui field">
          <label>有效期（秒）</label>
          <input
            type="number"
            style={{ width: '8em' }}
            value={String(options.life ?? '')}
            onChange={(event) => onChange('life', Number(event.target.value) || 0)}
          />
        </div>
        {code !== 'get_302' && code !== 'post_307' ? (
          <>
            <div className="ui field">
              <label>最大失败次数</label>
              <input
                type="number"
                style={{ width: '8em' }}
                value={String(options.maxFails ?? '')}
                onChange={(event) => onChange('maxFails', Number(event.target.value) || 0)}
              />
            </div>
            <div className="ui field">
              <label>失败拦截时间（秒）</label>
              <input
                type="number"
                style={{ width: '8em' }}
                value={String(options.failBlockTimeout ?? '')}
                onChange={(event) => onChange('failBlockTimeout', Number(event.target.value) || 0)}
              />
            </div>
          </>
        ) : null}
      </div>
    )
  }
  if (code === 'record_ip') {
    return (
      <div className="ui fields inline">
        <div className="ui field">
          <label>类型</label>
          <select className="ui dropdown" value={String(options.type ?? 'black')} onChange={(event) => onChange('type', event.target.value)}>
            <option value="black">黑名单</option>
            <option value="white">白名单</option>
            <option value="grey">灰名单</option>
          </select>
        </div>
        <div className="ui field">
          <label>级别</label>
          <select className="ui dropdown" value={String(options.level ?? 'critical')} onChange={(event) => onChange('level', event.target.value)}>
            {EVENT_LEVELS.map((level) => (
              <option key={level.code} value={level.code}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ui field">
          <label>超时时间（秒）</label>
          <input
            type="number"
            style={{ width: '8em' }}
            value={String(options.timeout ?? '')}
            onChange={(event) => onChange('timeout', Number(event.target.value) || 0)}
          />
        </div>
      </div>
    )
  }
  if (code === 'tag') {
    const tags = Array.isArray(options.tags) ? (options.tags as string[]) : []
    return (
      <div className="ui field">
        <label>标签（用逗号分隔）</label>
        <input
          type="text"
          value={tags.join(',')}
          onChange={(event) =>
            onChange(
              'tags',
              event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0),
            )
          }
        />
      </div>
    )
  }
  if (code === 'go_group') {
    return (
      <div className="ui field">
        <label>目标分组</label>
        <select className="ui dropdown" value={String(options.groupId ?? '')} onChange={(event) => onChange('groupId', event.target.value)}>
          <option value="">[选择分组]</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (code === 'go_set') {
    const groupId = Number(options.groupId || 0)
    const group = groups.find((item) => item.id === groupId)
    return (
      <div className="ui fields inline">
        <div className="ui field">
          <label>目标分组</label>
          <select className="ui dropdown" value={String(groupId || '')} onChange={(event) => onChange('groupId', event.target.value)}>
            <option value="">[选择分组]</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ui field">
          <label>目标规则集</label>
          <select className="ui dropdown" value={String(options.setId ?? '')} onChange={(event) => onChange('setId', event.target.value)}>
            <option value="">[选择规则集]</option>
            {(group?.sets || []).map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }
  if (code === 'allow') {
    return (
      <div className="ui field">
        <label>允许范围</label>
        <select className="ui dropdown" value={String(options.scope ?? 'global')} onChange={(event) => onChange('scope', event.target.value)}>
          <option value="group">当前分组</option>
          <option value="server">当前网站</option>
          <option value="global">全局</option>
        </select>
      </div>
    )
  }
  return null
}

function defaultOptions(code: string): Record<string, unknown> {
  switch (code) {
    case 'block':
      return { timeout: 300, scope: 'global' }
    case 'captcha':
      return { life: 600, maxFails: 100, failBlockTimeout: 3600 }
    case 'js_cookie':
      return { life: 600, maxFails: 100, failBlockTimeout: 3600, scope: 'service' }
    case 'record_ip':
      return { type: 'black', level: 'critical', timeout: 3600 }
    case 'tag':
      return { tags: [] }
    default:
      return {}
  }
}

function SetForm({ mode }: { mode: 'create' | 'update' }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const setId = Number(searchParams.get('setId') || 0) || 0
  const type = searchParams.get('type') || 'inbound'

  const query = useQuery({
    queryKey: ['waf-set-form', mode, firewallPolicyId, groupId, setId, type],
    queryFn: () =>
      apiGet<SetFormData>(mode === 'create' ? '/servers/components/waf/createSetPopup' : '/servers/components/waf/updateSetPopup', {
        firewallPolicyId,
        groupId,
        setId,
        type,
      }),
    enabled: firewallPolicyId > 0 && groupId > 0 && (mode === 'create' || setId > 0),
  })

  const [name, setName] = useState('')
  const [rules, setRules] = useState<WafRule[]>([])
  const [connector, setConnector] = useState('and')
  const [actionConfigs, setActionConfigs] = useState<WafActionConfig[]>([])
  const [ignoreLocal, setIgnoreLocal] = useState(false)
  const [ignoreSearchEngine, setIgnoreSearchEngine] = useState(false)
  const [useCode, setUseCode] = useState(false)
  const [code, setCode] = useState('')
  const [editingRule, setEditingRule] = useState<{ index: number; rule: WafRule | null } | null>(null)
  const [editingAction, setEditingAction] = useState<{ index: number; code: string; options: Record<string, unknown> } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!query.data || initialized) {
      return
    }
    setInitialized(true)
    setConnector(query.data.connectors[0]?.value || 'and')
    if (mode === 'update' && query.data.setConfig) {
      setName(query.data.setConfig.name)
      setRules(query.data.setConfig.rules || [])
      setConnector(query.data.setConfig.connector || 'and')
      setActionConfigs(query.data.setConfig.actions || [])
      setIgnoreLocal(Boolean(query.data.setConfig.ignoreLocal))
      setIgnoreSearchEngine(Boolean(query.data.setConfig.ignoreSearchEngine))
    }
  }, [query.data, initialized, mode])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const connectors = data.connectors
  const selectedConnector = connectors.find((item) => item.value === connector)

  function saveRule(rule: WafRule) {
    if (editingRule && editingRule.index >= 0) {
      setRules((current) => current.map((item, index) => (index === editingRule.index ? rule : item)))
    } else {
      setRules((current) => [...current, rule])
    }
    setEditingRule(null)
  }

  function saveAction() {
    if (!editingAction) {
      return
    }
    const config = { code: editingAction.code, options: editingAction.options }
    if (editingAction.index >= 0) {
      setActionConfigs((current) => current.map((item, index) => (index === editingAction.index ? config : item)))
    } else {
      setActionConfigs((current) => [...current, config])
    }
    setEditingAction(null)
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入规则集名称', 'error')
      return
    }
    if (useCode && mode === 'create') {
      if (!code.trim()) {
        toast('请输入规则集代码', 'error')
        return
      }
    } else {
      if (rules.length === 0) {
        toast('请添加至少一个规则', 'error')
        return
      }
      if (actionConfigs.length === 0) {
        toast('请添加至少一个动作', 'error')
        return
      }
    }
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await postFormValues('/servers/components/waf/createSetPopup', {
          groupId,
          name,
          formType: useCode ? 'code' : 'normal',
          rulesJSON: useCode ? '' : JSON.stringify(rules),
          connector,
          actionsJSON: useCode ? '' : JSON.stringify(actionConfigs),
          ignoreLocal: ignoreLocal ? 1 : '',
          ignoreSearchEngine: ignoreSearchEngine ? 1 : '',
          code: useCode ? code : '',
        })
      } else {
        await postFormValues('/servers/components/waf/updateSetPopup', {
          groupId,
          setId,
          name,
          rulesJSON: JSON.stringify(rules),
          connector,
          actionsJSON: JSON.stringify(actionConfigs),
          ignoreLocal: ignoreLocal ? 1 : '',
          ignoreSearchEngine: ignoreSearchEngine ? 1 : '',
        })
      }
      toast('保存成功')
      navigate(`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${groupId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>{mode === 'create' ? '添加规则集' : '修改规则集'}</h3>
      {mode === 'create' && data.isGlobalPolicy ? (
        <p className="ui message">
          当前设置的规则集为WAF策略的规则集，将会应用于对应集群已经启用WAF的网站；如果你只是想设置某个网站相关的规则集，请到对应网站WAF功能中设置。
        </p>
      ) : null}

      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">规则集名称 *</td>
              <td>
                <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                {mode === 'create' ? (
                  <p className="comment">
                    可以用来描述当前规则集用途。
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setUseCode((current) => !current)
                      }}
                    >
                      {useCode ? '[切换到常规表单]' : '[使用代码]'}
                    </a>
                  </p>
                ) : null}
              </td>
            </tr>

            {(!useCode || mode === 'update') && (
              <>
                <tr>
                  <td>规则 *</td>
                  <td>
                    {rules.length === 0 ? <span className="ui disabled">暂时还没有规则</span> : null}
                    {rules.map((rule, index) => (
                      <div key={index} className="ui label small basic" style={{ marginBottom: '0.5em', lineHeight: 1.6 }}>
                        {ruleSummary(rule)}
                        {rule.description ? <span className="grey small">（{rule.description}）</span> : null}
                        <a
                          href=""
                          title="修改"
                          style={{ marginLeft: '0.4em' }}
                          onClick={(event) => {
                            event.preventDefault()
                            setEditingRule({ index, rule })
                          }}
                        >
                          修改
                        </a>
                        <a
                          href=""
                          title="删除"
                          style={{ marginLeft: '0.4em' }}
                          onClick={(event) => {
                            event.preventDefault()
                            setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))
                          }}
                        >
                          删除
                        </a>
                      </div>
                    ))}
                    {editingRule ? (
                      <WafRuleEditor type={type} rule={editingRule.rule} onSaved={saveRule} onCancel={() => setEditingRule(null)} />
                    ) : (
                      <button
                        className="ui button tiny"
                        type="button"
                        onClick={() => setEditingRule({ index: -1, rule: null })}
                      >
                        + 添加规则
                      </button>
                    )}
                  </td>
                </tr>
                {rules.length > 1 ? (
                  <tr>
                    <td>规则之间的关系 *</td>
                    <td>
                      <select className="ui dropdown" style={{ width: '10em' }} value={connector} onChange={(event) => setConnector(event.target.value)}>
                        {connectors.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <p className="comment">{selectedConnector?.description}</p>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>执行动作 *</td>
                  <td>
                    {actionConfigs.length === 0 ? <span className="ui disabled">暂时还没有动作</span> : null}
                    {actionConfigs.map((config, index) => (
                      <div key={`${config.code}-${index}`} className="ui label small basic" style={{ marginBottom: '0.5em' }}>
                        {data.actions.find((item) => item.code === config.code)?.name || config.code.toUpperCase()}
                        <a
                          href=""
                          style={{ marginLeft: '0.4em' }}
                          onClick={(event) => {
                            event.preventDefault()
                            setEditingAction({ index, code: config.code, options: { ...(config.options || {}) } })
                          }}
                        >
                          修改
                        </a>
                        <a
                          href=""
                          style={{ marginLeft: '0.4em' }}
                          onClick={(event) => {
                            event.preventDefault()
                            setActionConfigs((current) => current.filter((_, actionIndex) => actionIndex !== index))
                          }}
                        >
                          删除
                        </a>
                      </div>
                    ))}
                    {editingAction ? (
                      <div className="ui segment">
                        <div className="ui field">
                          <label>动作类型</label>
                          <select
                            className="ui dropdown"
                            value={editingAction.code}
                            onChange={(event) =>
                              setEditingAction({
                                ...editingAction,
                                code: event.target.value,
                                options: defaultOptions(event.target.value),
                              })
                            }
                          >
                            {data.actions.map((action) => (
                              <option key={action.code} value={action.code}>
                                {action.name}
                              </option>
                            ))}
                          </select>
                          <p className="comment">{data.actions.find((action) => action.code === editingAction.code)?.description}</p>
                        </div>
                        <ActionFields
                          code={editingAction.code}
                          options={editingAction.options}
                          policy={data.firewallPolicy}
                          onChange={(key, value) =>
                            setEditingAction((current) =>
                              current ? { ...current, options: { ...current.options, [key]: value } } : current,
                            )
                          }
                        />
                        <div style={{ marginTop: '0.6em' }}>
                          <button className="ui button tiny primary" type="button" onClick={saveAction}>
                            确定
                          </button>
                          &nbsp;
                          <button className="ui button tiny" type="button" onClick={() => setEditingAction(null)}>
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="ui button tiny"
                        type="button"
                        onClick={() => setEditingAction({ index: -1, code: data.actions[0]?.code || 'block', options: defaultOptions(data.actions[0]?.code || 'block') })}
                      >
                        + 添加动作
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>允许局域网IP</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={ignoreLocal} onChange={(event) => setIgnoreLocal(event.target.checked)} />
                      <label />
                    </div>
                    <p className="comment">选中后，表示如果请求来自局域网IP，则直接跳过当前规则集。</p>
                  </td>
                </tr>
                <tr>
                  <td>允许搜索引擎</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={ignoreSearchEngine} onChange={(event) => setIgnoreSearchEngine(event.target.checked)} />
                      <label />
                    </div>
                    <p className="comment">选中后，表示如果请求来自常见搜索引擎的IP，则直接跳过当前规则集。</p>
                  </td>
                </tr>
              </>
            )}

            {useCode && mode === 'create' ? (
              <tr>
                <td>规则集代码 *</td>
                <td>
                  <textarea
                    rows={20}
                    placeholder="{ ... 规则集代码  ... }"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
          &nbsp;
          <button
            className="ui button"
            type="button"
            onClick={() => navigate(`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${groupId}`)}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

export function WafCreateSetPage() {
  return <SetForm mode="create" />
}

export function WafUpdateSetPage() {
  return <SetForm mode="update" />
}

export function WafCreateRulePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'inbound'
  const [saved, setSaved] = useState<WafRule | null>(null)

  if (saved) {
    return (
      <div>
        <h3>规则已生成</h3>
        <p className="comment">以下是可以用于规则集代码中的规则配置：</p>
        <textarea readOnly rows={13} value={JSON.stringify(saved, null, 2)} />
        <div style={{ marginTop: '1em' }}>
          <button className="ui button" type="button" onClick={() => navigate(-1)}>
            关闭窗口
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3>添加规则</h3>
      <WafRuleEditor type={type} rule={null} onSaved={setSaved} onCancel={() => navigate(-1)} />
    </div>
  )
}

export function WafSetCodePage() {
  const [searchParams] = useSearchParams()
  const setId = Number(searchParams.get('setId') || 0) || 0
  const query = useQuery({
    queryKey: ['waf-set-code', setId],
    queryFn: () => apiGet<{ setName: string; code: string }>('/servers/components/waf/setCodePopup', { setId }),
    enabled: setId > 0,
  })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>规则集 “{query.data.setName}” 代码</h3>
      <form className="ui form">
        <textarea readOnly rows={13} value={query.data.code} />
        <p className="comment">你可以将此段代码复制并在创建规则集的时候使用。</p>
      </form>
    </div>
  )
}
