import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GripVertical, Pencil, Plus, X } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { Modal } from './Modal'
import { MoreOptionsIndicator, PriorRow, SizeCapacityField, ValueList } from './fields'
import { RequestCondsEditor, RequestCondsView, condTypeName, condTypes } from './conds'
import { LocationShell } from './LocationShell'
import type {
  CacheConfig,
  CachePolicy,
  CacheRef,
  LocationPageBase,
  RequestCond,
  RequestCondsConfig,
  SizeCapacity,
} from './types'

interface CacheData extends LocationPageBase {
  cacheConfig?: CacheConfig | null
  cachePolicy?: CachePolicy | null
}

const timeUnits = [
  { value: 'ms', name: '毫秒' },
  { value: 'second', name: '秒' },
  { value: 'minute', name: '分钟' },
  { value: 'hour', name: '小时' },
  { value: 'day', name: '天' },
  { value: 'week', name: '周' },
]

function emptyCacheRef(isReverse: boolean): CacheRef {
  return {
    isOn: true,
    cachePolicyId: 0,
    key: '${scheme}://${host}${requestPath}${isArgs}${args}',
    life: { count: 1, unit: 'day' },
    status: [200],
    minSize: { count: 0, unit: 'kb' },
    maxSize: { count: 128, unit: 'mb' },
    methods: [],
    skipCacheControlValues: ['private', 'no-cache', 'no-store'],
    skipSetCookie: true,
    allowChunkedEncoding: true,
    allowPartialContent: true,
    isReverse,
    conds: null,
    simpleCond: null,
  }
}

