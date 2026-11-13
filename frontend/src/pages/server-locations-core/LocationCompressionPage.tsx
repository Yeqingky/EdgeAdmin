import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { MoreOptionsRow, PriorRow, SizeCapacityField, UrlPatternsField, ValueList } from './fields'
import { RequestCondsEditor } from './conds'
import { LocationShell } from './LocationShell'
import type { CompressionConfig, LocationPageBase, RequestCondsConfig, SizeCapacity, URLPattern } from './types'

interface CompressionData extends LocationPageBase {
  compressionConfig?: CompressionConfig | null
}

interface CompressionTypeState {
  code: string
  name: string
  isOn: boolean
}

const allCompressionTypes: { code: string; name: string }[] = [
  { code: 'gzip', name: 'Gzip' },
  { code: 'deflate', name: 'Deflate' },
  { code: 'brotli', name: 'Brotli' },
  { code: 'zstd', name: 'ZSTD' },
]

function CompressionForm({ data }: { data: CompressionData }) {
  const toast = useToast()
  const config = data.compressionConfig
  const [isPrior, setIsPrior] = useState(config?.isPrior ?? false)
  const [isOn, setIsOn] = useState(config?.isOn ?? false)
  const [useDefaultTypes, setUseDefaultTypes] = useState(config?.useDefaultTypes ?? true)
  const [typeStates, setTypeStates] = useState<CompressionTypeState[]>(() => {
    const configured = config?.types || []
    const ordered = configured
      .map((code) => allCompressionTypes.find((item) => item.code === code))
      .filter((item): item is { code: string; name: string } => item != null)
      .map((item) => ({ ...item, isOn: true }))
    const rest = allCompressionTypes
      .filter((item) => !configured.includes(item.code))
      .map((item) => ({ ...item, isOn: false }))
    return [...ordered, ...rest]
  })
  const [decompressData, setDecompressData] = useState(config?.decompressData ?? false)
  const [extensions, setExtensions] = useState<string[]>(config?.extensions || [])
  const [exceptExtensions, setExceptExtensions] = useState<string[]>(config?.exceptExtensions || [])
  const [mimeTypes, setMimeTypes] = useState<string[]>(config?.mimeTypes || [])
  const [minLength, setMinLength] = useState<SizeCapacity | null>(config?.minLength || { count: 1, unit: 'kb' })
  const [maxLength, setMaxLength] = useState<SizeCapacity | null>(config?.maxLength || { count: 32, unit: 'mb' })
  const [enablePartialContent, setEnablePartialContent] = useState(config?.enablePartialContent ?? false)
  const [onlyURLPatterns, setOnlyURLPatterns] = useState<URLPattern[]>(config?.onlyURLPatterns || [])
  const [exceptURLPatterns, setExceptURLPatterns] = useState<URLPattern[]>(config?.exceptURLPatterns || [])
  const [conds, setConds] = useState<RequestCondsConfig | null>(config?.conds || null)
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const configIsOn = isPrior && isOn

  function move(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= typeStates.length) {
      return
    }
    const next = typeStates.slice()
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setTypeStates(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const payload: CompressionConfig = {
        isPrior,
        isOn,
        useDefaultTypes,
        types: typeStates.filter((item) => item.isOn).map((item) => item.code),
        level: config?.level ?? 0,
        decompressData,
        gzipRef: config?.gzipRef ?? null,
        deflateRef: config?.deflateRef ?? null,
        brotliRef: config?.brotliRef ?? null,
        minLength,
        maxLength,
        mimeTypes,
        extensions,
        exceptExtensions,
        conds: conds && conds.groups.length > 0 ? conds : null,
        enablePartialContent,
        onlyURLPatterns,
        exceptURLPatterns,
      }
      await apiPost('/servers/server/settings/locations/compression', {
        csrfToken: await getCsrfToken(),
        webId: data.webId,
        compressionJSON: JSON.stringify(payload),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function normalizeExtension(value: string) {
    return value.length > 0 && !value.startsWith('.') ? `.${value}` : value
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <PriorRow isPrior={isPrior} onChange={setIsPrior} />
        {isPrior ? (
          <FormRow title="启用内容压缩">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        ) : null}
      </FormTable>

      {configIsOn ? (
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td>支持的扩展名</td>
              <td>
                <ValueList values={extensions} onChange={setExtensions} placeholder="比如 .html" normalize={normalizeExtension} />
                <p className="comment">含有这些扩展名的URL将会被压缩,不区分大小写.</p>
              </td>
            </tr>
            <tr>
              <td>例外扩展名</td>
              <td>
                <ValueList values={exceptExtensions} onChange={setExceptExtensions} placeholder="比如 .html" normalize={normalizeExtension} />
                <p className="comment">含有这些扩展名的URL将<strong>不会</strong>被压缩,不区分大小写.</p>
              </td>
            </tr>
            <tr>
              <td>支持的MimeType</td>
              <td>
                <ValueList values={mimeTypes} onChange={setMimeTypes} placeholder="比如 text/*" />
                <p className="comment">响应的Content-Type里包含这些MimeType的内容将会被压缩.</p>
              </td>
            </tr>
          </tbody>
          <MoreOptionsRow visible={moreOptionsVisible} onToggle={() => setMoreOptionsVisible((visible) => !visible)} />
          {moreOptionsVisible ? (
            <tbody>
              <tr>
                <td>压缩算法</td>
                <td>
                  <Checkbox
                    checked={useDefaultTypes}
                    onChange={setUseDefaultTypes}
                  />
                  <span className="grey small">
                    {useDefaultTypes ? '使用默认顺序(brotli,gzip,zstd,deflate)' : '使用默认顺序'}
                  </span>
                  {!useDefaultTypes ? (
                    <div>
                      <div className="ui divider" />
                      {typeStates.map((type, index) => (
                        <div key={type.code} className="ui checkbox" style={{ marginRight: '2em' }}>
                          <input
                            id={`compression-type-${type.code}`}
                            type="checkbox"
                            checked={type.isOn}
                            onChange={(event) => {
                              const next = typeStates.slice()
                              next[index] = { ...type, isOn: event.target.checked }
                              setTypeStates(next)
                            }}
                          />
                          <label htmlFor={`compression-type-${type.code}`}>{type.name}</label>
                          &nbsp;
                          <a
                            href=""
                            title="上移"
                            onClick={(event) => {
                              event.preventDefault()
                              move(index, -1)
                            }}
                          >
                            <ArrowUp size={11} />
                          </a>
                          <a
                            href=""
                            title="下移"
                            onClick={(event) => {
                              event.preventDefault()
                              move(index, 1)
                            }}
                          >
                            <ArrowDown size={11} />
                          </a>
                        </div>
                      ))}
                      <p className="comment">选择支持的压缩算法和优先顺序,使用箭头按钮排序.</p>
                    </div>
                  ) : null}
                </td>
              </tr>
              <tr>
                <td>支持已压缩内容</td>
                <td>
                  <Checkbox checked={decompressData} onChange={setDecompressData} />
                  <p className="comment">支持对已压缩内容尝试重新使用新的算法压缩;不选中表示保留当前的压缩格式.</p>
                </td>
              </tr>
              <tr>
                <td>内容最小长度</td>
                <td>
                  <SizeCapacityField value={minLength} unit="kb" onChange={setMinLength} />
                  <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                </td>
              </tr>
              <tr>
                <td>内容最大长度</td>
                <td>
                  <SizeCapacityField value={maxLength} unit="mb" onChange={setMaxLength} />
                  <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                </td>
              </tr>
              <tr>
                <td>支持Partial<br />Content</td>
                <td>
                  <Checkbox checked={enablePartialContent} onChange={setEnablePartialContent} />
                  <p className="comment">支持对分片内容(PartialContent)的压缩;除非客户端有特殊要求,一般不需要启用.</p>
                </td>
              </tr>
              <tr>
                <td>例外URL</td>
                <td>
                  <UrlPatternsField patterns={exceptURLPatterns} onChange={setExceptURLPatterns} />
                  <p className="comment">如果填写了例外URL,表示这些URL跳过不做处理.</p>
                </td>
              </tr>
              <tr>
                <td>限制URL</td>
                <td>
                  <UrlPatternsField patterns={onlyURLPatterns} onChange={setOnlyURLPatterns} />
                  <p className="comment">如果填写了限制URL,表示只对这些URL进行压缩处理;如果不填则表示支持所有的URL.</p>
                </td>
              </tr>
              <tr>
                <td>匹配条件</td>
                <td>
                  <RequestCondsEditor conds={conds} onChange={setConds} />
                </td>
              </tr>
            </tbody>
          ) : null}
        </table>
      ) : null}

      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function LocationCompressionPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-compression', serverId, locationId],
    queryFn: () =>
      apiGet<CompressionData>('/servers/server/settings/locations/compression', {
        serverId,
        locationId,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <LocationShell
      serverId={serverId}
      locationId={locationId}
      pattern={data.locationConfig?.pattern}
      tinyLeftMenuItems={data.tinyLeftMenuItems}
      leftMenuItemIsDisabled={data.leftMenuItemIsDisabled}
    >
      <CompressionForm data={data} />
    </LocationShell>
  )
}
