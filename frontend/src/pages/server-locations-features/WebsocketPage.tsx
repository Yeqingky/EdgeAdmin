import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultTimeDuration, MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, PriorCheckbox, ValuesBox } from './editors'
import type { LocationBaseData, TimeDuration } from './types'

interface WebsocketRef {
  isPrior: boolean
  isOn: boolean
  websocketId: number
}

interface WebsocketConfig {
  id: number
  isOn: boolean
  handshakeTimeout: TimeDuration
  allowAllOrigins: boolean
  allowedOrigins: string[]
  requestSameOrigin: boolean
  requestOrigin: string
}

interface WebsocketData extends LocationBaseData {
  webId: number
  websocketRef: WebsocketRef | null
  websocketConfig: WebsocketConfig | null
}

function normalizeRef(ref: WebsocketRef | null): WebsocketRef {
  return {
    isPrior: ref?.isPrior ?? false,
    isOn: ref?.isOn ?? false,
    websocketId: ref?.websocketId ?? 0,
  }
}

function normalizeConfig(config: WebsocketConfig | null): WebsocketConfig {
  return {
    id: config?.id ?? 0,
    isOn: config?.isOn ?? false,
    handshakeTimeout: defaultTimeDuration(config?.handshakeTimeout, 30),
    allowAllOrigins: config?.allowAllOrigins ?? true,
    allowedOrigins: config?.allowedOrigins ? [...config.allowedOrigins] : [],
    requestSameOrigin: config?.requestSameOrigin ?? true,
    requestOrigin: config?.requestOrigin ?? '',
  }
}

export function WebsocketPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<WebsocketData>('/servers/server/settings/locations/websocket', 'location-websocket')
  const [ref, setRef] = useState<WebsocketRef>(normalizeRef(null))
  const [config, setConfig] = useState<WebsocketConfig>(normalizeConfig(null))
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setRef(normalizeRef(query.data.websocketRef))
      setConfig(normalizeConfig(query.data.websocketConfig))
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

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/websocket', {
        webId: query.data.webId,
        websocketRefJSON: JSON.stringify(ref),
        websocketJSON: JSON.stringify(config),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-websocket', serverId, locationId] })
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
          <PriorCheckbox checked={ref.isPrior} onChange={(isPrior) => setRef({ ...ref, isPrior })} />
          {ref.isPrior ? (
            <tbody>
              <FormRow title="启用Websocket">
                <Checkbox checked={ref.isOn} onChange={(isOn) => setRef({ ...ref, isOn })} />
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="允许所有来源域(Origin)">
                <Checkbox checked={config.allowAllOrigins} onChange={(allowAllOrigins) => setConfig({ ...config, allowAllOrigins })} />
                <p className="comment">选中表示允许所有的来源域.</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn && !config.allowAllOrigins ? (
            <tbody>
              <FormRow title="允许的来源域列表(Origin)">
                <ValuesBox
                  values={config.allowedOrigins}
                  onChange={(allowedOrigins) => setConfig({ ...config, allowedOrigins })}
                  placeholder="比如 https://example.com"
                />
                <p className="comment">只允许在列表中的来源域名访问Websocket服务.</p>
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
              <FormRow title="传递请求来源域">
                <Checkbox checked={config.requestSameOrigin} onChange={(requestSameOrigin) => setConfig({ ...config, requestSameOrigin })} />
                <p className="comment">
                  选中后,表示把接收到的请求中的<code>Origin</code>字段传递到源站.
                </p>
              </FormRow>
              {!config.requestSameOrigin ? (
                <FormRow title="指定传递的来源域">
                  <input
                    type="text"
                    maxLength={200}
                    value={config.requestOrigin}
                    onChange={(event) => setConfig({ ...config, requestOrigin: event.target.value })}
                  />
                  <p className="comment">
                    指定向源站传递的<span className="ui label tiny">Origin</span>字段值.
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