function CacheRefEditor({ initial, isNew, onSave, onCancel }: {
  initial: CacheRef
  isNew: boolean
  onSave: (ref: CacheRef) => void
  onCancel: () => void
}) {
  const [ref, setRef] = useState<CacheRef>(initial)
  const [category, setCategory] = useState<'simple' | 'complex'>(initial.conds ? 'complex' : 'simple')
  const [simpleType, setSimpleType] = useState(initial.simpleCond?.type || 'url-extension')
  const [simpleValue, setSimpleValue] = useState(initial.simpleCond?.value || '[]')
  const [simpleCaseInsensitive, setSimpleCaseInsensitive] = useState(initial.simpleCond?.isCaseInsensitive ?? true)
  const [conds, setConds] = useState<RequestCondsConfig | null>(initial.conds || null)
  const [statusText, setStatusText] = useState((initial.status || [200]).join(','))
  const [ignoreArgs, setIgnoreArgs] = useState(!(initial.key || '').includes('${args}'))

  function update(patch: Partial<CacheRef>) {
    setRef((current) => ({ ...current, ...patch }))
  }

  function save() {
    const definition = condTypes.find((item) => item.type === simpleType) || condTypes[0]
    const simpleCond: RequestCond = {
      type: definition.type,
      isRequest: true,
      param: definition.param,
      operator: definition.operator,
      value: simpleValue,
      isCaseInsensitive: simpleCaseInsensitive,
    }
    const status = statusText
      .split(/[，、,;\s]+/)
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => !Number.isNaN(value))

    let key = ref.key
    if (ignoreArgs) {
      key = key.replace('${isArgs}${args}', '')
    } else {
      if (!key.includes('${isArgs}')) {
        key += '${isArgs}'
      }
      if (!key.includes('${args}')) {
        key += '${args}'
      }
    }

    onSave({
      ...ref,
      key,
      status: status.length > 0 ? status : [200],
      conds: category === 'complex' && conds && conds.groups.length > 0 ? conds : null,
      simpleCond: category === 'simple' ? simpleCond : null,
    })
  }

  return (
    <Modal
      title={isNew ? (ref.isReverse ? '添加不缓存条件' : '添加缓存条件') : '修改缓存条件'}
      onClose={onCancel}
      width="52em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onCancel}>取消</button>
          <button className="ui button primary" type="button" onClick={save}>保存</button>
        </>
      }
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">条件分类</td>
            <td>
              <Select value={category} onChange={(event) => setCategory(event.target.value as 'simple' | 'complex')}>
                <option value="simple">简单条件</option>
                <option value="complex">组合条件</option>
              </Select>
            </td>
          </tr>
          {category === 'simple' ? (
            <>
              <tr>
                <td className="title">条件类型</td>
                <td>
                  <Select value={simpleType} onChange={(event) => setSimpleType(event.target.value)}>
                    {condTypes.map((item) => (
                      <option key={item.type} value={item.type}>{item.name}</option>
                    ))}
                  </Select>
                </td>
              </tr>
              <tr>
                <td>条件值</td>
                <td>
                  <input type="text" value={simpleValue} onChange={(event) => setSimpleValue(event.target.value)} />
                  <p className="comment">扩展名和MimeType列表使用JSON数组格式，比如 ["png","jpg"]。</p>
                </td>
              </tr>
              <tr>
                <td>不区分大小写</td>
                <td>
                  <Checkbox checked={simpleCaseInsensitive} onChange={setSimpleCaseInsensitive} />
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td>组合条件</td>
              <td>
                <RequestCondsEditor conds={conds} onChange={setConds} />
              </td>
            </tr>
          )}
          <tr>
            <td className="title">缓存Key</td>
            <td>
              <input type="text" value={ref.key} onChange={(event) => update({ key: event.target.value })} />
              <div className="ui checkbox" style={{ marginTop: '0.5em' }}>
                <input type="checkbox" checked={ignoreArgs} onChange={(event) => setIgnoreArgs(event.target.checked)} />
                <label>忽略URI参数</label>
              </div>
              <p className="comment">可以使用变量，比如 ${'${scheme}'}、${'${host}'}、${'${requestPath}'}、${'${args}'}。</p>
            </td>
          </tr>
          <tr>
            <td>缓存时间</td>
            <td>
              <div className="ui fields inline">
                <div className="ui field">
                  <input
                    type="text"
                    size={6}
                    value={String(ref.life?.count ?? 1)}
                    onChange={(event) => update({ life: { count: Number(event.target.value) || 0, unit: ref.life?.unit || 'day' } })}
                  />
                </div>
                <div className="ui field">
                  <Select
                    value={ref.life?.unit || 'day'}
                    onChange={(event) => update({ life: { count: ref.life?.count ?? 1, unit: event.target.value } })}
                  >
                    {timeUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>{unit.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td>缓存的状态码</td>
            <td>
              <input type="text" value={statusText} onChange={(event) => setStatusText(event.target.value)} />
              <p className="comment">多个状态码使用逗号分隔，默认200。</p>
            </td>
          </tr>
          <tr>
            <td>可缓存最小尺寸</td>
            <td>
              <SizeCapacityField
                value={ref.minSize}
                unit="kb"
                onChange={(value: SizeCapacity) => update({ minSize: value })}
              />
            </td>
          </tr>
          <tr>
            <td>可缓存最大尺寸</td>
            <td>
              <SizeCapacityField
                value={ref.maxSize}
                unit="mb"
                onChange={(value: SizeCapacity) => update({ maxSize: value })}
              />
            </td>
          </tr>
          <tr>
            <td>支持的请求方法</td>
            <td>
              <ValueList values={ref.methods || []} onChange={(methods) => update({ methods })} placeholder="比如 GET" />
              <p className="comment">留空表示支持所有请求方法。</p>
            </td>
          </tr>
          <tr>
            <td>支持分片内容缓存</td>
            <td>
              <Checkbox checked={ref.allowPartialContent === true} onChange={(value) => update({ allowPartialContent: value })} />
            </td>
          </tr>
          <tr>
            <td>支持If-None-Match</td>
            <td>
              <Checkbox checked={ref.enableIfNoneMatch === true} onChange={(value) => update({ enableIfNoneMatch: value })} />
            </td>
          </tr>
          <tr>
            <td>支持If-Modified-Since</td>
            <td>
              <Checkbox checked={ref.enableIfModifiedSince === true} onChange={(value) => update({ enableIfModifiedSince: value })} />
            </td>
          </tr>
          <tr>
            <td>强制Range请求回源</td>
            <td>
              <Checkbox checked={ref.alwaysForwardRangeRequest === true} onChange={(value) => update({ alwaysForwardRangeRequest: value })} />
            </td>
          </tr>
          <tr>
            <td>允许异步读取源站</td>
            <td>
              <Checkbox checked={ref.enableReadingOriginAsync === true} onChange={(value) => update({ enableReadingOriginAsync: value })} />
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

function CacheForm({ data }: { data: CacheData }) {
  const toast = useToast()
  const confirm = useConfirm()
  const config = data.cacheConfig
  const [isPrior, setIsPrior] = useState(config?.isPrior ?? false)
  const [isOn, setIsOn] = useState(config?.isOn ?? false)
  const [addStatusHeader, setAddStatusHeader] = useState(config?.addStatusHeader ?? true)
  const [addAgeHeader, setAddAgeHeader] = useState(config?.addAgeHeader ?? false)
  const [enableCacheControlMaxAge, setEnableCacheControlMaxAge] = useState(config?.enableCacheControlMaxAge ?? false)
  const [disablePolicyRefs, setDisablePolicyRefs] = useState(config?.disablePolicyRefs ?? false)
  const [purgeIsOn, setPurgeIsOn] = useState(config?.purgeIsOn ?? false)
  const [purgeKey, setPurgeKey] = useState(config?.purgeKey || '')
  const [keyIsOn, setKeyIsOn] = useState(config?.key?.isOn ?? false)
  const [keyScheme, setKeyScheme] = useState(config?.key?.scheme || 'https')
  const [keyHost, setKeyHost] = useState(config?.key?.host || '')
  const [keyOptionsVisible, setKeyOptionsVisible] = useState(false)
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [refs, setRefs] = useState<CacheRef[]>(config?.cacheRefs || [])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchBoxVisible, setSearchBoxVisible] = useState(false)
  const [editingRef, setEditingRef] = useState<{ index: number; ref: CacheRef } | null>(null)
  const [draggingIndex, setDraggingIndex] = useState(-1)
  const [submitting, setSubmitting] = useState(false)

  const cacheIsOn = isPrior && isOn

  async function saveRefs(nextRefs: CacheRef[]) {
    setRefs(nextRefs)
    try {
      await apiPost('/servers/server/settings/cache/updateRefs', {
        webId: data.webId,
        refsJSON: JSON.stringify(nextRefs),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  function generatePurgeKey() {
    const salt = Math.random().toString() + Math.random().toString()
    const digits = salt.replace(/0\./g, '').replace(/\./g, '')
    let result = ''
    for (let i = 0; i < digits.length; i++) {
      result += String.fromCharCode(
        Number.parseInt(digits.substring(i, i + 1), 10) + (Math.random() < 0.5 ? 'a' : 'A').charCodeAt(0),
      )
    }
    setPurgeKey(result)
  }

  function matchesKeyword(ref: CacheRef, keyword: string): boolean {
    if (keyword.length === 0) {
      return true
    }
    if (ref.simpleCond && typeof ref.simpleCond.value === 'string' && ref.simpleCond.value.includes(keyword)) {
      return true
    }
    if (ref.conds && ref.conds.groups) {
      return ref.conds.groups.some((group) =>
        (group.conds || []).some((cond) => typeof cond.value === 'string' && cond.value.includes(keyword)),
      )
    }
    return false
  }

  function dropOn(targetIndex: number) {
    if (draggingIndex < 0 || draggingIndex === targetIndex) {
      setDraggingIndex(-1)
      return
    }
    const next = refs.slice()
    const [moved] = next.splice(draggingIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDraggingIndex(-1)
    void saveRefs(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const payload: CacheConfig = {
        isPrior,
        isOn,
        addStatusHeader,
        addAgeHeader,
        enableCacheControlMaxAge,
        disablePolicyRefs,
        purgeIsOn,
        purgeKey,
        key: { isOn: keyIsOn, scheme: keyScheme, host: keyHost },
        cacheRefs: refs,
        stale: config?.stale,
      }
      await apiPost('/servers/server/settings/locations/cache', {
        webId: data.webId,
        cacheJSON: JSON.stringify(payload),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleRefs = refs.filter((ref) => ref.visible !== false && matchesKeyword(ref, searchKeyword))

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="全局缓存策略">
          {data.cachePolicy ? (
            <div>
              {data.cachePolicy.name}{' '}
              <a href={`#/servers/components/cache/policy?cachePolicyId=${data.cachePolicy.id}`}>查看</a>
              <p className="comment">使用当前网站所在集群的设置。</p>
            </div>
          ) : (
            <span className="red">当前集群没有设置缓存策略，当前配置无法生效。</span>
          )}
        </FormRow>
      </FormTable>

      <FormTable>
        <PriorRow isPrior={isPrior} onChange={setIsPrior} />
        {isPrior ? (
          <FormRow title="启用缓存">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        ) : null}
      </FormTable>

      {cacheIsOn ? (
        <FormTable>
          <FormRow title="缓存主域名">
            {keyIsOn ? (
              <div>
                使用主域名：{keyScheme}://{keyHost} &nbsp;
                <a href="" onClick={(event) => { event.preventDefault(); setKeyOptionsVisible((visible) => !visible) }}>
                  <span className="small">[修改]</span>
                </a>
              </div>
            ) : (
              <div>
                默认 &nbsp;
                <a href="" onClick={(event) => { event.preventDefault(); setKeyOptionsVisible((visible) => !visible) }}>
                  <span className="small">[修改]</span>
                </a>
              </div>
            )}
            {keyOptionsVisible ? (
              <div style={{ marginTop: '1em' }}>
                <div className="ui divider" />
                <table className="ui table definition">
                  <tbody>
                    <tr>
                      <td className="title">启用主域名</td>
                      <td>
                        <Checkbox checked={keyIsOn} onChange={setKeyIsOn} />
                        <p className="comment">启用主域名后，所有缓存键值中的协议和域名部分都会修改为主域名，用来实现缓存不区分域名。</p>
                      </td>
                    </tr>
                    {keyIsOn ? (
                      <tr>
                        <td>主域名 *</td>
                        <td>
                          <div className="ui fields inline">
                            <div className="ui field">
                              <Select value={keyScheme} onChange={(event) => setKeyScheme(event.target.value)}>
                                <option value="https">https://</option>
                                <option value="http">http://</option>
                              </Select>
                            </div>
                            <div className="ui field">
                              <input type="text" placeholder="example.com" value={keyHost} onChange={(event) => setKeyHost(event.target.value)} />
                            </div>
                          </div>
                          <p className="comment">此域名<strong>必须</strong>是当前网站已绑定域名，在刷新缓存时也需要使用此域名。</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <button className="ui button tiny" type="button" onClick={() => setKeyOptionsVisible(false)}>完成</button>
              </div>
            ) : null}
          </FormRow>
        </FormTable>
      ) : null}

      {cacheIsOn ? (
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td colSpan={2}>
                <MoreOptionsIndicator visible={moreOptionsVisible} onToggle={() => setMoreOptionsVisible((visible) => !visible)} />
              </td>
            </tr>
          </tbody>
          {moreOptionsVisible ? (
            <tbody>
              <tr>
                <td>使用默认缓存条件</td>
                <td>
                  <Checkbox checked={!disablePolicyRefs} onChange={(checked) => setDisablePolicyRefs(!checked)} />
                  <p className="comment">选中后使用系统全局缓存策略中已经定义的默认缓存条件。</p>
                </td>
              </tr>
              <tr>
                <td>添加X-Cache报头</td>
                <td>
                  <Checkbox checked={addStatusHeader} onChange={setAddStatusHeader} />
                  <p className="comment">选中后自动在响应报头中增加<code>X-Cache: BYPASS|MISS|HIT|PURGE</code>；在浏览器端查看X-Cache值时请先禁用浏览器缓存，避免影响观察。</p>
                </td>
              </tr>
              <tr>
                <td>添加Age Header</td>
                <td>
                  <Checkbox checked={addAgeHeader} onChange={setAddAgeHeader} />
                  <p className="comment">选中后自动在响应Header中增加<code>Age: [存活时间秒数]</code>。</p>
                </td>
              </tr>
              <tr>
                <td>支持源站控制有效时间</td>
                <td>
                  <Checkbox checked={enableCacheControlMaxAge} onChange={setEnableCacheControlMaxAge} />
                  <p className="comment">选中后表示支持源站在Header中设置的<code>Cache-Control: max-age=[有效时间秒数]</code>。</p>
                </td>
              </tr>
              <tr>
                <td className="color-border">允许PURGE</td>
                <td>
                  <Checkbox checked={purgeIsOn} onChange={setPurgeIsOn} />
                  <p className="comment">允许使用PURGE方法清除某个URL缓存。</p>
                </td>
              </tr>
              {purgeIsOn ? (
                <tr>
                  <td className="color-border">PURGE Key *</td>
                  <td>
                    <input type="text" maxLength={200} value={purgeKey} onChange={(event) => setPurgeKey(event.target.value)} />
                    <p className="comment">
                      <a href="" onClick={(event) => { event.preventDefault(); generatePurgeKey() }}>[随机生成]</a>。
                      需要在PURGE方法调用时加入<code>X-Edge-Purge-Key: {purgeKey}</code> Header。只能包含字符、数字、下划线。
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          ) : null}
        </table>
      ) : null}

      {cacheIsOn ? (
        <div style={{ marginTop: '1em' }}>
          <h4 style={{ position: 'relative' }}>
            缓存条件 &nbsp;
            <a
              href=""
              style={{ fontSize: '0.8em' }}
              onClick={(event) => {
                event.preventDefault()
                setEditingRef({ index: -1, ref: emptyCacheRef(false) })
              }}
            >
              [添加]
            </a>{' '}
            &nbsp;
            <a
              href=""
              style={{ fontSize: '0.8em' }}
              onClick={(event) => {
                event.preventDefault()
                setSearchBoxVisible((visible) => !visible)
                if (searchBoxVisible) {
                  setSearchKeyword('')
                }
              }}
            >
              [搜索]
            </a>
            {searchBoxVisible ? (
              <input
                type="text"
                placeholder="搜索..."
                autoFocus
                size={20}
                value={searchKeyword}
                style={{ marginLeft: '0.5em', zoom: 0.9 }}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            ) : null}
          </h4>

          {visibleRefs.length === 0 ? <p className="comment">暂时还没有缓存条件。</p> : null}

          {visibleRefs.length > 0 ? (
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th style={{ width: '1em' }} />
                  <th>缓存条件</th>
                  <th style={{ width: '7em' }}>缓存时间</th>
                  <th className="three op">操作</th>
                </tr>
              </thead>
              {visibleRefs.map((cacheRef, index) => (
                <tbody
                  key={`${cacheRef.id ?? 'ref'}-${index}`}
                  draggable
                  onDragStart={() => setDraggingIndex(refs.indexOf(cacheRef))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropOn(refs.indexOf(cacheRef))}
                >
                  <tr>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ cursor: 'move', color: '#999' }}>
                        <GripVertical size={14} />
                      </span>
                    </td>
                    <td style={{ borderLeft: cacheRef.isReverse ? '1px #db2828 solid' : undefined }}>
                      <div className={cacheRef.isOn ? undefined : 'disabled'}>
                        <RequestCondsView conds={cacheRef.conds} />
                        {cacheRef.simpleCond ? (
                          <span className="ui label tiny basic">
                            {condTypeName(cacheRef.simpleCond)}: {cacheRef.simpleCond?.value}
                          </span>
                        ) : null}
                      </div>
                      {cacheRef.key && !cacheRef.key.includes('${args}') ? (
                        <span className="ui label tiny basic grey">忽略URI参数</span>
                      ) : null}
                    </td>
                    <td className={cacheRef.isOn ? undefined : 'disabled'}>
                      {cacheRef.isReverse ? (
                        <span className="red">不缓存</span>
                      ) : (
                        <span>
                          {cacheRef.life?.count} {timeUnits.find((unit) => unit.value === cacheRef.life?.unit)?.name || cacheRef.life?.unit}
                        </span>
                      )}
                    </td>
                    <td>
                      <a href="" onClick={(event) => {
                        event.preventDefault()
                        setEditingRef({ index: refs.indexOf(cacheRef), ref: cacheRef })
                      }}>
                        <Pencil size={12} /> 修改
                      </a>{' '}
                      &nbsp;
                      {cacheRef.isOn ? (
                        <a href="" onClick={(event) => {
                          event.preventDefault()
                          const next = refs.slice()
                          const target = refs.indexOf(cacheRef)
                          next[target] = { ...cacheRef, isOn: false }
                          void saveRefs(next)
                        }}>
                          暂停
                        </a>
                      ) : (
                        <a href="" onClick={(event) => {
                          event.preventDefault()
                          const next = refs.slice()
                          const target = refs.indexOf(cacheRef)
                          next[target] = { ...cacheRef, isOn: true }
                          void saveRefs(next)
                        }}>
                          <span className="red">恢复</span>
                        </a>
                      )}{' '}
                      &nbsp;
                      <a href="" onClick={(event) => {
                        event.preventDefault()
                        void (async () => {
                          if (!(await confirm({ message: '确定要删除此缓存设置吗？', danger: true, confirmText: '删除' }))) {
                            return
                          }
                          await saveRefs(refs.filter((_, i) => i !== refs.indexOf(cacheRef)))
                        })()
                      }}>
                        <X size={12} /> 删除
                      </a>
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          ) : null}

          {refs.length > 1 ? (
            <p className="comment">
              所有条件匹配顺序为从上到下，可以拖动左侧的
              <GripVertical size={12} style={{ verticalAlign: 'middle' }} />
              排序。服务设置的优先级比全局缓存策略设置的优先级要高。
            </p>
          ) : null}

          <button
            className="ui button tiny"
            type="button"
            onClick={() => setEditingRef({ index: -1, ref: emptyCacheRef(false) })}
          >
            <Plus size={12} /> 添加缓存条件
          </button>
          &nbsp;&nbsp;
          <a
            href=""
            style={{ fontSize: '0.8em' }}
            onClick={(event) => {
              event.preventDefault()
              setEditingRef({ index: -1, ref: emptyCacheRef(true) })
            }}
          >
            +添加不缓存条件
          </a>
        </div>
      ) : null}

      <SubmitButton submitting={submitting} />
      <p className="comment">修改条件设置后请记得保存。</p>

      {editingRef ? (
        <CacheRefEditor
          initial={editingRef.ref}
          isNew={editingRef.index < 0}
          onCancel={() => setEditingRef(null)}
          onSave={(nextRef) => {
            const next = refs.slice()
            if (editingRef.index >= 0) {
              next[editingRef.index] = nextRef
            } else {
              next.push(nextRef)
            }
            setEditingRef(null)
            void saveRefs(next)
          }}
        />
      ) : null}
    </form>
  )
}

export function LocationCachePage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-cache', serverId, locationId],
    queryFn: () =>
      apiGet<CacheData>('/servers/server/settings/locations/cache', {
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
      <CacheForm data={data} />
    </LocationShell>
  )
}
