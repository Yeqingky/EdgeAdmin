import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultConds, MissingLocation, useLocationData } from './helpers'
import { CondsBox, Modal, MoreOptionsIndicator } from './editors'
import type { LocationBaseData, RequestCondsConfig } from './types'

interface RewriteRule {
  id: number
  isOn: boolean
  conds: RequestCondsConfig | null
  pattern: string
  mode: string
  redirectStatus: number
  proxyHost: string
  replace: string
  withQuery: boolean
  isBreak: boolean
}

interface RewriteData extends LocationBaseData {
  webId: number
  rewriteRules: RewriteRule[] | null
}

const STATUS_OPTIONS: Array<{ code: number; text: string }> = [
  { code: 301, text: 'Moved Permanently' },
  { code: 308, text: 'Permanent Redirect' },
  { code: 302, text: 'Found' },
  { code: 303, text: 'See Other' },
  { code: 307, text: 'Temporary Redirect' },
]

async function postRepeatedIds(webId: number, ids: number[]) {
  const body = new URLSearchParams()
  body.set('webId', String(webId))
  ids.forEach((id) => body.append('rewriteRuleIds', String(id)))
  const resp = await fetch('/servers/server/settings/rewrite/sort', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  const result = (await resp.json()) as { code: number; message: string }
  if (result.code !== 200) {
    throw new Error(result.message || '排序失败')
  }
}

function RewriteRuleForm({ webId, rule, onClose }: { webId: number; rule: RewriteRule | null; onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pattern, setPattern] = useState(rule?.pattern || '')
  const [replace, setReplace] = useState(rule?.replace || '')
  const [mode, setMode] = useState(rule?.mode || 'proxy')
  const [redirectStatus, setRedirectStatus] = useState(rule?.redirectStatus || 307)
  const [proxyHost, setProxyHost] = useState(rule?.proxyHost || '')
  const [withQuery, setWithQuery] = useState(rule?.withQuery ?? true)
  const [isBreak, setIsBreak] = useState(rule?.isBreak ?? false)
  const [isOn, setIsOn] = useState(rule?.isOn ?? true)
  const [conds, setConds] = useState<RequestCondsConfig>(defaultConds(rule?.conds))
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const params: Record<string, unknown> = {
        webId,
        pattern,
        replace,
        mode,
        redirectStatus,
        proxyHost,
        withQuery,
        isBreak,
        isOn,
        condsJSON: JSON.stringify(conds),
      }
      if (rule) {
        params.rewriteRuleId = rule.id
      }
      await apiPost(rule ? '/servers/server/settings/rewrite/updatePopup' : '/servers/server/settings/rewrite/createPopup', params)
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-rewrite'] })
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={rule ? '修改重写规则' : '创建重写规则'} onClose={onClose} width="46em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <tbody>
            <FormRow title="匹配规则 *">
              <input type="text" maxLength={500} placeholder="比如 /post/(.+)" value={pattern} onChange={(event) => setPattern(event.target.value)} />
              <p className="comment">需要符合正则表达式规范.</p>
            </FormRow>
            <FormRow title="目标URL *">
              <input type="text" maxLength={500} placeholder="比如 /post/${1}.html" value={replace} onChange={(event) => setReplace(event.target.value)} />
              <p className="comment">
                URL中可以包含一些内置的变量,并且可以用<code>{'${1}'}</code>,<code>{'${2}'}</code>等变量形式表示在匹配规则中匹配的第N个括号里的内容,
                也可以是一个完整的URL,比如:http://example.com/hello.
              </p>
            </FormRow>
            <FormRow title="转发方式">
              <select className="ui dropdown auto-width" value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="proxy">隐式</option>
                <option value="redirect">显式</option>
              </select>
              <p className="comment">隐式表示不在客户端显示重写后的URL;显式表示在客户端跳转URL,将会显示重写后的URL.</p>
            </FormRow>
            <FormRow title="匹配条件">
              <CondsBox conds={conds} onChange={setConds} />
            </FormRow>
            <tr>
              <td colSpan={2}>
                <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
              </td>
            </tr>
          </tbody>
          {moreOptionsVisible ? (
            <tbody>
              {mode === 'redirect' ? (
                <FormRow title="跳转状态码">
                  <select className="ui dropdown auto-width" value={redirectStatus} onChange={(event) => setRedirectStatus(Number(event.target.value))}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.code} value={status.code}>
                        {status.code} {status.text}
                      </option>
                    ))}
                  </select>
                  <p className="comment">通常使用默认的307即可.</p>
                </FormRow>
              ) : null}
              {mode === 'proxy' ? (
                <FormRow title="代理主机名">
                  <input type="text" maxLength={100} placeholder="比如 example.com" value={proxyHost} onChange={(event) => setProxyHost(event.target.value)} />
                  <p className="comment">
                    如果转发的方式为隐式而且目标URL为不同的域名时需要用到此选项,用于修改被代理服务接收到的域名,默认和客户端请求的主机名一致,通常不必填写,支持请求变量.
                  </p>
                </FormRow>
              ) : null}
              <FormRow title="保留URL参数">
                <Checkbox checked={withQuery} onChange={setWithQuery} />
                <p className="comment">选中此选项,将会把用户输入的URL中的参数部分转发到目标URL上.</p>
              </FormRow>
              <FormRow title="终止往下匹配">
                <Checkbox checked={isBreak} onChange={setIsBreak} />
                <p className="comment">如果选中了此选项,一旦匹配成功,不会继续匹配其他的重写规则或路由规则.</p>
              </FormRow>
              <FormRow title="启用当前重写规则">
                <Checkbox checked={isOn} onChange={setIsOn} />
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

