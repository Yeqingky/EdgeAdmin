import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultReverseProxyConfig, defaultReverseProxyRef, MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, PriorCheckbox } from './editors'
import { reverseProxyMenu } from './reverseProxyMenu'
import type { LocationBaseData, ReverseProxyConfig, ReverseProxyRef } from './types'

interface ReverseProxySettingData extends LocationBaseData {
  reverseProxyRef: ReverseProxyRef | null
  reverseProxyConfig: Partial<ReverseProxyConfig> | null
}

const FORWARD_HEADERS = ['X-Real-IP', 'X-Forwarded-For', 'X-Forwarded-By', 'X-Forwarded-Host', 'X-Forwarded-Proto']

export function ReverseProxySettingPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<ReverseProxySettingData>('/servers/server/settings/locations/reverseProxy/setting', 'location-reverse-proxy-setting')
  const [ref, setRef] = useState<ReverseProxyRef>(defaultReverseProxyRef(null))
  const [config, setConfig] = useState<ReverseProxyConfig>(defaultReverseProxyConfig(null))
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setRef(defaultReverseProxyRef(query.data.reverseProxyRef))
      setConfig(defaultReverseProxyConfig(query.data.reverseProxyConfig))
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

  const isOn = ref.isPrior && ref.isOn

  function update(patch: Partial<ReverseProxyConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function toggleHeader(name: string, checked: boolean) {
    const headers = checked ? [...config.addHeaders, name] : config.addHeaders.filter((header) => header !== name)
    update({ addHeaders: headers })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/reverseProxy/setting', {
        locationId,
        reverseProxyRefJSON: JSON.stringify(ref),
        reverseProxyJSON: JSON.stringify(config),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-reverse-proxy-setting', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocationShell data={query.data} menu={reverseProxyMenu(serverId, locationId, 'setting')}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <PriorCheckbox checked={ref.isPrior} onChange={(isPrior) => setRef({ ...ref, isPrior })} />
          {ref.isPrior ? (
            <tbody>
              <FormRow title="启用源站">
                <Checkbox checked={ref.isOn} onChange={(isOn) => setRef({ ...ref, isOn })} />
                <p className="comment">选中后，所有源站设置才会生效。</p>
              </FormRow>
              <FormRow title="回源主机名（Host）">
                <div>
                  <label style={{ marginRight: '1em' }}>
                    <input type="radio" checked={config.requestHostType === 0} onChange={() => update({ requestHostType: 0 })} /> 跟随CDN域名
                  </label>
                  <label style={{ marginRight: '1em' }}>
                    <input type="radio" checked={config.requestHostType === 1} onChange={() => update({ requestHostType: 1 })} /> 跟随源站
                  </label>
                  <label>
                    <input type="radio" checked={config.requestHostType === 2} onChange={() => update({ requestHostType: 2 })} /> 自定义
                  </label>
                </div>
                {config.requestHostType === 2 ? (
                  <div style={{ marginTop: '0.8em' }}>
                    <input type="text" placeholder="比如example.com" value={config.requestHost} onChange={(event) => update({ requestHost: event.target.value })} />
                  </div>
                ) : null}
                <p className="comment">
                  请求源站时的主机名（Host），用于修改源站接收到的域名
                  {config.requestHostType === 0 ? '，"跟随CDN域名"是指源站接收到的域名和当前CDN访问域名保持一致' : null}
                  {config.requestHostType === 1 ? '，"跟随源站"是指源站接收到的域名仍然是填写的源站地址中的信息，不随代理服务域名改变而改变' : null}
                  {config.requestHostType === 2 ? '，自定义Host内容中支持请求变量' : null}。
                </p>
              </FormRow>
              <FormRow title="回源主机名移除端口">
                <Checkbox checked={config.requestHostExcludingPort} onChange={(requestHostExcludingPort) => update({ requestHostExcludingPort })} />
                <p className="comment">选中后表示移除回源主机名中的端口部分。</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setAdvancedVisible(!advancedVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {isOn && advancedVisible ? (
            <tbody>
              <FormRow title="回源跟随">
                <Checkbox checked={config.followRedirects} onChange={(followRedirects) => update({ followRedirects })} />
                <p className="comment">选中后，自动读取源站跳转后的网页内容。</p>
              </FormRow>
              <FormRow title="自动添加报头">
                <div>
                  {FORWARD_HEADERS.map((name) => (
                    <div key={name} style={{ width: '14em', float: 'left', marginBottom: '1em' }}>
                      <Checkbox label={name} checked={config.addHeaders.includes(name)} onChange={(checked) => toggleHeader(name, checked)} />
                    </div>
                  ))}
                  <div style={{ clear: 'both' }} />
                </div>
                <p className="comment">选中后，会自动向源站请求添加这些报头，以便于源站获取客户端信息。</p>
              </FormRow>
              <FormRow title="请求URI（RequestURI）">
                <input
                  type="text"
                  placeholder="${requestURI}"
                  value={config.requestURI}
                  onChange={(event) => update({ requestURI: event.target.value })}
                />
                <p className="comment">
                  {'${requestURI}'}为完整的请求URI，可以使用类似于"{'${requestURI}'}?arg1=value1&arg2=value2"的形式添加你的参数。
                </p>
              </FormRow>
              <FormRow title="去除URL前缀（StripPrefix）">
                <input type="text" placeholder="/PREFIX" value={config.stripPrefix} onChange={(event) => update({ stripPrefix: event.target.value })} />
                <p className="comment">
                  可以把请求的路径部分前缀去除后再查找文件，比如把 <span className="ui label tiny">/web/app/index.html</span> 去除前缀{' '}
                  <span className="ui label tiny">/web</span> 后就变成 <span className="ui label tiny">/app/index.html</span>。
                </p>
              </FormRow>
              <FormRow title="自动刷新缓存区（AutoFlush）">
                <Checkbox checked={config.autoFlush} onChange={(autoFlush) => update({ autoFlush })} />
                <p className="comment">开启后将自动刷新缓冲区数据到客户端，在类似于SSE（server-sent events）等场景下很有用。</p>
              </FormRow>
              <FormRow title="自动重试50X">
                <Checkbox checked={config.retry50X} onChange={(retry50X) => update({ retry50X })} />
                <p className="comment">选中后，表示当源站返回状态码为50X（比如502、504等）时，自动重试其他源站。</p>
              </FormRow>
              <FormRow title="自动重试40X">
                <Checkbox checked={config.retry40X} onChange={(retry40X) => update({ retry40X })} />
                <p className="comment">选中后，表示当源站返回状态码为40X（403或404）时，自动重试其他源站。</p>
              </FormRow>
              <FormRow title="PROXY Protocol">
                <Checkbox
                  checked={config.proxyProtocol.isOn}
                  onChange={(proxyProtocolIsOn) => update({ proxyProtocol: { ...config.proxyProtocol, isOn: proxyProtocolIsOn } })}
                />
                <p className="comment">选中后表示启用PROXY Protocol，每次连接源站时都会在头部写入客户端地址信息。</p>
              </FormRow>
              {config.proxyProtocol.isOn ? (
                <FormRow title="PROXY Protocol版本">
                  <select
                    className="ui dropdown auto-width"
                    value={config.proxyProtocol.version}
                    onChange={(event) => update({ proxyProtocol: { ...config.proxyProtocol, version: Number(event.target.value) } })}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                  <p className="comment">
                    {config.proxyProtocol.version === 1
                      ? '发送类似于PROXY TCP4 192.168.1.1 192.168.1.10 32567 443的头部信息。'
                      : '发送二进制格式的头部信息。'}
                  </p>
                </FormRow>
              ) : null}
              <FormRow title="源站连接失败超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <input
                      type="text"
                      size={6}
                      value={config.connTimeout.count}
                      onChange={(event) => update({ connTimeout: { ...config.connTimeout, count: Math.max(0, Number(event.target.value) || 0) } })}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <p className="comment">连接源站失败的最大超时时间，0表示不限制。</p>
              </FormRow>
              <FormRow title="源站读取超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <input
                      type="text"
                      size={6}
                      value={config.readTimeout.count}
                      onChange={(event) => update({ readTimeout: { ...config.readTimeout, count: Math.max(0, Number(event.target.value) || 0) } })}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <p className="comment">读取内容时的最大超时时间，0表示不限制。</p>
              </FormRow>
              <FormRow title="源站最大并发连接数">
                <input
                  type="text"
                  size={6}
                  maxLength={10}
                  value={config.maxConns}
                  onChange={(event) => update({ maxConns: Math.max(0, Number(event.target.value) || 0) })}
                />
                <p className="comment">源站可以接受到的最大并发连接数，0表示使用系统默认。</p>
              </FormRow>
              <FormRow title="源站最大空闲连接数">
                <input
                  type="text"
                  size={6}
                  maxLength={10}
                  value={config.maxIdleConns}
                  onChange={(event) => update({ maxIdleConns: Math.max(0, Number(event.target.value) || 0) })}
                />
                <p className="comment">当没有请求时，源站保持等待的最大空闲连接数量，0表示使用系统默认。</p>
              </FormRow>
              <FormRow title="源站最大空闲超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <input
                      type="text"
                      size={6}
                      value={config.idleTimeout.count}
                      onChange={(event) => update({ idleTimeout: { ...config.idleTimeout, count: Math.max(0, Number(event.target.value) || 0) } })}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <p className="comment">源站保持等待的空闲超时时间，0表示使用默认时间。</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
