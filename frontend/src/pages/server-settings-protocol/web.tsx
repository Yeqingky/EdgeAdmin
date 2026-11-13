import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import {
  Comment,
  CondsEditor,
  GroupConfigWarning,
  PopupPage,
  ServerSettingsShell,
  SizeCapacityEditor,
  URLPatternsEditor,
  ValuesEditor,
  buildSettingsURL,
  useSearchInt,
} from './common'
import type { CondsConfig, SizeCapacity, URLPattern } from './common'

interface RootConfig {
  isPrior: boolean
  isOn: boolean
  dir: string
  indexes: string[]
  stripPrefix: string
  decodePath: boolean
  isBreak: boolean
  exceptHiddenFiles: boolean
  onlyURLPatterns: URLPattern[]
  exceptURLPatterns: URLPattern[]
}

interface RootData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  rootConfig: RootConfig | null
}

function emptyRoot(): RootConfig {
  return {
    isPrior: false,
    isOn: false,
    dir: '',
    indexes: [],
    stripPrefix: '',
    decodePath: false,
    isBreak: false,
    exceptHiddenFiles: true,
    onlyURLPatterns: [],
    exceptURLPatterns: [],
  }
}

export function WebRootPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<RootConfig | null>(null)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-web-root', serverId],
    queryFn: () => apiGet<RootData>('/servers/server/settings/web', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: RootConfig = {
    ...emptyRoot(),
    ...(data.rootConfig || {}),
    indexes: data.rootConfig?.indexes || [],
    onlyURLPatterns: data.rootConfig?.onlyURLPatterns || [],
    exceptURLPatterns: data.rootConfig?.exceptURLPatterns || [],
    ...(config || {}),
  }

  function update<K extends keyof RootConfig>(key: K, value: RootConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/web', {
        serverId,
        webId: data.webId,
        rootJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/web">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用静态资源分发">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
            </FormRow>
            {current.isOn ? (
              <FormRow title="静态资源根目录">
                <TextInput
                  type="text"
                  placeholder="类似于 /home/www"
                  value={current.dir}
                  onChange={(event) => update('dir', event.target.value)}
                />
                <Comment>可以访问此根目录下的静态资源。</Comment>
              </FormRow>
            ) : null}
            {current.isOn ? (
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    [{advancedVisible ? '收起更多选项' : '更多选项'}]
                  </a>
                </td>
              </tr>
            ) : null}
          </tbody>
          {current.isOn && advancedVisible ? (
            <tbody>
              <FormRow title="首页文件">
                <ValuesEditor values={current.indexes} onChange={(values) => update('indexes', values)} placeholder="比如 index.html" />
                <Comment>在URL中只有目录没有文件名时默认查找的首页文件。</Comment>
              </FormRow>
              <FormRow title="例外URL">
                <URLPatternsEditor patterns={current.exceptURLPatterns} onChange={(values) => update('exceptURLPatterns', values)} />
                <Comment>如果填写了例外URL，表示不支持通过这些URL访问。</Comment>
              </FormRow>
              <FormRow title="限制URL">
                <URLPatternsEditor patterns={current.onlyURLPatterns} onChange={(values) => update('onlyURLPatterns', values)} />
                <Comment>如果填写了限制URL，表示仅支持通过这些URL访问。</Comment>
              </FormRow>
              <FormRow title="排除隐藏文件">
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={current.exceptHiddenFiles}
                    onChange={(event) => update('exceptHiddenFiles', event.target.checked)}
                  />
                  <label></label>
                </div>
                <Comment>排除以点（.）符号开头的隐藏目录或文件，比如 /.git/logs/HEAD。</Comment>
              </FormRow>
              <FormRow title="去除URL前缀">
                <TextInput
                  type="text"
                  placeholder="/PREFIX"
                  value={current.stripPrefix}
                  onChange={(event) => update('stripPrefix', event.target.value)}
                />
                <Comment>可以把请求的路径部分前缀去除后再查找文件。</Comment>
              </FormRow>
              <FormRow title="路径解码">
                <div className="ui checkbox">
                  <input type="checkbox" checked={current.decodePath} onChange={(event) => update('decodePath', event.target.checked)} />
                  <label></label>
                </div>
                <Comment>是否对请求路径进行URL解码后再查找文件。</Comment>
              </FormRow>
              <FormRow title="终止请求">
                <div className="ui checkbox">
                  <input type="checkbox" checked={current.isBreak} onChange={(event) => update('isBreak', event.target.checked)} />
                  <label></label>
                </div>
                <Comment>在找不到要访问的文件的情况下是否终止请求并返回404。</Comment>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

export function WebCreateIndexRoute() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [index, setIndex] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const backTo = buildSettingsURL('/web', { serverId })

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/web/createIndex', { index })
      toast('保存成功')
      setIndex('')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PopupPage title="添加首页文件" backTo={backTo}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="首页文件名 *">
              <TextInput type="text" maxLength={200} value={index} onChange={(event) => setIndex(event.target.value)} />
            </FormRow>
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </PopupPage>
  )
}

interface WebPConfig {
  isPrior: boolean
  isOn: boolean
  minLength: SizeCapacity
  maxLength: SizeCapacity
  mimeTypes: string[]
  extensions: string[]
  conds: CondsConfig | null
}

interface WebPData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  webpConfig: WebPConfig | null
  requireCache: boolean
}

export function WebpPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<WebPConfig | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-webp', serverId],
    queryFn: () => apiGet<WebPData>('/servers/server/settings/webp', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: WebPConfig = {
    isPrior: false,
    isOn: false,
    minLength: { count: 0, unit: 'kb' },
    maxLength: { count: 0, unit: 'kb' },
    mimeTypes: ['image/png', 'image/jpeg', 'image/bmp', 'image/x-ico'],
    extensions: ['.png', '.jpeg', '.jpg', '.bmp', '.ico'],
    conds: null,
    ...(data.webpConfig || {}),
    mimeTypes: data.webpConfig?.mimeTypes || [],
    extensions: data.webpConfig?.extensions || [],
    ...(config || {}),
  }

  function update<K extends keyof WebPConfig>(key: K, value: WebPConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/webp', {
        csrfToken,
        webId: data.webId,
        webpJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/webp">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用WebP压缩">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
              <Comment>
                选中后表示开启自动WebP压缩；图片的宽和高均不能超过16383像素
                {data.requireCache ? '；只有满足缓存条件的图片内容才会被转换' : ''}。
              </Comment>
            </FormRow>
            {current.isOn ? (
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
            ) : null}
          </tbody>
          {moreOptions && current.isOn ? (
            <tbody>
              <FormRow title="支持的扩展名">
                <ValuesEditor
                  values={current.extensions}
                  onChange={(values) =>
                    update(
                      'extensions',
                      values.map((value) => (value.length > 0 && value[0] !== '.' ? `.${value}` : value)),
                    )
                  }
                  placeholder="比如 .html"
                />
                <Comment>含有这些扩展名的URL将会被转成WebP，不区分大小写。</Comment>
              </FormRow>
              <FormRow title="支持的MimeType">
                <ValuesEditor
                  values={current.mimeTypes}
                  onChange={(values) => update('mimeTypes', values)}
                  placeholder="比如 text/*"
                />
                <Comment>响应的Content-Type里包含这些MimeType的内容将会被转成WebP。</Comment>
              </FormRow>
              <FormRow title="内容最小长度">
                <SizeCapacityEditor value={current.minLength} onChange={(value) => update('minLength', value)} />
                <Comment>0表示不限制，内容长度从文件尺寸或Content-Length中获取。</Comment>
              </FormRow>
              <FormRow title="内容最大长度">
                <SizeCapacityEditor value={current.maxLength} onChange={(value) => update('maxLength', value)} />
                <Comment>0表示不限制，内容长度从文件尺寸或Content-Length中获取。</Comment>
              </FormRow>
              <FormRow title="匹配条件">
                <CondsEditor value={current.conds || { isOn: true, connector: 'or', groups: [] }} onChange={(conds) => update('conds', conds)} />
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

interface WebsocketRef {
  isPrior: boolean
  isOn: boolean
  websocketId: number
}

interface WebsocketConfig {
  id: number
  isOn: boolean
  handshakeTimeout: { count: number; unit: string }
  allowAllOrigins: boolean
  allowedOrigins: string[]
  requestSameOrigin: boolean
  requestOrigin: string
}

interface WebsocketData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  websocketRef: WebsocketRef | null
  websocketConfig: WebsocketConfig | null
}

export function WebsocketPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [ref, setRef] = useState<WebsocketRef | null>(null)
  const [config, setConfig] = useState<WebsocketConfig | null>(null)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-websocket', serverId],
    queryFn: () => apiGet<WebsocketData>('/servers/server/settings/websocket', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const currentRef: WebsocketRef = ref ?? data.websocketRef ?? { isPrior: false, isOn: false, websocketId: 0 }
  const current: WebsocketConfig = {
    id: 0,
    isOn: false,
    handshakeTimeout: { count: 30, unit: 'second' },
    allowAllOrigins: true,
    allowedOrigins: [],
    requestSameOrigin: true,
    requestOrigin: '',
    ...(data.websocketConfig || {}),
    handshakeTimeout: data.websocketConfig?.handshakeTimeout || { count: 30, unit: 'second' },
    allowedOrigins: data.websocketConfig?.allowedOrigins || [],
    ...(config || {}),
  }

  function updateConfig<K extends keyof WebsocketConfig>(key: K, value: WebsocketConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/websocket', {
        webId: data.webId,
        websocketRefJSON: JSON.stringify(currentRef),
        websocketJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const isOn = currentRef.isOn

  return (
    <ServerSettingsShell serverId={serverId} activePath="/websocket">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用Websocket">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={currentRef.isOn}
                  onChange={(event) => setRef({ ...currentRef, isOn: event.target.checked })}
                />
                <label></label>
              </div>
            </FormRow>
            {isOn ? (
              <>
                <FormRow title="允许所有来源域（Origin）">
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={current.allowAllOrigins}
                      onChange={(event) => updateConfig('allowAllOrigins', event.target.checked)}
                    />
                    <label></label>
                  </div>
                  <Comment>选中表示允许所有的来源域。</Comment>
                </FormRow>
                {!current.allowAllOrigins ? (
                  <FormRow title="允许的来源域列表（Origin）">
                    <ValuesEditor
                      values={current.allowedOrigins}
                      onChange={(values) => updateConfig('allowedOrigins', values)}
                      placeholder="比如 *.example.com"
                    />
                    <Comment>只允许在列表中的来源域名访问Websocket服务。</Comment>
                  </FormRow>
                ) : null}
                <tr>
                  <td colSpan={2}>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setAdvancedVisible(!advancedVisible)
                      }}
                    >
                      [{advancedVisible ? '收起更多选项' : '更多选项'}]
                    </a>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
          {isOn && advancedVisible ? (
            <tbody>
              <FormRow title="传递请求来源域">
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={current.requestSameOrigin}
                    onChange={(event) => updateConfig('requestSameOrigin', event.target.checked)}
                  />
                  <label></label>
                </div>
                <Comment>选中后，表示把接收到的请求中的 Origin 字段传递到源站。</Comment>
              </FormRow>
              {!current.requestSameOrigin ? (
                <FormRow title="指定传递的来源域">
                  <TextInput
                    type="text"
                    maxLength={200}
                    value={current.requestOrigin}
                    onChange={(event) => updateConfig('requestOrigin', event.target.value)}
                  />
                  <Comment>指定向源站传递的 Origin 字段值。</Comment>
                </FormRow>
              ) : null}
              <FormRow title="握手超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      maxLength={10}
                      style={{ width: '6em' }}
                      value={String(current.handshakeTimeout.count)}
                      onChange={(event) =>
                        updateConfig('handshakeTimeout', {
                          ...current.handshakeTimeout,
                          count: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <Comment>0表示使用默认的时间设置。</Comment>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

export function WebsocketCreateOriginRoute() {
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const backTo = buildSettingsURL('/websocket', { serverId })

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/websocket/createOrigin', { origin })
      toast('保存成功')
      if (serverId > 0) {
        navigate(backTo)
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PopupPage title="添加来源域" backTo={backTo}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="来源域 *">
              <TextInput
                type="text"
                maxLength={200}
                placeholder="比如 example.com"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              />
              <Comment>允许客户端通过Websocket可以访问的域名，可以使用星号通配符（*）来表示匹配一组域名。</Comment>
            </FormRow>
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </PopupPage>
  )
}

