import { useState } from 'react'
import { Checkbox } from '../../../../components/form'
import { LoadingBlock } from '../../../../components/LoadingBlock'
import { CapacityInput, Modal, StringListInput, UrlPatternsInput, type CapacityValue, type GroupBasic, type LeftMenuItem, type UrlPattern } from '../../shared'
import {
  PriorEnableRows,
  SettingsShell,
  arrayField,
  boolField,
  numberField,
  objectField,
  stringField,
  useGroupId,
  useJsonConfig,
  useSaveSettings,
  useSettingsQuery,
  type JsonObject,
} from './common'

interface BaseData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  webId: number
}

function SaveButton({ submitting }: { submitting: boolean }) {
  return (
    <div style={{ marginTop: '1em' }}>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </div>
  )
}

/* ---------------------------- 统计 ---------------------------- */

interface StatData extends BaseData {
  statConfig: JsonObject | null
}

export function GroupSettingsStatPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/stat'
  const query = useSettingsQuery<StatData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.statConfig, { isPrior: false, isOn: false })
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (!query.data || !config) {
    return <LoadingBlock />
  }

  return (
    <SettingsShell group={query.data.group} leftMenuItems={query.data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: query.data.webId, statJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用统计" />
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 字符编码 ---------------------------- */

interface CharsetEntry {
  charset: string
  name: string
}

interface CharsetData extends BaseData {
  charsetConfig: JsonObject | null
  usualCharsets: CharsetEntry[]
  allCharsets: CharsetEntry[]
}

export function GroupSettingsCharsetPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/charset'
  const query = useSettingsQuery<CharsetData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.charsetConfig, {
    isPrior: false,
    isOn: false,
    charset: '',
    isUpper: false,
    force: false,
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, charsetJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用字符编码" />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td className="title">选择字符编码</td>
                <td>
                  <select
                    className="ui dropdown"
                    style={{ width: '20em' }}
                    value={stringField(config, 'charset')}
                    onChange={(event) => setConfig({ ...config, charset: event.target.value })}
                  >
                    <option value="">[未选择]</option>
                    <optgroup label="常用字符编码" />
                    {data.usualCharsets.map((charset) => (
                      <option key={charset.charset} value={charset.charset}>
                        {charset.charset}（{charset.name}）
                      </option>
                    ))}
                    <optgroup label="全部字符编码" />
                    {data.allCharsets.map((charset) => (
                      <option key={charset.charset} value={charset.charset}>
                        {charset.charset}（{charset.name}）
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>强制替换</td>
                    <td>
                      <Checkbox checked={boolField(config, 'force')} onChange={(checked) => setConfig({ ...config, force: checked })} />
                      <p className="comment">选中后，表示强制覆盖已经设置的字符集；不选中，表示如果源站已经设置了字符集，则保留不修改。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>字符编码大写</td>
                    <td>
                      <Checkbox checked={boolField(config, 'isUpper')} onChange={(checked) => setConfig({ ...config, isUpper: checked })} />
                      <p className="comment">选中后将指定的字符编码转换为大写，比如默认为utf-8，选中后将改为UTF-8。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 访问日志 ---------------------------- */

interface AccessLogField {
  code: number
  name: string
}

interface AccessLogData extends BaseData {
  accessLogConfig: JsonObject | null
  fields: AccessLogField[]
  defaultFieldCodes: number[]
}

export function GroupSettingsAccessLogPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/accessLog'
  const query = useSettingsQuery<AccessLogData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.accessLogConfig, {
    isPrior: false,
    isOn: false,
    fields: [],
    status1: true,
    status2: true,
    status3: true,
    status4: true,
    status5: true,
    firewallOnly: false,
    enableClientClosed: false,
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')
  let selectedFields = arrayField<number>(config, 'fields')
  if (selectedFields.length === 0 && (data.defaultFieldCodes || []).length > 0) {
    selectedFields = data.defaultFieldCodes || []
  }

  function toggleField(code: number, checked: boolean) {
    const next = checked ? [...selectedFields, code] : selectedFields.filter((value) => value !== code)
    if (config) {
      setConfig({ ...config, fields: next })
    }
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, accessLogJSON: JSON.stringify({ ...config, fields: selectedFields }) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用访问日志" />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>基础信息</td>
                    <td>
                      <p className="comment" style={{ paddingTop: 0 }}>
                        默认记录客户端IP、请求URL等基础信息。
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td>高级信息</td>
                    <td>
                      {data.fields.map((field) => (
                        <div key={field.code} className="ui checkbox" style={{ width: '10em', marginBottom: '0.8em' }}>
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.code)}
                            onChange={(event) => toggleField(field.code, event.target.checked)}
                          />
                          <label>{field.name}</label>
                        </div>
                      ))}
                      <p className="comment">
                        在基础信息之外要存储的信息。
                        {selectedFields.includes(8) ? (
                          <span className="red">记录"请求Body"将会显著消耗更多的系统资源，建议仅在调试时启用，最大记录尺寸为2MiB。</span>
                        ) : null}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td>要存储的访问日志状态码</td>
                    <td>
                      {[1, 2, 3, 4, 5].map((status) => (
                        <div key={status} className="ui checkbox" style={{ width: '3.5em' }}>
                          <input
                            type="checkbox"
                            checked={boolField(config, `status${status}`, true)}
                            onChange={(event) => setConfig({ ...config, [`status${status}`]: event.target.checked })}
                          />
                          <label>{status}xx</label>
                        </div>
                      ))}
                    </td>
                  </tr>
                  <tr>
                    <td>记录客户端中断日志</td>
                    <td>
                      <Checkbox
                        checked={boolField(config, 'enableClientClosed')}
                        onChange={(checked) => setConfig({ ...config, enableClientClosed: checked })}
                      />
                      <p className="comment">以499的状态码记录客户端主动中断日志。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        {isPrior && isOn ? (
          <table className="ui table definition selectable">
            <tbody>
              <tr>
                <td className="title">只记录WAF相关日志</td>
                <td>
                  <Checkbox
                    checked={boolField(config, 'firewallOnly')}
                    onChange={(checked) => setConfig({ ...config, firewallOnly: checked })}
                  />
                  <p className="comment">选中后只记录WAF相关的日志。通过此选项可有效减少访问日志数量，降低网络带宽和存储压力。</p>
                </td>
              </tr>
            </tbody>
          </table>
        ) : null}
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 内容压缩 ---------------------------- */

const COMPRESSION_TYPES = [
  { code: 'gzip', name: 'Gzip' },
  { code: 'deflate', name: 'Deflate' },
  { code: 'brotli', name: 'Brotli' },
  { code: 'zstd', name: 'ZSTD' },
]

interface CompressionData extends BaseData {
  compressionConfig: JsonObject | null
}

export function GroupSettingsCompressionPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/compression'
  const query = useSettingsQuery<CompressionData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.compressionConfig, {
    isPrior: false,
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
    enablePartialContent: false,
    onlyURLPatterns: [],
    exceptURLPatterns: [],
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId, true)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')
  const types = arrayField<string>(config, 'types')

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, compressionJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用内容压缩" />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td>支持的扩展名</td>
                <td>
                  <StringListInput
                    values={arrayField<string>(config, 'extensions')}
                    onChange={(values) => setConfig({ ...config, extensions: values.map((value) => (value.startsWith('.') ? value : `.${value}`)) })}
                    placeholder="比如 .html"
                  />
                  <p className="comment">含有这些扩展名的URL将会被压缩，不区分大小写。</p>
                </td>
              </tr>
              <tr>
                <td>例外扩展名</td>
                <td>
                  <StringListInput
                    values={arrayField<string>(config, 'exceptExtensions')}
                    onChange={(values) => setConfig({ ...config, exceptExtensions: values.map((value) => (value.startsWith('.') ? value : `.${value}`)) })}
                    placeholder="比如 .html"
                  />
                  <p className="comment">含有这些扩展名的URL将不会被压缩，不区分大小写。</p>
                </td>
              </tr>
              <tr>
                <td>支持的MimeType</td>
                <td>
                  <StringListInput values={arrayField<string>(config, 'mimeTypes')} onChange={(values) => setConfig({ ...config, mimeTypes: values })} placeholder="比如 text/*" />
                  <p className="comment">响应的Content-Type里包含这些MimeType的内容将会被压缩。</p>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>压缩算法</td>
                    <td>
                      <Checkbox checked={boolField(config, 'useDefaultTypes', true)} onChange={(checked) => setConfig({ ...config, useDefaultTypes: checked })} />
                      <span className="grey small">使用默认顺序（brotli、gzip、zstd、deflate）</span>
                      {!boolField(config, 'useDefaultTypes', true) ? (
                        <div style={{ marginTop: '0.5em' }}>
                          {COMPRESSION_TYPES.map((type) => (
                            <div key={type.code} className="ui checkbox" style={{ marginRight: '2em' }}>
                              <input
                                type="checkbox"
                                checked={types.includes(type.code)}
                                onChange={(event) =>
                                  setConfig({
                                    ...config,
                                    types: event.target.checked ? [...types, type.code] : types.filter((code) => code !== type.code),
                                  })
                                }
                              />
                              <label>{type.name}</label>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <p className="comment">选择支持的压缩算法和优先顺序。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>支持已压缩内容</td>
                    <td>
                      <Checkbox checked={boolField(config, 'decompressData')} onChange={(checked) => setConfig({ ...config, decompressData: checked })} />
                      <p className="comment">支持对已压缩内容尝试重新使用新的算法压缩；不选中表示保留当前的压缩格式。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>内容最小长度</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(config, 'minLength', { count: 0, unit: 'kb' })}
                        onChange={(value) => setConfig({ ...config, minLength: value })}
                      />
                      <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>内容最大长度</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(config, 'maxLength', { count: 0, unit: 'mb' })}
                        onChange={(value) => setConfig({ ...config, maxLength: value })}
                      />
                      <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>支持Partial Content</td>
                    <td>
                      <Checkbox
                        checked={boolField(config, 'enablePartialContent')}
                        onChange={(checked) => setConfig({ ...config, enablePartialContent: checked })}
                      />
                      <p className="comment">支持对分片内容（PartialContent）的压缩；除非客户端有特殊要求，一般不需要启用。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>例外URL</td>
                    <td>
                      <UrlPatternsInput
                        patterns={arrayField<UrlPattern>(config, 'exceptURLPatterns')}
                        onChange={(patterns) => setConfig({ ...config, exceptURLPatterns: patterns })}
                      />
                      <p className="comment">如果填写了例外URL，表示这些URL跳过不做处理。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>限制URL</td>
                    <td>
                      <UrlPatternsInput
                        patterns={arrayField<UrlPattern>(config, 'onlyURLPatterns')}
                        onChange={(patterns) => setConfig({ ...config, onlyURLPatterns: patterns })}
                      />
                      <p className="comment">如果填写了限制URL，表示只对这些URL进行压缩处理；如果不填则表示支持所有的URL。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 访客IP ---------------------------- */

interface RemoteAddrData extends BaseData {
  remoteAddrConfig: JsonObject | null
}

const REMOTE_ADDR_OPTIONS = [
  { name: '直接获取', type: 'default', description: '用户直接访问边缘节点，即 "用户 --> 边缘节点" 模式，这时候系统会试图从直接的连接中读取到客户端IP地址。' },
  {
    name: '从上级代理中获取',
    type: 'proxy',
    description:
      '用户和边缘节点之间有别的代理服务转发，即 "用户 --> [第三方代理服务] --> 边缘节点"，这时候只能从上级代理中获取传递的IP地址；上级代理传递的请求报头中必须包含 X-Forwarded-For 或 X-Real-IP 信息。',
  },
  { name: '从请求报头中读取', type: 'requestHeader', description: '从自定义请求报头读取客户端IP。' },
  { name: '[自定义变量]', type: 'variable', description: '通过自定义变量来获取客户端真实的IP地址。' },
]

export function GroupSettingsRemoteAddrPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/remoteAddr'
  const query = useSettingsQuery<RemoteAddrData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.remoteAddrConfig, {
    isPrior: false,
    isOn: false,
    value: '${rawRemoteAddr}',
    type: 'default',
    requestHeaderName: '',
  })
  const save = useSaveSettings(path, groupId, true)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')
  const type = stringField(config, 'type', 'default')

  function changeType(nextType: string) {
    if (!config) {
      return
    }
    if (nextType === 'default') {
      setConfig({ ...config, type: nextType, value: '${rawRemoteAddr}' })
    } else if (nextType === 'proxy') {
      setConfig({ ...config, type: nextType, value: '${remoteAddr}' })
    } else if (nextType === 'requestHeader') {
      setConfig({ ...config, type: nextType, value: '' })
    } else {
      setConfig({ ...config, type: nextType, value: '${rawRemoteAddr}' })
    }
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, remoteAddrJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows
            config={config}
            onChange={setConfig}
            label="启用访客IP设置"
            comment="选中后，表示使用自定义的请求变量获取客户端IP。"
          />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td>获取IP方式 *</td>
                <td>
                  <select className="ui dropdown auto-width" value={type} onChange={(event) => changeType(event.target.value)}>
                    {REMOTE_ADDR_OPTIONS.map((option) => (
                      <option key={option.type} value={option.type}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {REMOTE_ADDR_OPTIONS.filter((option) => option.type === type).map((option) => (
                    <p key={option.type} className="comment">
                      {option.description}
                    </p>
                  ))}
                </td>
              </tr>
              {type === 'requestHeader' ? (
                <tr>
                  <td>请求报头 *</td>
                  <td>
                    <input
                      type="text"
                      maxLength={100}
                      value={stringField(config, 'requestHeaderName')}
                      onChange={(event) => {
                        const name = event.target.value
                        setConfig({ ...config, requestHeaderName: name, value: `\${header.${name.trim()}}` })
                      }}
                    />
                    <p className="comment">请输入包含有客户端IP的请求报头，需要注意大小写，常见的有X-Forwarded-For、X-Real-IP、X-Client-IP等。</p>
                  </td>
                </tr>
              ) : null}
              {type === 'variable' ? (
                <tr>
                  <td>读取IP变量值 *</td>
                  <td>
                    <input
                      type="text"
                      maxLength={100}
                      value={stringField(config, 'value')}
                      onChange={(event) => setConfig({ ...config, value: event.target.value })}
                    />
                    <p className="comment">通过此变量获取用户的IP地址。</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 请求限制 ---------------------------- */

interface RequestLimitData extends BaseData {
  requestLimitConfig: JsonObject | null
}

export function GroupSettingsRequestLimitPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/requestLimit'
  const query = useSettingsQuery<RequestLimitData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.requestLimitConfig, {
    isPrior: false,
    isOn: false,
    maxConns: 0,
    maxConnsPerIP: 0,
    maxBodySize: { count: -1, unit: 'kb' },
    outBandwidthPerConn: { count: -1, unit: 'kb' },
  })
  const save = useSaveSettings(path, groupId, true)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')

  function numberInput(key: string) {
    return (
      <input
        type="text"
        maxLength={6}
        value={String(numberField(config || {}, key))}
        onChange={(event) => {
          const value = Number(event.target.value)
          setConfig({ ...(config || {}), [key]: Number.isNaN(value) || value < 0 ? 0 : value })
        }}
      />
    )
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, requestLimitJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用请求限制" />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td>最大并发连接数</td>
                <td>
                  {numberInput('maxConns')}
                  <p className="comment">当前网站最大并发连接数，超出此限制则响应用户429代码。为0表示不限制。</p>
                </td>
              </tr>
              <tr>
                <td>单IP最大并发连接数</td>
                <td>
                  {numberInput('maxConnsPerIP')}
                  <p className="comment">单IP最大连接数，超出此限制则响应用户429代码。为0表示不限制。</p>
                </td>
              </tr>
              <tr>
                <td>单连接带宽限制</td>
                <td>
                  <CapacityInput
                    value={objectField<CapacityValue>(config, 'outBandwidthPerConn', { count: -1, unit: 'kb' })}
                    onChange={(value) => setConfig({ ...config, outBandwidthPerConn: value })}
                    units={['byte', 'kb', 'mb']}
                  />
                  <p className="comment">客户端单个请求每秒可以读取的下行流量。</p>
                </td>
              </tr>
              <tr>
                <td>单请求最大尺寸</td>
                <td>
                  <CapacityInput
                    value={objectField<CapacityValue>(config, 'maxBodySize', { count: -1, unit: 'kb' })}
                    onChange={(value) => setConfig({ ...config, maxBodySize: value })}
                    units={['byte', 'kb', 'mb', 'gb']}
                  />
                  <p className="comment">单个请求能发送的最大内容尺寸。</p>
                </td>
              </tr>
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- WebP ---------------------------- */

interface WebpData extends BaseData {
  webpConfig: JsonObject | null
}

export function GroupSettingsWebpPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/webp'
  const query = useSettingsQuery<WebpData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.webpConfig, {
    isPrior: false,
    isOn: false,
    minLength: { count: 0, unit: 'kb' },
    maxLength: { count: 0, unit: 'kb' },
    mimeTypes: ['image/png', 'image/jpeg', 'image/bmp', 'image/x-ico'],
    extensions: ['.png', '.jpeg', '.jpg', '.bmp', '.ico'],
    conds: null,
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId, true)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = boolField(config, 'isOn')

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, webpJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows
            config={config}
            onChange={setConfig}
            label="启用WebP压缩"
            comment="选中后表示开启自动WebP压缩；图片的宽和高均不能超过16383像素。"
          />
          {isPrior && isOn ? (
            <tbody>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>支持的扩展名</td>
                    <td>
                      <StringListInput
                        values={arrayField<string>(config, 'extensions')}
                        onChange={(values) => setConfig({ ...config, extensions: values.map((value) => (value.startsWith('.') ? value : `.${value}`)) })}
                        placeholder="比如 .html"
                      />
                      <p className="comment">含有这些扩展名的URL将会被转成WebP，不区分大小写。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>支持的MimeType</td>
                    <td>
                      <StringListInput
                        values={arrayField<string>(config, 'mimeTypes')}
                        onChange={(values) => setConfig({ ...config, mimeTypes: values })}
                        placeholder="比如 text/*"
                      />
                      <p className="comment">响应的Content-Type里包含这些MimeType的内容将会被转成WebP。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>内容最小长度</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(config, 'minLength', { count: 0, unit: 'kb' })}
                        onChange={(value) => setConfig({ ...config, minLength: value })}
                      />
                      <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>内容最大长度</td>
                    <td>
                      <CapacityInput
                        value={objectField<CapacityValue>(config, 'maxLength', { count: 0, unit: 'kb' })}
                        onChange={(value) => setConfig({ ...config, maxLength: value })}
                      />
                      <p className="comment">0表示不限制，内容长度从文件尺寸或Content-Length中获取。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- Websocket ---------------------------- */

interface WebsocketData extends BaseData {
  websocketRef: JsonObject | null
  websocketConfig: JsonObject | null
}

export function GroupSettingsWebsocketPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/websocket'
  const query = useSettingsQuery<WebsocketData>(path, groupId)
  const [refConfig, setRefConfig] = useJsonConfig(query.data?.websocketRef, { isPrior: false, isOn: false, websocketId: 0 })
  const [config, setConfig] = useJsonConfig(query.data?.websocketConfig, {
    id: 0,
    isOn: false,
    handshakeTimeout: { count: 30, unit: 'second' },
    allowAllOrigins: true,
    allowedOrigins: [],
    requestSameOrigin: true,
    requestOrigin: '',
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !refConfig || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(refConfig, 'isPrior')
  const isOn = isPrior && boolField(refConfig, 'isOn')
  const allowedOrigins = arrayField<string>(config, 'allowedOrigins')

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({
            webId: data.webId,
            websocketRefJSON: JSON.stringify(refConfig),
            websocketJSON: JSON.stringify(config),
          })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={refConfig} onChange={setRefConfig} label="启用Websocket" />
          {isOn ? (
            <tbody>
              <tr>
                <td>允许所有来源域（Origin）</td>
                <td>
                  <Checkbox checked={boolField(config, 'allowAllOrigins', true)} onChange={(checked) => setConfig({ ...config, allowAllOrigins: checked })} />
                  <p className="comment">选中表示允许所有的来源域。</p>
                </td>
              </tr>
              {!boolField(config, 'allowAllOrigins', true) ? (
                <tr>
                  <td>允许的来源域列表（Origin）</td>
                  <td>
                    {allowedOrigins.length > 0 ? (
                      <div>
                        {allowedOrigins.map((origin, index) => (
                          <span key={`${origin}-${index}`} className="ui label small basic">
                            {origin}{' '}
                            <a
                              href=""
                              title="删除"
                              onClick={(event) => {
                                event.preventDefault()
                                setConfig({ ...config, allowedOrigins: allowedOrigins.filter((_, i) => i !== index) })
                              }}
                            >
                              ×
                            </a>
                          </span>
                        ))}
                        <div className="ui divider" />
                      </div>
                    ) : null}
                    <button
                      className="ui button tiny"
                      type="button"
                      onClick={() => {
                        const origin = window.prompt('请输入来源域（Origin），比如 https://example.com')
                        if (origin && origin.trim().length > 0) {
                          setConfig({ ...config, allowedOrigins: [...allowedOrigins, origin.trim()] })
                        }
                      }}
                    >
                      +
                    </button>
                    <p className="comment">只允许在列表中的来源域名访问Websocket服务。</p>
                  </td>
                </tr>
              ) : null}
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>传递请求来源域</td>
                    <td>
                      <Checkbox checked={boolField(config, 'requestSameOrigin', true)} onChange={(checked) => setConfig({ ...config, requestSameOrigin: checked })} />
                      <p className="comment">选中后，表示把接收到的请求中的Origin字段传递到源站。</p>
                    </td>
                  </tr>
                  {!boolField(config, 'requestSameOrigin', true) ? (
                    <tr>
                      <td>指定传递的来源域</td>
                      <td>
                        <input type="text" maxLength={200} value={stringField(config, 'requestOrigin')} onChange={(event) => setConfig({ ...config, requestOrigin: event.target.value })} />
                        <p className="comment">指定向源站传递的Origin字段值。</p>
                      </td>
                    </tr>
                  ) : null}
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}

/* ---------------------------- 自定义页面 ---------------------------- */

interface CustomPage {
  id?: number
  status?: number[] | number
  bodyType: string
  url?: string
  body?: string
  newStatus?: number
  exceptURLPatterns?: UrlPattern[]
  onlyURLPatterns?: UrlPattern[]
}

interface ShutdownConfig {
  isPrior?: boolean
  isOn: boolean
  bodyType: string
  url: string
  body: string
  status: number
}

interface PagesData extends BaseData {
  enableGlobalPages: boolean
  pages: CustomPage[] | null
  shutdownConfig: JsonObject | null
}

export function GroupSettingsPagesPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/pages'
  const query = useSettingsQuery<PagesData>(path, groupId)
  const [pages, setPages] = useState<CustomPage[] | null>(null)
  const [shutdownConfig, setShutdownConfig] = useState<ShutdownConfig | null>(null)
  const [enableGlobalPages, setEnableGlobalPages] = useState<boolean | null>(null)
  const [editingIndex, setEditingIndex] = useState(-1)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  const currentPages = pages ?? data.pages ?? []
  const currentShutdown: ShutdownConfig = shutdownConfig ?? {
    isPrior: boolField(data.shutdownConfig || {}, 'isPrior'),
    isOn: boolField(data.shutdownConfig || {}, 'isOn'),
    bodyType: stringField(data.shutdownConfig || {}, 'bodyType', 'html'),
    url: stringField(data.shutdownConfig || {}, 'url'),
    body: stringField(data.shutdownConfig || {}, 'body'),
    status: numberField(data.shutdownConfig || {}, 'status'),
  }
  const currentEnableGlobalPages = enableGlobalPages ?? data.enableGlobalPages

  function updatePage(index: number, page: CustomPage) {
    const next = currentPages.slice()
    next[index] = page
    setPages(next)
  }

  function removePage(index: number) {
    setPages(currentPages.filter((_, i) => i !== index))
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({
            webId: data.webId,
            enableGlobalPages: currentEnableGlobalPages,
            pagesJSON: JSON.stringify(currentPages),
            shutdownJSON: JSON.stringify(currentShutdown),
          })
        }}
      >
        <h4 style={{ marginBottom: '0.5em' }}>自定义页面</h4>
        <p className="comment" style={{ paddingTop: 0, marginTop: 0 }}>
          根据响应状态码返回一些自定义页面，比如404，500等错误页面。
        </p>

        {currentPages.length > 0 ? (
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th className="two wide">响应状态码</th>
                <th>页面类型</th>
                <th className="two wide">新状态码</th>
                <th>例外URL</th>
                <th>限制URL</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {currentPages.map((page, index) => (
                <tr key={page.id || index}>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditingIndex(index)
                      }}
                    >
                      {Array.isArray(page.status) ? page.status.join(',') : page.status}
                    </a>
                  </td>
                  <td style={{ wordBreak: 'break-all' }}>
                    {page.bodyType === 'url' ? (
                      <div>
                        {page.url}
                        <div>
                          <span className="ui label basic tiny">读取URL</span>
                        </div>
                      </div>
                    ) : null}
                    {page.bodyType === 'redirectURL' ? (
                      <div>
                        {page.url}
                        <div>
                          <span className="ui label basic tiny">跳转URL</span>
                          {page.newStatus && page.newStatus > 0 ? <span className="ui label basic tiny">{page.newStatus}</span> : null}
                        </div>
                      </div>
                    ) : null}
                    {page.bodyType === 'html' ? (
                      <div>
                        [HTML内容]
                        <div>{page.newStatus && page.newStatus > 0 ? <span className="ui label basic tiny">{page.newStatus}</span> : null}</div>
                      </div>
                    ) : null}
                  </td>
                  <td>{page.newStatus && page.newStatus > 0 ? page.newStatus : <span className="disabled">保持</span>}</td>
                  <td>
                    {page.exceptURLPatterns && page.exceptURLPatterns.length > 0 ? (
                      page.exceptURLPatterns.map((pattern) => (
                        <span key={pattern.pattern} className="ui basic label small">
                          {pattern.pattern}
                        </span>
                      ))
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td>
                    {page.onlyURLPatterns && page.onlyURLPatterns.length > 0 ? (
                      page.onlyURLPatterns.map((pattern) => (
                        <span key={pattern.pattern} className="ui basic label small">
                          {pattern.pattern}
                        </span>
                      ))
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setEditingIndex(index)
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;{' '}
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        removePage(index)
                      }}
                    >
                      删除
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div style={{ marginTop: '1em' }}>
          <button
            className="ui button small"
            type="button"
            onClick={() =>
              setPages([
                ...currentPages,
                { status: [404], bodyType: 'html', url: '', body: '', newStatus: 0, exceptURLPatterns: [], onlyURLPatterns: [] },
              ])
            }
          >
            +添加自定义页面
          </button>
        </div>

        <h4 style={{ marginTop: '2em' }}>临时关闭页面</h4>
        <p className="comment" style={{ marginTop: 0, paddingTop: 0 }}>
          开启临时关闭页面时，所有请求都会直接显示此页面。可用于临时升级网站或者禁止用户访问某个网页。
        </p>
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">启用临时关闭网站</td>
              <td>
                <Checkbox checked={currentShutdown.isOn} onChange={(checked) => setShutdownConfig({ ...currentShutdown, isOn: checked })} />
                <p className="comment">选中后，表示临时关闭当前网站，并显示自定义内容。</p>
              </td>
            </tr>
            {currentShutdown.isOn ? (
              <>
                <tr>
                  <td>显示内容类型 *</td>
                  <td>
                    <select
                      className="ui dropdown auto-width"
                      value={currentShutdown.bodyType}
                      onChange={(event) => setShutdownConfig({ ...currentShutdown, bodyType: event.target.value })}
                    >
                      <option value="html">HTML</option>
                      <option value="url">读取URL</option>
                      <option value="redirectURL">跳转URL</option>
                    </select>
                  </td>
                </tr>
                {currentShutdown.bodyType === 'url' ? (
                  <tr>
                    <td className="title">显示页面URL *</td>
                    <td>
                      <input
                        type="text"
                        value={currentShutdown.url}
                        placeholder="类似于 https://example.com/page.html"
                        onChange={(event) => setShutdownConfig({ ...currentShutdown, url: event.target.value })}
                      />
                      <p className="comment">将从此URL中读取内容。</p>
                    </td>
                  </tr>
                ) : null}
                {currentShutdown.bodyType === 'redirectURL' ? (
                  <tr>
                    <td className="title">跳转到URL *</td>
                    <td>
                      <input
                        type="text"
                        value={currentShutdown.url}
                        placeholder="类似于 https://example.com/page.html"
                        onChange={(event) => setShutdownConfig({ ...currentShutdown, url: event.target.value })}
                      />
                      <p className="comment">将会跳转到此URL。</p>
                    </td>
                  </tr>
                ) : null}
                {currentShutdown.bodyType === 'html' ? (
                  <tr>
                    <td>显示页面HTML *</td>
                    <td>
                      <textarea
                        rows={8}
                        value={currentShutdown.body}
                        onChange={(event) => setShutdownConfig({ ...currentShutdown, body: event.target.value })}
                      />
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>状态码</td>
                  <td>
                    <input
                      type="text"
                      style={{ width: '5.2em' }}
                      maxLength={3}
                      value={currentShutdown.status > 0 ? String(currentShutdown.status) : ''}
                      onChange={(event) => {
                        const status = Number(event.target.value)
                        setShutdownConfig({ ...currentShutdown, status: Number.isNaN(status) ? 0 : status })
                      }}
                    />
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <h4 style={{ marginTop: '2em' }}>其他设置</h4>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">启用系统自定义页面</td>
              <td>
                <Checkbox
                  checked={currentEnableGlobalPages}
                  onChange={(checked) => setEnableGlobalPages(checked)}
                />
                <p className="comment">选中后，表示如果当前网站没有自定义页面，则尝试使用系统对应的自定义页面。</p>
              </td>
            </tr>
          </tbody>
        </table>
        <SaveButton submitting={save.isPending} />
      </form>

      {editingIndex >= 0 && currentPages[editingIndex] ? (
        <Modal title="修改自定义页面" onClose={() => setEditingIndex(-1)} width="44em">
          <PageEditor
            page={currentPages[editingIndex]}
            onDone={(page) => {
              updatePage(editingIndex, page)
              setEditingIndex(-1)
            }}
          />
        </Modal>
      ) : null}
    </SettingsShell>
  )
}

function PageEditor({ page, onDone }: { page: CustomPage; onDone: (page: CustomPage) => void }) {
  const [form, setForm] = useState<CustomPage>({ ...page })
  return (
    <div className="ui form">
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">响应状态码 *</td>
            <td>
              <input
                type="text"
                placeholder="比如 404,500"
                value={(Array.isArray(form.status) ? form.status : form.status ? [form.status] : []).join(',')}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value
                      .split(',')
                      .map((value) => Number(value.trim()))
                      .filter((value) => !Number.isNaN(value) && value > 0),
                  })
                }
              />
            </td>
          </tr>
          <tr>
            <td>页面类型</td>
            <td>
              <select className="ui dropdown auto-width" value={form.bodyType} onChange={(event) => setForm({ ...form, bodyType: event.target.value })}>
                <option value="html">HTML</option>
                <option value="url">读取URL</option>
                <option value="redirectURL">跳转URL</option>
              </select>
            </td>
          </tr>
          {form.bodyType !== 'html' ? (
            <tr>
              <td>URL *</td>
              <td>
                <input type="text" value={form.url || ''} onChange={(event) => setForm({ ...form, url: event.target.value })} />
              </td>
            </tr>
          ) : (
            <tr>
              <td>HTML内容</td>
              <td>
                <textarea rows={6} value={form.body || ''} onChange={(event) => setForm({ ...form, body: event.target.value })} />
              </td>
            </tr>
          )}
          <tr>
            <td>新状态码</td>
            <td>
              <input
                type="text"
                style={{ width: '6em' }}
                value={form.newStatus ? String(form.newStatus) : ''}
                onChange={(event) => setForm({ ...form, newStatus: Number(event.target.value) || 0 })}
              />
              <p className="comment">0表示保持原状态码。</p>
            </td>
          </tr>
          <tr>
            <td>例外URL</td>
            <td>
              <UrlPatternsInput patterns={form.exceptURLPatterns} onChange={(patterns) => setForm({ ...form, exceptURLPatterns: patterns })} />
            </td>
          </tr>
          <tr>
            <td>限制URL</td>
            <td>
              <UrlPatternsInput patterns={form.onlyURLPatterns} onChange={(patterns) => setForm({ ...form, onlyURLPatterns: patterns })} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className="ui button primary" type="button" onClick={() => onDone(form)}>
          确定
        </button>
      </div>
    </div>
  )
}

/* ---------------------------- 静态资源 ---------------------------- */

interface WebData extends BaseData {
  rootConfig: JsonObject | null
}

export function GroupSettingsWebPage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/web'
  const query = useSettingsQuery<WebData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.rootConfig, {
    isPrior: false,
    isOn: false,
    dir: '',
    indexes: [],
    stripPrefix: '',
    decodePath: false,
    isBreak: false,
    exceptHiddenFiles: true,
    onlyURLPatterns: [],
    exceptURLPatterns: [],
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const save = useSaveSettings(path, groupId)

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data || !config) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const isPrior = boolField(config, 'isPrior')
  const isOn = isPrior && boolField(config, 'isOn')
  const indexes = arrayField<string>(config, 'indexes')

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, rootJSON: JSON.stringify(config) })
        }}
      >
        <table className="ui table selectable definition">
          <PriorEnableRows config={config} onChange={setConfig} label="启用静态资源分发" />
          {isOn ? (
            <tbody>
              <tr>
                <td className="title">静态资源根目录</td>
                <td>
                  <input type="text" placeholder="类似于 /home/www" value={stringField(config, 'dir')} onChange={(event) => setConfig({ ...config, dir: event.target.value })} />
                  <p className="comment">可以访问此根目录下的静态资源。</p>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setAdvancedVisible(!advancedVisible)
                    }}
                  >
                    {advancedVisible ? '收起选项' : '更多选项'}
                  </a>
                </td>
              </tr>
              {advancedVisible ? (
                <>
                  <tr>
                    <td>首页文件</td>
                    <td>
                      {indexes.length > 0 ? (
                        <div>
                          {indexes.map((index, i) => (
                            <span key={`${index}-${i}`} className="ui label small basic">
                              {index}{' '}
                              <a
                                href=""
                                title="删除"
                                onClick={(event) => {
                                  event.preventDefault()
                                  setConfig({ ...config, indexes: indexes.filter((_, position) => position !== i) })
                                }}
                              >
                                ×
                              </a>
                            </span>
                          ))}
                          <div className="ui divider" />
                        </div>
                      ) : null}
                      <button
                        className="ui button tiny"
                        type="button"
                        onClick={() => {
                          const index = window.prompt('请输入首页文件名，比如 index.html')
                          if (index && index.trim().length > 0) {
                            setConfig({ ...config, indexes: [...indexes, index.trim()] })
                          }
                        }}
                      >
                        +
                      </button>
                      <p className="comment">在URL中只有目录没有文件名时默认查找的首页文件。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>例外URL</td>
                    <td>
                      <UrlPatternsInput
                        patterns={arrayField<UrlPattern>(config, 'exceptURLPatterns')}
                        onChange={(patterns) => setConfig({ ...config, exceptURLPatterns: patterns })}
                      />
                      <p className="comment">如果填写了例外URL，表示不支持通过这些URL访问。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>限制URL</td>
                    <td>
                      <UrlPatternsInput
                        patterns={arrayField<UrlPattern>(config, 'onlyURLPatterns')}
                        onChange={(patterns) => setConfig({ ...config, onlyURLPatterns: patterns })}
                      />
                      <p className="comment">如果填写了限制URL，表示仅支持通过这些URL访问。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>排除隐藏文件</td>
                    <td>
                      <Checkbox checked={boolField(config, 'exceptHiddenFiles', true)} onChange={(checked) => setConfig({ ...config, exceptHiddenFiles: checked })} />
                      <p className="comment">排除以点（.）符号开头的隐藏目录或文件，比如/.git/logs/HEAD</p>
                    </td>
                  </tr>
                  <tr>
                    <td>去除URL前缀</td>
                    <td>
                      <input type="text" placeholder="/PREFIX" value={stringField(config, 'stripPrefix')} onChange={(event) => setConfig({ ...config, stripPrefix: event.target.value })} />
                    </td>
                  </tr>
                  <tr>
                    <td>路径解码</td>
                    <td>
                      <Checkbox checked={boolField(config, 'decodePath')} onChange={(checked) => setConfig({ ...config, decodePath: checked })} />
                      <p className="comment">是否对请求路径进行URL解码。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>终止请求</td>
                    <td>
                      <Checkbox checked={boolField(config, 'isBreak')} onChange={(checked) => setConfig({ ...config, isBreak: checked })} />
                      <p className="comment">在找不到要访问的文件的情况下是否终止请求并返回404，如果选择终止请求，则不再尝试反向代理等设置。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>
        <SaveButton submitting={save.isPending} />
      </form>
    </SettingsShell>
  )
}
