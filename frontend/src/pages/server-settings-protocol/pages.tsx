import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { GroupConfigWarning, PopupPage, ServerSettingsShell, URLPatternsEditor, buildSettingsURL, useSearchInt } from './common'
import type { URLPattern } from './common'

interface HTTPPageConfig {
  id: number
  isOn: boolean
  status: string[]
  newStatus: number
  bodyType: string
  url: string
  body: string
  onlyURLPatterns: URLPattern[] | null
  exceptURLPatterns: URLPattern[] | null
}

interface ShutdownConfig {
  isPrior: boolean
  isOn: boolean
  bodyType: string
  url: string
  body: string
  status: number
}

interface PagesData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  enableGlobalPages: boolean
  pages: HTTPPageConfig[]
  shutdownConfig: ShutdownConfig | null
}

interface BodyType {
  name: string
  code: string
}

interface PageFormData {
  status: string
  bodyType: string
  body: string
  url: string
  newStatus: number
  exceptURLPatterns: URLPattern[]
  onlyURLPatterns: URLPattern[]
}

const BODY_TYPES: BodyType[] = [
  { name: 'HTML', code: 'html' },
  { name: '读取URL', code: 'url' },
  { name: '跳转URL', code: 'redirectURL' },
]

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
\t<title>\${status} \${statusMessage}</title>
\t<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
\t<style>
\t\taddress { line-height: 1.8; }
\t</style>
</head>
<body>

<h1>\${status} \${statusMessage}</h1>
<p><!-- 内容 --></p>

<address>Connection: \${remoteAddr} (Client) -&gt; \${serverAddr} (Server)</address>
<address>Request ID: \${requestId}</address>

</body>
</html>`

const SHUTDOWN_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
\t<title>升级中</title>
\t<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
\t<style>
\t\taddress { line-height: 1.8; }
\t</style>
</head>
<body>

<h1>网站升级中</h1>
<p>为了给您提供更好的服务，我们正在升级网站，请稍后重新访问。</p>

<address>Connection: \${remoteAddr} (Client) -&gt; \${serverAddr} (Server)</address>
<address>Request ID: \${requestId}</address>

</body>
</html>`

function pageToForm(page: HTTPPageConfig): PageFormData {
  return {
    status: page.status && page.status.length > 0 ? page.status[0] : '',
    bodyType: page.bodyType || 'html',
    body: page.body || '',
    url: page.url || '',
    newStatus: page.newStatus || 0,
    exceptURLPatterns: page.exceptURLPatterns || [],
    onlyURLPatterns: page.onlyURLPatterns || [],
  }
}

function emptyForm(): PageFormData {
  return {
    status: '',
    bodyType: 'html',
    body: '',
    url: '',
    newStatus: 0,
    exceptURLPatterns: [],
    onlyURLPatterns: [],
  }
}

