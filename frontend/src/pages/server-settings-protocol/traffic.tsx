import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  Comment,
  GroupConfigWarning,
  ServerSettingsShell,
  SizeCapacityEditor,
  URLPatternsEditor,
  ValuesEditor,
  useSearchInt,
} from './common'
import type { SizeCapacity, URLPattern } from './common'

interface ReferersConfig {
  isPrior: boolean
  isOn: boolean
  allowEmpty: boolean
  allowSameDomain: boolean
  allowDomains: string[]
  denyDomains: string[]
  checkOrigin: boolean
  onlyURLPatterns?: URLPattern[]
  exceptURLPatterns?: URLPattern[]
}

interface ReferersData {
  serverId: number
  webId: number
  referersConfig: ReferersConfig | null
}

function emptyReferers(): ReferersConfig {
  return {
    isPrior: false,
    isOn: false,
    allowEmpty: true,
    allowSameDomain: true,
    allowDomains: [],
    denyDomains: [],
    checkOrigin: true,
    onlyURLPatterns: [],
    exceptURLPatterns: [],
  }
}

export function ReferersPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<ReferersConfig | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-referers', serverId],
    queryFn: () => apiGet<ReferersData>('/servers/server/settings/referers', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: ReferersConfig = config ?? {
    ...emptyReferers(),
    ...(data.referersConfig || {}),
    allowDomains: data.referersConfig?.allowDomains || [],
    denyDomains: data.referersConfig?.denyDomains || [],
    onlyURLPatterns: data.referersConfig?.onlyURLPatterns || [],
    exceptURLPatterns: data.referersConfig?.exceptURLPatterns || [],
  }

  function update<K extends keyof ReferersConfig>(key: K, value: ReferersConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/referers', {
        csrfToken,
        webId: data.webId,
        referersJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/referers">
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用防盗链">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
              <Comment>选中后表示开启防盗链.</Comment>
            </FormRow>
            {current.isOn ? (
              <>
                <FormRow title="允许直接访问网站">
                  <div className="ui checkbox">
                    <input type="checkbox" checked={current.allowEmpty} onChange={(event) => update('allowEmpty', event.target.checked)} />
                    <label></label>
                  </div>
                  <Comment>允许用户直接访问网站,用户第一次访问网站时来源域名通常为空.</Comment>
                </FormRow>
                <FormRow title="来源域名允许一致">
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={current.allowSameDomain}
                      onChange={(event) => update('allowSameDomain', event.target.checked)}
                    />
                    <label></label>
                  </div>
                  <Comment>允许来源域名和当前访问的域名一致,相当于在站内访问.</Comment>
                </FormRow>
                <FormRow title="允许的来源域名">
                  <ValuesEditor
                    values={current.allowDomains}
                    onChange={(values) => update('allowDomains', values)}
                    placeholder="比如 example.com 或 *.example.com"
                  />
                  <Comment>
                    允许的其他来源域名列表,比如 example.com,*.example.com.单个星号 * 表示允许所有域名.
                  </Comment>
                </FormRow>
                <FormRow title="禁止的来源域名">
                  <ValuesEditor
                    values={current.denyDomains}
                    onChange={(values) => update('denyDomains', values)}
                    placeholder="比如 example.org 或 *.example.org"
                  />
                  <Comment>
                    禁止的来源域名列表,比如 example.org,*.example.org;除了这些禁止的来源域名外,其他域名都会被允许,除非限定了允许的来源域名.
                  </Comment>
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
              </>
            ) : null}
          </tbody>
          {moreOptions && current.isOn ? (
            <tbody>
              <FormRow title="同时检查Origin">
                <div className="ui checkbox">
                  <input type="checkbox" checked={current.checkOrigin} onChange={(event) => update('checkOrigin', event.target.checked)} />
                  <label></label>
                </div>
                <Comment>如果请求没有指定Referer Header,则尝试检查Origin Header,多用于跨站调用.</Comment>
              </FormRow>
              <FormRow title="例外URL">
                <URLPatternsEditor patterns={current.exceptURLPatterns || []} onChange={(values) => update('exceptURLPatterns', values)} />
                <Comment>如果填写了例外URL,表示这些URL跳过不做处理.</Comment>
              </FormRow>
              <FormRow title="限制URL">
                <URLPatternsEditor patterns={current.onlyURLPatterns || []} onChange={(values) => update('onlyURLPatterns', values)} />
                <Comment>如果填写了限制URL,表示只对这些URL进行处理;如果不填则表示支持所有的URL.</Comment>
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

interface RemoteAddrConfig {
  isPrior: boolean
  isOn: boolean
  value: string
  type: string
  requestHeaderName: string
}

interface RemoteAddrData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  remoteAddrConfig: RemoteAddrConfig | null
}

const REMOTE_ADDR_OPTIONS = [
  {
    type: 'default',
    name: '直接获取',
    description:
      '用户直接访问边缘节点,即 "用户 --> 边缘节点" 模式,这时候系统会试图从直接的连接中读取到客户端IP地址.',
    value: '${rawRemoteAddr}',
  },
  {
    type: 'proxy',
    name: '从上级代理中获取',
    description:
      '用户和边缘节点之间有别的代理服务转发,即 "用户 --> [第三方代理服务] --> 边缘节点",这时候只能从上级代理中获取传递的IP地址;上级代理传递的请求报头中必须包含 X-Forwarded-For 或 X-Real-IP 信息.',
    value: '${remoteAddr}',
  },
  { type: 'requestHeader', name: '从请求报头中读取', description: '从自定义请求报头读取客户端IP.', value: '' },
  { type: 'variable', name: '[自定义变量]', description: '通过自定义变量来获取客户端真实的IP地址.', value: '' },
]

export function RemoteAddrPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<RemoteAddrConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-remote-addr', serverId],
    queryFn: () => apiGet<RemoteAddrData>('/servers/server/settings/remoteAddr', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: RemoteAddrConfig = config ??
    (data.remoteAddrConfig
      ? { ...data.remoteAddrConfig }
      : { isPrior: false, isOn: false, value: '${rawRemoteAddr}', type: 'default', requestHeaderName: '' })

  function update<K extends keyof RemoteAddrConfig>(key: K, value: RemoteAddrConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  function changeType(type: string) {
    const option = REMOTE_ADDR_OPTIONS.find((item) => item.type === type)
    let value = option?.value || ''
    if (type === 'requestHeader' && current.requestHeaderName.length > 0) {
      value = `\${header.${current.requestHeaderName}}`
    }
    setConfig({ ...current, type, value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/remoteAddr', {
        csrfToken,
        webId: data.webId,
        remoteAddrJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const option = REMOTE_ADDR_OPTIONS.find((item) => item.type === current.type)

  return (
    <ServerSettingsShell serverId={serverId} activePath="/remoteAddr">
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
            <FormRow title="启用访客IP设置">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
              <Comment>选中后,表示使用自定义的请求变量获取客户端IP.</Comment>
            </FormRow>
            {current.isOn ? (
              <>
                <FormRow title="获取IP方式 *">
                  <Select value={current.type} onChange={(event) => changeType(event.target.value)}>
                    {REMOTE_ADDR_OPTIONS.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  {option ? <Comment>{option.description}</Comment> : null}
                </FormRow>
                {current.type === 'requestHeader' ? (
                  <FormRow title="请求报头 *">
                    <TextInput
                      type="text"
                      maxLength={100}
                      value={current.requestHeaderName}
                      onChange={(event) =>
                        setConfig({
                          ...current,
                          requestHeaderName: event.target.value,
                          value: `\${header.${event.target.value.trim()}}`,
                        })
                      }
                    />
                    <Comment>
                      请输入包含有客户端IP的请求报头,需要注意大小写,常见的有 X-Forwarded-For,X-Real-IP,X-Client-IP 等.
                    </Comment>
                  </FormRow>
                ) : null}
                {current.type === 'variable' ? (
                  <FormRow title="读取IP变量值 *">
                    <TextInput
                      type="text"
                      maxLength={100}
                      value={current.value}
                      onChange={(event) => update('value', event.target.value)}
                    />
                    <Comment>
                      通过此变量获取用户的IP地址,比如使用 ${'{header.你的自定义报头}'} 的形式.
                    </Comment>
                  </FormRow>
                ) : null}
              </>
            ) : null}
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

interface RequestLimitConfig {
  isPrior: boolean
  isOn: boolean
  maxConns: number
  maxConnsPerIP: number
  outBandwidthPerConn: SizeCapacity
  maxBodySize: SizeCapacity
}

interface RequestLimitData {
  hasGroupConfig: boolean
  groupSettingURL: string
  serverId: number
  webId: number
  requestLimitConfig: RequestLimitConfig | null
}

export function RequestLimitPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<RequestLimitConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-request-limit', serverId],
    queryFn: () => apiGet<RequestLimitData>('/servers/server/settings/requestLimit', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: RequestLimitConfig = config ?? {
    isPrior: false,
    isOn: false,
    maxConns: 0,
    maxConnsPerIP: 0,
    outBandwidthPerConn: { count: -1, unit: 'kb' },
    maxBodySize: { count: -1, unit: 'kb' },
    ...(data.requestLimitConfig || {}),
  }

  function update<K extends keyof RequestLimitConfig>(key: K, value: RequestLimitConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/requestLimit', {
        csrfToken,
        webId: data.webId,
        requestLimitJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/requestLimit">
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
            <FormRow title="启用请求限制">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
            </FormRow>
            {current.isOn ? (
              <>
                <FormRow title="最大并发连接数">
                  <TextInput
                    type="text"
                    maxLength={6}
                    value={String(current.maxConns)}
                    onChange={(event) => update('maxConns', Math.max(0, Number(event.target.value) || 0))}
                  />
                  <Comment>当前网站最大并发连接数,超出此限制则响应用户 429 代码.为0表示不限制.</Comment>
                </FormRow>
                <FormRow title="单IP最大并发连接数">
                  <TextInput
                    type="text"
                    maxLength={6}
                    value={String(current.maxConnsPerIP)}
                    onChange={(event) => update('maxConnsPerIP', Math.max(0, Number(event.target.value) || 0))}
                  />
                  <Comment>
                    单IP最大连接数,超出此限制则响应用户 429 代码.为0表示不限制.
                    {current.maxConnsPerIP > 0 && current.maxConnsPerIP <= 3 ? (
                      <span className="red">当前设置的并发连接数过低,可能会影响正常用户访问,建议不小于3.</span>
                    ) : null}
                  </Comment>
                </FormRow>
                <FormRow title="单连接带宽限制">
                  <SizeCapacityEditor
                    value={current.outBandwidthPerConn}
                    onChange={(value) => update('outBandwidthPerConn', value)}
                    units={['byte', 'kb', 'mb']}
                  />
                  <Comment>客户端单个请求每秒可以读取的下行流量.</Comment>
                </FormRow>
                <FormRow title="单请求最大尺寸">
                  <SizeCapacityEditor
                    value={current.maxBodySize}
                    onChange={(value) => update('maxBodySize', value)}
                    units={['byte', 'kb', 'mb', 'gb']}
                  />
                  <Comment>单个请求能发送的最大内容尺寸.</Comment>
                </FormRow>
              </>
            ) : null}
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
