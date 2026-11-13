import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { CapacityInput, DurationInput, type CachePolicyTypeOption, type SizeCapacity, type TimeDuration } from './common'

interface CreateCacheData {
  types: CachePolicyTypeOption[]
  cachePolicyName?: string
}

export function CacheCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cache-create'],
    queryFn: () => apiGet<CreateCacheData>('/servers/components/cache/createPopup'),
  })
  const [name, setName] = useState('')
  const [policyType, setPolicyType] = useState('')
  const [fileDir, setFileDir] = useState('/opt/cache')
  const [capacity, setCapacity] = useState<SizeCapacity | null>({ count: 128, unit: 'gb' })
  const [fileMemoryCapacity, setFileMemoryCapacity] = useState<SizeCapacity | null>({ count: 1, unit: 'gb' })
  const [fileOpenFileCacheMax, setFileOpenFileCacheMax] = useState('0')
  const [fileEnableSendfile, setFileEnableSendfile] = useState(false)
  const [fileMinFreeSize, setFileMinFreeSize] = useState<SizeCapacity | null>({ count: 0, unit: 'gb' })
  const [maxSize, setMaxSize] = useState<SizeCapacity | null>({ count: 32, unit: 'mb' })
  const [enableIncompletePartialContent, setEnableIncompletePartialContent] = useState(true)
  const [syncCompressionCache, setSyncCompressionCache] = useState(false)
  const [fetchTimeout, setFetchTimeout] = useState<TimeDuration | null>({ count: 20, unit: 'minute' })
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && policyType === '' && query.data.types.length > 0) {
      setPolicyType(query.data.types[0].type)
    }
  }, [query.data, policyType])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入策略名称', 'error')
      return
    }
    if (policyType === 'file' && !fileDir.trim()) {
      toast('请输入缓存目录', 'error')
      return
    }
    setSubmitting(true)
    try {
      const created = await apiPost<{ cachePolicy: { id: number; name: string } }>('/servers/components/cache/createPopup', {
        name,
        type: policyType,
        fileDir,
        fileMemoryCapacityJSON: JSON.stringify(fileMemoryCapacity || { count: 0, unit: 'gb' }),
        fileOpenFileCacheMax,
        fileEnableSendfile: fileEnableSendfile ? 1 : '',
        fileMinFreeSizeJSON: JSON.stringify(fileMinFreeSize || { count: 0, unit: 'gb' }),
        capacityJSON: JSON.stringify(capacity || { count: 0, unit: 'gb' }),
        maxSizeJSON: JSON.stringify(maxSize || { count: 0, unit: 'byte' }),
        fetchTimeoutJSON: JSON.stringify(fetchTimeout || { count: 0, unit: 'minute' }),
        syncCompressionCache: syncCompressionCache ? 1 : '',
        enableMMAP: '',
        enableIncompletePartialContent: enableIncompletePartialContent ? 1 : '',
        description,
        isOn: isOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/servers/components/cache/policy?cachePolicyId=${created.cachePolicy.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>创建缓存策略</h3>
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
                <select className="ui dropdown auto-width" value={policyType} onChange={(event) => setPolicyType(event.target.value)}>
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
                    <input type="text" maxLength={500} value={fileDir} onChange={(event) => setFileDir(event.target.value)} />
                    <p className="comment">存放文件缓存的目录,通常填写绝对路径.</p>
                  </td>
                </tr>
                <tr>
                  <td className="color-border">缓存硬盘最大用量 *</td>
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
            ) : null}

            {policyType === 'memory' ? (
              <tr>
                <td>内存最大容量</td>
                <td>
                  <CapacityInput value={capacity} onChange={setCapacity} />
                  <p className="comment">单个节点上允许缓存的最大容量,如果为0表示没有限制.</p>
                </td>
              </tr>
            ) : null}

            <tr>
              <td>最大内容尺寸</td>
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
                    <p className="comment">缓存硬盘保留的最小空余空间,如果为0表示自动限制(目前默认保留5GiB).</p>
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
                      <input type="checkbox" checked={fileEnableSendfile} onChange={(event) => setFileEnableSendfile(event.target.checked)} />
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
                        checked={enableIncompletePartialContent}
                        onChange={(event) => setEnableIncompletePartialContent(event.target.checked)}
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

        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
          &nbsp;
          <button className="ui button" type="button" onClick={() => navigate('/servers/components/cache')}>
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
