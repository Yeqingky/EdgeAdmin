import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { defaultConds, defaultSizeCapacity, MissingLocation, useLocationData } from './helpers'
import { CondsBox, MoreOptionsIndicator, PriorCheckbox, SizeCapacityBox, ValuesBox } from './editors'
import type { LocationBaseData, RequestCondsConfig, SizeCapacity } from './types'

interface WebpConfig {
  isPrior: boolean
  isOn: boolean
  minLength: SizeCapacity
  maxLength: SizeCapacity
  mimeTypes: string[]
  extensions: string[]
  conds: RequestCondsConfig | null
}

interface WebpData extends LocationBaseData {
  webId: number
  webpConfig: WebpConfig | null
}

function normalizeConfig(config: WebpConfig | null): WebpConfig {
  return {
    isPrior: config?.isPrior ?? false,
    isOn: config?.isOn ?? false,
    minLength: defaultSizeCapacity(config?.minLength, 0, 'kb'),
    maxLength: defaultSizeCapacity(config?.maxLength, 0, 'kb'),
    mimeTypes: config?.mimeTypes ? [...config.mimeTypes] : ['image/png', 'image/jpeg', 'image/bmp', 'image/x-ico'],
    extensions: config?.extensions ? [...config.extensions] : ['.png', '.jpeg', '.jpg', '.bmp', '.ico'],
    conds: config?.conds ?? null,
  }
}

export function WebpPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<WebpData>('/servers/server/settings/locations/webp', 'location-webp')
  const [config, setConfig] = useState<WebpConfig>(normalizeConfig(null))
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(normalizeConfig(query.data.webpConfig))
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

  function update(patch: Partial<WebpConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/webp', {
        webId: query.data.webId,
        webpJSON: JSON.stringify(config),
        csrfToken: await getCsrfToken(),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-webp', serverId, locationId] })
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
              <FormRow title="启用WebP压缩">
                <Checkbox checked={config.isOn} onChange={(isOn) => update({ isOn })} />
                <p className="comment">选中后表示开启自动WebP压缩；图片的宽和高均不能超过16383像素。</p>
              </FormRow>
            </tbody>
          ) : null}
          {isOn ? (
            <tbody>
              <tr>
                <td colSpan={2}>
                  <MoreOptionsIndicator onClick={() => setMoreOptionsVisible(!moreOptionsVisible)} />
                </td>
              </tr>
            </tbody>
          ) : null}
          {isOn && moreOptionsVisible ? (
            <tbody>
              <FormRow title="支持的扩展名">
                <ValuesBox
                  values={config.extensions}
                  onChange={(values) =>
                    update({
                      extensions: values.map((value) => (value.length > 0 && value[0] !== '.' ? `.${value}` : value)),
                    })
                  }
                  placeholder="比如 .html"
                />
                <p className="comment">含有这些扩展名的URL将会被转成WebP，不区分大小写。</p>
              </FormRow>
              <FormRow title="支持的MimeType">
                <ValuesBox values={config.mimeTypes} onChange={(mimeTypes) => update({ mimeTypes })} placeholder="比如 text/*" />
                <p className="comment">响应的Content-Type里包含这些MimeType的内容将会被转成WebP。</p>
              </FormRow>
              <FormRow title="内容最小长度">
                <SizeCapacityBox value={config.minLength} onChange={(minLength) => update({ minLength })} />
                <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
              </FormRow>
              <FormRow title="内容最大长度">
                <SizeCapacityBox value={config.maxLength} onChange={(maxLength) => update({ maxLength })} />
                <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
              </FormRow>
              <FormRow title="匹配条件">
                <CondsBox conds={defaultConds(config.conds)} onChange={(conds) => update({ conds })} />
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
