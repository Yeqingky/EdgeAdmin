import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultUrlPatterns, MissingLocation, useLocationData } from './helpers'
import { DomainsBox, MoreOptionsIndicator, PriorCheckbox, UrlsPatternsBox } from './editors'
import type { LocationBaseData, UrlPattern } from './types'

interface ReferersConfig {
  isPrior: boolean
  isOn: boolean
  allowEmpty: boolean
  allowSameDomain: boolean
  allowDomains: string[]
  denyDomains: string[]
  checkOrigin: boolean
  onlyURLPatterns: UrlPattern[]
  exceptURLPatterns: UrlPattern[]
}

interface ReferersData extends LocationBaseData {
  webId: number
  referersConfig: ReferersConfig | null
}

function normalizeConfig(config: ReferersConfig | null): ReferersConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    allowEmpty: config?.allowEmpty ?? true,
    allowSameDomain: config?.allowSameDomain ?? true,
    allowDomains: config?.allowDomains ? [...config.allowDomains] : [],
    denyDomains: config?.denyDomains ? [...config.denyDomains] : [],
    checkOrigin: config?.checkOrigin ?? true,
    onlyURLPatterns: defaultUrlPatterns(config?.onlyURLPatterns),
    exceptURLPatterns: defaultUrlPatterns(config?.exceptURLPatterns),
  }
}

export function ReferersPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<ReferersData>('/servers/server/settings/locations/referers', 'location-referers')
  const [config, setConfig] = useState<ReferersConfig>(normalizeConfig(null))
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(normalizeConfig(query.data.referersConfig))
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

  function update(patch: Partial<ReferersConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/referers', {
        webId: query.data.webId,
        referersJSON: JSON.stringify(config),
        csrfToken: await getCsrfToken(),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-referers', serverId, locationId] })
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
              <FormRow title="启用防盗链">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
                <p className="comment">选中后表示开启防盗链.</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="允许直接访问网站">
                <Checkbox checked={config.allowEmpty} onChange={(allowEmpty) => update({ allowEmpty })} />
                <p className="comment">允许用户直接访问网站,用户第一次访问网站时来源域名通常为空.</p>
              </FormRow>
              <FormRow title="来源域名允许一致">
                <Checkbox checked={config.allowSameDomain} onChange={(allowSameDomain) => update({ allowSameDomain })} />
                <p className="comment">允许来源域名和当前访问的域名一致,相当于在站内访问.</p>
              </FormRow>
              <FormRow title="允许的来源域名">
                <DomainsBox domains={config.allowDomains} onChange={(allowDomains) => update({ allowDomains })} />
                <p className="comment">
                  允许的其他来源域名列表,比如<code>example.com</code>,<code>*.example.com</code>.单个星号<code>*</code>表示允许所有域名.
                </p>
              </FormRow>
              <FormRow title="禁止的来源域名">
                <DomainsBox domains={config.denyDomains} onChange={(denyDomains) => update({ denyDomains })} />
                <p className="comment">
                  禁止的来源域名列表,比如<code>example.org</code>,<code>*.example.org</code>;除了这些禁止的来源域名外,其他域名都会被允许,
                  除非限定了允许的来源域名.
                </p>
              </FormRow>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {isOn && moreOptionsVisible ? (
            <tbody>
              <FormRow title="同时检查Origin">
                <Checkbox checked={config.checkOrigin} onChange={(checkOrigin) => update({ checkOrigin })} />
                <p className="comment">如果请求没有指定Referer Header,则尝试检查Origin Header,多用于跨站调用.</p>
              </FormRow>
              <FormRow title="例外URL">
                <UrlsPatternsBox patterns={config.exceptURLPatterns} onChange={(exceptURLPatterns) => update({ exceptURLPatterns })} />
                <p className="comment">如果填写了例外URL,表示这些URL跳过不做处理.</p>
              </FormRow>
              <FormRow title="限制URL">
                <UrlsPatternsBox patterns={config.onlyURLPatterns} onChange={(onlyURLPatterns) => update({ onlyURLPatterns })} />
                <p className="comment">如果填写了限制URL,表示只对这些URL进行处理;如果不填则表示支持所有的URL.</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
