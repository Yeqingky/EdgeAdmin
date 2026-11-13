import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { PageHeader } from '../../components/PageHeader'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  CondsEditor,
  GroupConfigWarning,
  Modal,
  MoreOptionsIndicator,
  ServerSettingsShell,
  SizeCapacityEditor,
  StringListEditor,
  TimeDurationEditor,
  condTypeName,
  useServerId,
  type RequestCond,
  type RequestCondsConfig,
  type ServerSettingsBase,
  type SizeCapacity,
  type TimeDuration,
} from './shared'

interface CacheKeyConfig {
  isOn: boolean
  scheme: string
  host: string
}

interface CacheRef {
  id?: number
  isOn: boolean
  cachePolicyId: number
  key: string
  life: TimeDuration
  status: number[]
  minSize: SizeCapacity | null
  maxSize: SizeCapacity | null
  methods: string[]
  skipCacheControlValues?: string[]
  skipSetCookie?: boolean
  enableRequestCachePragma?: boolean
  allowChunkedEncoding?: boolean
  allowPartialContent?: boolean
  forcePartialContent?: boolean
  alwaysForwardRangeRequest?: boolean
  enableIfNoneMatch?: boolean
  enableIfModifiedSince?: boolean
  enableReadingOriginAsync?: boolean
  conds: RequestCondsConfig | null
  simpleCond: RequestCond | null
  isReverse: boolean
}

interface CacheConfig {
  isPrior?: boolean
  isOn: boolean
  addStatusHeader: boolean
  addAgeHeader: boolean
  enableCacheControlMaxAge: boolean
  disablePolicyRefs: boolean
  key: CacheKeyConfig
  purgeIsOn: boolean
  purgeKey: string
  stale?: unknown
  cacheRefs: CacheRef[]
}

interface CachePolicyInfo {
  id: number
  name: string
  isOn: boolean
  maxBytes: SizeCapacity | null
}

interface CacheData extends ServerSettingsBase {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  cacheConfig: CacheConfig | null
  cachePolicy: CachePolicyInfo | null
}

const SIMPLE_COND_TYPES = [
  { code: 'url-extension', name: '文件扩展名' },
  { code: 'url-eq-index', name: '首页' },
  { code: 'url-all', name: '全站' },
  { code: 'url-prefix', name: 'URL目录前缀' },
  { code: 'url-eq', name: 'URL完整路径' },
  { code: 'url-wildcard-match', name: 'URL通配符' },
  { code: 'url-regexp', name: 'URL正则匹配' },
  { code: 'params', name: '参数匹配' },
]

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  isOn: false,
  addStatusHeader: true,
  addAgeHeader: false,
  enableCacheControlMaxAge: false,
  disablePolicyRefs: false,
  key: { isOn: false, scheme: 'https', host: '' },
  purgeIsOn: false,
  purgeKey: '',
  cacheRefs: [],
}

export function CacheMenu({ active }: { active: 'index' | 'purge' | 'fetch' }) {
  const serverId = useServerId()
  return (
    <PageHeader
      items={[
        { name: '设置', href: `/servers/server/settings/cache?serverId=${serverId}`, active: active === 'index' },
        { name: '刷新', href: `/servers/server/settings/cache/purge?serverId=${serverId}`, active: active === 'purge' },
        { name: '预热', href: `/servers/server/settings/cache/fetch?serverId=${serverId}`, active: active === 'fetch' },
      ]}
    />
  )
}

