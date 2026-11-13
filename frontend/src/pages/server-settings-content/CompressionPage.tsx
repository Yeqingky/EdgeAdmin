import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import {
  CondsEditor,
  GroupConfigWarning,
  MoreOptionsIndicator,
  ServerSettingsShell,
  SizeCapacityEditor,
  StringListEditor,
  useServerId,
  type RequestCondsConfig,
  type ServerSettingsBase,
  type SizeCapacity,
} from './shared'

interface URLPattern {
  type: string
  pattern: string
}

interface GzipConfig {
  id?: number
  isOn: boolean
  level: number
  minLength: SizeCapacity | null
  maxLength: SizeCapacity | null
  conds?: RequestCondsConfig | null
}

interface CompressionConfig {
  isPrior?: boolean
  isOn: boolean
  useDefaultTypes: boolean
  types: string[]
  level: number
  decompressData: boolean
  gzipRef?: { id: number; isOn: boolean } | null
  gzip?: GzipConfig | null
  deflateRef?: { id: number; isOn: boolean } | null
  brotliRef?: { id: number; isOn: boolean } | null
  minLength: SizeCapacity | null
  maxLength: SizeCapacity | null
  mimeTypes: string[]
  extensions: string[]
  exceptExtensions: string[]
  conds: RequestCondsConfig | null
  enablePartialContent: boolean
  onlyURLPatterns: URLPattern[]
  exceptURLPatterns: URLPattern[]
}

interface CompressionData extends ServerSettingsBase {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  compressionConfig: CompressionConfig | null
}

const ALL_TYPES = [
  { code: 'gzip', name: 'Gzip' },
  { code: 'deflate', name: 'Deflate' },
  { code: 'brotli', name: 'Brotli' },
  { code: 'zstd', name: 'ZSTD' },
]

const DEFAULT_CONFIG: CompressionConfig = {
  isOn: false,
  useDefaultTypes: true,
  types: ['brotli', 'gzip', 'zstd', 'deflate'],
  level: 0,
  decompressData: false,
  minLength: { count: 1, unit: 'kb' },
  maxLength: { count: 32, unit: 'mb' },
  mimeTypes: ['text/*', 'application/javascript', 'application/json', 'application/atom+xml', 'application/rss+xml', 'application/xhtml+xml', 'font/*', 'image/svg+xml'],
  extensions: ['.js', '.json', '.html', '.htm', '.xml', '.css', '.woff2', '.txt'],
  exceptExtensions: ['.apk', '.ipa'],
  conds: null,
  enablePartialContent: false,
  onlyURLPatterns: [],
  exceptURLPatterns: [],
}

