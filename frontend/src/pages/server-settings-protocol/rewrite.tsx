import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { CondsEditor, PopupPage, ServerSettingsShell, buildSettingsURL, useSearchInt } from './common'
import type { CondsConfig } from './common'

interface RewriteRule {
  id: number
  pattern: string
  replace: string
  mode: string
  redirectStatus: number
  proxyHost: string
  withQuery: boolean
  isBreak: boolean
  isOn: boolean
  conds: CondsConfig | null
}

interface RewriteData {
  webId: number
  rewriteRules: RewriteRule[] | null
}

interface RewriteFormData {
  pattern: string
  replace: string
  mode: string
  redirectStatus: number
  proxyHost: string
  withQuery: boolean
  isBreak: boolean
  isOn: boolean
  conds: CondsConfig | null
}

const STATUS_OPTIONS = [
  { code: 301, text: 'Moved Permanently' },
  { code: 308, text: 'Permanent Redirect' },
  { code: 302, text: 'Found' },
  { code: 303, text: 'See Other' },
  { code: 307, text: 'Temporary Redirect' },
]

function emptyRule(): RewriteFormData {
  return {
    pattern: '',
    replace: '',
    mode: 'proxy',
    redirectStatus: 307,
    proxyHost: '',
    withQuery: true,
    isBreak: false,
    isOn: true,
    conds: null,
  }
}

