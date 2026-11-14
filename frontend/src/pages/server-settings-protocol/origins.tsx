import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  CodeLabel,
  Comment,
  PopupPage,
  ValuesEditor,
  buildSettingsURL,
  useSearchInt,
  useSearchString,
} from './common'

interface OriginData {
  id?: number
  protocol: string
  addr: string
  tunnelNodeId?: number
  weight: number
  name: string
  description: string
  isOn: boolean
  connTimeout: number
  readTimeout: number
  idleTimeout: number
  maxConns: number
  maxIdleConns: number
  cert?: { id?: number } | null
  domains?: string[]
  host: string
  followPort: boolean
  http2Enabled: boolean
}

interface AddPopupData {
  reverseProxyId: number
  originType: string
  serverType: string
  isHTTP: boolean
  ossTypes: { name: string; code: string }[]
}

interface UpdatePopupData extends AddPopupData {
  originId: number
  origin: OriginData
}

interface OriginFormState {
  protocol: string
  addr: string
  tunnelNodeId: number
  host: string
  weight: number
  name: string
  connTimeout: number
  readTimeout: number
  idleTimeout: number
  maxConns: number
  maxIdleConns: number
  followPort: boolean
  http2Enabled: boolean
  description: string
  isOn: boolean
  domains: string[]
  certId: number
}

const PROTOCOL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  httpProxy: [
    { value: 'http', label: 'HTTP' },
    { value: 'https', label: 'HTTPS' },
  ],
  httpWeb: [
    { value: 'http', label: 'HTTP' },
    { value: 'https', label: 'HTTPS' },
  ],
  tcpProxy: [
    { value: 'tcp', label: 'TCP' },
    { value: 'tls', label: 'TLS' },
  ],
  udpProxy: [{ value: 'udp', label: 'UDP' }],
}

function defaultProtocol(serverType: string): string {
  if (serverType === 'tcpProxy') {
    return 'tcp'
  }
  if (serverType === 'udpProxy') {
    return 'udp'
  }
  return 'http'
}

function checkPortError(protocol: string, addr: string): string {
  if (protocol === 'http') {
    if (addr.endsWith(':443')) {
      return '443通常是HTTPS协议端口,请确认源站协议选择是否正确.'
    }
    if (addr.endsWith(':8443')) {
      return '8443通常是HTTPS协议端口,请确认源站协议选择是否正确.'
    }
  }
  if (protocol === 'https') {
    if (addr.endsWith(':80')) {
      return '80通常是HTTP协议端口,请确认源站协议选择是否正确.'
    }
    if (addr.endsWith(':8080')) {
      return '8080通常是HTTP协议端口,请确认源站协议选择是否正确.'
    }
  }
  return ''
}

