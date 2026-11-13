import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  CondsEditor,
  PopupPage,
  ServerSettingsShell,
  ValuesEditor,
  buildSettingsURL,
  useSearchInt,
} from './common'
import type { CondsConfig } from './common'

export interface RedirectConfig {
  id?: number
  isOn: boolean
  status: number
  type: string
  mode?: string
  beforeURL: string
  afterURL: string
  matchPrefix: boolean
  matchRegexp: boolean
  keepRequestURI: boolean
  keepArgs: boolean
  conds: CondsConfig | null
  domainsAll: boolean
  domainsBefore: string[]
  domainBeforeIgnorePorts: boolean
  domainAfter: string
  domainAfterScheme: string
  portsAll: boolean
  portsBefore: string[]
  portAfter: number
  portAfterScheme: string
  exceptDomains?: string[]
  onlyDomains?: string[]
}

interface RedirectsData {
  webId: number
  redirects: RedirectConfig[] | null
}

interface CreateRedirectData {
  statusList: { code: number; text: string }[]
}

const STATUS_OPTIONS = [
  { code: 301, text: 'Moved Permanently' },
  { code: 308, text: 'Permanent Redirect' },
  { code: 302, text: 'Found' },
  { code: 303, text: 'See Other' },
  { code: 307, text: 'Temporary Redirect' },
]

function emptyRedirect(): RedirectConfig {
  return {
    isOn: true,
    status: 0,
    type: 'url',
    mode: 'equal',
    beforeURL: '',
    afterURL: '',
    matchPrefix: false,
    matchRegexp: false,
    keepRequestURI: false,
    keepArgs: true,
    conds: null,
    domainsAll: false,
    domainsBefore: [],
    domainBeforeIgnorePorts: true,
    domainAfter: '',
    domainAfterScheme: '',
    portsAll: false,
    portsBefore: [],
    portAfter: 0,
    portAfterScheme: '',
    exceptDomains: [],
    onlyDomains: [],
  }
}

