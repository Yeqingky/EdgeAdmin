import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { SubmitButton } from '../../components/form'
import { ServerSettingsShell, useServerId, type ServerSettingsBase } from './shared'
import { CacheMenu } from './CachePage'

interface WebConfigInfo {
  cache?: { isOn: boolean } | null
}

interface CachePurgeData extends ServerSettingsBase {
  webId: number
  webConfig: WebConfigInfo
}

export function ServerCachePurgePage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-cache-purge', serverId],
    queryFn: () => apiGet<CachePurgeData>('/servers/server/settings/cache/purge', { serverId }),
    enabled: serverId > 0,
  })
  const [keyType, setKeyType] = useState<'key' | 'prefix'>('key')
  const [keys, setKeys] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

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
  const cacheIsOn = !!data.webConfig?.cache?.isOn

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      await apiPost('/servers/server/settings/cache/purge', {
        serverId,
        webId: data.webId,
        keyType,
        keys,
      })
      toast('任务提交成功，请等待节点配置刷新')
      setKeys('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <CacheMenu active="purge" />
      <div className="margin" />
      {!cacheIsOn ? (
        <p className="comment">没有开启缓存，不需要刷新。</p>
      ) : (
        <div>
          <p className="comment">可以在这里批量刷新一组URL缓存。</p>
          <form className="ui form" onSubmit={submit}>
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
                    <textarea name="keys" rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} />
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
                    {submitting ? <div>数据发送中...</div> : null}
                    {!submitting && message.length > 0 ? <span className="red">失败：{message}</span> : null}
                  </td>
                </tr>
              </tbody>
            </table>
            <SubmitButton submitting={submitting}>提交</SubmitButton>
          </form>
        </div>
      )}
    </ServerSettingsShell>
  )
}
