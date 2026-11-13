import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { PriorCheckbox } from './editors'
import type { LocationBaseData } from './types'

interface RemoteAddrConfig {
  isPrior: boolean
  isOn: boolean
  value: string
  type: string
  requestHeaderName: string
}

interface RemoteAddrData extends LocationBaseData {
  webId: number
  remoteAddrConfig: RemoteAddrConfig | null
}

const REMOTE_ADDR_OPTIONS: Array<{ type: string; name: string; description: string }> = [
  {
    type: 'default',
    name: '直接获取',
    description: '用户直接访问边缘节点,即 "用户 --> 边缘节点" 模式,这时候系统会试图从直接的连接中读取到客户端IP地址.',
  },
  {
    type: 'proxy',
    name: '从上级代理中获取',
    description:
      '用户和边缘节点之间有别的代理服务转发,即 "用户 --> [第三方代理服务] --> 边缘节点",这时候只能从上级代理中获取传递的IP地址;上级代理传递的请求报头中必须包含 X-Forwarded-For 或 X-Real-IP 信息.',
  },
  { type: 'requestHeader', name: '从请求报头中读取', description: '从自定义请求报头读取客户端IP.' },
  { type: 'variable', name: '自定义变量', description: '通过自定义变量来获取客户端真实的IP地址.' },
]

const DEFAULT_VALUE = '${rawRemoteAddr}'

function normalizeConfig(config: RemoteAddrConfig | null): RemoteAddrConfig {
  if (!config) {
    return { isPrior: false, isOn: false, value: DEFAULT_VALUE, type: 'default', requestHeaderName: '' }
  }
  let type = config.type || ''
  const value = config.value || DEFAULT_VALUE
  if (type.length === 0) {
    if (value === '${rawRemoteAddr}' || value === '${remoteAddrValue}') {
      type = 'default'
    } else if (value === '${remoteAddr}') {
      type = 'proxy'
    } else {
      type = 'variable'
    }
  }
  return {
    isPrior: config.isPrior ?? false,
    isOn: config.isOn ?? false,
    value,
    type,
    requestHeaderName: config.requestHeaderName || '',
  }
}

export function RemoteAddrPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<RemoteAddrData>('/servers/server/settings/locations/remoteAddr', 'location-remote-addr')
  const [config, setConfig] = useState<RemoteAddrConfig>(normalizeConfig(null))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(normalizeConfig(query.data.remoteAddrConfig))
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

  const isOn = config.isPrior && config.isOn
  const option = REMOTE_ADDR_OPTIONS.find((item) => item.type === config.type)

  function changeType(type: string) {
    if (type === 'default') {
      setConfig((current) => ({ ...current, type, value: DEFAULT_VALUE }))
    } else if (type === 'proxy') {
      setConfig((current) => ({ ...current, type, value: '${remoteAddr}' }))
    } else if (type === 'requestHeader') {
      setConfig((current) => ({ ...current, type, value: current.requestHeaderName ? `\${header.${current.requestHeaderName}}` : '' }))
    } else {
      setConfig((current) => ({ ...current, type, value: DEFAULT_VALUE }))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      const payload = { ...config }
      if (payload.type === 'requestHeader' && payload.requestHeaderName.trim().length > 0) {
        payload.value = `\${header.${payload.requestHeaderName.trim()}}`
      }
      await apiPost('/servers/server/settings/locations/remoteAddr', {
        webId: query.data.webId,
        remoteAddrJSON: JSON.stringify(payload),
        csrfToken: await getCsrfToken(),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-remote-addr', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocationShell data={query.data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <PriorCheckbox checked={config.isPrior} onChange={(isPrior) => setConfig({ ...config, isPrior })} />
          {config.isPrior ? (
            <tbody>
              <FormRow title="启用访客IP设置">
                <Checkbox checked={config.isOn} onChange={(isOn) => setConfig({ ...config, isOn })} />
                <p className="comment">选中后,表示使用自定义的请求变量获取客户端IP.</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="获取IP方式 *">
                <select className="ui dropdown auto-width" value={config.type} onChange={(event) => changeType(event.target.value)}>
                  {REMOTE_ADDR_OPTIONS.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {option && option.description.length > 0 ? <p className="comment">{option.description}</p> : null}
              </FormRow>
              {config.type === 'requestHeader' ? (
                <FormRow title="请求报头 *">
                  <input
                    type="text"
                    maxLength={100}
                    value={config.requestHeaderName}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        requestHeaderName: event.target.value,
                        value: `\${header.${event.target.value.trim()}}`,
                      })
                    }
                  />
                  <p className="comment">
                    请输入包含有客户端IP的请求报头,需要注意大小写,常见的有<code>X-Forwarded-For</code>,<code>X-Real-IP</code>,
                    <code>X-Client-IP</code>等.
                  </p>
                </FormRow>
              ) : null}
              {config.type === 'variable' ? (
                <FormRow title="读取IP变量值 *">
                  <input type="text" maxLength={100} value={config.value} onChange={(event) => setConfig({ ...config, value: event.target.value })} />
                  <p className="comment">
                    通过此变量获取用户的IP地址.比如通过报头传递IP的情形,可以使用<code>{'${header.你的自定义报头}'}</code>.
                  </p>
                </FormRow>
              ) : null}
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