export function PageForm({
  initial,
  pageId,
  onSaved,
}: {
  initial?: HTTPPageConfig
  pageId?: number
  onSaved: (page: HTTPPageConfig) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<PageFormData>(initial ? pageToForm(initial) : emptyForm())
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof PageFormData>(key: K, value: PageFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    if (form.status.length !== 3) {
      setError('状态码长度必须为3位')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await apiPost<{ page: HTTPPageConfig }>(
        pageId ? '/servers/server/settings/pages/updatePopup' : '/servers/server/settings/pages/createPopup',
        {
          pageId: pageId || '',
          status: form.status,
          bodyType: form.bodyType,
          body: form.body,
          url: form.url,
          newStatus: form.newStatus,
          exceptURLPatternsJSON: JSON.stringify(form.exceptURLPatterns),
          onlyURLPatternsJSON: JSON.stringify(form.onlyURLPatterns),
        },
      )
      toast('保存成功')
      onSaved(result.page)
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
          <FormRow title="响应状态码 *">
            <TextInput
              type="text"
              size={3}
              maxLength={3}
              placeholder="状态码"
              style={{ width: '5.2em' }}
              value={form.status}
              onChange={(event) => update('status', event.target.value)}
            />
            <p className="comment">匹配的响应状态码，比如404，或者50x。</p>
          </FormRow>
          <FormRow title="内容类型 *">
            <Select value={form.bodyType} onChange={(event) => update('bodyType', event.target.value)}>
              {BODY_TYPES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormRow>
          {form.bodyType === 'html' ? (
            <FormRow title="显示页面HTML *">
              <textarea rows={7} value={form.body} onChange={(event) => update('body', event.target.value)} />
              <p className="comment">
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    update('body', HTML_TEMPLATE)
                  }}
                >
                  [使用模板]
                </a>
                。填写页面的HTML内容，支持请求变量。
              </p>
            </FormRow>
          ) : null}
          {form.bodyType === 'url' ? (
            <FormRow title="显示页面URL *">
              <TextInput
                type="text"
                maxLength={500}
                placeholder="类似于 https://example.com/page.html"
                value={form.url}
                onChange={(event) => update('url', event.target.value)}
              />
              <p className="comment">将从此URL中读取内容。</p>
            </FormRow>
          ) : null}
          {form.bodyType === 'redirectURL' ? (
            <FormRow title="跳转到URL *">
              <TextInput
                type="text"
                maxLength={500}
                placeholder="类似于 https://example.com/page.html"
                value={form.url}
                onChange={(event) => update('url', event.target.value)}
              />
              <p className="comment">将会跳转到此URL，支持使用变量。</p>
            </FormRow>
          ) : null}
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
            <FormRow title="例外URL">
              <URLPatternsEditor patterns={form.exceptURLPatterns} onChange={(values) => update('exceptURLPatterns', values)} />
              <p className="comment">对这些URL将不做任何限制。</p>
            </FormRow>
            <FormRow title="限制URL">
              <URLPatternsEditor patterns={form.onlyURLPatterns} onChange={(values) => update('onlyURLPatterns', values)} />
              <p className="comment">只对这些URL做限制。</p>
            </FormRow>
            <FormRow title="新状态码">
              <TextInput
                type="text"
                size={3}
                maxLength={3}
                placeholder="状态码"
                style={{ width: '5.2em' }}
                value={form.newStatus > 0 ? String(form.newStatus) : ''}
                onChange={(event) => update('newStatus', Number(event.target.value) || 0)}
              />
              <p className="comment">可以用来修改响应的状态码，不填表示不改变原有状态码。</p>
            </FormRow>
          </tbody>
        ) : null}
      </FormTable>
      {error ? <div className="ui negative message">{error}</div> : null}
      <SubmitButton submitting={submitting} />
    </form>
  )
}

