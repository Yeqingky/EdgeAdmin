import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import {
  MoreOptionsIndicator,
  NetworkAddressesEditor,
  ServerSettingsShell,
  StringListEditor,
  useServerId,
  type NetworkAddress,
  type ServerSettingsBase,
} from './shared'

interface RedirectToHttpsConfig {
  isPrior?: boolean
  isOn: boolean
  host: string
  port: number
  status: number
  onlyDomains: string[] | null
  exceptDomains: string[] | null
}

interface HttpData extends ServerSettingsBase {
  conflictingPorts: number[]
  serverType: string
  httpConfig: { isOn: boolean; addresses: NetworkAddress[] | null } | null
  webId: number
  redirectToHTTPSConfig: RedirectToHttpsConfig | null
}

const STATUS_OPTIONS = [
  { code: 301, text: 'Moved Permanently' },
  { code: 308, text: 'Permanent Redirect' },
  { code: 302, text: 'Found' },
  { code: 303, text: 'See Other' },
  { code: 307, text: 'Temporary Redirect' },
]

export function ServerHttpSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-http', serverId],
    queryFn: () => apiGet<HttpData>('/servers/server/settings/http', { serverId }),
    enabled: serverId > 0,
  })
  const [isOn, setIsOn] = useState(false)
  const [addresses, setAddresses] = useState<NetworkAddress[]>([])
  const [redirect, setRedirect] = useState<RedirectToHttpsConfig>({
    isOn: false,
    host: '',
    port: 0,
    status: 0,
    onlyDomains: [],
    exceptDomains: [],
  })
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const data = query.data
    if (!data) {
      return
    }
    setIsOn(data.httpConfig?.isOn ?? false)
    setAddresses(data.httpConfig?.addresses || [])
    setRedirect({
      isOn: false,
      host: '',
      port: 0,
      status: 0,
      onlyDomains: [],
      exceptDomains: [],
      ...(data.redirectToHTTPSConfig || {}),
      onlyDomains: data.redirectToHTTPSConfig?.onlyDomains || [],
      exceptDomains: data.redirectToHTTPSConfig?.exceptDomains || [],
    })
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

  function updateRedirect<K extends keyof RedirectToHttpsConfig>(key: K, value: RedirectToHttpsConfig[K]) {
    setRedirect((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/http', {
        serverId,
        isOn: isOn ? 1 : '',
        addresses: JSON.stringify(addresses.map((address) => ({ ...address, protocol: address.protocol || 'http' }))),
        webId: data.webId,
        redirectToHTTPSJSON: JSON.stringify(redirect),
      })
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
          <FormRow title="启用HTTP">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
          {isOn ? (
            <>
              <FormRow title="绑定端口 *">
                <div>
                  {isOn && addresses.length === 0 ? <span className="red">还没有添加端口绑定，会导致HTTP服务无法访问。</span> : null}
                  <NetworkAddressesEditor addresses={addresses} onChange={setAddresses} protocol="http" />
                  {data.conflictingPorts.length > 0 ? (
                    <p className="comment">
                      <span className="red">
                        配置错误：
                        {data.conflictingPorts.map((port, index) => (
                          <span key={port}>
                            {port}
                            {index !== data.conflictingPorts.length - 1 ? '、' : ''}
                          </span>
                        ))}
                        {data.conflictingPorts.length > 1 ? '等' : ''}
                        端口同HTTPS设置的端口冲突，请删除HTTP或HTTPS中的相关端口。
                      </span>
                    </p>
                  ) : null}
                </div>
              </FormRow>
              <FormRow title="自动跳转到HTTPS">
                <div>
                  <Checkbox checked={redirect.isOn} onChange={(checked) => updateRedirect('isOn', checked)} />
                  <p className="comment">
                    开启后，所有HTTP的请求都会自动跳转到对应的HTTPS URL上，{' '}
                    <MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />
                  </p>
                  {moreOptions ? (
                    <table className="ui table">
                      <tbody>
                        <tr>
                          <td className="title">跳转状态码</td>
                          <td>
                            <select className="ui dropdown" value={redirect.status} onChange={(event) => updateRedirect('status', Number(event.target.value))}>
                              <option value={0}>[使用默认]</option>
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.code} {option.text}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td>跳转后域名或IP地址</td>
                          <td>
                            <input type="text" value={redirect.host} onChange={(event) => updateRedirect('host', event.target.value)} />
                            <p className="comment">默认和用户正在访问的域名或IP地址一致，不填写就表示使用当前的域名。</p>
                          </td>
                        </tr>
                        <tr>
                          <td>端口</td>
                          <td>
                            <input
                              type="text"
                              maxLength={5}
                              style={{ width: '6em' }}
                              value={redirect.port > 0 ? String(redirect.port) : ''}
                              onChange={(event) => updateRedirect('port', Number(event.target.value) || 0)}
                            />
                            <p className="comment">默认端口为443。</p>
                          </td>
                        </tr>
                        <tr>
                          <td>允许的域名</td>
                          <td>
                            <StringListEditor values={redirect.onlyDomains || []} onChange={(values) => updateRedirect('onlyDomains', values)} placeholder="比如 example.com" />
                            <p className="comment">如果填写了允许的域名，那么只有这些域名可以自动跳转。</p>
                          </td>
                        </tr>
                        <tr>
                          <td>排除的域名</td>
                          <td>
                            <StringListEditor values={redirect.exceptDomains || []} onChange={(values) => updateRedirect('exceptDomains', values)} placeholder="比如 example.com" />
                            <p className="comment">如果填写了排除的域名，那么这些域名将不跳转。</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : null}
                </div>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