export function ServerCacheSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['server-settings-cache', serverId],
    queryFn: () => apiGet<CacheData>('/servers/server/settings/cache', { serverId }),
    enabled: serverId > 0,
  })

  const [config, setConfig] = useState<CacheConfig>(DEFAULT_CACHE_CONFIG)
  const [moreOptions, setMoreOptions] = useState(false)
  const [keyOptions, setKeyOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingRef, setEditingRef] = useState<{ ref: CacheRef | null; index: number | null } | null>(null)

  useEffect(() => {
    if (query.data?.cacheConfig) {
      const cacheConfig = query.data.cacheConfig
      setConfig({
        ...DEFAULT_CACHE_CONFIG,
        ...cacheConfig,
        key: cacheConfig.key || DEFAULT_CACHE_CONFIG.key,
        cacheRefs: cacheConfig.cacheRefs || [],
      })
    }
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const editingIndex = editingRef ? editingRef.index : null

  function update<K extends keyof CacheConfig>(key: K, value: CacheConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  function updateRefs(refs: CacheRef[]) {
    update('cacheRefs', refs)
  }

  async function autoSaveRefs(refs: CacheRef[]) {
    try {
      await apiPost('/servers/server/settings/cache/updateRefs', { webId: data.webId, refsJSON: JSON.stringify(refs) })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['server-settings-cache', serverId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  async function removeRef(index: number) {
    if (!(await confirm({ message: '确定要删除此缓存设置吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    const refs = config.cacheRefs.filter((_, i) => i !== index)
    updateRefs(refs)
    await autoSaveRefs(refs)
  }

  async function toggleRef(index: number, isOn: boolean) {
    const refs = [...config.cacheRefs]
    refs[index] = { ...refs[index], isOn }
    updateRefs(refs)
    await autoSaveRefs(refs)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/cache', { webId: data.webId, cacheJSON: JSON.stringify(config) })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell
      data={data}
    >
      <CacheMenu active="index" />
      {data.hasGroupConfig ? <GroupConfigWarning href={data.groupSettingURL} /> : null}
      <div className={data.hasGroupConfig ? 'opacity-mask' : undefined}>
        <form className="ui form" onSubmit={save}>
          <FormTable>
            <FormRow title="全局缓存策略">
              {data.cachePolicy ? (
                <div>
                  {data.cachePolicy.name}{' '}
                  <a href={`/servers/components/cache/policy?cachePolicyId=${data.cachePolicy.id}`}>查看</a>
                  <p className="comment">使用当前网站所在集群的设置。</p>
                </div>
              ) : (
                <span className="red">当前集群没有设置缓存策略，当前配置无法生效。</span>
              )}
            </FormRow>
            <FormRow title="启用缓存">
              <Checkbox checked={config.isOn} onChange={(checked) => update('isOn', checked)} />
            </FormRow>
          </FormTable>

          {config.isOn ? (
            <>
              <FormTable>
                <FormRow title="缓存主域名">
                  <div>
                    {config.key.isOn ? (
                      <div>
                        使用主域名：{config.key.scheme}://{config.key.host} &nbsp;
                        <a href="" onClick={(event) => { event.preventDefault(); setKeyOptions(!keyOptions) }}>
                          <span className="small">[修改]</span>
                        </a>
                      </div>
                    ) : (
                      <div>
                        默认 &nbsp;
                        <a href="" onClick={(event) => { event.preventDefault(); setKeyOptions(!keyOptions) }}>
                          <span className="small">[修改]</span>
                        </a>
                      </div>
                    )}
                    {keyOptions ? (
                      <div style={{ marginTop: '1em' }}>
                        <div className="ui divider" />
                        <table className="ui table definition">
                          <tbody>
                            <tr>
                              <td className="title">启用主域名</td>
                              <td>
                                <Checkbox checked={config.key.isOn} onChange={(checked) => update('key', { ...config.key, isOn: checked })} />
                                <p className="comment">
                                  启用主域名后，所有缓存键值中的协议和域名部分都会修改为主域名，用来实现缓存不区分域名。
                                </p>
                              </td>
                            </tr>
                            {config.key.isOn ? (
                              <tr>
                                <td>主域名 *</td>
                                <td>
                                  <div className="ui fields inline">
                                    <div className="ui field">
                                      <Select value={config.key.scheme} onChange={(event) => update('key', { ...config.key, scheme: event.target.value })}>
                                        <option value="https">https://</option>
                                        <option value="http">http://</option>
                                      </Select>
                                    </div>
                                    <div className="ui field">
                                      <input
                                        type="text"
                                        placeholder="example.com"
                                        value={config.key.host}
                                        onChange={(event) => update('key', { ...config.key, host: event.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <p className="comment">
                                    此域名<strong>必须</strong>是当前网站已绑定域名，在刷新缓存时也需要使用此域名。
                                  </p>
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                        <button className="ui button tiny" type="button" onClick={() => setKeyOptions(false)}>
                          完成
                        </button>
                      </div>
                    ) : null}
                  </div>
                </FormRow>
                <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
                  <span />
                </FormRow>
                {moreOptions ? (
                  <>
                    <FormRow title="使用默认缓存条件">
                      <Checkbox checked={!config.disablePolicyRefs} onChange={(checked) => update('disablePolicyRefs', !checked)} />
                      <p className="comment">选中后使用系统全局缓存策略中已经定义的默认缓存条件。</p>
                    </FormRow>
                    <FormRow title="添加X-Cache报头">
                      <Checkbox checked={config.addStatusHeader} onChange={(checked) => update('addStatusHeader', checked)} />
                      <p className="comment">
                        选中后自动在响应报头中增加<code>X-Cache: BYPASS|MISS|HIT|PURGE</code>；在浏览器端查看X-Cache值时请先禁用浏览器缓存，避免影响观察。
                      </p>
                    </FormRow>
                    <FormRow title="添加Age Header">
                      <Checkbox checked={config.addAgeHeader} onChange={(checked) => update('addAgeHeader', checked)} />
                      <p className="comment">
                        选中后自动在响应Header中增加<code>Age: [存活时间秒数]</code>。
                      </p>
                    </FormRow>
                    <FormRow title="支持源站控制有效时间">
                      <Checkbox checked={config.enableCacheControlMaxAge} onChange={(checked) => update('enableCacheControlMaxAge', checked)} />
                      <p className="comment">
                        选中后表示支持源站在Header中设置的<code>Cache-Control: max-age=[有效时间秒数]</code>。
                      </p>
                    </FormRow>
                    <FormRow title={<span className="color-border">允许PURGE</span>}>
                      <Checkbox checked={config.purgeIsOn} onChange={(checked) => update('purgeIsOn', checked)} />
                      <p className="comment">允许使用PURGE方法清除某个URL缓存。</p>
                    </FormRow>
                    {config.purgeIsOn ? (
                      <FormRow title={<span className="color-border">PURGE Key *</span>}>
                        <TextInput type="text" maxLength={200} value={config.purgeKey} onChange={(event) => update('purgeKey', event.target.value)} />
                        <p className="comment">
                          <a
                            href=""
                            onClick={(event) => {
                              event.preventDefault()
                              update('purgeKey', Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))
                            }}
                          >
                            [随机生成]
                          </a>
                          。需要在PURGE方法调用时加入<code>X-Edge-Purge-Key: {config.purgeKey}</code> Header。只能包含字符、数字、下划线。
                        </p>
                      </FormRow>
                    ) : null}
                  </>
                ) : null}
              </FormTable>

              <h4>缓存条件</h4>
              {config.cacheRefs.length === 0 ? <p className="comment">暂时还没有缓存条件。</p> : null}
              {config.cacheRefs.length > 0 ? (
                <table className="ui table selectable celled">
                  <thead>
                    <tr>
                      <th>缓存条件</th>
                      <th style={{ width: '7em' }}>缓存时间</th>
                      <th className="three op">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.cacheRefs.map((ref, index) => (
                      <tr key={index}>
                        <td className={ref.isOn ? undefined : 'disabled'} style={ref.isReverse ? { borderLeft: '1px #db2828 solid' } : undefined}>
                          {ref.simpleCond ? (
                            <span>
                              {condTypeName(ref.simpleCond)}: {ref.simpleCond.value}
                            </span>
                          ) : null}
                          {ref.conds && (ref.conds.groups || []).length > 0 ? (
                            <span>
                              {(ref.conds.groups || []).map((group, groupIndex) => (
                                <span key={groupIndex} className="ui label tiny">
                                  {(group.conds || []).map((cond) => cond.value).join(` ${group.connector === 'or' ? '或' : '和'} `)}
                                </span>
                              ))}
                            </span>
                          ) : null}
                          {ref.key.indexOf('${args}') < 0 ? <span className="ui label tiny basic">忽略URI参数</span> : null}
                          {ref.minSize && ref.minSize.count > 0 ? (
                            <span className="ui label tiny basic">
                              {ref.minSize.count}
                              {ref.minSize.unit}
                              {ref.maxSize && ref.maxSize.count > 0 ? ` - ${ref.maxSize.count}${ref.maxSize.unit.toUpperCase()}` : ''}
                            </span>
                          ) : null}
                          {(ref.methods || []).length > 0 ? <span className="ui label tiny basic">{ref.methods.join(', ')}</span> : null}
                        </td>
                        <td className={ref.isOn ? undefined : 'disabled'}>
                          {ref.isReverse ? <span className="red">不缓存</span> : `${ref.life?.count ?? 0} ${timeUnitName(ref.life?.unit || '')}`}
                        </td>
                        <td>
                          <a href="" onClick={(event) => { event.preventDefault(); setEditingRef({ ref, index }) }}>
                            修改
                          </a>{' '}
                          &nbsp;
                          <a href="" onClick={(event) => { event.preventDefault(); void toggleRef(index, !ref.isOn) }}>
                            {ref.isOn ? '暂停' : <span className="red">恢复</span>}
                          </a>{' '}
                          &nbsp;
                          <a href="" onClick={(event) => { event.preventDefault(); void removeRef(index) }}>
                            删除
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {config.cacheRefs.length > 1 ? (
                <p className="comment">所有条件匹配顺序为从上到下。服务设置的优先级比全局缓存策略设置的优先级要高。</p>
              ) : null}
              <button className="ui button tiny" type="button" onClick={() => setEditingRef({ ref: null, index: null })}>
                +添加缓存条件
              </button>{' '}
              &nbsp;&nbsp;
              <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); setEditingRef({ ref: { ...EMPTY_REF, isReverse: true }, index: null }) }}>
                +添加不缓存条件
              </a>
              <div className="margin" />
              <SubmitButton submitting={submitting} />
              <p className="comment">修改条件设置后请记得保存。</p>
            </>
          ) : (
            <SubmitButton submitting={submitting} />
          )}
        </form>
      </div>

      {editingRef ? (
        <CacheRefEditor
          key={editingIndex === null ? 'new-ref' : `ref-${editingIndex}`}
          cacheRef={editingRef.ref}
          isReverse={editingRef.ref?.isReverse || false}
          cachePolicy={data.cachePolicy}
          onClose={() => setEditingRef(null)}
          onSubmit={async (ref) => {
            const refs = [...config.cacheRefs]
            if (editingIndex === null) {
              refs.push(ref)
            } else {
              refs[editingIndex] = ref
            }
            updateRefs(refs)
            setEditingRef(null)
            await autoSaveRefs(refs)
          }}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

const EMPTY_REF: CacheRef = {
  isOn: true,
  cachePolicyId: 0,
  key: '${scheme}://${host}${requestPath}${isArgs}${args}',
  life: { count: 1, unit: 'day' },
  status: [200],
  maxSize: { count: 128, unit: 'mb' },
  minSize: { count: 0, unit: 'kb' },
  methods: [],
  skipCacheControlValues: ['private', 'no-cache', 'no-store'],
  skipSetCookie: true,
  allowChunkedEncoding: true,
  allowPartialContent: true,
  forcePartialContent: false,
  conds: null,
  simpleCond: { type: 'url-extension', value: '' },
  isReverse: false,
}

function timeUnitName(unit: string): string {
  switch (unit) {
    case 'ms':
      return '毫秒'
    case 'second':
      return '秒'
    case 'minute':
      return '分钟'
    case 'hour':
      return '小时'
    case 'day':
      return '天'
    case 'week':
      return '周'
    default:
      return unit
  }
}

function CacheRefEditor({
  cacheRef,
  isReverse,
  cachePolicy,
  onClose,
  onSubmit,
}: {
  cacheRef: CacheRef | null
  isReverse: boolean
  cachePolicy: CachePolicyInfo | null
  onClose: () => void
  onSubmit: (ref: CacheRef) => Promise<void>
}) {
  const toast = useToast()
  const [ref, setRef] = useState<CacheRef>(cacheRef ? { ...cacheRef, simpleCond: cacheRef.simpleCond || null } : { ...EMPTY_REF, isReverse })
  const [category, setCategory] = useState<'simple' | 'complex'>(cacheRef?.simpleCond ? 'simple' : cacheRef?.conds ? 'complex' : 'simple')
  const [condType, setCondType] = useState(cacheRef?.simpleCond?.type || 'url-extension')
  const [condValue, setCondValue] = useState(cacheRef?.simpleCond?.value || '')
  const [ignoreArgs, setIgnoreArgs] = useState(!(cacheRef?.key || EMPTY_REF.key).includes('${args}'))
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof CacheRef>(key: K, value: CacheRef[K]) {
    setRef((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const key = ignoreArgs ? stripArgs(ref.key) : ensureArgs(ref.key)
      const next: CacheRef = {
        ...ref,
        key,
        simpleCond: category === 'simple' ? { type: condType, value: condValue, isReverse: false } : null,
        conds: category === 'complex' ? ref.conds : null,
      }
      const payload: Record<string, unknown> = { cacheRefJSON: JSON.stringify(next) }
      if (category === 'simple') {
        payload.condType = condType
        payload.condJSON = JSON.stringify({ type: condType, value: condValue })
      }
      const resp = await apiPost<{ cacheRef: CacheRef }>('/servers/server/settings/cache/createPopup', payload)
      await onSubmit({ ...resp.cacheRef, id: ref.id })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const condComponent = SIMPLE_COND_TYPES.find((item) => item.code === condType)

  return (
    <Modal
      title={isReverse ? (cacheRef ? '修改不缓存条件' : '添加不缓存条件') : cacheRef ? '修改缓存条件' : '添加缓存条件'}
      onClose={onClose}
      width="50em"
    >
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="缓存对象 *">
            {category === 'simple' ? (
              <div>
                <Select value={condType} onChange={(event) => setCondType(event.target.value)}>
                  {SIMPLE_COND_TYPES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <p className="comment">
                  <a href="" onClick={(event) => { event.preventDefault(); setCategory('complex') }}>
                    切换到复杂条件 »
                  </a>
                </p>
              </div>
            ) : (
              <div>
                <a href="" onClick={(event) => { event.preventDefault(); setCategory('simple') }}>
                  « 切换到简单条件
                </a>
              </div>
            )}
          </FormRow>
          {category === 'simple' ? (
            <FormRow title={`${condComponent?.name || '条件'}参数`}>
              <TextInput type="text" value={condValue} onChange={(event) => setCondValue(event.target.value)} />
              {condType === 'url-extension' ? <p className="comment">多个扩展名使用半角逗号分隔，比如 png,jpg。</p> : null}
            </FormRow>
          ) : (
            <FormRow title="匹配条件">
              <CondsEditor conds={ref.conds} onChange={(conds) => update('conds', conds)} />
            </FormRow>
          )}
          <FormRow title="缓存Key *">
            <TextInput type="text" maxLength={1024} value={ref.key} onChange={(event) => update('key', event.target.value)} />
            <Checkbox label="忽略URI参数" checked={ignoreArgs} onChange={setIgnoreArgs} />
            <p className="comment">可以使用${'{scheme}'}、${'{host}'}、${'{requestPath}'}、${'{args}'}等变量。</p>
          </FormRow>
          <FormRow title="缓存时间">
            <TimeDurationEditor value={ref.life} onChange={(value) => update('life', value)} />
            <p className="comment">缓存内容在节点上保存的时间。</p>
          </FormRow>
          <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
            <span />
          </FormRow>
          {moreOptions ? (
            <>
              <FormRow title="缓存的状态码">
                <StringListEditor
                  values={(ref.status || []).map(String)}
                  onChange={(values) => update('status', values.map((value) => Number(value) || 0).filter((value) => value > 0))}
                  placeholder="比如 200"
                  width="5em"
                />
                <p className="comment">不填表示缓存所有的状态码。</p>
              </FormRow>
              <FormRow title="支持的请求方法">
                <StringListEditor
                  values={ref.methods || []}
                  onChange={(values) => update('methods', values.map((value) => value.toUpperCase()))}
                  placeholder="比如 GET"
                  width="7em"
                />
                <p className="comment">不填表示支持所有的请求方法。</p>
              </FormRow>
              <FormRow title="内容最小尺寸">
                <SizeCapacityEditor value={ref.minSize} unit="kb" onChange={(value) => update('minSize', value)} />
                <p className="comment">0表示不限制。</p>
              </FormRow>
              <FormRow title="内容最大尺寸">
                <SizeCapacityEditor value={ref.maxSize} unit="mb" onChange={(value) => update('maxSize', value)} />
                {cachePolicy?.maxBytes && cachePolicy.maxBytes.count > 0 ? (
                  <p className="comment">
                    不能超过全局缓存策略的最大尺寸：{cachePolicy.maxBytes.count}
                    {cachePolicy.maxBytes.unit}
                  </p>
                ) : (
                  <p className="comment">0表示不限制。</p>
                )}
              </FormRow>
              <FormRow title="跳过Set-Cookie">
                <Checkbox checked={ref.skipSetCookie ?? true} onChange={(checked) => update('skipSetCookie', checked)} />
                <p className="comment">选中后，如果响应中含有Set-Cookie则不缓存。</p>
              </FormRow>
              <FormRow title="支持分片内容">
                <Checkbox checked={ref.allowPartialContent ?? true} onChange={(checked) => update('allowPartialContent', checked)} />
                <p className="comment">选中后支持对响应的分片内容（PartialContent）进行缓存。</p>
              </FormRow>
              <FormRow title="支持If-None-Match">
                <Checkbox checked={ref.enableIfNoneMatch ?? false} onChange={(checked) => update('enableIfNoneMatch', checked)} />
              </FormRow>
              <FormRow title="支持If-Modified-Since">
                <Checkbox checked={ref.enableIfModifiedSince ?? false} onChange={(checked) => update('enableIfModifiedSince', checked)} />
              </FormRow>
              <FormRow title="启用当前条件">
                <Checkbox checked={ref.isOn} onChange={(checked) => update('isOn', checked)} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        {isReverse ? <p className="comment">如果请求满足当前添加的条件，则不缓存。</p> : null}
        <SubmitButton submitting={submitting}>确定</SubmitButton>
      </form>
    </Modal>
  )
}

function stripArgs(key: string): string {
  return key.replace('${isArgs}${args}', '').replace('${isArgs}', '').replace('${args}', '')
}

function ensureArgs(key: string): string {
  let result = key
  if (!result.includes('${isArgs}')) {
    result += '${isArgs}'
  }
  if (!result.includes('${args}')) {
    result += '${args}'
  }
  return result
}
