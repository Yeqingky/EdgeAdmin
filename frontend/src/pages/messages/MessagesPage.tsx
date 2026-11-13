import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'

interface MessageItem {
  id: number
  role: string
  isRead: boolean
  body: string
  level: string
  datetime: string
  params: string
  type: string
  cluster?: { id: number; name: string }
  node?: { id: number; name: string }
}

export function MessagesPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['messages'], queryFn: () => apiGet<{ messages: MessageItem[]; page: string }>('/messages') })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function readAll() {
    if (!(await confirm({ message: '确定要设置所有的未读消息为已读吗？' }))) {
      return
    }
    await apiPost('/messages/readAll')
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
  }

  async function readPage() {
    if (!(await confirm({ message: '确定要设置当前页的未读消息为已读吗？' }))) {
      return
    }
    await apiPost('/messages/readPage', { messageIds: query.data?.messages.map((message) => message.id) || [] })
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
  }

  async function readMessage(id: number) {
    await apiPost('/messages/readPage', { messageIds: [id] })
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
  }

  return (
    <div>
      {query.data.messages.length > 0 ? (
        <div className="ui menu text blue first-menu">
          <a href="" className="item" onClick={(event) => { event.preventDefault(); void readPage() }}>[当前页已读]</a>
          <a href="" className="item" onClick={(event) => { event.preventDefault(); void readAll() }}>[全部已读]</a>
        </div>
      ) : null}
      <div className="margin" />
      {query.data.messages.length === 0 ? <p className="comment">暂时还没有消息。</p> : null}
      {query.data.messages.map((message) => (
        <table className="ui table selectable" key={message.id}>
          <tbody>
            <tr className={message.level === 'error' ? 'error' : message.level === 'success' ? 'positive' : message.level === 'warning' ? 'warning' : undefined}>
              <td style={{ position: 'relative' }}>
                <strong>{message.datetime}</strong>
                {message.cluster?.id ? (
                  <span>
                    {' | '}
                    <a href={`/clusters/cluster?clusterId=${message.cluster.id}`}>集群：{message.cluster.name}</a>
                  </span>
                ) : null}
                {message.node?.id ? (
                  <span>
                    {' | '}
                    <a href={`/clusters/cluster/node?clusterId=${message.cluster?.id}&nodeId=${message.node.id}`}>节点：{message.node.name}</a>
                  </span>
                ) : null}
                <a
                  href=""
                  style={{ position: 'absolute', right: '1em' }}
                  title="标为已读"
                  onClick={(event) => { event.preventDefault(); void readMessage(message.id) }}
                >
                  <Check size={14} />
                </a>
              </td>
            </tr>
            <tr className={message.level === 'error' ? 'error' : message.level === 'success' ? 'positive' : message.level === 'warning' ? 'warning' : undefined}>
              <td>
                <pre style={{ padding: 0, margin: 0, wordBreak: 'break-all' }}>{message.body}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      ))}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