export function RedirectForm({
  initial,
  onSaved,
}: {
  initial?: RedirectConfig
  onSaved: (redirect: RedirectConfig) => void
}) {
  const toast = useToast()
  const base = initial || emptyRedirect()
  const [form, setForm] = useState<RedirectConfig>({
    ...emptyRedirect(),
    ...base,
    domainsBefore: base.domainsBefore || [],
    portsBefore: base.portsBefore || [],
    exceptDomains: base.exceptDomains || [],
    onlyDomains: base.onlyDomains || [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [moreOptions, setMoreOptions] = useState(false)
  const [error, setError] = useState('')

  const mode = form.matchPrefix ? 'matchPrefix' : form.matchRegexp ? 'matchRegexp' : 'equal'

  function update<K extends keyof RedirectConfig>(key: K, value: RedirectConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function changeMode(value: string) {
    setForm((current) => ({
      ...current,
      matchPrefix: value === 'matchPrefix',
      matchRegexp: value === 'matchRegexp',
      mode: value,
    }))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      const data = new FormData()
      data.set('csrfToken', csrfToken)
      data.set('type', form.type)
      data.set('status', String(form.status || 0))
      data.set('matchPrefix', form.matchPrefix ? '1' : '0')
      data.set('matchRegexp', form.matchRegexp ? '1' : '0')
      data.set('mode', mode)
      data.set('beforeURL', form.beforeURL)
      data.set('afterURL', form.afterURL)
      data.set('keepRequestURI', form.keepRequestURI ? '1' : '0')
      data.set('keepArgs', form.keepArgs ? '1' : '0')
      data.set('domainsAll', form.domainsAll ? '1' : '0')
      data.set('domainsBeforeJSON', JSON.stringify(form.domainsBefore))
      data.set('domainBeforeIgnorePorts', form.domainBeforeIgnorePorts ? '1' : '0')
      data.set('domainAfter', form.domainAfter)
      data.set('domainAfterScheme', form.domainAfterScheme)
      data.set('portsAll', form.portsAll ? '1' : '0')
      form.portsBefore.forEach((port) => data.append('portsBefore', port))
      data.set('portAfter', String(form.portAfter || 0))
      data.set('portAfterScheme', form.portAfterScheme)
      data.set('exceptDomainsJSON', JSON.stringify(form.exceptDomains || []))
      data.set('onlyDomainsJSON', JSON.stringify(form.onlyDomains || []))
      data.set('condsJSON', form.conds ? JSON.stringify(form.conds) : '')
      data.set('isOn', form.isOn ? '1' : '0')
      const result = await apiPostForm<{ redirect: RedirectConfig }>('/servers/server/settings/redirects/createPopup', data)
      toast('保存成功')
      onSaved({ ...result.redirect, id: form.id })
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
          <FormRow title="跳转类型">
            <Select value={form.type} onChange={(event) => update('type', event.target.value)}>
              <option value="url">URL跳转</option>
              <option value="domain">域名跳转</option>
              <option value="port">端口跳转</option>
            </Select>
          </FormRow>
          {form.type === 'url' ? (
            <>
              <FormRow title="跳转前URL *">
                <TextInput
                  type="text"
                  placeholder="比如 http://www.url1.com"
                  value={form.beforeURL}
                  onChange={(event) => update('beforeURL', event.target.value)}
                />
                <p className="comment">
                  需要填写完整的URL，包括<span className="ui label tiny">http://</span>或者<span className="ui label tiny">https://</span>
                  ，如果有非默认端口，也需要带上端口号。
                </p>
              </FormRow>
              <FormRow title="匹配模式 *">
                <Select value={mode} onChange={(event) => changeMode(event.target.value)}>
                  <option value="equal">精准匹配</option>
                  <option value="matchPrefix">匹配前缀</option>
                  <option value="matchRegexp">正则匹配</option>
                </Select>
                <p className="comment">
                  {mode === 'equal' ? '精准匹配跳转前的URL，即只有访问完全一样的URL才会跳转。' : null}
                  {mode === 'matchPrefix' ? '只要访问的URL头部部分包含跳转前URL，即可跳转。' : null}
                  {mode === 'matchRegexp'
                    ? '可以在跳转前URL中使用正则表达式，然后可以在跳转后URL中使用正则表达式中括号的变量，比如${1}、${2}分别表示第一个和第二个括号内的变量值。'
                    : null}
                </p>
              </FormRow>
              <FormRow title="跳转后URL *">
                <TextInput
                  type="text"
                  placeholder="比如 https://www.url2.cn"
                  value={form.afterURL}
                  onChange={(event) => update('afterURL', event.target.value)}
                />
                <p className="comment">需要填写完整的URL，包括http://或者https://，如果有非默认端口，也需要带上端口号。</p>
              </FormRow>
              {mode === 'matchPrefix' ? (
                <FormRow title="是否保留URL路径参数">
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={form.keepRequestURI}
                      onChange={(event) => update('keepRequestURI', event.target.checked)}
                    />
                    <label></label>
                  </div>
                  <p className="comment">选中后，则跳转之后，保留跳转之前的URL路径和参数。</p>
                </FormRow>
              ) : null}
              {mode === 'equal' || mode === 'matchRegexp' ? (
                <FormRow title="是否保留请求参数">
                  <div className="ui checkbox">
                    <input type="checkbox" checked={form.keepArgs} onChange={(event) => update('keepArgs', event.target.checked)} />
                    <label></label>
                  </div>
                  <p className="comment">选中后，则跳转之后，保留跳转之前的URL上的参数（即问号之后的部分）。</p>
                </FormRow>
              ) : null}
            </>
          ) : null}
          {form.type === 'domain' ? (
            <>
              <FormRow title="所有域名都跳转">
                <div className="ui checkbox">
                  <input type="checkbox" checked={form.domainsAll} onChange={(event) => update('domainsAll', event.target.checked)} />
                  <label></label>
                </div>
                <p className="comment">选中后，表示所有域名都会跳转（只要跳转前后域名不同）；不选中后可以指定域名跳转。</p>
              </FormRow>
              {!form.domainsAll ? (
                <FormRow title="指定跳转前域名">
                  <ValuesEditor
                    values={form.domainsBefore}
                    onChange={(values) => update('domainsBefore', values)}
                    placeholder="比如 example.com"
                  />
                </FormRow>
              ) : null}
              <FormRow title="忽略跳转前端口">
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={form.domainBeforeIgnorePorts}
                    onChange={(event) => update('domainBeforeIgnorePorts', event.target.checked)}
                  />
                  <label></label>
                </div>
                <p className="comment">选中后，表示忽略跳转前域名端口，只要域名匹配时就跳转；如不选中，则表示只有域名和端口同时匹配时才会跳转。</p>
              </FormRow>
              <FormRow title="跳转后域名 *">
                <TextInput
                  type="text"
                  maxLength={100}
                  placeholder="比如example.com"
                  value={form.domainAfter}
                  onChange={(event) => update('domainAfter', event.target.value)}
                />
                <p className="comment">这里填写的是网址中的域名部分，不需要添加https://部分。</p>
              </FormRow>
              <FormRow title="跳转后协议">
                <Select value={form.domainAfterScheme} onChange={(event) => update('domainAfterScheme', event.target.value)}>
                  <option value="">保持</option>
                  <option value="https">HTTPS</option>
                  <option value="http">HTTP</option>
                </Select>
                <p className="comment">跳转后的URL的协议。</p>
              </FormRow>
            </>
          ) : null}
          {form.type === 'port' ? (
            <>
              <FormRow title="所有端口都跳转">
                <div className="ui checkbox">
                  <input type="checkbox" checked={form.portsAll} onChange={(event) => update('portsAll', event.target.checked)} />
                  <label></label>
                </div>
                <p className="comment">选中后，表示所有端口都会跳转（只要跳转前后端口不同）；不选中后可以指定端口跳转。</p>
              </FormRow>
              {!form.portsAll ? (
                <FormRow title="指定跳转前端口">
                  <ValuesEditor values={form.portsBefore} onChange={(values) => update('portsBefore', values)} placeholder="单个端口 或 端口1-端口2" />
                </FormRow>
              ) : null}
              <FormRow title="跳转后端口 *">
                <TextInput
                  type="text"
                  maxLength={5}
                  style={{ width: '5em' }}
                  value={form.portAfter > 0 ? String(form.portAfter) : ''}
                  onChange={(event) => update('portAfter', Number(event.target.value) || 0)}
                />
              </FormRow>
              <FormRow title="跳转后协议">
                <Select value={form.portAfterScheme} onChange={(event) => update('portAfterScheme', event.target.value)}>
                  <option value="">保持</option>
                  <option value="https">HTTPS</option>
                  <option value="http">HTTP</option>
                </Select>
                <p className="comment">跳转后的URL的协议。</p>
              </FormRow>
            </>
          ) : null}
          <FormRow title="跳转状态码">
            <Select
              value={String(form.status)}
              onChange={(event) => update('status', Number(event.target.value) || 0)}
            >
              <option value="0">[默认]</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.code} - {status.text}
                </option>
              ))}
            </Select>
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
            <FormRow title="例外域名">
              <ValuesEditor values={form.exceptDomains || []} onChange={(values) => update('exceptDomains', values)} />
              <p className="comment">这些域名<strong>不</strong>执行跳转。</p>
            </FormRow>
            <FormRow title="仅限域名">
              <ValuesEditor values={form.onlyDomains || []} onChange={(values) => update('onlyDomains', values)} />
              <p className="comment">只有这些域名执行跳转。</p>
            </FormRow>
            <FormRow title="匹配条件">
              <CondsEditor value={form.conds || { isOn: true, connector: 'or', groups: [] }} onChange={(conds) => update('conds', conds)} />
            </FormRow>
            <FormRow title="启用当前跳转">
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

function redirectSummary(redirect: RedirectConfig): { before: string; after: string; tags: string[] } {
  const tags: string[] = []
  let before = ''
  let after = ''
  if (redirect.type === 'domain') {
    before = redirect.domainsAll ? '所有域名' : (redirect.domainsBefore || []).join(', ')
    after = redirect.domainAfter
    tags.push('域名跳转')
    if (redirect.domainAfterScheme) {
      tags.push(redirect.domainAfterScheme)
    }
    if (redirect.domainBeforeIgnorePorts) {
      tags.push('忽略端口')
    }
  } else if (redirect.type === 'port') {
    before = redirect.portsAll ? '所有端口' : (redirect.portsBefore || []).join(', ')
    after = String(redirect.portAfter || '')
    tags.push('端口跳转')
    if (redirect.portAfterScheme) {
      tags.push(redirect.portAfterScheme)
    }
  } else {
    before = redirect.beforeURL
    after = redirect.afterURL
    tags.push('URL跳转')
    tags.push(redirect.matchPrefix ? '匹配前缀' : redirect.matchRegexp ? '正则匹配' : '精准匹配')
    ;(redirect.exceptDomains || []).forEach((domain) => tags.push(`排除:${domain}`))
    ;(redirect.onlyDomains || []).forEach((domain) => tags.push(`仅限:${domain}`))
  }
  return { before, after, tags }
}

export function RedirectsPage() {
  const serverId = useSearchInt('serverId')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [redirects, setRedirects] = useState<RedirectConfig[] | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const query = useQuery({
    queryKey: ['server-settings-redirects', serverId],
    queryFn: () => apiGet<RedirectsData>('/servers/server/settings/redirects', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current = redirects ?? (data.redirects || [])

  async function persist(next: RedirectConfig[]) {
    setRedirects(next)
    try {
      await apiPost('/servers/server/settings/redirects', {
        serverId,
        webId: data.webId,
        hostRedirectsJSON: JSON.stringify(next),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-settings-redirects', serverId] })
    } catch (event) {
      toast(event instanceof Error ? event.message : '保存失败', 'error')
    }
  }

  function saveForm(redirect: RedirectConfig) {
    let next: RedirectConfig[]
    if (editingIndex !== null) {
      next = current.map((item, index) => (index === editingIndex ? redirect : item))
    } else {
      const nextId = current.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1
      next = [...current, { ...redirect, id: nextId }]
    }
    setCreating(false)
    setEditingIndex(null)
    void persist(next)
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/redirects">
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
      {current.length === 0 ? <p className="comment">暂时还没有URL跳转规则。</p> : null}
      {current.length > 0 ? (
        <table className="ui table celled selectable">
          <thead>
            <tr>
              <th>跳转前</th>
              <th style={{ width: '1em' }}></th>
              <th>跳转后</th>
              <th>HTTP状态码</th>
              <th className="two wide">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {current.map((redirect, index) => {
              const summary = redirectSummary(redirect)
              return (
                <tr key={`${redirect.id}-${index}`}>
                  <td>
                    {summary.before}
                    <div style={{ marginTop: '0.4em' }}>
                      {summary.tags.map((tag) => (
                        <span className="ui label tiny basic" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>-&gt;</td>
                  <td>{summary.after}</td>
                  <td>{redirect.status > 0 ? redirect.status : <span className="disabled">默认</span>}</td>
                  <td>
                    {redirect.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditingIndex(index)
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void confirm({ message: '确定要删除这条跳转规则吗？' }).then((ok) => {
                          if (ok) {
                            void persist(current.filter((_, i) => i !== index))
                          }
                        })
                      }}
                    >
                      删除
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {creating || editingIndex !== null ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '55em' }}>
            <div className="header">{editingIndex !== null ? '修改URL跳转' : '添加URL跳转'}</div>
            <div className="content">
              <RedirectForm
                initial={editingIndex !== null ? current[editingIndex] : undefined}
                onSaved={saveForm}
              />
            </div>
            <div className="actions">
              <button
                className="ui button"
                onClick={() => {
                  setCreating(false)
                  setEditingIndex(null)
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

export function RedirectCreateRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const backTo = buildSettingsURL('/redirects', { serverId })
  const query = useQuery({
    queryKey: ['server-settings-redirects-create'],
    queryFn: () => apiGet<CreateRedirectData>('/servers/server/settings/redirects/createPopup', {}),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }

  return (
    <PopupPage title="添加URL跳转" backTo={backTo}>
      <RedirectForm
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
    </PopupPage>
  )
}

