import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import { Modal, MoreOptionsIndicator, ServerSettingsShell, useServerId, type ServerSettingsBase, type TimeDuration } from './shared'

interface FastcgiParam {
  name: string
  value: string
}

interface FastcgiConfig {
  id: number
  isOn: boolean
  address: string
  params?: FastcgiParam[]
  readTimeout?: TimeDuration | null
  poolSize: number
  pathInfoPattern: string
}

interface FastcgiRef {
  isPrior?: boolean
  isOn: boolean
  fastcgiIds: number[]
}

interface FastcgiData extends ServerSettingsBase {
  webId: number
  fastcgiRef: FastcgiRef | null
  fastcgiConfigs: FastcgiConfig[] | null
}

export function ServerFastcgiSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-fastcgi', serverId],
    queryFn: () => apiGet<FastcgiData>('/servers/server/settings/fastcgi', { serverId }),
    enabled: serverId > 0,
  })
  const [fastcgiRef, setFastcgiRef] = useState<FastcgiRef>({ isOn: false, fastcgiIds: [] })
  const [configs, setConfigs] = useState<FastcgiConfig[]>([])
  const [editor, setEditor] = useState<{ config: FastcgiConfig | null; index: number | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!query.data) {
      return
    }
    const data = query.data
    const list = data.fastcgiConfigs || []
    setConfigs(list)
    setFastcgiRef(data.fastcgiRef || { isOn: false, fastcgiIds: list.map((config) => config.id) })
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  function handleEditorSaved(config: FastcgiConfig) {
    if (!editor) {
      return
    }
    if (editor.index === null) {
      const nextConfigs = [...configs, config]
      setConfigs(nextConfigs)
      setFastcgiRef({ ...fastcgiRef, fastcgiIds: nextConfigs.map((item) => item.id) })
    } else {
      const nextConfigs = [...configs]
      nextConfigs[editor.index] = config
      setConfigs(nextConfigs)
    }
    setEditor(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/fastcgi', { webId: data.webId, fastcgiRefJSON: JSON.stringify(fastcgiRef) })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="启用配置">
            <Checkbox checked={fastcgiRef.isOn} onChange={(checked) => setFastcgiRef({ ...fastcgiRef, isOn: checked })} />
          </FormRow>
          {fastcgiRef.isOn ? (
            <FormRow title="Fastcgi服务">
              <div>
                {configs.length > 0 ? (
                  <div style={{ marginBottom: '0.5em' }}>
                    {configs.map((config, index) => (
                      <div key={config.id} className={`ui label small basic${config.isOn ? '' : ' disabled'}`}>
                        {config.address} &nbsp;
                        <a href="" title="修改" onClick={(event) => { event.preventDefault(); setEditor({ config, index }) }}>
                          <Pencil size={12} />
                        </a>{' '}
                        &nbsp;
                        <a
                          href=""
                          title="删除"
                          onClick={(event) => {
                            event.preventDefault()
                            const nextConfigs = configs.filter((_, i) => i !== index)
                            setConfigs(nextConfigs)
                            setFastcgiRef({ ...fastcgiRef, fastcgiIds: nextConfigs.map((item) => item.id) })
                          }}
                        >
                          <Trash2 size={13} />
                        </a>
                      </div>
                    ))}
                    <div className="ui divided" />
                  </div>
                ) : null}
                <button className="ui button tiny" type="button" onClick={() => setEditor({ config: null, index: null })}>
                  +
                </button>
              </div>
            </FormRow>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>

      {editor ? (
        <FastcgiEditor
          config={editor.config}
          onClose={() => setEditor(null)}
          onSaved={handleEditorSaved}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

function FastcgiEditor({ config, onClose, onSaved }: { config: FastcgiConfig | null; onClose: () => void; onSaved: (config: FastcgiConfig) => void }) {
  const toast = useToast()
  const [address, setAddress] = useState(config?.address || '')
  const [params, setParams] = useState<FastcgiParam[]>(
    config?.params || [
      { name: 'DOCUMENT_ROOT', value: '' },
      { name: 'SCRIPT_FILENAME', value: '' },
    ],
  )
  const [readTimeout, setReadTimeout] = useState(String(config?.readTimeout?.count || ''))
  const [poolSize, setPoolSize] = useState(String(config?.poolSize || 0))
  const [pathInfoPattern, setPathInfoPattern] = useState(config?.pathInfoPattern || '')
  const [isOn, setIsOn] = useState(config?.isOn ?? true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function paramLabel(param: FastcgiParam): string {
    if (param.name === 'DOCUMENT_ROOT') {
      return '文档目录'
    }
    if (param.name === 'SCRIPT_FILENAME') {
      return '脚本文件'
    }
    return ''
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const form = {
        csrfToken: await getCsrfToken(),
        address,
        paramsJSON: JSON.stringify(params),
        readTimeout: Number(readTimeout) || 0,
        poolSize: Number(poolSize) || 0,
        pathInfoPattern,
        ...(isOn ? { isOn: 1 } : {}),
      }
      const path = config ? '/servers/server/settings/fastcgi/updatePopup' : '/servers/server/settings/fastcgi/createPopup'
      const resp = await apiPost<{ fastcgi: FastcgiConfig }>(path, {
        ...form,
        ...(config ? { fastcgiId: config.id } : {}),
      })
      toast(config ? '修改成功' : '添加成功')
      onSaved(resp.fastcgi)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={config ? '修改Fastcgi服务' : '添加Fastcgi服务'} onClose={onClose} width="45em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="Fastcgi地址">
            <TextInput type="text" placeholder="比如 127.0.0.1:9000" maxLength={100} style={{ width: '14em' }} value={address} onChange={(event) => setAddress(event.target.value)} />
          </FormRow>
          <FormRow title="自定义参数集">
            <div>
              {params.map((param, index) => (
                <div key={index}>
                  {paramLabel(param) ? (
                    <div className="ui field" style={{ margin: 0 }}>
                      <label>{paramLabel(param)}：</label>
                    </div>
                  ) : null}
                  <div className="ui fields inline">
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="参数名"
                        style={{ width: '12em' }}
                        value={param.name}
                        onChange={(event) => {
                          const next = [...params]
                          next[index] = { ...param, name: event.target.value }
                          setParams(next)
                        }}
                      />
                    </div>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="参数值"
                        style={{ width: '16em' }}
                        value={param.value}
                        onChange={(event) => {
                          const next = [...params]
                          next[index] = { ...param, value: event.target.value }
                          setParams(next)
                        }}
                      />
                    </div>
                    <div className="ui field" style={{ padding: 0 }}>
                      <a href="" title="删除" onClick={(event) => { event.preventDefault(); setParams(params.filter((_, i) => i !== index)) }}>
                        <Trash2 size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {params.length > 0 ? (
                <p className="comment">
                  可以在参数值中使用一些变量
                  <a href="https://goedge.cloud/docs/Server/Variables.md" target="_blank" rel="noreferrer">
                    点这里查看
                  </a>{' '}
                  。
                </p>
              ) : null}
              <button className="ui button tiny" type="button" onClick={() => setParams([...params, { name: '', value: '' }])}>
                +
              </button>
            </div>
          </FormRow>
          <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
            <span />
          </FormRow>
          {moreOptions ? (
            <>
              <FormRow title="读取超时时间">
                <div className="ui right labeled input" style={{ width: '7em' }}>
                  <input type="number" maxLength={10} placeholder="比如 30" value={readTimeout} onChange={(event) => setReadTimeout(event.target.value)} />
                  <span className="ui basic label">秒</span>
                </div>
              </FormRow>
              <FormRow title="连接池尺寸">
                <TextInput type="text" maxLength={4} style={{ width: '7em' }} value={poolSize} onChange={(event) => setPoolSize(event.target.value)} />
                <p className="comment">0表示不限制，通常可以设置为CPU数量的两倍</p>
              </FormRow>
              <FormRow title="PATH_INFO匹配">
                <TextInput type="text" maxLength={100} value={pathInfoPattern} onChange={(event) => setPathInfoPattern(event.target.value)} />
                <p className="comment">
                  匹配PATH_INFO的正则表达式，用括号表示匹配的内容，如果只有一个匹配括号表示第一个括号为${'{fastcgi.pathInfo}'}
                  值；如果有两个或两个以上的匹配括号，则第一个表示匹配的是${'{fastcgi.filename}'}，第二个匹配的是$
                  {'{fastcgi.pathInfo}'}，比如(\w+\.php)(.+)$。
                </p>
              </FormRow>
              <FormRow title="启用当前Fastcgi">
                <Checkbox checked={isOn} onChange={setIsOn} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}
