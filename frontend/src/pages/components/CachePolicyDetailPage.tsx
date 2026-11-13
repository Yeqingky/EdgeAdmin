import { useQuery } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { capacityText, CachePolicyMenu, durationText, type CachePolicy, type ClusterOption } from './common'

interface CachePolicyData {
  cachePolicy: CachePolicy
  cachePolicyId: number
  cachePolicyName: string
  fetchTimeoutString: string
  typeName: string
  clusters: ClusterOption[]
}

export function CachePolicyDetailPage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-policy', cachePolicyId],
    queryFn: () => apiGet<CachePolicyData>('/servers/components/cache/policy', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const policy = data.cachePolicy
  const options = policy.options || {}
  const memoryCapacity = options.memoryPolicy?.capacity
  const refs = policy.cacheRefs || []
  const moreRequired = true

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="index" />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">策略名称</td>
            <td>{policy.name}</td>
          </tr>
          <tr>
            <td>状态</td>
            <td>
              <StatusLabel isOn={policy.isOn} />
            </td>
          </tr>
          <tr>
            <td className="color-border">缓存类型</td>
            <td>
              {data.typeName}
              <span className="small">({policy.type})</span>
            </td>
          </tr>

          {policy.type === 'file' ? (
            <>
              <tr>
                <td className="color-border">缓存目录</td>
                <td>
                  {options.dir || ''}
                  <p className="comment">存放文件缓存的目录,通常填写绝对路径.</p>
                </td>
              </tr>
              <tr>
                <td className="color-border">缓存硬盘最大用量</td>
                <td>
                  {capacityText(policy.capacity) ? capacityText(policy.capacity) : <span className="disabled">不限</span>}
                  <p className="comment">单个节点上缓存所在硬盘的最大用量,如果为0表示没有限制.</p>
                </td>
              </tr>
              {memoryCapacity && memoryCapacity.count > 0 ? (
                <tr>
                  <td className="color-border">内存最大容量</td>
                  <td>
                    {capacityText(memoryCapacity)}
                    <p className="comment">
                      作为一级缓存的内存最大容量,可以作为硬盘缓冲区和存储热点缓存内容,如果为0表示不使用内存作为一级缓存.
                    </p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="color-border">内存最大容量</td>
                  <td>
                    <a href={`/servers/components/cache/update?cachePolicyId=${cachePolicyId}`}>
                      <span className="red">请设置一个内存容量作为缓冲区,以提升缓存写入性能.</span>
                    </a>
                  </td>
                </tr>
              )}
              {options.openFileCache && options.openFileCache.isOn && options.openFileCache.max ? (
                <tr>
                  <td className="color-border">缓存文件句柄缓存</td>
                  <td>{options.openFileCache.max}</td>
                </tr>
              ) : null}
              {options.enableSendfile ? (
                <tr>
                  <td className="color-border">开启Sendfile</td>
                  <td>
                    <span className="green">Y</span>
                  </td>
                </tr>
              ) : null}
              {options.minFreeSize && options.minFreeSize.count > 0 ? (
                <tr>
                  <td className="color-border">缓存硬盘最小空余空间</td>
                  <td>{capacityText(options.minFreeSize)}</td>
                </tr>
              ) : null}
              {options.enableIncompletePartialContent ? (
                <tr>
                  <td className="color-border">允许读取不完整的Partial Content</td>
                  <td>
                    <span className="green">Y</span>
                  </td>
                </tr>
              ) : null}
            </>
          ) : (
            <tr>
              <td>缓存最大容量</td>
              <td>
                {capacityText(policy.capacity) ? capacityText(policy.capacity) : <span className="disabled">不限</span>}
                <p className="comment">允许缓存的最大容量,如果为0表示没有限制.</p>
              </td>
            </tr>
          )}

          <tr>
            <td colSpan={2}>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  const target = document.getElementById('cache-more-options')
                  if (target) {
                    target.style.display = target.style.display === 'none' ? '' : 'none'
                  }
                }}
              >
                [更多选项]
              </a>
            </td>
          </tr>
        </tbody>
        <tbody id="cache-more-options" style={{ display: moreRequired ? '' : 'none' }}>
          <tr>
            <td>最大内容长度</td>
            <td>
              {capacityText(policy.maxSize) ? capacityText(policy.maxSize) : <span className="disabled">不限</span>}
              <p className="comment">允许缓存的单个内容最大尺寸,如果为0表示没有限制.</p>
            </td>
          </tr>
          <tr>
            <td>同步写入压缩缓存</td>
            <td>
              {policy.syncCompressionCache ? <span className="green">Y</span> : <span className="disabled">N</span>}
            </td>
          </tr>
          <tr>
            <td>预热超时时间</td>
            <td>
              {data.fetchTimeoutString ? data.fetchTimeoutString : <span className="disabled">使用默认</span>}
              {!data.fetchTimeoutString && durationText(policy.fetchTimeout) ? <span> {durationText(policy.fetchTimeout)}</span> : null}
            </td>
          </tr>
          <tr>
            <td>描述</td>
            <td>
              {policy.description ? policy.description : <span className="disabled">暂时还没有描述.</span>}
            </td>
          </tr>
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
            </tr>
          </thead>
          <tbody>
            {refs.map((ref, index) => (
              <tr key={index}>
                <td>
                  <span className={ref.isOn ? undefined : 'disabled'}>{ref.key || ''}</span>
                  {ref.isReverse ? <span className="ui label tiny basic">反向</span> : null}
                </td>
                <td>{durationText(ref.life) || <span className="disabled">不限</span>}</td>
                <td>{(ref.status || []).join(', ') || <span className="disabled">-</span>}</td>
                <td>{(ref.methods || []).join(', ') || <span className="disabled">-</span>}</td>
                <td>
                  {capacityText(ref.minSize) || '0'} ~ {capacityText(ref.maxSize) || '不限'}
                </td>
                <td className="center">
                  <StatusLabel isOn={ref.isOn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h4>使用此策略的集群</h4>
      {data.clusters.length === 0 ? <p className="comment">暂时还没有集群使用此策略.</p> : null}
      {data.clusters.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {data.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td>
                  {cluster.name}
                  <a href={`/clusters/cluster?clusterId=${cluster.id}`} title="查看集群" style={{ marginLeft: '0.5em' }}>
                    <Link2 size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
