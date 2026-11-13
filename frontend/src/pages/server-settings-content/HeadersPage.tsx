import { useState, type FormEvent } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import {
  GroupConfigWarning,
  Modal,
  MoreOptionsIndicator,
  ServerSettingsShell,
  StringListEditor,
  useServerId,
  type ServerSettingsBase,
} from './shared'

interface HeaderStatus {
  always: boolean
  codes: number[]
}

interface HeaderReplaceValue {
  pattern: string
  replacement: string
}

interface HeaderConfig {
  id: number
  isOn: boolean
  name: string
  value: string
  status: HeaderStatus | null
  disableRedirect: boolean
  shouldAppend: boolean
  shouldReplace: boolean
  replaceValues: HeaderReplaceValue[] | null
  methods: string[] | null
  domains: string[] | null
}

interface CorsConfig {
  isOn: boolean
  allowMethods: string[] | null
  allowOrigin: string
  allowCredentials: boolean
  exposeHeaders: string[] | null
  maxAge: number
  requestHeaders: string[] | null
  requestMethod: string
  optionsMethodOnly: boolean
}

interface HeaderPolicy {
  id: number
  name?: string
  isOn?: boolean
  setHeaderRefs?: { isOn: boolean; headerId: number }[] | null
  setHeaders: HeaderConfig[] | null
  deleteHeaders: string[] | null
  cors: CorsConfig | null
  nonStandardHeaders: string[] | null
}

interface HeaderPolicyRef {
  isPrior: boolean
  isOn: boolean
  headerPolicyId: number
}

interface HeadersData extends ServerSettingsBase {
  hasGroupRequestConfig: boolean
  hasGroupResponseConfig: boolean
  groupSettingURL: string
  requestHeaderRef: HeaderPolicyRef | null
  requestHeaderPolicy: HeaderPolicy | null
  responseHeaderRef: HeaderPolicyRef | null
  responseHeaderPolicy: HeaderPolicy | null
}

type HeaderType = 'request' | 'response'

