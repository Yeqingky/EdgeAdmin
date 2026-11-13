import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { StatusLabel } from '../../components/StatusLabel'
import { useToast } from '../../components/Toast'
import {
  CachePolicyMenu,
  FailedKeyList,
  NodeResultLabels,
  postActionResult,
  type CachePolicy,
  type ClusterOption,
  type FailedKey,
  type NodeResult,
} from './common'

interface CachePolicyBaseData {
  cachePolicyId: number
  cachePolicyName: string
  clusters: ClusterOption[]
  clusterId?: number
  page?: string
}

function CacheLoading({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return <LoadingBlock />
  }
  if (isError) {
    return <div className="ui negative message">加载失败</div>
  }
  return null
}

export function CacheCleanPage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-clean', cachePolicyId],
    queryFn: () => apiGet<CachePolicyBaseData>('/servers/components/cache/clean', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })
  const [clusterId, setClusterId] = useState<number | null>(null)
  const [reason, setReason] = useState(0)
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<NodeResult[]>([])

  const loading = <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  if (query.isLoading || query.isError || !query.data) {
    return loading
  }
  const data = query.data
  const selectedClusterId = clusterId ?? data.clusterId ?? (data.clusters[0]?.id || 0)
  const reasonable = reason === 1 || reason === 2 || reason === 3

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setResults([])
    try {
      const response = await postActionResult<{ isAllOk: boolean; results: NodeResult[] }>('/servers/components/cache/clean', {
        cachePolicyId,
        clusterId: selectedClusterId,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        setOk(false)
        return
      }
      setOk(true)
      setResults(response.data.results || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="clean" />
      <h3>选择集群</h3>
      <select className="ui dropdown auto-width" value={selectedClusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
        {data.clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name}
          </option>
        ))}
      </select>
      <div className="ui divider" />

      <h3>清理</h3>
      <p>
        <span className="red">
          严重警告：该操作将清理集群所有节点上的所有当前策略产生的缓存；如果只是想清理单个缓存，请使用“刷新预热”功能。
        </span>
      </p>
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
              <td className="title">操作原因 *</td>
              <td>
                <p className="comment">为了防止新手滥用此功能、导致节点崩溃，你需要选择操作原因，才能继续操作：</p>
                {[
                  { value: 0, label: '我是一名新手，我不知道怎么清除缓存' },
                  { value: 2, label: '要清理的域名太多，我比较懒，我不想用“刷新预热”功能' },
                  { value: 3, label: '因节点硬盘空间不足或以往缓存设置错误或其他原因，想清除所有缓存，重新开始' },
                  { value: 1, label: '我怀疑“刷新预热”功能不起作用' },
                ].map((option) => (
                  <div key={option.value} style={{ marginTop: '0.6em' }}>
                    <label>
                      <input type="radio" checked={reason === option.value} onChange={() => setReason(option.value)} /> {option.label}
                    </label>
                  </div>
                ))}
              </td>
            </tr>
            {!reasonable ? (
              <tr>
                <td>新手操作建议</td>
                <td>
                  请使用左侧主菜单中的{' '}
                  <a href="/servers/components/cache/batch?keyType=prefix" target="_blank" rel="noreferrer">
                    [刷新预热]
                  </a>{' '}
                  功能来清理你的缓存。
                </td>
              </tr>
            ) : null}
            {reason === 1 ? (
              <tr>
                <td>操作建议</td>
                <td>
                  当前系统提供的{' '}
                  <a href="/servers/components/cache/batch?keyType=prefix" target="_blank" rel="noreferrer">
                    [刷新预热]
                  </a>{' '}
                  功能运行非常可靠，如果你确认发现功能异常，且能100%几率重现问题，请及时报告给软件开发者。
                </td>
              </tr>
            ) : null}
            {reason === 2 ? (
              <tr>
                <td>操作建议</td>
                <td>
                  请尽可能使用{' '}
                  <a href="/servers/components/cache/batch?keyType=prefix" target="_blank" rel="noreferrer">
                    [刷新预热]
                  </a>{' '}
                  功能，避免影响当前系统上的别的网站。
                </td>
              </tr>
            ) : null}
            {reason === 3 ? (
              <tr>
                <td>操作建议</td>
                <td>缓存文件较多时，系统需要消耗更多系统资源和更多时间删除缓存文件，硬盘使用空间会逐渐恢复，操作后，请耐心等待。</td>
              </tr>
            ) : null}
            {reasonable ? (
              <tr>
                <td className="title">操作结果</td>
                <td>
                  {requesting ? <div>数据发送中...</div> : null}
                  {!requesting && !ok && message.length > 0 ? <span className="red">失败：{message}</span> : null}
                  {!requesting && ok ? <NodeResultLabels results={results} /> : null}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {!requesting && reasonable ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : (
          <button className="ui button disabled" type="button">
            提交
          </button>
        )}
      </form>
    </div>
  )
}

export function CacheStatPage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-stat', cachePolicyId],
    queryFn: () => apiGet<CachePolicyBaseData>('/servers/components/cache/stat', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })
  const [clusterId, setClusterId] = useState<number | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<NodeResult[]>([])

  if (query.isLoading || query.isError || !query.data) {
    return <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  }
  const data = query.data
  const selectedClusterId = clusterId ?? data.clusterId ?? (data.clusters[0]?.id || 0)

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setResults([])
    try {
      const response = await postActionResult<{ isAllOk: boolean; results: NodeResult[] }>('/servers/components/cache/stat', {
        cachePolicyId,
        clusterId: selectedClusterId,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        return
      }
      setOk(true)
      setResults(response.data.results || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="stat" />
      <h3>选择集群</h3>
      <select className="ui dropdown auto-width" value={selectedClusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
        {data.clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name}
          </option>
        ))}
      </select>
      <div className="ui divider" />
      <h3>统计</h3>
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
              <td className="title">操作结果</td>
              <td>
                {requesting ? <div>数据发送中...</div> : null}
                {!requesting && !ok && message.length > 0 ? <span className="red">失败：{message}</span> : null}
                {!requesting && ok ? <NodeResultLabels results={results} /> : null}
              </td>
            </tr>
          </tbody>
        </table>
        {!requesting ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

export function CacheTestPage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-test', cachePolicyId],
    queryFn: () => apiGet<CachePolicyBaseData>('/servers/components/cache/test', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })
  const [clusterId, setClusterId] = useState<number | null>(null)
  const [writeKey, setWriteKey] = useState('my-key')
  const [writeValue, setWriteValue] = useState('my-value')
  const [readKey, setReadKey] = useState('my-key')
  const [writeState, setWriteState] = useState({ requesting: false, ok: false, message: '', results: [] as NodeResult[] })
  const [readState, setReadState] = useState({ requesting: false, ok: false, message: '', results: [] as NodeResult[] })

  if (query.isLoading || query.isError || !query.data) {
    return <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  }
  const data = query.data
  const selectedClusterId = clusterId ?? data.clusterId ?? (data.clusters[0]?.id || 0)

  async function submitWrite() {
    setWriteState({ requesting: true, ok: false, message: '', results: [] })
    try {
      const response = await postActionResult<{ isAllOk: boolean; results: NodeResult[] }>('/servers/components/cache/testWrite', {
        clusterId: selectedClusterId,
        cachePolicyId,
        key: writeKey,
        value: writeValue,
      })
      setWriteState({
        requesting: false,
        ok: response.code === 200,
        message: response.code === 200 ? '' : response.message,
        results: response.code === 200 ? response.data.results || [] : [],
      })
    } catch (error) {
      setWriteState({ requesting: false, ok: false, message: error instanceof Error ? error.message : '请求失败', results: [] })
    }
  }

  async function submitRead() {
    setReadState({ requesting: true, ok: false, message: '', results: [] })
    try {
      const response = await postActionResult<{ isAllOk: boolean; results: NodeResult[] }>('/servers/components/cache/testRead', {
        clusterId: selectedClusterId,
        cachePolicyId,
        key: readKey,
      })
      setReadState({
        requesting: false,
        ok: response.code === 200,
        message: response.code === 200 ? '' : response.message,
        results: response.code === 200 ? response.data.results || [] : [],
      })
    } catch (error) {
      setReadState({ requesting: false, ok: false, message: error instanceof Error ? error.message : '请求失败', results: [] })
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="test" />
      <h3>选择集群</h3>
      <select className="ui dropdown auto-width" value={selectedClusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
        {data.clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name}
          </option>
        ))}
      </select>
      <div className="ui divider" />

      <h3>测试写入</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submitWrite()
        }}
      >
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">Key</td>
              <td>
                <input type="text" value={writeKey} onChange={(event) => setWriteKey(event.target.value)} />
              </td>
            </tr>
            <tr>
              <td>Value</td>
              <td>
                <textarea rows={3} value={writeValue} onChange={(event) => setWriteValue(event.target.value)} />
              </td>
            </tr>
            <tr>
              <td>操作结果</td>
              <td>
                {writeState.requesting ? <div>数据发送中...</div> : null}
                {!writeState.requesting && !writeState.ok && writeState.message.length > 0 ? (
                  <span className="red">失败：{writeState.message}</span>
                ) : null}
                {!writeState.requesting && writeState.ok ? <NodeResultLabels results={writeState.results} /> : null}
              </td>
            </tr>
          </tbody>
        </table>
        {!writeState.requesting ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : null}
      </form>

      <div className="ui divider" />

      <h3>测试读取</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submitRead()
        }}
      >
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">Key</td>
              <td>
                <input type="text" value={readKey} onChange={(event) => setReadKey(event.target.value)} />
              </td>
            </tr>
            <tr>
              <td>操作结果</td>
              <td>
                {readState.requesting ? <div>数据发送中...</div> : null}
                {!readState.requesting && !readState.ok && readState.message.length > 0 ? (
                  <span className="red">失败：{readState.message}</span>
                ) : null}
                {!readState.requesting && readState.ok ? <NodeResultLabels results={readState.results} /> : null}
              </td>
            </tr>
          </tbody>
        </table>
        {!readState.requesting ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

export function CachePurgePage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-purge', cachePolicyId],
    queryFn: () => apiGet<CachePolicyBaseData>('/servers/components/cache/purge', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })
  const toast = useToast()
  const [keyType, setKeyType] = useState('key')
  const [keys, setKeys] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [failKeys, setFailKeys] = useState<FailedKey[]>([])

  if (query.isLoading || query.isError || !query.data) {
    return <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  }
  const data = query.data

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setFailKeys([])
    try {
      const response = await postActionResult<{ failKeys: FailedKey[] | null }>('/servers/components/cache/purge', {
        cachePolicyId,
        clusterId: 0,
        keyType,
        keys,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        setFailKeys(response.data?.failKeys || [])
        return
      }
      setOk(true)
      toast('任务提交成功')
      setKeys('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="purge" />
      <p className="comment">可以在这里批量刷新一组URL。</p>
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
              <td className="title">URL类型</td>
              <td>
                <label>
                  <input type="radio" checked={keyType === 'key'} onChange={() => setKeyType('key')} /> URL
                </label>
                &nbsp;
                <label>
                  <input type="radio" checked={keyType === 'prefix'} onChange={() => setKeyType('prefix')} /> 目录
                </label>
              </td>
            </tr>
            <tr>
              <td>{keyType === 'key' ? 'URL' : '目录'}</td>
              <td>
                <textarea rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} autoFocus />
                {keyType === 'key' ? (
                  <p className="comment">
                    每行一个URL，比如<code>https://example.com/hello/world.html</code>。
                  </p>
                ) : (
                  <p className="comment">
                    每行一个URL目录，比如<code>https://example.com/hello/</code>；如果只填写域名部分，表示清理全站，比如
                    <code>https://example.com/</code>。
                  </p>
                )}
              </td>
            </tr>
            <tr>
              <td>操作结果</td>
              <td>
                {requesting ? <div>数据发送中...</div> : null}
                {!requesting && !ok && message.length > 0 ? <span className="red">失败：{message}</span> : null}
                {!requesting && !ok ? <FailedKeyList failKeys={failKeys} /> : null}
                {!requesting && ok ? <span className="green">任务提交成功</span> : null}
              </td>
            </tr>
          </tbody>
        </table>
        {!requesting ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

export function CacheFetchPage({ cachePolicyId }: { cachePolicyId: number }) {
  const query = useQuery({
    queryKey: ['cache-fetch', cachePolicyId],
    queryFn: () => apiGet<CachePolicyBaseData>('/servers/components/cache/fetch', { cachePolicyId }),
    enabled: cachePolicyId > 0,
  })
  const toast = useToast()
  const [keys, setKeys] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [failKeys, setFailKeys] = useState<FailedKey[]>([])

  if (query.isLoading || query.isError || !query.data) {
    return <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  }
  const data = query.data

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setFailKeys([])
    try {
      const response = await postActionResult<{ failKeys: FailedKey[] | null }>('/servers/components/cache/fetch', {
        cachePolicyId,
        clusterId: 0,
        keys,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        setFailKeys(response.data?.failKeys || [])
        return
      }
      setOk(true)
      toast('任务提交成功')
      setKeys('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CachePolicyMenu cachePolicyId={cachePolicyId} cachePolicyName={data.cachePolicyName} active="fetch" />
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
              <td>URL列表</td>
              <td>
                <textarea rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} autoFocus />
                <p className="comment">每行一个URL。</p>
              </td>
            </tr>
            <tr>
              <td className="title">操作结果</td>
              <td>
                {requesting ? <div>数据发送中...</div> : null}
                {!requesting && !ok && message.length > 0 ? <span className="red">失败：{message}</span> : null}
                {!requesting && !ok ? <FailedKeyList failKeys={failKeys} /> : null}
                {!requesting && ok ? <span className="green">任务提交成功</span> : null}
              </td>
            </tr>
          </tbody>
        </table>
        {!requesting ? (
          <div style={{ marginTop: '1em' }}>
            <button className="ui button primary" type="submit">
              提交
            </button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

interface CacheSelectData {
  cachePolicies: CachePolicy[]
  page: string
}

export function CacheSelectPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['cache-select'],
    queryFn: () => apiGet<CacheSelectData>('/servers/components/cache/selectPopup'),
  })
  if (query.isLoading || query.isError || !query.data) {
    return <CacheLoading isLoading={query.isLoading} isError={query.isError} />
  }
  const policies = query.data.cachePolicies || []
  return (
    <div>
      <h3>选择缓存策略</h3>
      <table className="ui table selectable">
        <thead>
          <tr>
            <th>策略名称</th>
            <th style={{ width: '7em' }}>状态</th>
            <th className="two op">操作</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.name}</td>
              <td>
                <StatusLabel isOn={policy.isOn} />
              </td>
              <td>
                {policy.isOn ? (
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      navigate(`/servers/components/cache/policy?cachePolicyId=${policy.id}`)
                    }}
                  >
                    选择
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
