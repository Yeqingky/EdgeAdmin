import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, X } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { Modal } from './Modal'
import { PriorRow, ValueList } from './fields'
import { LocationShell } from './LocationShell'
import type { CorsConfig, HeaderConfig, HeaderPolicy, HeaderPolicyRef, LocationPageBase } from './types'

interface HeadersData extends LocationPageBase {
  requestHeaderRef?: HeaderPolicyRef | null
  requestHeaderPolicy?: HeaderPolicy | null
  responseHeaderRef?: HeaderPolicyRef | null
  responseHeaderPolicy?: HeaderPolicy | null
}

interface HeaderEditorState {
  headerId: number
  name: string
  value: string
  statusCodes: string
  methods: string[]
  domains: string[]
  shouldAppend: boolean
  disableRedirect: boolean
  shouldReplace: boolean
  replaceValues: { pattern: string; replacement: string; isCaseInsensitive?: boolean; isRegexp?: boolean }[]
  isNew: boolean
}

function HeaderEditor({ state, policyId, headerType, onClose, onSaved }: {
  state: HeaderEditorState
  policyId: number
  headerType: 'request' | 'response'
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const toast = useToast()
  const [editor, setEditor] = useState(state)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<HeaderEditorState>) {
    setEditor((current) => ({ ...current, ...patch }))
  }

  async function save() {
    if (editor.name.length === 0) {
      toast('请输入Header名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      const statusList = editor.statusCodes
        .split(/[，、,;\s]+/)
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => !Number.isNaN(value))
      const payload = {
        headerPolicyId: policyId,
        name: editor.name,
        value: editor.value,
        statusListJSON: JSON.stringify(statusList),
        methodsJSON: JSON.stringify(editor.methods),
        domainsJSON: JSON.stringify(editor.domains),
        shouldAppend: editor.shouldAppend ? '1' : '0',
        disableRedirect: editor.disableRedirect ? '1' : '0',
        shouldReplace: editor.shouldReplace ? '1' : '0',
        replaceValuesJSON: JSON.stringify(editor.replaceValues),
      }
      if (editor.isNew) {
        await apiPost('/servers/server/settings/headers/createSetPopup', { ...payload, type: headerType })
        toast('保存成功')
      } else {
        await apiPost('/servers/server/settings/headers/updateSetPopup', { ...payload, headerId: editor.headerId })
        toast('保存成功')
      }
      await onSaved()
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editor.isNew ? '添加报头' : '修改报头'}
      onClose={onClose}
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>取消</button>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="button" onClick={() => void save()}>
            保存
          </button>
        </>
      }
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">名称 *</td>
            <td>
              <input type="text" value={editor.name} maxLength={100} onChange={(event) => update({ name: event.target.value })} />
            </td>
          </tr>
          <tr>
            <td>值</td>
            <td>
              <input type="text" value={editor.value} onChange={(event) => update({ value: event.target.value })} />
              <p className="comment">可以使用变量，比如 ${'${remoteAddr}'}、${'${requestPath}'}。</p>
            </td>
          </tr>
          <tr>
            <td>状态码</td>
            <td>
              <input type="text" value={editor.statusCodes} placeholder="比如 200,404，留空表示所有状态码" onChange={(event) => update({ statusCodes: event.target.value })} />
            </td>
          </tr>
          <tr>
            <td>请求方法</td>
            <td>
              <ValueList values={editor.methods} onChange={(methods) => update({ methods })} placeholder="比如 GET" />
              <p className="comment">留空表示支持所有请求方法。</p>
            </td>
          </tr>
          <tr>
            <td>专属域名</td>
            <td>
              <ValueList values={editor.domains} onChange={(domains) => update({ domains })} placeholder="比如 example.com" />
              <p className="comment">留空表示支持所有域名。</p>
            </td>
          </tr>
          <tr>
            <td>附加</td>
            <td>
              <Checkbox checked={editor.shouldAppend} onChange={(value) => update({ shouldAppend: value })} />
              <p className="comment">选中表示在已有报头值后附加新的值，而不是覆盖。</p>
            </td>
          </tr>
          <tr>
            <td>跳转时禁用</td>
            <td>
              <Checkbox checked={editor.disableRedirect} onChange={(value) => update({ disableRedirect: value })} />
            </td>
          </tr>
          <tr>
            <td>替换值</td>
            <td>
              <Checkbox checked={editor.shouldReplace} onChange={(value) => update({ shouldReplace: value })} />
              <p className="comment">选中后可以替换报头值中的部分内容。</p>
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

function CorsEditor({ cors, policyId, onClose, onSaved }: {
  cors?: CorsConfig | null
  policyId: number
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const toast = useToast()
  const [isOn, setIsOn] = useState(cors?.isOn ?? false)
  const [allowOrigin, setAllowOrigin] = useState(cors?.allowOrigin || '')
  const [allowMethods, setAllowMethods] = useState<string[]>(cors?.allowMethods || [])
  const [exposeHeaders, setExposeHeaders] = useState<string[]>(cors?.exposeHeaders || [])
  const [requestHeaders, setRequestHeaders] = useState<string[]>(cors?.requestHeaders || [])
  const [maxAge, setMaxAge] = useState(String(cors?.maxAge ?? 0))
  const [allowCredentials, setAllowCredentials] = useState(cors?.allowCredentials ?? true)
  const [optionsMethodOnly, setOptionsMethodOnly] = useState(cors?.optionsMethodOnly ?? false)
  const [requestMethod, setRequestMethod] = useState(cors?.requestMethod || '')
  const [submitting, setSubmitting] = useState(false)

  async function save() {
    setSubmitting(true)
    try {
      const corsJSON: CorsConfig = {
        isOn,
        allowOrigin,
        allowMethods,
        exposeHeaders,
        requestHeaders,
        maxAge: Number.parseInt(maxAge, 10) || 0,
        allowCredentials,
        optionsMethodOnly,
        requestMethod,
      }
      await apiPost('/servers/server/settings/headers/updateCORSPopup', {
        csrfToken: await getCsrfToken(),
        headerPolicyId: policyId,
        corsJSON: JSON.stringify(corsJSON),
      })
      toast('保存成功')
      await onSaved()
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="CORS自适应跨域"
      onClose={onClose}
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>取消</button>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="button" onClick={() => void save()}>
            保存
          </button>
        </>
      }
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">启用</td>
            <td>
              <Checkbox checked={isOn} onChange={setIsOn} />
              <p className="comment">启用后，服务器会自动生成<code>Access-Control-*-*</code>相关的报头。</p>
            </td>
          </tr>
          <tr>
            <td>允许的Origin</td>
            <td>
              <input type="text" value={allowOrigin} placeholder="* 或者具体域名" onChange={(event) => setAllowOrigin(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>允许的方法</td>
            <td>
              <ValueList values={allowMethods} onChange={setAllowMethods} placeholder="比如 POST" />
            </td>
          </tr>
          <tr>
            <td>允许的请求报头</td>
            <td>
              <ValueList values={requestHeaders} onChange={setRequestHeaders} placeholder="比如 Content-Type" />
            </td>
          </tr>
          <tr>
            <td>暴露的响应报头</td>
            <td>
              <ValueList values={exposeHeaders} onChange={setExposeHeaders} placeholder="比如 Content-Length" />
            </td>
          </tr>
          <tr>
            <td>有效期</td>
            <td>
              <input type="text" size={8} value={maxAge} onChange={(event) => setMaxAge(event.target.value)} />
              <span className="grey"> 秒</span>
            </td>
          </tr>
          <tr>
            <td>允许携带凭证</td>
            <td>
              <Checkbox checked={allowCredentials} onChange={setAllowCredentials} />
            </td>
          </tr>
          <tr>
            <td>仅支持OPTIONS方法</td>
            <td>
              <Checkbox checked={optionsMethodOnly} onChange={setOptionsMethodOnly} />
            </td>
          </tr>
          <tr>
            <td>请求方法</td>
            <td>
              <input type="text" value={requestMethod} onChange={(event) => setRequestMethod(event.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

function HeadersForm({ data, serverId, locationId }: { data: HeadersData; serverId: string; locationId: string }) {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState<'request' | 'response'>(
    typeof window !== 'undefined' && window.location.hash === '#request' ? 'request' : 'response',
  )
  const [requestRef, setRequestRef] = useState<HeaderPolicyRef>(
    data.requestHeaderRef || { isPrior: false, isOn: true, headerPolicyId: 0 },
  )
  const [responseRef, setResponseRef] = useState<HeaderPolicyRef>(
    data.responseHeaderRef || { isPrior: false, isOn: true, headerPolicyId: 0 },
  )
  const [headerEditor, setHeaderEditor] = useState<HeaderEditorState | null>(null)
  const [corsOpen, setCorsOpen] = useState(false)
  const [nameModal, setNameModal] = useState<{ kind: 'delete' | 'nonStandard'; name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const policy = activeType === 'request' ? data.requestHeaderPolicy : data.responseHeaderPolicy
  const ref = activeType === 'request' ? requestRef : responseRef
  const setRef = activeType === 'request' ? setRequestRef : setResponseRef
  const setHeaders = policy?.setHeaders || []
  const deleteHeaders = policy?.deleteHeaders || []
  const nonStandardHeaders = policy?.nonStandardHeaders || []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['location-headers', serverId, locationId] })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/headers', {
        webId: data.webId,
        type: activeType,
        requestHeaderJSON: JSON.stringify(requestRef),
        responseHeaderJSON: JSON.stringify(responseRef),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteHeader(header: HeaderConfig) {
    if (!(await confirm({ message: '确定要删除此报头吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/headers/delete', {
        headerPolicyId: policy?.id || 0,
        type: 'setHeader',
        headerId: header.id,
      })
      toast('删除成功')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function deleteName(name: string, kind: 'delete' | 'nonStandard') {
    try {
      await apiPost(
        kind === 'delete'
          ? '/servers/server/settings/headers/deleteDeletingHeader'
          : '/servers/server/settings/headers/deleteNonStandardHeader',
        { headerPolicyId: policy?.id || 0, headerName: name },
      )
      toast('删除成功')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function addName() {
    if (!nameModal || nameModal.name.length === 0) {
      return
    }
    try {
      await apiPost(
        nameModal.kind === 'delete'
          ? '/servers/server/settings/headers/createDeletePopup'
          : '/servers/server/settings/headers/createNonStandardPopup',
        { headerPolicyId: policy?.id || 0, name: nameModal.name },
      )
      toast('保存成功')
      setNameModal(null)
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  function openHeaderEditor(header?: HeaderConfig) {
    if (header) {
      setHeaderEditor({
        headerId: header.id,
        name: header.name,
        value: header.value,
        statusCodes: (header.status?.codes || []).join(','),
        methods: header.methods || [],
        domains: header.domains || [],
        shouldAppend: header.shouldAppend === true,
        disableRedirect: header.disableRedirect === true,
        shouldReplace: header.shouldReplace === true,
        replaceValues: header.replaceValues || [],
        isNew: false,
      })
      return
    }
    setHeaderEditor({
      headerId: 0,
      name: '',
      value: '',
      statusCodes: '',
      methods: [],
      domains: [],
      shouldAppend: false,
      disableRedirect: false,
      shouldReplace: false,
      replaceValues: [],
      isNew: true,
    })
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <div className="ui menu tabular small">
        <a
          className={`item${activeType === 'response' ? ' active' : ''}`}
          href=""
          onClick={(event) => {
            event.preventDefault()
            setActiveType('response')
            window.location.hash = '#response'
          }}
        >
          响应报头{setHeaders.length > 0 && activeType === 'response' ? `(${setHeaders.length})` : ''}
        </a>
        <a
          className={`item${activeType === 'request' ? ' active' : ''}`}
          href=""
          onClick={(event) => {
            event.preventDefault()
            setActiveType('request')
            window.location.hash = '#request'
          }}
        >
          请求报头{activeType === 'request' && setHeaders.length > 0 ? `(${setHeaders.length})` : ''}
        </a>
      </div>

      <div className="margin" />

      <FormTable>
        <PriorRow isPrior={ref.isPrior} onChange={(isPrior) => setRef({ ...ref, isPrior })} />
      </FormTable>

      {ref.isPrior ? (
        <div>
          <h4>
            设置{activeType === 'request' ? '请求' : '响应'}报头 &nbsp;
            <a
              href=""
              style={{ fontSize: '0.8em' }}
              onClick={(event) => {
                event.preventDefault()
                openHeaderEditor()
              }}
            >
              [添加新报头]
            </a>
          </h4>
          {setHeaders.length === 0 ? <p className="comment">暂时还没有自定义报头。</p> : null}
          {setHeaders.length > 0 ? (
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>值</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {setHeaders.map((header) => (
                  <tr key={header.id}>
                    <td className="five wide">
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          openHeaderEditor(header)
                        }}
                      >
                        {header.name} <Pencil size={11} />
                      </a>
                      <div>
                        {header.status?.codes?.length && !header.status.always
                          ? header.status.codes.map((code) => (
                              <span key={code} className="ui label tiny basic grey">{code}</span>
                            ))
                          : null}
                        {(header.methods || []).map((method) => (
                          <span key={method} className="ui label tiny basic grey">{method}</span>
                        ))}
                        {(header.domains || []).map((domain) => (
                          <span key={domain} className="ui label tiny basic grey">{domain}</span>
                        ))}
                        {header.shouldAppend ? <span className="ui label tiny basic grey">附加</span> : null}
                        {header.disableRedirect ? <span className="ui label tiny basic grey">跳转禁用</span> : null}
                        {header.shouldReplace ? <span className="ui label tiny basic grey">替换</span> : null}
                      </div>
                    </td>
                    <td>{header.value}</td>
                    <td>
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          openHeaderEditor(header)
                        }}
                      >
                        修改
                      </a>{' '}
                      &nbsp;
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void deleteHeader(header)
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

          <h4>其他设置</h4>

          <FormTable>
            <FormRow title="删除报头">
              {deleteHeaders.length > 0 ? (
                <div>
                  {deleteHeaders.map((name) => (
                    <div key={name} className="ui label small basic">
                      {name}{' '}
                      <a href="" onClick={(event) => { event.preventDefault(); void deleteName(name, 'delete') }}>
                        <X size={11} />
                      </a>
                    </div>
                  ))}
                  <div className="ui divider" />
                </div>
              ) : null}
              <button className="ui button small" type="button" onClick={() => setNameModal({ kind: 'delete', name: '' })}>
                <Plus size={12} />
              </button>
              <p className="comment">可以通过此功能删除{activeType === 'request' ? '转发到源站的请求' : '响应'}报文中不需要的报头。</p>
            </FormRow>
            <FormRow title="非标报头">
              {nonStandardHeaders.length > 0 ? (
                <div>
                  {nonStandardHeaders.map((name) => (
                    <div key={name} className="ui label small basic">
                      {name}{' '}
                      <a href="" onClick={(event) => { event.preventDefault(); void deleteName(name, 'nonStandard') }}>
                        <X size={11} />
                      </a>
                    </div>
                  ))}
                  <div className="ui divider" />
                </div>
              ) : null}
              <button className="ui button small" type="button" onClick={() => setNameModal({ kind: 'nonStandard', name: '' })}>
                <Plus size={12} />
              </button>
              <p className="comment">可以通过此功能设置报文中非标准的报头，比如 hello_world。</p>
            </FormRow>
            {activeType === 'response' ? (
              <FormRow title="CORS自适应跨域">
                {policy?.cors?.isOn ? <span className="green">已启用</span> : <span className="disabled">未启用</span>} &nbsp;
                <a href="" onClick={(event) => { event.preventDefault(); setCorsOpen(true) }}>[修改]</a>
                <p className="comment">
                  {policy?.cors?.isOn ? '服务器会' : '启用后，服务器可以'}自动生成<code>Access-Control-*-*</code>相关的报头。
                </p>
              </FormRow>
            ) : null}
          </FormTable>
        </div>
      ) : null}

      <SubmitButton submitting={submitting} />

      {headerEditor ? (
        <HeaderEditor
          state={headerEditor}
          policyId={policy?.id || 0}
          headerType={activeType}
          onClose={() => setHeaderEditor(null)}
          onSaved={refresh}
        />
      ) : null}

      {corsOpen ? (
        <CorsEditor
          cors={policy?.cors}
          policyId={policy?.id || 0}
          onClose={() => setCorsOpen(false)}
          onSaved={refresh}
        />
      ) : null}

      {nameModal ? (
        <Modal
          title={nameModal.kind === 'delete' ? '添加要删除的报头' : '添加非标报头'}
          onClose={() => setNameModal(null)}
          footer={
            <>
              <button className="ui button" type="button" onClick={() => setNameModal(null)}>取消</button>
              <button className="ui button primary" type="button" onClick={() => void addName()}>保存</button>
            </>
          }
        >
          <FormTable>
            <FormRow title="报头名称">
              <input
                type="text"
                autoFocus
                value={nameModal.name}
                onChange={(event) => setNameModal({ ...nameModal, name: event.target.value })}
              />
            </FormRow>
          </FormTable>
        </Modal>
      ) : null}
    </form>
  )
}

export function LocationHeadersPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-headers', serverId, locationId],
    queryFn: () =>
      apiGet<HeadersData>('/servers/server/settings/locations/headers', {
        serverId,
        locationId,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <LocationShell
      serverId={serverId}
      locationId={locationId}
      pattern={data.locationConfig?.pattern}
      tinyLeftMenuItems={data.tinyLeftMenuItems}
      leftMenuItemIsDisabled={data.leftMenuItemIsDisabled}
    >
      <HeadersForm data={data} serverId={serverId} locationId={locationId} />
    </LocationShell>
  )
}
