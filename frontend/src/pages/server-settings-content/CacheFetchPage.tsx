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

interface CacheFetchData extends ServerSettingsBase {
  webId: number
  webConfig: WebConfigInfo
}

export function ServerCacheFetchPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-cache-fetch', serverId],
    queryFn: () => apiGet<CacheFetchData>('/servers/server/settings/cache/fetch', { serverId }),
    enabled: serverId > 0,
  })
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
      await apiPost('/servers/server/settings/cache/fetch', {
        serverId,
        webId: data.webId,
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
      <CacheMenu active="fetch" />
      <div className="margin" />
      {!cacheIsOn ? (
        <p className="comment">没有开启缓存，暂时无法预热缓存。</p>
      ) : (
        <div>
          <p className="comment">可以在这里批量预热一组URL。</p>
          <form className="ui form" onSubmit={submit}>
            <table className="ui table definition selectable">
              <tbody>
                <tr>
                  <td>URL列表</td>
                  <td>
                    <textarea name="keys" rows={10} value={keys} onChange={(event) => setKeys(event.target.value)} />
                    <p className="comment">每行一个URL。</p>
                  </td>
                </tr>
                <tr>
                  <td className="title">操作结果</td>
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