export function ServerHeadersSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['server-settings-headers', serverId],
    queryFn: () => apiGet<HeadersData>('/servers/server/settings/headers', { serverId }),
    enabled: serverId > 0,
  })
  const [type, setType] = useState<HeaderType>('response')
  const [setEditor, setSetEditor] = useState<{ header: HeaderConfig | null } | null>(null)
  const [nameEditor, setNameEditor] = useState<{ kind: 'delete' | 'nonStandard'; policyId: number } | null>(null)
  const [corsEditor, setCorsEditor] = useState<{ policyId: number; cors: CorsConfig | null } | null>(null)

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数.</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const isRequest = type === 'request'
  const policy = isRequest ? data.requestHeaderPolicy : data.responseHeaderPolicy
  const hasGroupConfig = isRequest ? data.hasGroupRequestConfig : data.hasGroupResponseConfig
  const setHeaders = policy?.setHeaders || []
  const requestHeaderCount = data.requestHeaderPolicy?.setHeaders?.length || 0
  const responseHeaderCount = data.responseHeaderPolicy?.setHeaders?.length || 0
  const deleteHeaders = policy?.deleteHeaders || []
  const nonStandardHeaders = policy?.nonStandardHeaders || []

  async function refresh(message: string) {
    toast(message)
    await queryClient.invalidateQueries({ queryKey: ['server-settings-headers', serverId] })
  }

  async function deleteHeader(headerId: number) {
    if (!policy) {
      return
    }
    if (!(await confirm({ message: '确定要删除此报头吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/headers/delete', { headerPolicyId: policy.id, type: 'setHeader', headerId })
      await refresh('删除成功,正在刷新页面')
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function deleteDeletingHeader(headerName: string) {
    if (!policy) {
      return
    }
    if (!(await confirm({ message: `确定要删除'${headerName}'吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/headers/deleteDeletingHeader', { headerPolicyId: policy.id, headerName })
      await refresh('删除成功')
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function deleteNonStandardHeader(headerName: string) {
    if (!policy) {
      return
    }
    if (!(await confirm({ message: `确定要删除'${headerName}'吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/headers/deleteNonStandardHeader', { headerPolicyId: policy.id, headerName })
      await refresh('删除成功')
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <div className="margin" />
      <div className="ui menu tabular small">
        <a className={`item${type === 'response' ? ' active' : ''}`} href="" onClick={(event) => { event.preventDefault(); setType('response') }}>
          响应报头{responseHeaderCount > 0 ? `(${responseHeaderCount})` : ''}
        </a>
        <a className={`item${type === 'request' ? ' active' : ''}`} href="" onClick={(event) => { event.preventDefault(); setType('request') }}>
          请求报头{requestHeaderCount > 0 ? `(${requestHeaderCount})` : ''}
        </a>
      </div>

      <div className="margin" />

      {hasGroupConfig ? <GroupConfigWarning href={`${data.groupSettingURL}#${type}`} /> : null}

      <div className={hasGroupConfig ? 'opacity-mask' : undefined}>
        <h4>
          设置{isRequest ? '请求' : '响应'}报头 &nbsp;{' '}
          <a
            href=""
            style={{ fontSize: '0.8em' }}
            onClick={(event) => {
              event.preventDefault()
              if (policy) {
                setSetEditor({ header: null })
              }
            }}
          >
            [添加新报头]
          </a>
        </h4>
        {!isRequest ? <p className="comment">将会覆盖已有的同名报头.</p> : null}
        {setHeaders.length === 0 ? <p className="comment">暂时还没有自定义报头.</p> : null}
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
                        setSetEditor({ header })
                      }}
                    >
                      {header.name} <ChevronRight size={12} />
                    </a>
                    <div>
                      {header.status && !header.status.always
                        ? (header.status.codes || []).map((code) => (
                            <span key={`status-${code}`} className="ui label tiny basic">
                              {code}
                            </span>
                          ))
                        : null}
                      {(header.methods || []).map((method) => (
                        <span key={`method-${method}`} className="ui label tiny basic">
                          {method}
                        </span>
                      ))}
                      {(header.domains || []).map((domain) => (
                        <span key={`domain-${domain}`} className="ui label tiny basic">
                          {domain}
                        </span>
                      ))}
                      {header.shouldAppend ? <span className="ui label tiny basic">附加</span> : null}
                      {header.disableRedirect ? <span className="ui label tiny basic">跳转禁用</span> : null}
                      {header.shouldReplace && (header.replaceValues || []).length > 0 ? <span className="ui label tiny basic">替换</span> : null}
                    </div>
                    {!isRequest && header.name === 'Access-Control-Allow-Origin' && header.value === '*' ? (
                      <div>
                        <span className="red small">建议使用当前页面下方的"CORS自适应跨域"功能代替Access-Control-*-*相关报头.</span>
                      </div>
                    ) : null}
                  </td>
                  <td>{header.value}</td>
                  <td>
                    <a href="" onClick={(event) => { event.preventDefault(); setSetEditor({ header }) }}>
                      修改
                    </a>{' '}
                    &nbsp;
                    <a href="" onClick={(event) => { event.preventDefault(); void deleteHeader(header.id) }}>
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
            <div>
              {deleteHeaders.length > 0 ? (
                <div>
                  {deleteHeaders.map((headerName) => (
                    <div key={headerName} className="ui label small basic">
                      {headerName}{' '}
                      <a href="" title="删除" onClick={(event) => { event.preventDefault(); void deleteDeletingHeader(headerName) }}>
                        <Trash2 size={13} />
                      </a>
                    </div>
                  ))}
                  <div className="ui divider" />
                </div>
              ) : null}
              <button className="ui button small" type="button" onClick={() => { if (policy) { setNameEditor({ kind: 'delete', policyId: policy.id }) } }}>
                +
              </button>
            </div>
          </FormRow>
          <FormRow title="非标报头">
            <div>
              {nonStandardHeaders.length > 0 ? (
                <div>
                  {nonStandardHeaders.map((headerName) => (
                    <div key={headerName} className="ui label small basic">
                      {headerName}{' '}
                      <a href="" title="删除" onClick={(event) => { event.preventDefault(); void deleteNonStandardHeader(headerName) }}>
                        <Trash2 size={13} />
                      </a>
                    </div>
                  ))}
                  <div className="ui divider" />
                </div>
              ) : null}
              <button className="ui button small" type="button" onClick={() => { if (policy) { setNameEditor({ kind: 'nonStandard', policyId: policy.id }) } }}>
                +
              </button>
            </div>
          </FormRow>
          {!isRequest ? (
            <FormRow title="CORS自适应跨域">
              <div>
                {policy?.cors?.isOn ? <span className="green">已启用</span> : <span className="disabled">未启用</span>} &nbsp;
                <a href="" onClick={(event) => { event.preventDefault(); if (policy) { setCorsEditor({ policyId: policy.id, cors: policy.cors }) } }}>
                  [修改]
                </a>
                <p className="comment">
                  {policy?.cors?.isOn ? '服务器会' : '启用后,服务器可以'}自动生成<code>Access-Control-*-*</code>相关的报头.
                </p>
              </div>
            </FormRow>
          ) : null}
        </FormTable>
      </div>

      {setEditor && policy ? (
        <HeaderSetEditor
          type={type}
          policyId={policy.id}
          header={setEditor.header}
          onClose={() => setSetEditor(null)}
          onSaved={async () => {
            setSetEditor(null)
            await refresh('保存成功,正在刷新页面')
            window.location.reload()
          }}
        />
      ) : null}

      {nameEditor ? (
        <NameEditor
          kind={nameEditor.kind}
          policyId={nameEditor.policyId}
          onClose={() => setNameEditor(null)}
          onSaved={async () => {
            setNameEditor(null)
            await refresh('保存成功,正在刷新页面')
            window.location.reload()
          }}
        />
      ) : null}

      {corsEditor ? (
        <CorsEditor
          policyId={corsEditor.policyId}
          cors={corsEditor.cors}
          onClose={() => setCorsEditor(null)}
          onSaved={async () => {
            setCorsEditor(null)
            await refresh('保存成功,正在刷新页面')
            window.location.reload()
          }}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

function HeaderSetEditor({
  type,
  policyId,
  header,
  onClose,
  onSaved,
}: {
  type: HeaderType
  policyId: number
  header: HeaderConfig | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const [name, setName] = useState(header?.name || '')
  const [value, setValue] = useState(header?.value || '')
  const [statusList, setStatusList] = useState<string[]>((header?.status?.codes || []).map(String))
  const [methods, setMethods] = useState<string[]>(header?.methods || [])
  const [domains, setDomains] = useState<string[]>(header?.domains || [])
  const [shouldAppend, setShouldAppend] = useState(header?.shouldAppend ?? false)
  const [disableRedirect, setDisableRedirect] = useState(header?.disableRedirect ?? false)
  const [shouldReplace, setShouldReplace] = useState(header?.shouldReplace ?? false)
  const [replaceValues, setReplaceValues] = useState<HeaderReplaceValue[]>(header?.replaceValues || [])
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        headerPolicyId: policyId,
        type,
        name,
        value,
        statusListJSON: JSON.stringify(statusList.map((code) => Number(code) || 0).filter((code) => code > 0)),
        methodsJSON: JSON.stringify(methods),
        domainsJSON: JSON.stringify(domains.filter((domain) => domain.length > 0)),
        shouldReplace: shouldReplace ? 1 : '',
        replaceValuesJSON: JSON.stringify(shouldReplace ? replaceValues : []),
      }
      if (shouldAppend) {
        payload.shouldAppend = 1
      }
      if (disableRedirect) {
        payload.disableRedirect = 1
      }
      if (header) {
        await apiPost('/servers/server/settings/headers/updateSetPopup', { ...payload, headerId: header.id })
      } else {
        await apiPost('/servers/server/settings/headers/createSetPopup', payload)
      }
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`${header ? '修改' : '添加'}自定义${type === 'request' ? '请求' : '响应'}报头`} onClose={onClose} width="45em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="报头名称(Name) *">
            <TextInput type="text" maxLength={200} placeholder="类似于Server,Content-Type之类" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
            <p className="comment">
              请注意报头名称的大小写,如无特殊需求,报头名称的格式通常为<code>Xxx</code>或者<code>Xxx-Yyy</code>.
            </p>
          </FormRow>
          <FormRow title="值(Value)">
            <TextInput type="text" maxLength={500} value={value} onChange={(event) => setValue(event.target.value)} />
            <p className="comment">可以包含请求变量.</p>
          </FormRow>
          <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
            <span />
          </FormRow>
          {moreOptions ? (
            <>
              {type === 'response' ? (
                <FormRow title="支持的状态码">
                  <StringListEditor values={statusList} onChange={setStatusList} placeholder="比如 200" width="5em" />
                  <p className="comment">不填表示支持所有的状态码.</p>
                </FormRow>
              ) : null}
              <FormRow title="支持的请求方法">
                <StringListEditor values={methods} onChange={(values) => setMethods(values.map((method) => method.toUpperCase()))} placeholder="比如 GET" width="7em" />
              </FormRow>
              <FormRow title="支持的域名">
                <StringListEditor values={domains} onChange={setDomains} placeholder="比如 example.com" />
              </FormRow>
              <FormRow title="只附加不替换">
                <Checkbox checked={shouldAppend} onChange={setShouldAppend} />
                <p className="comment">选中后表示如果已经存在同名的报头,则只会附加在原有的报头之后,不会覆盖.</p>
              </FormRow>
              {type === 'response' ? (
                <FormRow title="不在跳转时启用">
                  <Checkbox checked={disableRedirect} onChange={setDisableRedirect} />
                  <p className="comment">选中后表示在30X跳转时不启用当前报头.</p>
                </FormRow>
              ) : null}
              <FormRow title={<span className="color-border">启用内容替换</span>}>
                <Checkbox checked={shouldReplace} onChange={setShouldReplace} />
                <p className="comment">可以替换原有报头中的内容.</p>
              </FormRow>
              {shouldReplace ? (
                <FormRow title={<span className="color-border">替换内容</span>}>
                  <div>
                    {replaceValues.map((item, index) => (
                      <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
                        <div className="ui field">
                          <input
                            type="text"
                            placeholder="要替换的内容"
                            value={item.pattern}
                            onChange={(event) => {
                              const next = [...replaceValues]
                              next[index] = { ...item, pattern: event.target.value }
                              setReplaceValues(next)
                            }}
                          />
                        </div>
                        <div className="ui field">
                          <input
                            type="text"
                            placeholder="替换后的内容"
                            value={item.replacement}
                            onChange={(event) => {
                              const next = [...replaceValues]
                              next[index] = { ...item, replacement: event.target.value }
                              setReplaceValues(next)
                            }}
                          />
                        </div>
                        <div className="ui field" style={{ padding: 0 }}>
                          <a href="" title="删除" onClick={(event) => { event.preventDefault(); setReplaceValues(replaceValues.filter((_, i) => i !== index)) }}>
                            <Trash2 size={13} />
                          </a>
                        </div>
                      </div>
                    ))}
                    <button className="ui button tiny" type="button" onClick={() => setReplaceValues([...replaceValues, { pattern: '', replacement: '' }])}>
                      +
                    </button>
                  </div>
                </FormRow>
              ) : null}
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

function NameEditor({
  kind,
  policyId,
  onClose,
  onSaved,
}: {
  kind: 'delete' | 'nonStandard'
  policyId: number
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const path = kind === 'delete' ? '/servers/server/settings/headers/createDeletePopup' : '/servers/server/settings/headers/createNonStandardPopup'
      await apiPost(path, { headerPolicyId: policyId, name })
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={kind === 'delete' ? '添加需要删除的报头' : '添加非标报头'} onClose={onClose} width="35em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="报头名称(Name)">
            <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            <p className="comment">
              {kind === 'delete' ? (
                <>
                  请注意报头名称的大小写,如无特殊需求,报头名称的格式通常为<code>Xxx</code>或者<code>Xxx-Yyy</code>.
                </>
              ) : (
                <>
                  比如<code>hello_world</code>.
                </>
              )}
            </p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

function CorsEditor({ policyId, cors, onClose, onSaved }: { policyId: number; cors: CorsConfig | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const [config, setConfig] = useState<CorsConfig>(
    cors || {
      isOn: false,
      allowMethods: [],
      allowOrigin: '',
      allowCredentials: false,
      exposeHeaders: [],
      maxAge: 0,
      requestHeaders: [],
      requestMethod: '',
      optionsMethodOnly: false,
    },
  )
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof CorsConfig>(key: K, value: CorsConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/headers/updateCORSPopup', {
        csrfToken: await getCsrfToken(),
        headerPolicyId: policyId,
        corsJSON: JSON.stringify(config),
      })
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="CORS跨域设置" onClose={onClose} width="45em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="启用CORS">
            <Checkbox checked={config.isOn} onChange={(checked) => update('isOn', checked)} />
          </FormRow>
          {config.isOn ? (
            <>
              <FormRow title="允许的请求方法">
                <StringListEditor
                  values={config.allowMethods || []}
                  onChange={(values) => update('allowMethods', values.map((value) => value.toUpperCase()))}
                  placeholder="比如 GET"
                  width="7em"
                />
              </FormRow>
              <FormRow title="允许的域名(Origin)">
                <TextInput type="text" placeholder="比如 *" value={config.allowOrigin} onChange={(event) => update('allowOrigin', event.target.value)} />
              </FormRow>
              <FormRow title="允许携带Cookie">
                <Checkbox checked={config.allowCredentials} onChange={(checked) => update('allowCredentials', checked)} />
              </FormRow>
              <FormRow title="暴露的响应报头">
                <StringListEditor values={config.exposeHeaders || []} onChange={(values) => update('exposeHeaders', values)} />
              </FormRow>
              <FormRow title="允许的请求报头">
                <StringListEditor values={config.requestHeaders || []} onChange={(values) => update('requestHeaders', values)} />
              </FormRow>
              <FormRow title="有效时间">
                <div className="ui right labeled input" style={{ width: '8em' }}>
                  <input type="text" value={String(config.maxAge)} onChange={(event) => update('maxAge', Number(event.target.value) || 0)} />
                  <span className="ui label">秒</span>
                </div>
              </FormRow>
              <FormRow title="仅支持OPTIONS方法">
                <Checkbox checked={config.optionsMethodOnly} onChange={(checked) => update('optionsMethodOnly', checked)} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}
