import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../../../api/client'
import { Checkbox } from '../../../../components/form'
import { useToast } from '../../../../components/Toast'
import { LoadingBlock } from '../../../../components/LoadingBlock'
import {
  CapacityInput,
  Modal,
  NumberListInput,
  StringListInput,
  postForm,
  type CapacityValue,
  type GroupBasic,
  type LeftMenuItem,
} from '../../shared'
import {
  PriorEnableRows,
  SettingsShell,
  arrayField,
  boolField,
  useGroupId,
  useJsonConfig,
  useSaveSettings,
  useSettingsQuery,
  type JsonObject,
} from './common'

interface CacheData {
  group: GroupBasic
  leftMenuItems: LeftMenuItem[]
  webId: number
  cacheConfig: JsonObject | null
}

interface CacheRef {
  isOn?: boolean
  key?: string
  life?: CapacityValue
  status?: number[]
  maxSize?: CapacityValue
  minSize?: CapacityValue
  skipCacheControlValues?: string[]
  skipSetCookie?: boolean
  enableRequestCachePragma?: boolean
  conds?: unknown
  simpleCond?: unknown
  allowChunkedEncoding?: boolean
  allowPartialContent?: boolean
  forcePartialContent?: boolean
  enableIfNoneMatch?: boolean
  enableIfModifiedSince?: boolean
  enableReadingOriginAsync?: boolean
  isReverse?: boolean
  methods?: string[]
  cachePolicyId?: number
  expiresTime?: JsonObject
}

function CacheMenu({ group }: { group: GroupBasic }) {
  return (
    <div className="ui menu text blue">
      <a className="item active" href={`/servers/groups/group/settings/cache?groupId=${group.id}`}>
        设置
      </a>
      <a className="item" href={`/servers/groups/group/settings/cache/purge?groupId=${group.id}`}>
        刷新
      </a>
      <a className="item" href={`/servers/groups/group/settings/cache/fetch?groupId=${group.id}`}>
        预热
      </a>
    </div>
  )
}

function CacheRefSummary({ cacheRef }: { cacheRef: CacheRef }) {
  return (
    <span>
      <span className="ui label tiny basic">{cacheRef.isReverse ? '不缓存' : '缓存'}</span>
      <span className="ui label tiny basic">{cacheRef.key || '${scheme}://${host}${requestPath}'}</span>
      {cacheRef.life ? (
        <span className="ui label tiny basic">
          有效期 {cacheRef.life.count}
          {cacheRef.life.unit}
        </span>
      ) : null}
      {cacheRef.isOn === false ? <span className="ui label tiny red basic">已停用</span> : null}
    </span>
  )
}