export function ServerCompressionSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-compression', serverId],
    queryFn: () => apiGet<CompressionData>('/servers/server/settings/compression', { serverId }),
    enabled: serverId > 0,
  })
  const [config, setConfig] = useState<CompressionConfig>(DEFAULT_CONFIG)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.compressionConfig) {
      setConfig({
        ...DEFAULT_CONFIG,
        ...query.data.compressionConfig,
        types: query.data.compressionConfig.types || DEFAULT_CONFIG.types,
        mimeTypes: query.data.compressionConfig.mimeTypes || [],
        extensions: query.data.compressionConfig.extensions || [],
        exceptExtensions: query.data.compressionConfig.exceptExtensions || [],
      })
    }
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数.</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  function update<K extends keyof CompressionConfig>(key: K, value: CompressionConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  function toggleType(code: string, checked: boolean) {
    if (checked) {
      update('types', [...config.types.filter((item) => item !== code), code])
    } else {
      update('types', config.types.filter((item) => item !== code))
    }
  }

  function moveType(code: string, delta: number) {
    const index = config.types.indexOf(code)
    const target = index + delta
    if (index < 0 || target < 0 || target >= config.types.length) {
      return
    }
    const next = [...config.types]
    next.splice(index, 1)
    next.splice(target, 0, code)
    update('types', next)
  }

  function updateGzip(gzip: GzipConfig) {
    update('gzip', gzip)
  }

  const gzip: GzipConfig = config.gzip || { isOn: true, level: 0, minLength: null, maxLength: null }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/compression', {
        csrfToken: await getCsrfToken(),
        webId: data.webId,
        compressionJSON: JSON.stringify(config),
      })
      toast('保存成功,请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data} header={data.hasGroupConfig ? <GroupConfigWarning href={data.groupSettingURL} /> : null}>
      <div className={data.hasGroupConfig ? 'opacity-mask' : undefined}>
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="启用内容压缩">
              <Checkbox checked={config.isOn} onChange={(checked) => update('isOn', checked)} />
            </FormRow>
            {config.isOn ? (
              <>
                <FormRow title="支持的扩展名">
                  <StringListEditor
                    values={config.extensions}
                    onChange={(values) => update('extensions', values.map((value) => (value.length > 0 && !value.startsWith('.') ? `.${value}` : value)))}
                    placeholder="比如 .html"
                  />
                  <p className="comment">含有这些扩展名的URL将会被压缩,不区分大小写.</p>
                </FormRow>
                <FormRow title="例外扩展名">
                  <StringListEditor
                    values={config.exceptExtensions}
                    onChange={(values) => update('exceptExtensions', values.map((value) => (value.length > 0 && !value.startsWith('.') ? `.${value}` : value)))}
                    placeholder="比如 .html"
                  />
                  <p className="comment">
                    含有这些扩展名的URL将<strong>不会</strong>被压缩,不区分大小写.
                  </p>
                </FormRow>
                <FormRow title="支持的MimeType">
                  <StringListEditor values={config.mimeTypes} onChange={(values) => update('mimeTypes', values)} placeholder="比如 text/*" />
                  <p className="comment">响应的Content-Type里包含这些MimeType的内容将会被压缩.</p>
                </FormRow>
              </>
            ) : null}
          </FormTable>

          {config.isOn ? (
            <>
              <MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />
              {moreOptions ? (
                <>
                  <FormTable>
                    <FormRow title="压缩算法">
                      <Checkbox label="使用默认顺序(brotli,gzip,zstd,deflate)" checked={config.useDefaultTypes} onChange={(checked) => update('useDefaultTypes', checked)} />
                      {!config.useDefaultTypes ? (
                        <div style={{ marginTop: '0.8em' }}>
                          <div className="ui divider" />
                          {ALL_TYPES.map((item) => {
                            const enabled = config.types.includes(item.code)
                            return (
                              <div key={item.code} className="ui checkbox" style={{ marginRight: '2em' }}>
                                <input
                                  id={`compression-type-${item.code}`}
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(event) => toggleType(item.code, event.target.checked)}
                                />
                                <label htmlFor={`compression-type-${item.code}`}>{item.name}</label>
                                {enabled ? (
                                  <span style={{ marginLeft: '0.4em' }}>
                                    <a href="" title="上移" onClick={(event) => { event.preventDefault(); moveType(item.code, -1) }}>
                                      <ChevronUp size={12} />
                                    </a>
                                    <a href="" title="下移" onClick={(event) => { event.preventDefault(); moveType(item.code, 1) }}>
                                      <ChevronDown size={12} />
                                    </a>
                                  </span>
                                ) : null}
                              </div>
                            )
                          })}
                          <p className="comment">选择支持的压缩算法和优先顺序.</p>
                        </div>
                      ) : null}
                    </FormRow>
                    <FormRow title="支持已压缩内容">
                      <Checkbox checked={config.decompressData} onChange={(checked) => update('decompressData', checked)} />
                      <p className="comment">支持对已压缩内容尝试重新使用新的算法压缩;不选中表示保留当前的压缩格式.</p>
                    </FormRow>
                    <FormRow title="内容最小长度">
                      <SizeCapacityEditor value={config.minLength} unit="kb" onChange={(value) => update('minLength', value)} />
                      <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                    </FormRow>
                    <FormRow title="内容最大长度">
                      <SizeCapacityEditor value={config.maxLength} unit="mb" onChange={(value) => update('maxLength', value)} />
                      <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                    </FormRow>
                    <FormRow title="支持Partial Content">
                      <Checkbox checked={config.enablePartialContent} onChange={(checked) => update('enablePartialContent', checked)} />
                      <p className="comment">支持对分片内容(PartialContent)的压缩;除非客户端有特殊要求,一般不需要启用.</p>
                    </FormRow>
                    <FormRow title="例外URL">
                      <URLPatternsEditor patterns={config.exceptURLPatterns || []} onChange={(patterns) => update('exceptURLPatterns', patterns)} />
                      <p className="comment">如果填写了例外URL,表示这些URL跳过不做处理.</p>
                    </FormRow>
                    <FormRow title="限制URL">
                      <URLPatternsEditor patterns={config.onlyURLPatterns || []} onChange={(patterns) => update('onlyURLPatterns', patterns)} />
                      <p className="comment">如果填写了限制URL,表示只对这些URL进行压缩处理;如果不填则表示支持所有的URL.</p>
                    </FormRow>
                    <FormRow title="匹配条件">
                      <CondsEditor conds={config.conds} onChange={(conds) => update('conds', conds)} />
                    </FormRow>
                  </FormTable>

                  <h4>Gzip压缩</h4>
                  <FormTable>
                    <FormRow title="启用Gzip压缩">
                      <Checkbox checked={gzip.isOn} onChange={(checked) => updateGzip({ ...gzip, isOn: checked })} />
                    </FormRow>
                    {gzip.isOn ? (
                      <>
                        <FormRow title="压缩级别">
                          <Select value={gzip.level} onChange={(event) => updateGzip({ ...gzip, level: Number(event.target.value) })}>
                            <option value={0}>不压缩</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </Select>
                          <p className="comment">级别越高,压缩比例越大.</p>
                        </FormRow>
                        <FormRow title="Gzip内容最小长度">
                          <SizeCapacityEditor value={gzip.minLength} unit="kb" onChange={(value) => updateGzip({ ...gzip, minLength: value })} />
                          <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                        </FormRow>
                        <FormRow title="Gzip内容最大长度">
                          <SizeCapacityEditor value={gzip.maxLength} unit="mb" onChange={(value) => updateGzip({ ...gzip, maxLength: value })} />
                          <p className="comment">0表示不限制,内容长度从文件尺寸或Content-Length中获取.</p>
                        </FormRow>
                      </>
                    ) : null}
                  </FormTable>
                </>
              ) : null}
            </>
          ) : null}

          <SubmitButton submitting={submitting} />
        </form>
      </div>
    </ServerSettingsShell>
  )
}