export function RewritePage() {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<RewriteData>('/servers/server/settings/locations/rewrite', 'location-rewrite')
  const [rules, setRules] = useState<RewriteRule[]>([])
  const [editingRule, setEditingRule] = useState<RewriteRule | null | undefined>(undefined)

  useEffect(() => {
    if (query.data) {
      setRules(query.data.rewriteRules ? query.data.rewriteRules.map((rule) => ({ ...rule })) : [])
    }
  }, [query.data])

  if (locationId === 0) {
    return <MissingLocation />
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function removeRule(rule: RewriteRule) {
    if (!(await confirm({ message: '确定要删除此重写规则吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/rewrite/delete', { webId: query.data?.webId, rewriteRuleId: rule.id })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['location-rewrite', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function move(index: number, offset: number) {
    if (!query.data) {
      return
    }
    const target = index + offset
    if (target < 0 || target >= rules.length) {
      return
    }
    const next = [...rules]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setRules(next)
    try {
      await postRepeatedIds(query.data.webId, next.map((rule) => rule.id))
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '排序失败', 'error')
      setRules(rules)
    }
  }

  return (
    <LocationShell data={query.data} menu={[{ name: '[创建]', onClick: () => setEditingRule(null) }]}>
      <div className="margin" />
      {rules.length === 0 ? <p className="comment">暂时还没有重写规则.</p> : null}
      {rules.length > 0 ? (
        <table className="ui table selectable">
          <thead>
            <tr>
              <th style={{ width: '1em' }} />
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
                  <a
                    href=""
                    title="上移"
                    style={{ marginRight: '0.2em', opacity: index === 0 ? 0.3 : 1 }}
                    onClick={(event) => { event.preventDefault(); move(index, -1) }}
                  >
                    <ArrowUp size={12} />
                  </a>
                  <a href="" title="下移" style={{ opacity: index === rules.length - 1 ? 0.3 : 1 }} onClick={(event) => { event.preventDefault(); move(index, 1) }}>
                    <ArrowDown size={12} />
                  </a>
                </td>
                <td>
                  {rule.pattern}
                  <br />
                  {rule.isBreak ? <span className="ui label tiny">BREAK</span> : null}
                  {rule.mode === 'redirect' && rule.redirectStatus !== 307 ? <span className="ui label tiny">{rule.redirectStatus}</span> : null}
                  {rule.proxyHost && rule.proxyHost.length > 0 ? <span className="ui label tiny">Host: {rule.proxyHost}</span> : null}
                </td>
                <td>{rule.replace}</td>
                <td>{rule.mode === 'proxy' ? '隐式' : '显示'}</td>
                <td>
                  {rule.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}
                </td>
                <td>
                  <a href="" onClick={(event) => { event.preventDefault(); setEditingRule(rule) }}>
                    <Pencil size={12} /> 修改
                  </a>{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); removeRule(rule) }}>
                    <Trash2 size={12} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {rules.length > 0 ? <p className="comment">使用左侧箭头可以对重写规则进行排序.</p> : null}
      {editingRule !== undefined ? <RewriteRuleForm webId={query.data.webId} rule={editingRule} onClose={() => setEditingRule(undefined)} /> : null}
    </LocationShell>
  )
}