function OriginForm({
  title,
  serverId,
  data,
  initial,
  updating,
  backTo,
}: {
  title: string
  serverId: number
  data: AddPopupData
  initial?: OriginData
  updating: boolean
  backTo: string
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<OriginFormState>({
    protocol: initial?.protocol || defaultProtocol(data.serverType),
    addr: initial?.addr || '',
    tunnelNodeId: initial?.tunnelNodeId || 0,
    host: initial?.host || '',
    weight: initial?.weight ?? 10,
    name: initial?.name || '',
    connTimeout: initial?.connTimeout ?? 10,
    readTimeout: initial?.readTimeout ?? 0,
    idleTimeout: initial?.idleTimeout ?? 0,
    maxConns: initial?.maxConns ?? 0,
    maxIdleConns: initial?.maxIdleConns ?? 0,
    followPort: initial?.followPort ?? false,
    http2Enabled: initial?.http2Enabled ?? false,
    description: initial?.description || '',
    isOn: initial?.isOn ?? true,
    domains: initial?.domains || [],
    certId: initial?.cert?.id || 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [adviceHTTPS, setAdviceHTTPS] = useState(false)
  const [moreOptions, setMoreOptions] = useState(false)
  const [error, setError] = useState('')

  const isOSS = form.protocol.startsWith('oss:')
  const isHTTP = data.isHTTP
  const addresses = PROTOCOL_OPTIONS[data.serverType] || PROTOCOL_OPTIONS.httpProxy

  function update<K extends keyof OriginFormState>(key: K, value: OriginFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (key === 'addr' || key === 'protocol') {
      setAdviceHTTPS(false)
    }
  }

  async function detectHTTPS() {
    if (form.protocol !== 'http' || form.addr.length === 0) {
      return
    }
    try {
      const result = await apiPost<{ isOk: boolean; addr: string }>('/servers/server/settings/origins/detectHTTPS', {
        addr: form.addr,
      })
      setAdviceHTTPS(result.isOk)
      if (result.isOk) {
        setForm((current) => ({ ...current, addr: result.addr }))
      }
    } catch {
      setAdviceHTTPS(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        serverId,
        reverseProxyId: data.reverseProxyId,
        originType: data.originType,
        weight: form.weight,
        protocol: form.protocol,
        addr: form.addr,
        tunnelNodeId: form.tunnelNodeId,
        name: form.name,
        connTimeout: form.connTimeout,
        readTimeout: form.readTimeout,
        maxConns: form.maxConns,
        maxIdleConns: form.maxIdleConns,
        idleTimeout: form.idleTimeout,
        certIdsJSON: form.certId > 0 ? JSON.stringify([form.certId]) : '',
        domainsJSON: JSON.stringify(form.domains),
        host: form.host,
        followPort: form.followPort ? 1 : 0,
        http2Enabled: form.http2Enabled ? 1 : 0,
        description: form.description,
        isOn: form.isOn ? 1 : 0,
      }
      if (updating && initial?.id) {
        payload.originId = initial.id
      }
      await apiPost(updating ? '/servers/server/settings/origins/updatePopup' : '/servers/server/settings/origins/addPopup', payload)
      toast('保存成功')
      navigate(buildSettingsURL('/reverseProxy', { serverId }))
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const portError = checkPortError(form.protocol, form.addr)

  return (
    <PopupPage title={title} backTo={backTo}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="源站协议">
              <Select value={form.protocol} onChange={(event) => update('protocol', event.target.value)}>
                {addresses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </FormRow>
            {!isOSS ? (
              <>
                <FormRow title="源站地址 *">
                  <div className="ui input left labeled">
                    <span className="ui label">{form.protocol.toLowerCase()}://</span>
                    <TextInput
                      type="text"
                      value={form.addr}
                      onChange={(event) => update('addr', event.target.value)}
                      onBlur={() => void detectHTTPS()}
                    />
                  </div>
                  {portError ? (
                    <Comment>
                      <span className="red">{portError}</span>
                    </Comment>
                  ) : null}
                  {adviceHTTPS && form.protocol === 'http' ? (
                    <Comment>
                      <span className="red">系统检测到当前源站有HTTPS协议可用,是否切换到HTTPS协议?</span>{' '}
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setAdviceHTTPS(false)
                          setForm((current) => ({
                            ...current,
                            protocol: 'https',
                            addr: current.addr.endsWith(':80') ? current.addr.slice(0, -3) : current.addr,
                          }))
                        }}
                      >
                        [点此切换]
                      </a>
                    </Comment>
                  ) : null}
                  <Comment>
                    源站服务器地址,通常是一个IP(或域名)加端口,80和443端口可以省略
                    {data.serverType === 'httpProxy' ? ',不需要加 http:// 或 https://' : ''}.
                  </Comment>
                </FormRow>
                {isHTTP || form.protocol === 'tls' ? (
                  <FormRow title="回源主机名">
                    <TextInput
                      type="text"
                      value={form.host}
                      maxLength={100}
                      placeholder="比如example.com"
                      onChange={(event) => update('host', event.target.value)}
                    />
                    <Comment>
                      可选项.请求源站时的Host字段值,用于设置访问源站的站点域名{isHTTP ? ',支持请求变量' : ''}
                      ;如果用户访问的域名和源站域名不一致,请务必设置为源站域名.
                    </Comment>
                  </FormRow>
                ) : null}
              </>
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
                {form.protocol === 'https' || form.protocol === 'tls' ? (
                  <FormRow title={`${form.protocol.toUpperCase()}证书`}>
                    <TextInput
                      type="text"
                      value={form.certId > 0 ? String(form.certId) : ''}
                      placeholder="证书ID,留空表示不使用证书"
                      onChange={(event) => update('certId', Number(event.target.value) || 0)}
                    />
                    <Comment>可以选择连接源站使用的证书;除非源站有特殊需求,否则不需要添加.</Comment>
                  </FormRow>
                ) : null}
                {form.protocol !== 'udp' ? (
                  <FormRow title="专属域名">
                    <ValuesEditor values={form.domains} onChange={(values) => update('domains', values)} placeholder="比如 example.com" />
                    <Comment>
                      默认不需要填写,表示支持所有域名.如果填写了专属域名,表示这些源站只会在所列的专属域名被访问时才生效.
                    </Comment>
                  </FormRow>
                ) : null}
                {!isOSS ? (
                  <FormRow title="端口跟随">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={form.followPort} onChange={(event) => update('followPort', event.target.checked)} />
                      <label></label>
                    </div>
                    <Comment>选中后表示源站的端口保持和用户访问的服务端口保持一致;此时的源站地址中的端口号可以任意填写.</Comment>
                  </FormRow>
                ) : null}
                {!isOSS && form.protocol === 'https' ? (
                  <FormRow title="支持HTTP/2">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={form.http2Enabled} onChange={(event) => update('http2Enabled', event.target.checked)} />
                      <label></label>
                    </div>
                    <Comment>选中后,表示源站支持HTTP/2协议.</Comment>
                  </FormRow>
                ) : null}
                <FormRow title="权重">
                  <TextInput
                    type="text"
                    maxLength={4}
                    style={{ width: '5em' }}
                    value={String(form.weight)}
                    onChange={(event) => update('weight', Number(event.target.value) || 0)}
                  />
                  <Comment>数字越大,代表分配的请求比例越多.</Comment>
                </FormRow>
                <FormRow title="名称">
                  <TextInput type="text" maxLength={100} value={form.name} onChange={(event) => update('name', event.target.value)} />
                  <Comment>给当前源站起一个容易识别的名称.</Comment>
                </FormRow>
                {!isOSS ? (
                  <FormRow title="连接失败超时时间">
                    <div className="ui fields inline">
                      <div className="ui field">
                        <TextInput
                          type="text"
                          size={6}
                          value={String(form.connTimeout)}
                          onChange={(event) => update('connTimeout', Number(event.target.value) || 0)}
                        />
                      </div>
                      <div className="ui field">秒</div>
                    </div>
                    <Comment>连接源站失败的最大超时时间,0表示不限制.</Comment>
                  </FormRow>
                ) : null}
                {isHTTP && !isOSS ? (
                  <>
                    <FormRow title="读取超时时间">
                      <div className="ui fields inline">
                        <div className="ui field">
                          <TextInput
                            type="text"
                            size={6}
                            value={String(form.readTimeout)}
                            onChange={(event) => update('readTimeout', Number(event.target.value) || 0)}
                          />
                        </div>
                        <div className="ui field">秒</div>
                      </div>
                      <Comment>读取内容时的最大超时时间,0表示不限制.</Comment>
                    </FormRow>
                    <FormRow title="最大并发连接数">
                      <TextInput
                        type="text"
                        size={6}
                        maxLength={10}
                        value={String(form.maxConns)}
                        onChange={(event) => update('maxConns', Number(event.target.value) || 0)}
                      />
                      <Comment>源站可以接受到的最大并发连接数,0表示使用系统默认.</Comment>
                    </FormRow>
                    <FormRow title="最大空闲连接数">
                      <TextInput
                        type="text"
                        size={6}
                        maxLength={10}
                        value={String(form.maxIdleConns)}
                        onChange={(event) => update('maxIdleConns', Number(event.target.value) || 0)}
                      />
                      <Comment>当没有请求时,源站保持等待的最大空闲连接数量,0表示使用系统默认.</Comment>
                    </FormRow>
                    <FormRow title="最大空闲超时时间">
                      <div className="ui fields inline">
                        <div className="ui field">
                          <TextInput
                            type="text"
                            size={6}
                            value={String(form.idleTimeout)}
                            onChange={(event) => update('idleTimeout', Number(event.target.value) || 0)}
                          />
                        </div>
                        <div className="ui field">秒</div>
                      </div>
                      <Comment>源站保持等待的空闲超时时间,0表示使用默认时间.</Comment>
                    </FormRow>
                  </>
                ) : null}
                <FormRow title="备注">
                  <textarea
                    rows={3}
                    maxLength={100}
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                  />
                </FormRow>
                <FormRow title="启用当前源站">
                  <div className="ui checkbox">
                    <input type="checkbox" checked={form.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                    <label></label>
                  </div>
                </FormRow>
              </tbody>
            ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        {!moreOptions ? (
          <div style={{ marginTop: '1em' }}>
            <span className="ui grey text">
              权重 <CodeLabel>{form.weight}</CodeLabel> 启用 <CodeLabel>{form.isOn ? '是' : '否'}</CodeLabel>
            </span>
          </div>
        ) : null}
        <SubmitButton submitting={submitting} />
      </form>
    </PopupPage>
  )
}

export function OriginsAddPage() {
  const serverId = useSearchInt('serverId')
  const reverseProxyId = useSearchInt('reverseProxyId')
  const originType = useSearchString('originType', 'primary')
  const query = useQuery({
    queryKey: ['server-settings-origins-add', serverId, reverseProxyId, originType],
    queryFn: () =>
      apiGet<AddPopupData>('/servers/server/settings/origins/addPopup', {
        serverId,
        reverseProxyId,
        originType,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <OriginForm
      title="添加源站"
      serverId={serverId}
      data={query.data}
      updating={false}
      backTo={buildSettingsURL('/reverseProxy', { serverId })}
    />
  )
}

export function OriginsUpdatePage() {
  const serverId = useSearchInt('serverId')
  const reverseProxyId = useSearchInt('reverseProxyId')
  const originId = useSearchInt('originId')
  const originType = useSearchString('originType', 'primary')
  const query = useQuery({
    queryKey: ['server-settings-origins-update', serverId, reverseProxyId, originId, originType],
    queryFn: () =>
      apiGet<UpdatePopupData>('/servers/server/settings/origins/updatePopup', {
        serverId,
        reverseProxyId,
        originId,
        originType,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <OriginForm
      title="修改源站"
      serverId={serverId}
      data={query.data}
      initial={query.data.origin}
      updating
      backTo={buildSettingsURL('/reverseProxy', { serverId })}
    />
  )
}
