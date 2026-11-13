import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Checkbox } from '../../../../components/form'
import { useConfirm } from '../../../../components/Confirm'
import { useToast } from '../../../../components/Toast'
import { LoadingBlock } from '../../../../components/LoadingBlock'
import {
  Modal,
  NumberListInput,
  StringListInput,
  postForm,
  postFormWithCsrf,
  type GroupBasic,
  type LeftMenuItem,
} from '../../shared'
import {
  SettingsShell,
  boolField,
  numberField,
  stringField,
  useGroupId,
  useSaveSettings,
  useSettingsQuery,
  type JsonObject,
} from './common'

interface HeaderRef {
  isPrior: boolean
  isOn: boolean
  headerPolicyId: number
}

interface SetHeader {
  id: number
  name: string
  value: string
  status?: number[]
  methods?: string[]
  domains?: string[]
  shouldAppend?: boolean
  disableRedirect?: boolean
  shouldReplace?: boolean
}

interface HeaderPolicy {
  setHeaders?: SetHeader[] | null
  deleteHeaders?: string[] | null
  nonStandardHeaders?: string[] | null
  cors?: JsonObject | null
}

interface HeadersData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  webId: number
  requestHeaderRef: HeaderRef | null
  requestHeaderPolicy: HeaderPolicy | null
  responseHeaderRef: HeaderRef | null
  responseHeaderPolicy: HeaderPolicy | null
}

type HeaderType = 'request' | 'response'