export function RewriteForm({
  initial,
  ruleId,
  webId,
  onSaved,
}: {
  initial?: RewriteRule
  ruleId?: number
  webId: number
  onSaved: () => void
}) {
  const toast = useToast()
  const base = initial
    ? {
        pattern: initial.pattern,
        replace: initial.replace,
        mode: initial.mode || 'proxy',
        redirectStatus: initial.redirectStatus || 307,
        proxyHost: initial.proxyHost || '',
        withQuery: initial.withQuery,
        isBreak: initial.isBreak,
        isOn: initial.isOn,
        conds: initial.conds,
      }
    : emptyRule()
  const [form, setForm] = useState<RewriteFormData>(base)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof RewriteFormData>(key: K, value: RewriteFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost(ruleId ? '/servers/server/settings/rewrite/updatePopup' : '/servers/server/settings/rewrite/createPopup', {
        webId,
        rewriteRuleId: ruleId || '',
        pattern: form.pattern,
        replace: form.replace,
        mode: form.mode,
        redirectStatus: form.redirectStatus,
        proxyHost: form.proxyHost,
        withQuery: form.withQuery ? 1 : 0,
        isBreak: form.isBreak ? 1 : 0,
        isOn: form.isOn ? 1 : 0,
        condsJSON: form.conds ? JSON.stringify(form.conds) : '',
      })
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
          <FormRow title="匹配规则 *">
            <TextInput
              type="text"
              maxLength={500}
              placeholder="比如 /post/(.+)"
              value={form.pattern}
              onChange={(event) => update('pattern', event.target.value)}
            />
            <p className="comment">需要符合正则表达式规范。</p>
          </FormRow>
          <FormRow title="目标URL *">
            <TextInput
              type="text"
              maxLength={500}
              placeholder="比如 /post/${1}.html"
              value={form.replace}
              onChange={(event) => update('replace', event.target.value)}
            />
            <p className="comment">
              URL中可以包含内置变量，并且可以用 ${'{1}'}、${'{2}'} 等变量形式表示在匹配规则中匹配的第N个括号里的内容，也可以是一个完整的URL。
            </p>
          </FormRow>
          <FormRow title="转发方式">
            <Select value={form.mode} onChange={(event) => update('mode', event.target.value)}>
              <option value="proxy">隐式</option>
              <option value="redirect">显式</option>
            </Select>
            <p className="comment">隐式表示不在客户端显示重写后的URL；显式表示在客户端跳转URL，将会显示重写后的URL。</p>
          </FormRow>
          <FormRow title="匹配条件">
            <CondsEditor value={form.conds || { isOn: true, connector: 'or', groups: [] }} onChange={(conds) => update('conds', conds)} />
          </FormRow>
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
        </tbody>
        {moreOptions ? (
          <tbody>
            {form.mode === 'redirect' ? (
              <FormRow title="跳转状态码">
                <Select
                  value={String(form.redirectStatus)}
                  onChange={(event) => update('redirectStatus', Number(event.target.value) || 0)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.code} {status.text}
                    </option>
                  ))}
                </Select>
                <p className="comment">通常使用默认的307即可。</p>
              </FormRow>
            ) : null}
            {form.mode === 'proxy' ? (
              <FormRow title="代理主机名">
                <TextInput
                  type="text"
                  maxLength={100}
                  placeholder="比如 example.com"
                  value={form.proxyHost}
                  onChange={(event) => update('proxyHost', event.target.value)}
                />
                <p className="comment">如果转发的方式为隐式而且目标URL为不同的域名时需要用到此选项，通常不必填写，支持请求变量。</p>
              </FormRow>
            ) : null}
            <FormRow title="保留URL参数">
              <div className="ui checkbox">
                <input type="checkbox" checked={form.withQuery} onChange={(event) => update('withQuery', event.target.checked)} />
                <label></label>
              </div>
              <p className="comment">选中此选项，将会把用户输入的URL中的参数部分转发到目标URL上。</p>
            </FormRow>
            <FormRow title="终止往下匹配">
              <div className="ui checkbox">
                <input type="checkbox" checked={form.isBreak} onChange={(event) => update('isBreak', event.target.checked)} />
                <label></label>
              </div>
              <p className="comment">如果选中了此选项，一旦匹配成功，不会继续匹配其他的重写规则或路由规则。</p>
            </FormRow>
            <FormRow title="启用当前重写规则">
              <div className="ui checkbox">
                <input type="checkbox" checked={form.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
            </FormRow>
          </tbody>
        ) : null}
      </FormTable>
      {error ? <div className="ui negative message">{error}</div> : null}
      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function RewritePage() {
  const serverId = useSearchInt('serverId')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<RewriteRule | null>(null)

  const query = useQuery({
    queryKey: ['server-settings-rewrite', serverId],
    queryFn: () => apiGet<RewriteData>('/servers/server/settings/rewrite', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const rules = data.rewriteRules || []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['server-settings-rewrite', serverId] })
  }

  async function remove(rule: RewriteRule) {
    if (!(await confirm({ message: '确定要删除此重写规则吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/rewrite/delete', { webId: data.webId, rewriteRuleId: rule.id })
      toast('删除成功')
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '删除失败', 'error')
    }
  }

  async function move(index: number, delta: number) {
    const next = [...rules]
    const target = index + delta
    if (target < 0 || target >= next.length) {
      return
    }
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    try {
      const form = new FormData()
      form.set('webId', String(data.webId))
      next.forEach((rule) => form.append('rewriteRuleIds', String(rule.id)))
      await apiPostForm('/servers/server/settings/rewrite/sort', form)
      toast('保存成功')
      await refresh()
    } catch (event) {
      toast(event instanceof Error ? event.message : '排序失败', 'error')
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/rewrite">
      <div className="ui menu text blue first-menu">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreating(true)
          }}
        >
          [创建]
        </a>
      </div>
      <div className="margin" />
      {rules.length === 0 ? <p className="comment">暂时还没有重写规则。</p> : null}
      {rules.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th style={{ width: '1em' }}></th>
              <th>匹配规则</th>
              <th>转发目标</th>
              <th>转发方式</th>
              <th className="two wide">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.id}>
                <td>
                  <button className="ui button mini basic" type="button" disabled={index === 0} onClick={() => void move(index, -1)}>
                    ↑
                  </button>
                  <button
                    className="ui button mini basic"
                    type="button"
                    disabled={index === rules.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    ↓
                  </button>
                </td>
                <td>
                  {rule.pattern}
                  <br />
                  {rule.isBreak ? <span className="ui label tiny">BREAK</span> : null}
                  {rule.mode === 'redirect' && rule.redirectStatus !== 307 ? (
                    <span className="ui label tiny">{rule.redirectStatus}</span>
                  ) : null}
                  {rule.proxyHost ? <span className="ui label tiny">Host: {rule.proxyHost}</span> : null}
                </td>
                <td>{rule.replace}</td>
                <td>{rule.mode === 'proxy' ? '隐式' : '显示'}</td>
                <td>{rule.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setEditing(rule)
                    }}
                  >
                    修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void remove(rule)
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
      {rules.length > 1 ? <p className="comment">所有规则匹配顺序为从上到下，可以通过上下箭头排序。</p> : null}

      {creating || editing ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '50em' }}>
            <div className="header">{editing ? '修改重写规则' : '创建重写规则'}</div>
            <div className="content">
              <RewriteForm
                webId={data.webId}
                initial={editing || undefined}
                ruleId={editing?.id}
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

export function RewriteCreateRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const webId = useSearchInt('webId')
  const backTo = buildSettingsURL('/rewrite', { serverId })
  return (
    <PopupPage title="创建重写规则" backTo={backTo}>
      <RewriteForm
        webId={webId}
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
    </PopupPage>
  )
}

export function RewriteUpdateRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const webId = useSearchInt('webId')
  const rewriteRuleId = useSearchInt('rewriteRuleId')
  const backTo = buildSettingsURL('/rewrite', { serverId })
  const query = useQuery({
    queryKey: ['server-settings-rewrite-detail', webId, rewriteRuleId],
    queryFn: () =>
      apiGet<{ rewriteRule: RewriteRule }>('/servers/server/settings/rewrite/updatePopup', { webId, rewriteRuleId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <PopupPage title="修改重写规则" backTo={backTo}>
      <RewriteForm
        webId={webId}
        initial={query.data.rewriteRule}
        ruleId={rewriteRuleId}
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
    </PopupPage>
  )
}

