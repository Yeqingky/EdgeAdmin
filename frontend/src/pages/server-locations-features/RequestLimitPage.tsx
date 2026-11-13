import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultSizeCapacity, MissingLocation, useLocationData } from './helpers'
import { PriorCheckbox, SizeCapacityBox } from './editors'
import type { LocationBaseData, SizeCapacity } from './types'

interface RequestLimitConfig {
  isPrior: boolean
  isOn: boolean
  maxConns: number
  maxConnsPerIP: number
  outBandwidthPerConn: SizeCapacity
  maxBodySize: SizeCapacity
}

interface RequestLimitData extends LocationBaseData {
  webId: number
  requestLimitConfig: RequestLimitConfig | null
}

function defaultConfig(config: RequestLimitConfig | null): RequestLimitConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    maxConns: config?.maxConns ?? 0,
    maxConnsPerIP: config?.maxConnsPerIP ?? 0,
    outBandwidthPerConn: defaultSizeCapacity(config?.outBandwidthPerConn, -1, 'kb'),
    maxBodySize: defaultSizeCapacity(config?.maxBodySize, -1, 'kb'),
  }
}

export function RequestLimitPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<RequestLimitData>('/servers/server/settings/locations/requestLimit', 'location-request-limit')
  const [config, setConfig] = useState<RequestLimitConfig>(defaultConfig(null))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(defaultConfig(query.data.requestLimitConfig))
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

  function update(patch: Partial<RequestLimitConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/requestLimit', {
        webId: query.data.webId,
        requestLimitJSON: JSON.stringify(config),
        csrfToken: await getCsrfToken(),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-request-limit', serverId, locationId] })
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
          <PriorCheckbox checked={config.isPrior} onChange={(isPrior) => update({ isPrior })} />
          {config.isPrior ? (
            <tbody>
              <FormRow title="启用请求限制">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="最大并发连接数">
                <input
                  type="text"
                  maxLength={6}
                  value={config.maxConns}
                  onChange={(event) => update({ maxConns: Math.max(0, Number(event.target.value) || 0) })}
                />
                <p className="comment">
                  当前网站最大并发连接数,超出此限制则响应用户<code>429</code>代码.为0表示不限制.
                </p>
              </FormRow>
              <FormRow title="单IP最大并发连接数">
                <input
                  type="text"
                  maxLength={6}
                  value={config.maxConnsPerIP}
                  onChange={(event) => update({ maxConnsPerIP: Math.max(0, Number(event.target.value) || 0) })}
                />
                <p className="comment">
                  单IP最大连接数,统计单个IP总连接数时不区分网站,超出此限制则响应用户<code>429</code>代码.为0表示不限制.
                  {config.maxConnsPerIP > 0 && config.maxConnsPerIP <= 3 ? (
                    <span className="red">当前设置的并发连接数过低,可能会影响正常用户访问,建议不小于3.</span>
                  ) : null}
                </p>
              </FormRow>
              <FormRow title="单连接带宽限制">
                <SizeCapacityBox
                  value={config.outBandwidthPerConn}
                  units={['byte', 'kb', 'mb']}
                  onChange={(outBandwidthPerConn) => update({ outBandwidthPerConn })}
                />
                <p className="comment">客户端单个请求每秒可以读取的下行流量.</p>
              </FormRow>
              <FormRow title="单请求最大尺寸">
                <SizeCapacityBox
                  value={config.maxBodySize}
                  units={['byte', 'kb', 'mb', 'gb']}
                  onChange={(maxBodySize) => update({ maxBodySize })}
                />
                <p className="comment">单个请求能发送的最大内容尺寸.</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
