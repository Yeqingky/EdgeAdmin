import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultUrlPatterns, MissingLocation, useLocationData } from './helpers'
import { MoreOptionsIndicator, PriorCheckbox, UrlsPatternsBox, ValuesBox } from './editors'
import type { LocationBaseData, UrlPattern } from './types'

interface RootConfig {
  isPrior: boolean
  isOn: boolean
  dir: string
  indexes: string[]
  stripPrefix: string
  decodePath: boolean
  isBreak: boolean
  exceptHiddenFiles: boolean
  onlyURLPatterns: UrlPattern[]
  exceptURLPatterns: UrlPattern[]
}

interface RootData extends LocationBaseData {
  webId: number
  rootConfig: RootConfig | null
}

function normalizeConfig(config: RootConfig | null): RootConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    dir: config?.dir ?? '',
    indexes: config?.indexes ? [...config.indexes] : [],
    stripPrefix: config?.stripPrefix ?? '',
    decodePath: config?.decodePath ?? false,
    isBreak: config?.isBreak ?? false,
    exceptHiddenFiles: config?.exceptHiddenFiles ?? true,
    onlyURLPatterns: defaultUrlPatterns(config?.onlyURLPatterns),
    exceptURLPatterns: defaultUrlPatterns(config?.exceptURLPatterns),
  }
}

export function WebRootPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<RootData>('/servers/server/settings/locations/web', 'location-web-root')
  const [config, setConfig] = useState<RootConfig>(normalizeConfig(null))
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(normalizeConfig(query.data.rootConfig))
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

  function update(patch: Partial<RootConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/web', {
        webId: query.data.webId,
        rootJSON: JSON.stringify(config),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-web-root', serverId, locationId] })
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
              <FormRow title="启用静态资源分发">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <FormRow title="静态资源根目录">
                <input type="text" value={config.dir} placeholder="类似于 /home/www" onChange={(event) => update({ dir: event.target.value })} />
                <p className="comment">可以访问此根目录下的静态资源。</p>
              </FormRow>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setAdvancedVisible(!advancedVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {isOn && advancedVisible ? (
            <tbody>
              <FormRow title="首页文件">
                <ValuesBox values={config.indexes} onChange={(indexes) => update({ indexes })} placeholder="比如 index.html" />
                <p className="comment">在URL中只有目录没有文件名时默认查找的首页文件。</p>
              </FormRow>
              <FormRow title="例外URL">
                <UrlsPatternsBox patterns={config.exceptURLPatterns} onChange={(exceptURLPatterns) => update({ exceptURLPatterns })} />
                <p className="comment">如果填写了例外URL，表示不支持通过这些URL访问。</p>
              </FormRow>
              <FormRow title="限制URL">
                <UrlsPatternsBox patterns={config.onlyURLPatterns} onChange={(onlyURLPatterns) => update({ onlyURLPatterns })} />
                <p className="comment">如果填写了限制URL，表示仅支持通过这些URL访问。</p>
              </FormRow>
              <FormRow title="排除隐藏文件">
                <Checkbox checked={config.exceptHiddenFiles} onChange={(exceptHiddenFiles) => update({ exceptHiddenFiles })} />
                <p className="comment">
                  排除以点（.）符号开头的隐藏目录或文件，比如<code>/.git/logs/HEAD</code>
                </p>
              </FormRow>
              <FormRow title="去除URL前缀">
                <input type="text" value={config.stripPrefix} placeholder="/PREFIX" onChange={(event) => update({ stripPrefix: event.target.value })} />
                <p className="comment">
                  可以把请求的路径部分前缀去除后再查找文件，比如把 <span className="ui label tiny">/web/app/index.html</span> 去除前缀{' '}
                  <span className="ui label tiny">/web</span> 后就变成 <span className="ui label tiny">/app/index.html</span>。
                </p>
              </FormRow>
              <FormRow title="路径解码">
                <Checkbox checked={config.decodePath} onChange={(decodePath) => update({ decodePath })} />
                <p className="comment">
                  是否对请求路径进行URL解码，比如把 <span className="ui label tiny">/Web+App+Browser.html</span> 解码成{' '}
                  <span className="ui label tiny">/Web App Browser.html</span> 再查找文件。
                </p>
              </FormRow>
              <FormRow title="终止请求">
                <Checkbox checked={config.isBreak} onChange={(isBreak) => update({ isBreak })} />
                <p className="comment">在找不到要访问的文件的情况下是否终止请求并返回404，如果选择终止请求，则不再尝试反向代理等设置。</p>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
