import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import {
  CapacityInput,
  CachePolicyMenu,
  DurationInput,
  type CachePolicy,
  type CachePolicyOptions,
  type CachePolicyTypeOption,
  type CacheRef,
  type SizeCapacity,
  type TimeDuration,
} from './common'

interface CacheUpdateData {
  cachePolicy: CachePolicy
  cachePolicyId: number
  cachePolicyName: string
  types: CachePolicyTypeOption[]
}

const defaultCapacity: SizeCapacity = { count: 0, unit: 'gb' }
const defaultMaxSize: SizeCapacity = { count: 0, unit: 'mb' }

export function CacheUpdatePage({ cachePolicyId }: { cachePolicyId: number }) {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cache-policy-update', cachePolicyId],
    queryFn: () => apiGet<CacheUpdateData>('/servers/components/cache/update', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })

  const [name, setName] = useState('')
  const [policyType, setPolicyType] = useState('')
  const [options, setOptions] = useState<CachePolicyOptions>({})
  const [capacity, setCapacity] = useState<SizeCapacity | null>(null)
  const [maxSize, setMaxSize] = useState<SizeCapacity | null>(null)
  const [fileMemoryCapacity, setFileMemoryCapacity] = useState<SizeCapacity | null>(null)
  const [fileMinFreeSize, setFileMinFreeSize] = useState<SizeCapacity | null>(null)
  const [fileOpenFileCacheMax, setFileOpenFileCacheMax] = useState('0')
  const [fetchTimeout, setFetchTimeout] = useState<TimeDuration | null>(null)
  const [syncCompressionCache, setSyncCompressionCache] = useState(false)
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [refs, setRefs] = useState<CacheRef[]>([])
  const [moreOptions, setMoreOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!query.data) {
      return
    }
    const policy = query.data.cachePolicy
    setPolicyType(policy.type)
    setName(policy.name)
    setOptions(policy.options ? { ...policy.options } : {})
    setCapacity(policy.capacity || { ...defaultCapacity })
    setMaxSize(policy.maxSize || { ...defaultMaxSize })
    setFileMemoryCapacity(policy.options?.memoryPolicy?.capacity || { count: 0, unit: 'gb' })
    setFileMinFreeSize(policy.options?.minFreeSize || { count: 0, unit: 'gb' })
    setFileOpenFileCacheMax(
      policy.options?.openFileCache && policy.options.openFileCache.isOn && policy.options.openFileCache.max
        ? String(policy.options.openFileCache.max)
        : '0',
    )
    setFetchTimeout(policy.fetchTimeout || { count: 20, unit: 'minute' })
    setSyncCompressionCache(Boolean(policy.syncCompressionCache))
    setDescription(policy.description || '')
    setIsOn(policy.isOn)
    setRefs(policy.cacheRefs ? policy.cacheRefs.map((ref) => ({ ...ref })) : [])
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  function changePolicyType(type: string) {
    setPolicyType(type)
    if (type === 'file' && !options.dir) {
      setOptions((current) => ({
        ...current,
        dir: '/opt/cache',
        enableMMAP: false,
        enableIncompletePartialContent: true,
      }))
      setFileMemoryCapacity({ count: 2, unit: 'gb' })
    }
  }

  function patchRef(index: number, patch: Partial<CacheRef>) {
    setRefs((current) => current.map((ref, refIndex) => (refIndex === index ? { ...ref, ...patch } : ref)))
  }

  function addRef() {
    setRefs((current) => [
      ...current,
      {
        isOn: true,
        key: '${host}${requestURI}',
        life: { count: 0, unit: 'second' },
        status: [200],
        methods: ['GET', 'HEAD'],
        minSize: { count: 0, unit: 'byte' },
        maxSize: { count: 0, unit: 'byte' },
        isReverse: false,
      },
    ])
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入策略名称', 'error')
      return
    }
    if (policyType === 'file' && !options.dir) {
      toast('请输入缓存目录', 'error')
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/components/cache/update', {
        cachePolicyId,
        name,
        type: policyType,
        fileDir: options.dir || '',
        fileMemoryCapacityJSON: JSON.stringify(fileMemoryCapacity || { count: 0, unit: 'gb' }),
        fileOpenFileCacheMax,
        fileEnableSendfile: options.enableSendfile ? 1 : '',
        fileMinFreeSizeJSON: JSON.stringify(fileMinFreeSize || { count: 0, unit: 'gb' }),
        enableIncompletePartialContent: options.enableIncompletePartialContent ? 1 : '',
        enableMMAP: options.enableMMAP ? 1 : '',
        capacityJSON: JSON.stringify(capacity || { count: 0, unit: 'gb' }),
        maxSizeJSON: JSON.stringify(maxSize || { count: 0, unit: 'byte' }),
        syncCompressionCache: syncCompressionCache ? 1 : '',
        fetchTimeoutJSON: JSON.stringify(fetchTimeout || { count: 0, unit: 'minute' }),
        description,
        isOn: isOn ? 1 : '',
        refsJSON: JSON.stringify(refs),
      })
      toast('保存成功')
      navigate(`/servers/components/cache/policy?cachePolicyId=${cachePolicyId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={query.data.cachePolicyName} active="update" />

      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">策略名称 *</td>
              <td>
                <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
              </td>
            </tr>
            <tr>
              <td className="color-border">缓存类型 *</td>
              <td>
                <select className="ui dropdown auto-width" value={policyType} onChange={(event) => changePolicyType(event.target.value)}>
                  {query.data.types.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            {policyType === 'file' ? (
              <>
                <tr>
                  <td className="color-border">缓存目录 *</td>
                  <td>
                    <input
                      type="text"
                      maxLength={500}
                      value={options.dir || ''}
                      onChange={(event) => setOptions((current) => ({ ...current, dir: event.target.value }))}
                    />
                    <p className="comment">存放文件缓存的目录,通常填写绝对路径.</p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">缓存硬盘最大用量</td>
                  <td>
                    <CapacityInput value={capacity} onChange={setCapacity} />
                    <p className="comment">
                      单个节点上缓存所在硬盘的最大用量,超出此用量或硬盘接近用尽时,将会自动尝试清理旧数据,如果为0表示没有限制.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">内存最大容量</td>
                  <td>
                    <CapacityInput value={fileMemoryCapacity} onChange={setFileMemoryCapacity} />
                    <p className="comment">
                      单个节点上作为一级缓存的内存最大容量,可以作为硬盘缓冲区和存储热点缓存内容,如果为0表示不使用内存作为一级缓存.
                    </p>
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td>缓存最大容量</td>
                <td>
                  <CapacityInput value={capacity} onChange={setCapacity} />
                  <p className="comment">单个节点上允许缓存的最大容量,如果为0表示没有限制.</p>
                </td>
              </tr>
            )}

            <tr>
              <td>最大内容长度</td>
              <td>
                <CapacityInput value={maxSize} onChange={setMaxSize} />
                <p className="comment">允许缓存的单个内容最大尺寸,如果为0表示没有限制.</p>
              </td>
            </tr>

            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setMoreOptions((current) => !current)
                  }}
                >
                  {moreOptions ? '[收起选项]' : '[更多选项]'}
                </a>
              </td>
            </tr>

            {moreOptions && policyType === 'file' ? (
              <>
                <tr>
                  <td className="color-border">缓存硬盘最小空余空间</td>
                  <td>
                    <CapacityInput value={fileMinFreeSize} onChange={setFileMinFreeSize} />
                    <p className="comment">缓存硬盘保留的最小空余空间,如果为0表示使用默认(目前默认保留5GiB).</p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">缓存文件句柄缓存</td>
                  <td>
                    <input
                      type="text"
                      maxLength={6}
                      style={{ width: '10em' }}
                      value={fileOpenFileCacheMax}
                      onChange={(event) => setFileOpenFileCacheMax(event.target.value)}
                    />
                    <p className="comment">
                      保持在内存中的缓存文件句柄的数量,提升缓存文件打开速度,同时也会占用系统更多的内存;0表示不启用.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">开启Sendfile</td>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(options.enableSendfile)}
                        onChange={(event) => setOptions((current) => ({ ...current, enableSendfile: event.target.checked }))}
                      />
                      <label />
                    </div>
                    <p className="comment">使用sendfile提升发送缓存文件的效率.</p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">允许读取不完整的Partial Content</td>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(options.enableIncompletePartialContent)}
                        onChange={(event) =>
                          setOptions((current) => ({ ...current, enableIncompletePartialContent: event.target.checked }))
                        }
                      />
                      <label />
                    </div>
                    <p className="comment">允许在有一部分内容缓存的情况下读取分区内容,剩余的部分将会自动回源读取.</p>
                  </td>
                </tr>
              </>
            ) : null}

            {moreOptions ? (
              <>
                <tr>
                  <td>同步写入压缩缓存</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={syncCompressionCache} onChange={(event) => setSyncCompressionCache(event.target.checked)} />
                      <label />
                    </div>
                    <p className="comment">
                      选中后,在压缩设置开启的情况下,在缓存源站内容的同时,也会同步写入压缩缓存;不选中,表示在源站内容缓存后,下一次调用才会缓存压缩内容.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>预热超时时间</td>
                  <td>
                    <DurationInput value={fetchTimeout} onChange={setFetchTimeout} />
                    <p className="comment">预热读取源站的超时时间,默认20分钟.</p>
                  </td>
                </tr>
                <tr>
                  <td>描述</td>
                  <td>
                    <textarea maxLength={200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td>启用当前策略</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
                      <label />
                    </div>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <h4>默认缓存条件</h4>
        {refs.length === 0 ? <p className="comment">暂时还没有缓存条件.</p> : null}
        {refs.length > 0 ? (
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th>Key</th>
                <th>有效期</th>
                <th>状态码</th>
                <th>请求方法</th>
                <th>尺寸限制</th>
                <th className="center">状态</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((ref, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={ref.key || ''}
                      onChange={(event) => patchRef(index, { key: event.target.value })}
                      style={{ minWidth: '16em' }}
                    />
                  </td>
                  <td>
                    <DurationInput
                      value={ref.life || { count: 0, unit: 'second' }}
                      onChange={(life) => patchRef(index, { life })}
                      units={['second', 'minute', 'hour', 'day']}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={(ref.status || []).join(',')}
                      onChange={(event) =>
                        patchRef(index, {
                          status: event.target.value
                            .split(',')
                            .map((value) => Number(value.trim()))
                            .filter((value) => value > 0),
                        })
                      }
                      style={{ width: '6em' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={(ref.methods || []).join(',')}
                      onChange={(event) =>
                        patchRef(index, {
                          methods: event.target.value
                            .split(',')
                            .map((value) => value.trim().toUpperCase())
                            .filter((value) => value.length > 0),
                        })
                      }
                      style={{ width: '8em' }}
                    />
                  </td>
                  <td>
                    <CapacityInput value={ref.minSize || null} onChange={(minSize) => patchRef(index, { minSize })} />
                    <CapacityInput value={ref.maxSize || null} onChange={(maxSize) => patchRef(index, { maxSize })} />
                  </td>
                  <td className="center">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={ref.isOn} onChange={(event) => patchRef(index, { isOn: event.target.checked })} />
                      <label />
                    </div>
                    <div className="ui checkbox" style={{ marginTop: '0.4em' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(ref.isReverse)}
                        onChange={(event) => patchRef(index, { isReverse: event.target.checked })}
                      />
                      <label>反向</label>
                    </div>
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setRefs((current) => current.filter((_, refIndex) => refIndex !== index))
                      }}
                    >
                      <Trash2 size={13} /> 删除
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <button className="ui button tiny" type="button" onClick={addRef}>
          + 添加缓存条件
        </button>

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
