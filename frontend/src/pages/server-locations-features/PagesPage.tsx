import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, Modal, PriorCheckbox, UrlsPatternsBox } from './editors'
import type { LocationBaseData, UrlPattern } from './types'

interface PageItem {
  id: number
  isOn?: boolean
  status: string[]
  newStatus: number
  bodyType: string
  url: string
  body: string
  onlyURLPatterns?: UrlPattern[] | null
  exceptURLPatterns?: UrlPattern[] | null
}

interface ShutdownConfig {
  isPrior: boolean
  isOn: boolean
  bodyType: string
  url: string
  body: string
  status: number
}

interface PagesData extends LocationBaseData {
  webId: number
  enableGlobalPages: boolean
  pages: PageItem[] | null
  shutdownConfig: ShutdownConfig | null
}

const BODY_TYPES: Array<{ code: string; name: string }> = [
  { code: 'html', name: 'HTML' },
  { code: 'url', name: '读取URL' },
  { code: 'redirectURL', name: '跳转URL' },
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

const SHUTDOWN_TEMPLATE = `<!DOCTYPE html>
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

function normalizePage(page: PageItem): PageItem {
  return {
    id: page.id,
    isOn: page.isOn ?? false,
    status: page.status ? [...page.status] : [],
    newStatus: page.newStatus || 0,
    bodyType: page.bodyType || 'html',
    url: page.url || '',
    body: page.body || '',
    onlyURLPatterns: page.onlyURLPatterns ? page.onlyURLPatterns.map((item) => ({ ...item })) : [],
    exceptURLPatterns: page.exceptURLPatterns ? page.exceptURLPatterns.map((item) => ({ ...item })) : [],
  }
}

function normalizeShutdown(config: ShutdownConfig | null): ShutdownConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    bodyType: config?.bodyType || 'html',
    url: config?.url || '',
    body: config?.body || '',
    status: config?.status || 0,
  }
}

function PageForm({ page, onSaved, onClose }: { page: PageItem | null; onSaved: (page: PageItem) => void; onClose: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState(page ? page.status.join(',') : '')
  const [bodyType, setBodyType] = useState(page?.bodyType || 'html')
  const [body, setBody] = useState(page?.body || '')
  const [url, setUrl] = useState(page?.url || '')
  const [newStatus, setNewStatus] = useState(page && page.newStatus > 0 ? String(page.newStatus) : '')
  const [exceptURLPatterns, setExceptURLPatterns] = useState<UrlPattern[]>(page?.exceptURLPatterns ? [...page.exceptURLPatterns] : [])
  const [onlyURLPatterns, setOnlyURLPatterns] = useState<UrlPattern[]>(page?.onlyURLPatterns ? [...page.onlyURLPatterns] : [])
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const params: Record<string, unknown> = {
        status,
        bodyType,
        body,
        url,
        newStatus: newStatus.length > 0 ? Number(newStatus) : 0,
        exceptURLPatternsJSON: JSON.stringify(exceptURLPatterns),
        onlyURLPatternsJSON: JSON.stringify(onlyURLPatterns),
      }
      if (page) {
        params.pageId = page.id
      }
      const data = await apiPost<{ page: PageItem }>(
        page ? '/servers/server/settings/pages/updatePopup' : '/servers/server/settings/pages/createPopup',
        params,
      )
      toast('保存成功')
      onSaved(normalizePage(data.page))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={page ? '修改自定义页面' : '添加自定义页面'} onClose={onClose} width="42em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <tbody>
            <FormRow title="响应状态码 *">
              <input type="text" maxLength={3} style={{ width: '8em' }} value={status} onChange={(event) => setStatus(event.target.value)} />
              <p className="comment">匹配的响应状态码，比如404，或者50x。</p>
            </FormRow>
            <FormRow title="内容类型 *">
              <select className="ui dropdown auto-width" value={bodyType} onChange={(event) => setBodyType(event.target.value)}>
                {BODY_TYPES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormRow>
            {bodyType === 'html' ? (
              <FormRow title="显示页面HTML *">
                <textarea rows={7} value={body} onChange={(event) => setBody(event.target.value)} />
                <p className="comment">
                  <a href="" onClick={(event) => { event.preventDefault(); setBody(HTML_TEMPLATE) }}>
                    [使用模板]
                  </a>
                  。填写页面的HTML内容，支持请求变量。
                </p>
              </FormRow>
            ) : null}
            {bodyType === 'url' ? (
              <FormRow title="显示页面URL *">
                <input type="text" maxLength={500} placeholder="类似于 https://example.com/page.html" value={url} onChange={(event) => setUrl(event.target.value)} />
                <p className="comment">将从此URL中读取内容。</p>
              </FormRow>
            ) : null}
            {bodyType === 'redirectURL' ? (
              <FormRow title="跳转到URL *">
                <input type="text" maxLength={500} placeholder="类似于 https://example.com/page.html" value={url} onChange={(event) => setUrl(event.target.value)} />
                <p className="comment">将会跳转到此URL，支持使用变量。</p>
              </FormRow>
            ) : null}
            <tr>
              <td colSpan={2}>
                <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
              </td>
            </tr>
          </tbody>
          {moreOptionsVisible ? (
            <tbody>
              <FormRow title="例外URL">
                <UrlsPatternsBox patterns={exceptURLPatterns} onChange={setExceptURLPatterns} />
                <p className="comment">对这些URL将不做任何限制。</p>
              </FormRow>
              <FormRow title="限制URL">
                <UrlsPatternsBox patterns={onlyURLPatterns} onChange={setOnlyURLPatterns} />
                <p className="comment">只对这些URL做限制。</p>
              </FormRow>
              <FormRow title="新状态码">
                <input type="text" maxLength={3} style={{ width: '5.2em' }} value={newStatus} onChange={(event) => setNewStatus(event.target.value)} />
                <p className="comment">可以用来修改响应的状态码，不填表示不改变原有状态码。</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

export function PagesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<PagesData>('/servers/server/settings/locations/pages', 'location-pages')
  const [pages, setPages] = useState<PageItem[]>([])
  const [shutdown, setShutdown] = useState<ShutdownConfig>(normalizeShutdown(null))
  const [enableGlobalPages, setEnableGlobalPages] = useState(false)
  const [editingPage, setEditingPage] = useState<PageItem | null | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setPages((query.data.pages || []).map(normalizePage))
      setShutdown(normalizeShutdown(query.data.shutdownConfig))
      setEnableGlobalPages(query.data.enableGlobalPages)
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

  async function persist(nextPages: PageItem[], notify = true) {
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/pages', {
        webId: query.data.webId,
        enableGlobalPages,
        pagesJSON: JSON.stringify(nextPages),
        shutdownJSON: JSON.stringify(shutdown),
      })
      if (notify) {
        toast('保存成功')
      }
      await queryClient.invalidateQueries({ queryKey: ['location-pages', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    await persist(pages)
  }

  function savePage(page: PageItem) {
    const next = pages.some((item) => item.id === page.id)
      ? pages.map((item) => (item.id === page.id ? page : item))
      : [...pages, page]
    setPages(next)
    void persist(next)
  }

  async function removePage(index: number) {
    if (!(await confirm({ message: '确定要删除此自定义页面吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    const next = pages.filter((_, itemIndex) => itemIndex !== index)
    setPages(next)
    void persist(next)
  }

  const shutdownIsOn = shutdown.isPrior && shutdown.isOn

  return (
    <LocationShell data={query.data}>
      <form className="ui form" onSubmit={submit}>
        <h4 style={{ marginBottom: '0.5em' }}>自定义页面</h4>
        <p className="comment" style={{ paddingTop: 0, marginTop: 0 }}>
          根据响应状态码返回一些自定义页面，比如404，500等错误页面。
        </p>
        {pages.length > 0 ? (
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
                <tr key={page.id}>
                  <td>
                    <a href="" onClick={(event) => { event.preventDefault(); setEditingPage(page) }}>
                      {page.status.length === 1 ? page.status[0] : page.status.join(',')}
                    </a>
                  </td>
                  <td style={{ wordBreak: 'break-all' }}>
                    {page.bodyType === 'url' ? (
                      <div>
                        {page.url}
                        <div>
                          <span className="ui label grey basic">读取URL</span>
                        </div>
                      </div>
                    ) : null}
                    {page.bodyType === 'redirectURL' ? (
                      <div>
                        {page.url}
                        <div>
                          <span className="ui label grey basic">跳转URL</span>{' '}
                          {page.newStatus > 0 ? <span className="ui label grey basic">{page.newStatus}</span> : null}
                        </div>
                      </div>
                    ) : null}
                    {page.bodyType === 'html' ? (
                      <div>
                        [HTML内容]
                        <div>{page.newStatus > 0 ? <span className="ui label grey basic">{page.newStatus}</span> : null}</div>
                      </div>
                    ) : null}
                  </td>
                  <td>{page.newStatus > 0 ? page.newStatus : <span className="disabled">保持</span>}</td>
                  <td>
                    {page.exceptURLPatterns && page.exceptURLPatterns.length > 0 ? (
                      <div>
                        {page.exceptURLPatterns.map((pattern, patternIndex) => (
                          <span key={patternIndex} className="ui basic label small">
                            {pattern.pattern}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td>
                    {page.onlyURLPatterns && page.onlyURLPatterns.length > 0 ? (
                      <div>
                        {page.onlyURLPatterns.map((pattern, patternIndex) => (
                          <span key={patternIndex} className="ui basic label small">
                            {pattern.pattern}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td>
                    <a href="" title="修改" onClick={(event) => { event.preventDefault(); setEditingPage(page) }}>
                      <Pencil size={12} /> 修改
                    </a>{' '}
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); removePage(index) }}>
                      <Trash2 size={12} /> 删除
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div style={{ marginTop: '1em' }}>
          <button className="ui button small" type="button" onClick={() => setEditingPage(null)}>
            +添加自定义页面
          </button>
        </div>

        <h4 style={{ marginTop: '2em' }}>临时关闭页面</h4>
        <p className="comment" style={{ marginTop: 0, paddingTop: 0 }}>
          开启临时关闭页面时，所有请求都会直接显示此页面。可用于临时升级网站或者禁止用户访问某个网页。
        </p>
        <FormTable>
          <PriorCheckbox checked={shutdown.isPrior} onChange={(isPrior) => setShutdown({ ...shutdown, isPrior })} />
          {shutdown.isPrior ? (
            <tbody>
              <FormRow title="启用临时关闭网站">
                <Checkbox checked={shutdown.isOn} onChange={(isOn) => setShutdown({ ...shutdown, isOn })} />
                <p className="comment">选中后，表示临时关闭当前网站，并显示自定义内容。</p>
              </FormRow>
            </tbody>
          ) : null}
          {shutdownIsOn ? (
            <tbody>
              <FormRow title="显示内容类型 *">
                <select className="ui dropdown auto-width" value={shutdown.bodyType} onChange={(event) => setShutdown({ ...shutdown, bodyType: event.target.value })}>
                  {BODY_TYPES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FormRow>
              {shutdown.bodyType === 'url' ? (
                <FormRow title="显示页面URL *">
                  <input type="text" placeholder="类似于 https://example.com/page.html" value={shutdown.url} onChange={(event) => setShutdown({ ...shutdown, url: event.target.value })} />
                  <p className="comment">将从此URL中读取内容。</p>
                </FormRow>
              ) : null}
              {shutdown.bodyType === 'redirectURL' ? (
                <FormRow title="跳转到URL *">
                  <input type="text" placeholder="类似于 https://example.com/page.html" value={shutdown.url} onChange={(event) => setShutdown({ ...shutdown, url: event.target.value })} />
                  <p className="comment">将会跳转到此URL。</p>
                </FormRow>
              ) : null}
              {shutdown.bodyType === 'html' ? (
                <FormRow title="显示页面HTML *">
                  <textarea value={shutdown.body} onChange={(event) => setShutdown({ ...shutdown, body: event.target.value })} />
                  <p className="comment">
                    <a href="" onClick={(event) => { event.preventDefault(); setShutdown({ ...shutdown, body: SHUTDOWN_TEMPLATE }) }}>
                      [使用模板]
                    </a>
                    。填写页面的HTML内容，支持请求变量。
                  </p>
                </FormRow>
              ) : null}
              <FormRow title="状态码">
                <input
                  type="text"
                  maxLength={3}
                  style={{ width: '5.2em' }}
                  placeholder="状态码"
                  value={shutdown.status > 0 ? String(shutdown.status) : ''}
                  onChange={(event) => {
                    const status = Number(event.target.value)
                    setShutdown({ ...shutdown, status: !Number.isNaN(status) && status > 0 && status < 1000 ? Math.trunc(status) : 0 })
                  }}
                />
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>

        <h4 style={{ marginTop: '2em' }}>其他设置</h4>
        <FormTable>
          <tbody>
            <FormRow title="启用系统自定义页面">
              <Checkbox checked={enableGlobalPages} onChange={setEnableGlobalPages} />
              <p className="comment">选中后，表示如果当前网站没有自定义页面，则尝试使用系统对应的自定义页面。</p>
            </FormRow>
          </tbody>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>

      {editingPage !== undefined ? <PageForm page={editingPage} onSaved={savePage} onClose={() => setEditingPage(undefined)} /> : null}
    </LocationShell>
  )
}