function PagesTable({
  pages,
  onEdit,
  onRemove,
}: {
  pages: HTTPPageConfig[]
  onEdit: (page: HTTPPageConfig) => void
  onRemove: (index: number) => void
}) {
  if (pages.length === 0) {
    return null
  }
  return (
    <table className="ui table selectable celled">
      <thead>
        <tr>
          <th className="two wide">响应状态码</th>
          <th>页面类型</th>
          <th className="two wide">新状态码</th>
          <th>例外URL</th>
          <th>限制URL</th>
          <th className="two op">操作</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page, index) => (
          <tr key={`${page.id}-${index}`}>
            <td>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  onEdit(page)
                }}
              >
                {page.status && page.status.length > 0 ? page.status.join(',') : ''}
              </a>
            </td>
            <td style={{ wordBreak: 'break-all' }}>
              {page.bodyType === 'url' ? (
                <div>
                  {page.url}
                  <div>
                    <span className="ui label tiny basic">读取URL</span>
                  </div>
                </div>
              ) : null}
              {page.bodyType === 'redirectURL' ? (
                <div>
                  {page.url}
                  <div>
                    <span className="ui label tiny basic">跳转URL</span>
                    {page.newStatus > 0 ? <span className="ui label tiny basic">{page.newStatus}</span> : null}
                  </div>
                </div>
              ) : null}
              {page.bodyType === 'html' ? (
                <div>
                  [HTML内容]
                  {page.newStatus > 0 ? (
                    <div>
                      <span className="ui label tiny basic">{page.newStatus}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </td>
            <td>{page.newStatus > 0 ? page.newStatus : <span className="disabled">保持</span>}</td>
            <td>
              {page.exceptURLPatterns && page.exceptURLPatterns.length > 0 ? (
                page.exceptURLPatterns.map((pattern, i) => (
                  <span key={i} className="ui basic label small">
                    {pattern.pattern}
                  </span>
                ))
              ) : (
                <span className="disabled">-</span>
              )}
            </td>
            <td>
              {page.onlyURLPatterns && page.onlyURLPatterns.length > 0 ? (
                page.onlyURLPatterns.map((pattern, i) => (
                  <span key={i} className="ui basic label small">
                    {pattern.pattern}
                  </span>
                ))
              ) : (
                <span className="disabled">-</span>
              )}
            </td>
            <td>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  onEdit(page)
                }}
              >
                修改
              </a>{' '}
              &nbsp;
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  onRemove(index)
                }}
              >
                删除
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PagesPage() {
  const serverId = useSearchInt('serverId')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [pages, setPages] = useState<HTTPPageConfig[] | null>(null)
  const [shutdown, setShutdown] = useState<ShutdownConfig | null>(null)
  const [enableGlobalPages, setEnableGlobalPages] = useState<boolean | null>(null)
  const [editing, setEditing] = useState<HTTPPageConfig | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-pages', serverId],
    queryFn: () => apiGet<PagesData>('/servers/server/settings/pages', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const currentPages = pages ?? data.pages ?? []
  const currentShutdown: ShutdownConfig = shutdown ?? {
    isPrior: false,
    isOn: false,
    bodyType: 'html',
    url: '',
    body: '',
    status: 0,
    ...(data.shutdownConfig || {}),
  }
  const currentGlobal = enableGlobalPages ?? data.enableGlobalPages

  function updateShutdown<K extends keyof ShutdownConfig>(key: K, value: ShutdownConfig[K]) {
    setShutdown({ ...currentShutdown, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/pages', {
        webId: data.webId,
        pagesJSON: JSON.stringify(currentPages),
        shutdownJSON: JSON.stringify(currentShutdown),
        enableGlobalPages: currentGlobal ? 1 : 0,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-settings-pages', serverId] })
      setPages(null)
      setShutdown(null)
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/pages">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h4 style={{ marginBottom: '0.5em' }}>自定义页面</h4>
        <p className="comment" style={{ paddingTop: 0, marginTop: 0 }}>
          根据响应状态码返回一些自定义页面，比如404，500等错误页面。
        </p>
        <PagesTable
          pages={currentPages}
          onEdit={(page) => setEditing(page)}
          onRemove={(index) => {
            void confirm({ message: '确定要删除此自定义页面吗？' }).then((ok) => {
              if (ok) {
                setPages(currentPages.filter((_, i) => i !== index))
              }
            })
          }}
        />
        <div style={{ marginTop: '1em' }}>
          <button
            className="ui button small"
            type="button"
            onClick={(event) => {
              event.preventDefault()
              setCreating(true)
            }}
          >
            <Plus size={12} /> 添加自定义页面
          </button>
        </div>

        <h4 style={{ marginTop: '2em' }}>临时关闭页面</h4>
        <p className="comment" style={{ marginTop: 0, paddingTop: 0 }}>
          开启临时关闭页面时，所有请求都会直接显示此页面。可用于临时升级网站或者禁止用户访问某个网页。
        </p>
        <FormTable>
          <tbody>
            <FormRow title="启用临时关闭网站">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={currentShutdown.isOn}
                  onChange={(event) => updateShutdown('isOn', event.target.checked)}
                />
                <label></label>
              </div>
              <p className="comment">选中后，表示临时关闭当前网站，并显示自定义内容。</p>
            </FormRow>
            {currentShutdown.isOn ? (
              <>
                <FormRow title="显示内容类型 *">
                  <Select value={currentShutdown.bodyType} onChange={(event) => updateShutdown('bodyType', event.target.value)}>
                    <option value="html">HTML</option>
                    <option value="url">读取URL</option>
                    <option value="redirectURL">跳转URL</option>
                  </Select>
                </FormRow>
                {currentShutdown.bodyType === 'url' || currentShutdown.bodyType === 'redirectURL' ? (
                  <FormRow title={currentShutdown.bodyType === 'url' ? '显示页面URL *' : '跳转到URL *'}>
                    <TextInput
                      type="text"
                      value={currentShutdown.url}
                      placeholder="类似于 https://example.com/page.html"
                      onChange={(event) => updateShutdown('url', event.target.value)}
                    />
                    <p className="comment">
                      {currentShutdown.bodyType === 'url' ? '将从此URL中读取内容。' : '将会跳转到此URL。'}
                    </p>
                  </FormRow>
                ) : null}
                {currentShutdown.bodyType === 'html' ? (
                  <FormRow title="显示页面HTML *">
                    <textarea rows={7} value={currentShutdown.body} onChange={(event) => updateShutdown('body', event.target.value)} />
                    <p className="comment">
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          updateShutdown('body', SHUTDOWN_HTML_TEMPLATE)
                        }}
                      >
                        [使用模板]
                      </a>
                      。填写页面的HTML内容，支持请求变量。
                    </p>
                  </FormRow>
                ) : null}
                <FormRow title="状态码">
                  <TextInput
                    type="text"
                    size={3}
                    maxLength={3}
                    placeholder="状态码"
                    style={{ width: '5.2em' }}
                    value={currentShutdown.status > 0 ? String(currentShutdown.status) : ''}
                    onChange={(event) => updateShutdown('status', Number(event.target.value) || 0)}
                  />
                </FormRow>
              </>
            ) : null}
          </tbody>
        </FormTable>

        <h4 style={{ marginTop: '2em' }}>其他设置</h4>
        <FormTable>
          <tbody>
            <FormRow title="启用系统自定义页面">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={currentGlobal}
                  onChange={(event) => setEnableGlobalPages(event.target.checked)}
                />
                <label></label>
              </div>
              <p className="comment">选中后，表示如果当前网站没有自定义页面，则尝试使用系统对应的自定义页面。</p>
            </FormRow>
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>

      {creating || editing ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '50em' }}>
            <div className="header">{editing ? '修改自定义页面' : '添加自定义页面'}</div>
            <div className="content">
              <PageForm
                initial={editing || undefined}
                pageId={editing?.id}
                onSaved={(page) => {
                  if (editing) {
                    setPages(currentPages.map((item) => (item.id === page.id ? page : item)))
                  } else {
                    setPages([...currentPages, page])
                  }
                  setCreating(false)
                  setEditing(null)
                }}
              />
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => { setCreating(false); setEditing(null) }}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ServerSettingsShell>
  )
}

export function PageCreateRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const webId = useSearchInt('webId')
  const backTo = buildSettingsURL('/pages', { serverId })
  return (
    <PopupPage title="添加自定义页面" backTo={backTo}>
      <PageForm
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
      {webId > 0 ? <p className="comment">Web ID: {webId}</p> : null}
    </PopupPage>
  )
}

export function PageUpdateRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const pageId = useSearchInt('pageId')
  const backTo = buildSettingsURL('/pages', { serverId })
  const query = useQuery({
    queryKey: ['server-settings-pages-detail', pageId],
    queryFn: () => apiGet<{ pageConfig: HTTPPageConfig }>('/servers/server/settings/pages/updatePopup', { pageId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <PopupPage title="修改自定义页面" backTo={backTo}>
      <PageForm
        initial={query.data.pageConfig}
        pageId={query.data.pageConfig.id}
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
    </PopupPage>
  )
}