export function GroupSettingsCachePage() {
  const groupId = useGroupId()
  const path = '/servers/groups/group/settings/cache'
  const query = useSettingsQuery<CacheData>(path, groupId)
  const [config, setConfig] = useJsonConfig(query.data?.cacheConfig, {
    isPrior: false,
    isOn: false,
    addStatusHeader: true,
    addAgeHeader: false,
    enableCacheControlMaxAge: false,
    cacheRefs: [],
    purgeIsOn: false,
    purgeKey: '',
    disablePolicyRefs: false,
  })
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
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
  const cacheRefs = arrayField<CacheRef>(config, 'cacheRefs')

  function updateRef(index: number, cacheRef: CacheRef) {
    const next = cacheRefs.slice()
    next[index] = cacheRef
    setConfig({ ...(config || {}), cacheRefs: next })
  }

  return (
    <SettingsShell group={data.group} leftMenuItems={data.leftMenuItems}>
      <CacheMenu group={data.group} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ webId: data.webId, cacheJSON: JSON.stringify({ ...config, cacheRefs }) })
        }}
      >
        <table className="ui table definition selectable">
          <PriorEnableRows config={config} onChange={setConfig} label="启用缓存" />
          {isOn ? (
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
                    <td>使用默认缓存条件</td>
                    <td>
                      <Checkbox
                        checked={!boolField(config, 'disablePolicyRefs')}
                        onChange={(checked) => setConfig({ ...config, disablePolicyRefs: !checked })}
                      />
                      <p className="comment">选中后使用系统全局缓存策略中已经定义的默认缓存条件。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>添加X-Cache报头</td>
                    <td>
                      <Checkbox checked={boolField(config, 'addStatusHeader', true)} onChange={(checked) => setConfig({ ...config, addStatusHeader: checked })} />
                      <p className="comment">选中后自动在响应报头中增加X-Cache: BYPASS|MISS|HIT|PURGE。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>添加Age Header</td>
                    <td>
                      <Checkbox checked={boolField(config, 'addAgeHeader')} onChange={(checked) => setConfig({ ...config, addAgeHeader: checked })} />
                      <p className="comment">选中后自动在响应Header中增加Age: [存活时间秒数]。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>支持源站控制有效时间</td>
                    <td>
                      <Checkbox
                        checked={boolField(config, 'enableCacheControlMaxAge')}
                        onChange={(checked) => setConfig({ ...config, enableCacheControlMaxAge: checked })}
                      />
                      <p className="comment">选中后表示支持源站在Header中设置的Cache-Control: max-age=[有效时间秒数]。</p>
                    </td>
                  </tr>
                  <tr>
                    <td>允许PURGE</td>
                    <td>
                      <Checkbox checked={boolField(config, 'purgeIsOn')} onChange={(checked) => setConfig({ ...config, purgeIsOn: checked })} />
                      <p className="comment">允许使用PURGE方法清除某个URL缓存。</p>
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          ) : null}
        </table>

        {isOn ? (
          <div>
            <h4>缓存条件</h4>
            {cacheRefs.length === 0 ? <p className="comment">暂时还没有缓存条件。</p> : null}
            {cacheRefs.length > 0 ? (
              <table className="ui table selectable celled">
                <thead>
                  <tr>
                    <th>条件</th>
                    <th>状态</th>
                    <th className="two op">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cacheRefs.map((cacheRef, index) => (
                    <tr key={index}>
                      <td>
                        <CacheRefSummary cacheRef={cacheRef} />
                      </td>
                      <td>{cacheRef.isOn === false ? <span className="ui label red tiny basic">已停用</span> : <span className="ui label green tiny basic">已启用</span>}</td>
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
                            setConfig({ ...(config || {}), cacheRefs: cacheRefs.filter((_, position) => position !== index) })
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
                  setConfig({
                    ...(config || {}),
                    cacheRefs: [
                      ...cacheRefs,
                      {
                        isOn: true,
                        key: '${scheme}://${host}${requestPath}${isArgs}${args}',
                        life: { count: 1, unit: 'day' },
                        status: [200],
                        maxSize: { count: 128, unit: 'mb' },
                        minSize: { count: 0, unit: 'kb' },
                        skipCacheControlValues: ['private', 'no-cache', 'no-store'],
                        skipSetCookie: true,
                        allowChunkedEncoding: true,
                        allowPartialContent: true,
                        forcePartialContent: false,
                        enableIfNoneMatch: false,
                        enableIfModifiedSince: false,
                        enableReadingOriginAsync: false,
                        isReverse: false,
                        methods: [],
                      },
                    ],
                  })
                }
              >
                +添加缓存条件
              </button>
            </div>
          </div>
        ) : null}
        <p className="comment">修改条件设置后请记得保存。</p>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${save.isPending ? ' loading disabled' : ''}`} type="submit" disabled={save.isPending}>
            保存
          </button>
        </div>
      </form>

      {editingIndex >= 0 && cacheRefs[editingIndex] ? (
        <Modal title="修改缓存条件" onClose={() => setEditingIndex(-1)} width="46em">
          <CacheRefEditor
            cacheRef={cacheRefs[editingIndex]}
            onDone={(cacheRef) => {
              updateRef(editingIndex, cacheRef)
              setEditingIndex(-1)
            }}
          />
        </Modal>
      ) : null}
    </SettingsShell>
  )
}

function CacheRefEditor({ cacheRef, onDone }: { cacheRef: CacheRef; onDone: (cacheRef: CacheRef) => void }) {
  const [value, setValue] = useState<CacheRef>({ ...cacheRef })
  return (
    <div className="ui form">
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>是否启用</td>
            <td>
              <Checkbox checked={value.isOn !== false} onChange={(checked) => setValue({ ...value, isOn: checked })} />
            </td>
          </tr>
          <tr>
            <td>缓存键值</td>
            <td>
              <input type="text" value={value.key || ''} onChange={(event) => setValue({ ...value, key: event.target.value })} />
              <p className="comment">可以使用请求变量，比如 {'${scheme}://${host}${requestPath}${isArgs}${args}'}。</p>
            </td>
          </tr>
          <tr>
            <td>有效期</td>
            <td>
              <CapacityInput
                value={value.life || { count: 1, unit: 'day' }}
                onChange={(life) => setValue({ ...value, life })}
                units={['second', 'minute', 'hour', 'day']}
                defaultUnit="hour"
              />
            </td>
          </tr>
          <tr>
            <td>状态码</td>
            <td>
              <NumberListInput values={value.status || []} onChange={(status) => setValue({ ...value, status })} placeholder="比如 200,301" />
            </td>
          </tr>
          <tr>
            <td>最大内容尺寸</td>
            <td>
              <CapacityInput value={value.maxSize || { count: 0, unit: 'mb' }} onChange={(maxSize) => setValue({ ...value, maxSize })} />
            </td>
          </tr>
          <tr>
            <td>最小内容尺寸</td>
            <td>
              <CapacityInput value={value.minSize || { count: 0, unit: 'kb' }} onChange={(minSize) => setValue({ ...value, minSize })} />
            </td>
          </tr>
          <tr>
            <td>忽略的Cache-Control值</td>
            <td>
              <StringListInput
                values={value.skipCacheControlValues || []}
                onChange={(values) => setValue({ ...value, skipCacheControlValues: values })}
                placeholder="private,no-cache,no-store"
              />
            </td>
          </tr>
          <tr>
            <td>请求方法</td>
            <td>
              <StringListInput values={value.methods || []} onChange={(methods) => setValue({ ...value, methods })} placeholder="GET,HEAD" />
            </td>
          </tr>
          <tr>
            <td>排除Set-Cookie</td>
            <td>
              <Checkbox checked={value.skipSetCookie !== false} onChange={(checked) => setValue({ ...value, skipSetCookie: checked })} />
            </td>
          </tr>
          <tr>
            <td>支持分片内容</td>
            <td>
              <Checkbox
                checked={value.allowPartialContent !== false}
                onChange={(checked) => setValue({ ...value, allowPartialContent: checked })}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: '1em' }}>
        <button className="ui button primary" type="button" onClick={() => onDone(value)}>
          确定
        </button>
      </div>
    </div>
  )
}

/* ---------------------------- 刷新、预热 ---------------------------- */

interface WebConfigCache {
  cache?: { isOn: boolean } | null
}

interface CacheTaskData {
  group?: GroupBasic
  leftMenuItems?: LeftMenuItem[]
  webId: number
  webConfig: WebConfigCache
}

export function GroupSettingsCachePurgePage() {
  return <CacheTaskPage mode="purge" />
}

export function GroupSettingsCacheFetchPage() {
  return <CacheTaskPage mode="fetch" />
}

function CacheTaskPage({ mode }: { mode: 'purge' | 'fetch' }) {
  const [searchParams] = useSearchParams()
  const groupId = useGroupId()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const path = `/servers/groups/group/settings/cache/${mode}`
  const toast = useToast()
  const [keyType, setKeyType] = useState('key')
  const [keys, setKeys] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const query = useQuery({
    queryKey: [path, serverId],
    queryFn: () => apiGet<CacheTaskData>(path, { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const cacheIsOn = data.webConfig.cache ? data.webConfig.cache.isOn : false
  const title = mode === 'purge' ? '刷新' : '预热'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')
    try {
      await postForm(path, {
        serverId,
        webId: data.webId,
        keyType,
        keys,
      })
      toast('提交成功')
      setKeys('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SettingsShell group={data.group || { id: groupId, name: '' }} leftMenuItems={data.leftMenuItems}>
        <CacheMenu group={data.group || { id: groupId, name: '' }} />
        <div className="margin" />
        {!cacheIsOn ? (
          <p className="comment">没有开启缓存，不需要{title}。</p>
        ) : (
          <div>
            <p className="comment">{mode === 'purge' ? '可以在这里批量删除一组Key。' : '可以在这里批量预热一组缓存URL。'}</p>
            <form className="ui form" onSubmit={submit}>
              {mode === 'purge' ? (
                <table className="ui table definition selectable">
                  <tbody>
                    <tr>
                      <td className="title">操作类型</td>
                      <td>
                        <div className="ui radio checkbox" style={{ marginRight: '1em' }}>
                          <input type="radio" checked={keyType === 'key'} onChange={() => setKeyType('key')} />
                          <label>URL</label>
                        </div>
                        <div className="ui radio checkbox">
                          <input type="radio" checked={keyType === 'prefix'} onChange={() => setKeyType('prefix')} />
                          <label>目录</label>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>{keyType === 'prefix' ? '目录' : 'URL'}</td>
                      <td>
                        <textarea rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} />
                        <p className="comment">
                          {keyType === 'key'
                            ? '每行一个URL，比如 https://example.com/hello/world.html。'
                            : '每行一个URL目录，比如 https://example.com/hello/；如果只填写域名部分，表示清理全站。'}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="ui table definition selectable">
                  <tbody>
                    <tr>
                      <td>URL列表</td>
                      <td>
                        <textarea rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} />
                        <p className="comment">每行一个URL。</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
              {errorMessage ? <div className="ui negative message">失败：{errorMessage}</div> : null}
              <div style={{ marginTop: '1em' }}>
                <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
                  提交
                </button>
              </div>
            </form>
          </div>
        )}
      </SettingsShell>
    </div>
  )
}