export function GroupSettingsHeadersPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/headers'
  const query = useSettingsQuery<HeadersData>(path, groupId)
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const save = useSaveSettings(path, groupId)
  const [type, setType] = useState<HeaderType>('response')
  const [editingHeader, setEditingHeader] = useState<{ header?: SetHeader } | null>(null)
  const [corsVisible, setCorsVisible] = useState(false)
  const [requestRef, setRequestRef] = useState<HeaderRef | null>(null)
  const [responseRef, setResponseRef] = useState<HeaderRef | null>(null)

  useEffect(() => {
    if (query.data) {
      setRequestRef(query.data.requestHeaderRef)
      setResponseRef(query.data.responseHeaderRef)
    }
  }, [query.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: [path, groupId] })

  const deleteHeader = useMutation({
    mutationFn: (params: { headerPolicyId: number; headerId: number }) =>
      postForm('/servers/server/settings/headers/delete', { ...params, type: 'setHeader' }),
    onSuccess: async () => {
      toast('删除成功')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const addDeletingHeader = useMutation({
    mutationFn: (params: { headerPolicyId: number; name: string }) => postForm('/servers/server/settings/headers/createDeletePopup', params),
    onSuccess: async () => {
      toast('保存成功')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const removeDeletingHeader = useMutation({
    mutationFn: (params: { headerPolicyId: number; headerName: string }) => postForm('/servers/server/settings/headers/deleteDeletingHeader', params),
    onSuccess: async () => {
      toast('删除成功')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const addNonStandardHeader = useMutation({
    mutationFn: (params: { headerPolicyId: number; name: string }) => postForm('/servers/server/settings/headers/createNonStandardPopup', params),
    onSuccess: async () => {
      toast('保存成功')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const removeNonStandardHeader = useMutation({
    mutationFn: (params: { headerPolicyId: number; headerName: string }) => postForm('/servers/server/settings/headers/deleteNonStandardHeader', params),
    onSuccess: async () => {
      toast('删除成功')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const ref: HeaderRef =
    (type === 'request' ? requestRef : responseRef) || { isPrior: false, isOn: true, headerPolicyId: 0 }
  const policy: HeaderPolicy = (type === 'request' ? data.requestHeaderPolicy : data.responseHeaderPolicy) || {}
  const setHeaders = policy.setHeaders || []
  const deleteHeaders = policy.deleteHeaders || []
  const nonStandardHeaders = policy.nonStandardHeaders || []

  const setRef = (next: HeaderRef) => {
    if (type === 'request') {
      setRequestRef(next)
    } else {
      setResponseRef(next)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const payload: Record<string, string | number | boolean> = { webId: data.webId, type }
    if (type === 'request') {
      payload.requestHeaderJSON = JSON.stringify(requestRef || data.requestHeaderRef)
    } else {
      payload.responseHeaderJSON = JSON.stringify(responseRef || data.responseHeaderRef)
    }
    await save.mutateAsync(payload)
  }

  async function removeHeader(header: SetHeader) {
    if (!(await confirm({ message: `确定要删除此报头（${header.name}）吗？`, danger: true, confirmText: '删除' }))) {
      return
    }
    deleteHeader.mutate({ headerPolicyId: ref.headerPolicyId, headerId: header.id })
  }

  async function addHeaderName(kind: 'delete' | 'nonStandard') {
    const name = window.prompt(kind === 'delete' ? '请输入要删除的报头名称' : '请输入要保留的非标准报头名称')
    if (!name || name.trim().length === 0) {
      return
    }
    if (kind === 'delete') {
      addDeletingHeader.mutate({ headerPolicyId: ref.headerPolicyId, name: name.trim() })
    } else {
      addNonStandardHeader.mutate({ headerPolicyId: ref.headerPolicyId, name: name.trim() })
    }
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <div className="ui menu tabular small">
          <a
            className={`item${type === 'response' ? ' active' : ''}`}
            href=""
            onClick={(event) => {
              event.preventDefault()
              setType('response')
            }}
          >
            响应报头{setHeaders.length > 0 ? `(${setHeaders.length})` : ''}
          </a>
          <a
            className={`item${type === 'request' ? ' active' : ''}`}
            href=""
            onClick={(event) => {
              event.preventDefault()
              setType('request')
            }}
          >
            请求报头
          </a>
        </div>
        <div className="margin" />

        <table className="ui table definition selectable">
          <tbody>
            <tr className={ref.isPrior ? 'active' : undefined}>
              <td className="title">打开独立配置</td>
              <td>
                <div className="ui toggle checkbox">
                  <input
                    type="checkbox"
                    checked={ref.isPrior}
                    onChange={(event) => setRef({ ...ref, isPrior: event.target.checked })}
                  />
                  <label />
                </div>
                <p className="comment">
                  {ref.isPrior ? <strong>[已打开]</strong> : null} 打开后可以覆盖父级或子级配置。
                </p>
              </td>
            </tr>
            {ref.isPrior ? (
              <tr>
                <td className="title">启用{type === 'request' ? '请求' : '响应'}报头设置</td>
                <td>
                  <Checkbox checked={ref.isOn} onChange={(checked) => setRef({ ...ref, isOn: checked })} />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {ref.isPrior ? (
          <div>
            <h4>
              设置{type === 'request' ? '请求' : '响应'}报头 &nbsp;{' '}
              <a
                href=""
                style={{ fontSize: '0.8em' }}
                onClick={(event) => {
                  event.preventDefault()
                  setEditingHeader({})
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
                      <td>{header.name}</td>
                      <td style={{ wordBreak: 'break-all' }}>{header.value}</td>
                      <td>
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            setEditingHeader({ header })
                          }}
                        >
                          修改
                        </a>{' '}
                        &nbsp;{' '}
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            void removeHeader(header)
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

            <h4>删除报头</h4>
            {deleteHeaders.length === 0 ? <p className="comment">暂时还没有要删除的报头。</p> : null}
            <div>
              {deleteHeaders.map((name) => (
                <span key={name} className="ui label small basic">
                  {name}{' '}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      removeDeletingHeader.mutate({ headerPolicyId: ref.headerPolicyId, headerName: name })
                    }}
                  >
                    ×
                  </a>
                </span>
              ))}
            </div>
            <div style={{ marginTop: '0.5em' }}>
              <button className="ui button tiny" type="button" onClick={() => void addHeaderName('delete')}>
                +添加
              </button>
            </div>

            <h4>保留非标准报头</h4>
            {nonStandardHeaders.length === 0 ? <p className="comment">暂时还没有非标准报头。</p> : null}
            <div>
              {nonStandardHeaders.map((name) => (
                <span key={name} className="ui label small basic">
                  {name}{' '}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      removeNonStandardHeader.mutate({ headerPolicyId: ref.headerPolicyId, headerName: name })
                    }}
                  >
                    ×
                  </a>
                </span>
              ))}
            </div>
            <div style={{ marginTop: '0.5em' }}>
              <button className="ui button tiny" type="button" onClick={() => void addHeaderName('nonStandard')}>
                +添加
              </button>
            </div>

            {type === 'response' ? (
              <div>
                <h4>CORS跨域</h4>
                <table className="ui table definition selectable">
                  <tbody>
                    <tr>
                      <td className="title">CORS配置</td>
                      <td>
                        {policy.cors && boolField(policy.cors, 'isOn') ? (
                          <span className="green">已启用</span>
                        ) : (
                          <span className="disabled">未启用</span>
                        )}{' '}
                        &nbsp;{' '}
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            setCorsVisible(true)
                          }}
                        >
                          [修改]
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${save.isPending ? ' loading disabled' : ''}`} type="submit" disabled={save.isPending}>
            保存
          </button>
        </div>
      </form>

      {editingHeader ? (
        <Modal title={editingHeader.header ? '修改报头' : '添加报头'} onClose={() => setEditingHeader(null)} width="42em">
          <SetHeaderForm
            type={type}
            headerPolicyId={ref.headerPolicyId}
            header={editingHeader.header}
            onDone={async () => {
              setEditingHeader(null)
              await refresh()
            }}
          />
        </Modal>
      ) : null}

      {corsVisible && policy ? (
        <Modal title="修改CORS配置" onClose={() => setCorsVisible(false)} width="40em">
          <CorsForm
            headerPolicyId={ref.headerPolicyId}
            cors={policy.cors || null}
            onDone={async () => {
              setCorsVisible(false)
              await refresh()
            }}
          />
        </Modal>
      ) : null}
    </SettingsShell>
  )
}

function SetHeaderForm({
  type,
  headerPolicyId,
  header,
  onDone,
}: {
  type: HeaderType
  headerPolicyId: number
  header?: SetHeader
  onDone: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(header ? header.name : '')
  const [value, setValue] = useState(header ? header.value : '')
  const [statusList, setStatusList] = useState<number[]>(header ? header.status || [] : [])
  const [methods, setMethods] = useState<string[]>(header ? header.methods || [] : [])
  const [domains, setDomains] = useState<string[]>(header ? header.domains || [] : [])
  const [shouldAppend, setShouldAppend] = useState(header ? Boolean(header.shouldAppend) : false)
  const [disableRedirect, setDisableRedirect] = useState(header ? Boolean(header.disableRedirect) : false)

  const mutation = useMutation({
    mutationFn: () =>
      postForm(`/servers/server/settings/headers/${header ? 'updateSetPopup' : 'createSetPopup'}`, {
        type,
        headerPolicyId,
        headerId: header ? header.id : 0,
        name,
        value,
        statusListJSON: JSON.stringify(statusList),
        methodsJSON: JSON.stringify(methods),
        domainsJSON: JSON.stringify(domains),
        shouldAppend,
        disableRedirect,
        shouldReplace: false,
        replaceValuesJSON: '',
      }),
    onSuccess: () => {
      toast('保存成功')
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">名称 *</td>
            <td>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>值</td>
            <td>
              <textarea rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>状态码</td>
            <td>
              <NumberListInput values={statusList} onChange={setStatusList} placeholder="比如 200,301" />
              <p className="comment">留空表示所有状态码。</p>
            </td>
          </tr>
          <tr>
            <td>请求方法</td>
            <td>
              <StringListInput values={methods} onChange={setMethods} placeholder="GET,POST" />
            </td>
          </tr>
          <tr>
            <td>域名</td>
            <td>
              <StringListInput values={domains} onChange={setDomains} placeholder="example.com" />
            </td>
          </tr>
          <tr>
            <td>追加模式</td>
            <td>
              <Checkbox checked={shouldAppend} onChange={setShouldAppend} />
            </td>
          </tr>
          <tr>
            <td>禁止跳转</td>
            <td>
              <Checkbox checked={disableRedirect} onChange={setDisableRedirect} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}

function CorsForm({ headerPolicyId, cors, onDone }: { headerPolicyId: number; cors: JsonObject | null; onDone: () => void }) {
  const toast = useToast()
  const [config, setConfig] = useState<JsonObject>(
    cors || {
      isOn: false,
      allowMethods: [],
      allowOrigin: '',
      allowCredentials: true,
      exposeHeaders: [],
      maxAge: 0,
      requestHeaders: [],
      requestMethod: '',
      optionsMethodOnly: false,
    },
  )

  const mutation = useMutation({
    mutationFn: () => postFormWithCsrf('/servers/server/settings/headers/updateCORSPopup', { headerPolicyId, corsJSON: JSON.stringify(config) }),
    onSuccess: () => {
      toast('保存成功')
      onDone()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">启用CORS自适应跨域</td>
            <td>
              <Checkbox checked={boolField(config, 'isOn')} onChange={(checked) => setConfig({ ...config, isOn: checked })} />
              <p className="comment">启用后，自动在响应报头中增加对应的Access-Control-*相关内容。</p>
            </td>
          </tr>
          <tr>
            <td>允许的来源域</td>
            <td>
              <input type="text" value={stringField(config, 'allowOrigin')} onChange={(event) => setConfig({ ...config, allowOrigin: event.target.value })} />
              <p className="comment">可以使用 * 表示所有来源域。</p>
            </td>
          </tr>
          <tr>
            <td>允许的方法</td>
            <td>
              <StringListInput
                values={(config.allowMethods as string[]) || []}
                onChange={(values) => setConfig({ ...config, allowMethods: values })}
                placeholder="GET,POST"
              />
            </td>
          </tr>
          <tr>
            <td>暴露的报头</td>
            <td>
              <StringListInput
                values={(config.exposeHeaders as string[]) || []}
                onChange={(values) => setConfig({ ...config, exposeHeaders: values })}
              />
            </td>
          </tr>
          <tr>
            <td>允许的请求报头</td>
            <td>
              <StringListInput
                values={(config.requestHeaders as string[]) || []}
                onChange={(values) => setConfig({ ...config, requestHeaders: values })}
              />
            </td>
          </tr>
          <tr>
            <td>允许Cookie</td>
            <td>
              <Checkbox checked={boolField(config, 'allowCredentials', true)} onChange={(checked) => setConfig({ ...config, allowCredentials: checked })} />
            </td>
          </tr>
          <tr>
            <td>缓存时间（秒）</td>
            <td>
              <input
                type="text"
                value={String(numberField(config, 'maxAge'))}
                onChange={(event) => setConfig({ ...config, maxAge: Number(event.target.value) || 0 })}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className={`ui button primary${mutation.isPending ? ' loading disabled' : ''}`} type="submit" disabled={mutation.isPending}>
          保存
        </button>
      </div>
    </form>
  )
}