function URLPatternsEditor({ patterns, onChange }: { patterns: URLPattern[]; onChange: (patterns: URLPattern[]) => void }) {
  return (
    <div>
      {patterns.map((pattern, index) => (
        <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
          <div className="ui field">
            <select
              className="ui dropdown"
              value={pattern.type}
              onChange={(event) => {
                const next = [...patterns]
                next[index] = { ...pattern, type: event.target.value }
                onChange(next)
              }}
            >
              <option value="wildcard">通配符</option>
              <option value="regexp">正则表达式</option>
              <option value="images">常见图片</option>
              <option value="audios">常见音频</option>
              <option value="videos">常见视频</option>
            </select>
          </div>
          <div className="ui field">
            <input
              type="text"
              placeholder="比如 /hello/*"
              value={pattern.pattern}
              style={{ width: '20em' }}
              onChange={(event) => {
                const next = [...patterns]
                next[index] = { ...pattern, pattern: event.target.value }
                onChange(next)
              }}
            />
          </div>
          <div className="ui field" style={{ padding: 0 }}>
            <a href="" title="删除" onClick={(event) => { event.preventDefault(); onChange(patterns.filter((_, i) => i !== index)) }}>
              <Trash2 size={13} />
            </a>
          </div>
        </div>
      ))}
      <button className="ui button tiny" type="button" onClick={() => onChange([...patterns, { type: 'wildcard', pattern: '' }])}>
        +
      </button>
    </div>
  )
}
