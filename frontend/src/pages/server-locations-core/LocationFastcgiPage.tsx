import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, X } from 'lucide-react'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { Modal } from './Modal'
import { PriorRow } from './fields'
import { LocationShell } from './LocationShell'
import type { FastcgiConfig, FastcgiRef, LocationPageBase } from './types'

interface FastcgiData extends LocationPageBase {
  fastcgiRef?: FastcgiRef | null
  fastcgiConfigs?: FastcgiConfig[] | null
}

interface FastcgiEditorState {
  id: number
  address: string
  readTimeout: number
  poolSize: number
  pathInfoPattern: string
  isOn: boolean
  params: { name: string; value: string }[]
  isNew: boolean
}

function FastcgiEditor({ state, onClose, onSaved }: {
  state: FastcgiEditorState
  onClose: () => void
  onSaved: (config: FastcgiConfig) => void
}) {
  const toast = useToast()
  const [editor, setEditor] = useState(state)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<FastcgiEditorState>) {
    setEditor((current) => ({ ...current, ...patch }))
  }

  async function save() {
    if (editor.address.length === 0) {
      toast('请输入Fastcgi地址', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      if (!editor.isNew) {
        form.set('fastcgiId', String(editor.id))
      }
      form.set('address', editor.address)
      form.set('readTimeout', String(editor.readTimeout))
      form.set('poolSize', String(editor.poolSize))
      form.set('pathInfoPattern', editor.pathInfoPattern)
      form.set('isOn', editor.isOn ? '1' : '0')
      const params: Record<string, string> = {}
      editor.params.forEach((param) => {
        if (param.name.length > 0) {
          params[param.name] = param.value
        }
      })
      form.set('paramsJSON', JSON.stringify(params))

      const result = await apiPostForm<{ fastcgi: FastcgiConfig }>(
        editor.isNew ? '/servers/server/settings/fastcgi/createPopup' : '/servers/server/settings/fastcgi/updatePopup',
        form,
      )
      toast(editor.isNew ? '添加成功' : '修改成功')
      onSaved(result.fastcgi)
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editor.isNew ? '添加Fastcgi服务' : '修改Fastcgi服务'}
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
            <td className="title">Fastcgi地址 *</td>
            <td>
              <input type="text" placeholder="比如 127.0.0.1:9000" value={editor.address} onChange={(event) => update({ address: event.target.value })} />
            </td>
          </tr>
          <tr>
            <td>连接池尺寸</td>
            <td>
              <input
                type="text"
                size={6}
                value={String(editor.poolSize)}
                onChange={(event) => update({ poolSize: Number(event.target.value) || 0 })}
              />
              <p className="comment">0表示不使用连接池。</p>
            </td>
          </tr>
          <tr>
            <td>读取超时时间</td>
            <td>
              <input
                type="text"
                size={6}
                value={String(editor.readTimeout)}
                onChange={(event) => update({ readTimeout: Number(event.target.value) || 0 })}
              />
              <span className="grey"> 秒</span>
            </td>
          </tr>
          <tr>
            <td>PathInfo规则</td>
            <td>
              <input type="text" value={editor.pathInfoPattern} onChange={(event) => update({ pathInfoPattern: event.target.value })} />
              <p className="comment">用来识别PathInfo的正则表达式，留空表示不识别。</p>
            </td>
          </tr>
          <tr>
            <td>参数</td>
            <td>
              {editor.params.map((param, index) => (
                <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
                  <div className="ui field">
                    <input
                      type="text"
                      placeholder="名称"
                      value={param.name}
                      onChange={(event) => {
                        const params = editor.params.slice()
                        params[index] = { ...param, name: event.target.value }
                        update({ params })
                      }}
                    />
                  </div>
                  <div className="ui field">
                    <input
                      type="text"
                      placeholder="值"
                      value={param.value}
                      onChange={(event) => {
                        const params = editor.params.slice()
                        params[index] = { ...param, value: event.target.value }
                        update({ params })
                      }}
                    />
                  </div>
                  <div className="ui field">
                    <a href="" title="删除" onClick={(event) => {
                      event.preventDefault()
                      update({ params: editor.params.filter((_, i) => i !== index) })
                    }}>
                      <X size={13} />
                    </a>
                  </div>
                </div>
              ))}
              <button
                className="ui button tiny"
                type="button"
                onClick={() => update({ params: [...editor.params, { name: '', value: '' }] })}
              >
                <Plus size={12} /> 添加参数
              </button>
            </td>
          </tr>
          <tr>
            <td>启用</td>
            <td>
              <Checkbox checked={editor.isOn} onChange={(isOn) => update({ isOn })} />
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

function FastcgiForm({ data }: { data: FastcgiData }) {
  const toast = useToast()
  const configs = data.fastcgiConfigs || []
  const [isPrior, setIsPrior] = useState(data.fastcgiRef?.isPrior ?? false)
  const [isOn, setIsOn] = useState(data.fastcgiRef?.isOn ?? false)
  const [fastcgiConfigs, setFastcgiConfigs] = useState<FastcgiConfig[]>(configs)
  const [fastcgiIds, setFastcgiIds] = useState<number[]>(
    data.fastcgiConfigs ? configs.map((config) => config.id) : (data.fastcgiRef?.fastcgiIds || []),
  )
  const [editor, setEditor] = useState<FastcgiEditorState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const enabled = isPrior && isOn

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/fastcgi', {
        webId: data.webId,
        fastcgiRefJSON: JSON.stringify({ isPrior, isOn, fastcgiIds }),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function openCreate() {
    setEditor({
      id: 0,
      address: '',
      readTimeout: 0,
      poolSize: 0,
      pathInfoPattern: '',
      isOn: true,
      params: [],
      isNew: true,
    })
  }

  function openEdit(config: FastcgiConfig) {
    setEditor({
      id: config.id,
      address: config.address,
      readTimeout: config.readTimeout?.count || 0,
      poolSize: config.poolSize || 0,
      pathInfoPattern: config.pathInfoPattern || '',
      isOn: config.isOn,
      params: Object.entries(config.params || {}).map(([name, value]) => ({ name, value })),
      isNew: false,
    })
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <PriorRow isPrior={isPrior} onChange={setIsPrior} />
        {isPrior ? (
          <FormRow title="启用配置">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        ) : null}
      </FormTable>

      {enabled ? (
        <FormTable>
          <FormRow title="Fastcgi服务">
            {fastcgiConfigs.length > 0 ? (
              <div style={{ marginBottom: '0.5em' }}>
                {fastcgiConfigs.map((config, index) => (
                  <div key={config.id} className={`ui label basic small${config.isOn ? '' : ' disabled'}`}>
                    {config.address} &nbsp;
                    <a href="" title="修改" onClick={(event) => { event.preventDefault(); openEdit(config) }}>
                      <Pencil size={11} />
                    </a>{' '}
                    &nbsp;
                    <a href="" title="删除" onClick={(event) => {
                      event.preventDefault()
                      setFastcgiConfigs(fastcgiConfigs.filter((_, i) => i !== index))
                      setFastcgiIds(fastcgiIds.filter((_, i) => i !== index))
                    }}>
                      <X size={11} />
                    </a>
                  </div>
                ))}
                <div className="ui divided" />
              </div>
            ) : null}
            <button className="ui button tiny" type="button" onClick={openCreate}>
              <Plus size={12} />
            </button>
          </FormRow>
        </FormTable>
      ) : null}

      <SubmitButton submitting={submitting} />

      {editor ? (
        <FastcgiEditor
          state={editor}
          onClose={() => setEditor(null)}
          onSaved={(fastcgi) => {
            const existsIndex = fastcgiConfigs.findIndex((config) => config.id === fastcgi.id)
            if (existsIndex >= 0) {
              const next = fastcgiConfigs.slice()
              next[existsIndex] = fastcgi
              setFastcgiConfigs(next)
            } else {
              setFastcgiConfigs([...fastcgiConfigs, fastcgi])
              setFastcgiIds([...fastcgiIds, fastcgi.id])
            }
          }}
        />
      ) : null}
    </form>
  )
}

export function LocationFastcgiPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-fastcgi', serverId, locationId],
    queryFn: () =>
      apiGet<FastcgiData>('/servers/server/settings/locations/fastcgi', {
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
      <FastcgiForm data={data} />
    </LocationShell>
  )
}
