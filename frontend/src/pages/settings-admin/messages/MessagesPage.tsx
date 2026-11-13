import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { apiGet, apiPostForm } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { PageHeader } from '../../../components/PageHeader'

interface MessageCluster {
  id?: number
  name?: string
}

interface MessageNode {
  id?: number
  name?: string
}

interface MessageItem {
  id: number
  role: string
  isRead: boolean
  body: string
  level: string
  datetime: string
  params: string
  type: string
  cluster: MessageCluster
  node: MessageNode
}

interface MessagesData {
  messages: MessageItem[]
  page: string
}

function messageClass(level: string) {
  if (level === 'error') {
    return 'error'
  }
  if (level === 'success') {
    return 'positive'
  }
  if (level === 'warning') {
    return 'warning'
  }
  return ''
}

export function MessagesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['messages'],
    queryFn: () => apiGet<MessagesData>('/messages'),
  })
  const [reading, setReading] = useState(false)

  async function postRead(url: string, messageIds: number[]) {
    setReading(true)
    try {
      const form = new FormData()
      for (const id of messageIds) {
        form.append('messageIds', String(id))
      }
      await apiPostForm(url, form)
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setReading(false)
    }
  }

  async function readAll() {
    if (!(await confirm({ message: '确定要设置所有的未读消息为已读吗？' }))) {
      return
    }
    await postRead('/messages/readAll', [])
  }

  async function readPage() {
    if (!query.data) {
      return
    }
    if (!(await confirm({ message: '确定要设置当前页的未读消息为已读吗？' }))) {
      return
    }
    await postRead('/messages/readPage', query.data.messages.map((message) => message.id))
  }

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const messages = query.data.messages

  return (
    <div>
      {messages.length > 0 ? (
        <PageHeader>
          <a
            href=""
            className="item"
            onClick={(event) => {
              event.preventDefault()
              if (!reading) {
                void readPage()
              }
            }}
          >
            [当前页已读]
          </a>
          <a
            href=""
            className="item"
            onClick={(event) => {
              event.preventDefault()
              if (!reading) {
                void readAll()
              }
            }}
          >
            [全部已读]
          </a>
        </PageHeader>
      ) : null}
      <div className="margin" />

      {messages.length === 0 ? <p className="comment">暂时还没有消息。</p> : null}

      {messages.map((message) => {
        const params = message.params.length > 0 ? (JSON.parse(message.params) as Record<string, unknown> | null) : null
        let paramItems: { node?: { id?: number; name?: string }; error?: string }[] = []
        if (message.type === 'HealthCheckFailed' && params) {
          paramItems = (Array.isArray(params) ? params : []) as { node?: { id?: number; name?: string }; error?: string }[]
        }
        return (
          <div key={message.id}>
            <table className="ui table selectable">
              <tbody>
                <tr className={messageClass(message.level)}>
                  <td style={{ position: 'relative' }}>
                    <strong>{message.datetime}</strong>
                    {message.cluster && message.cluster.id != null ? (
                      <span>
                        <span> | </span>
                        {message.role === 'node' ? (
                          <a href={`/clusters/cluster?clusterId=${message.cluster.id}`}>集群：{message.cluster.name}</a>
                        ) : null}
                        {message.role === 'dns' ? (
                          <a href={`/dns/clusters/cluster?clusterId=${message.cluster.id}`}>DNS集群：{message.cluster.name}</a>
                        ) : null}
                      </span>
                    ) : null}
                    {message.node && message.node.id != null ? (
                      <span>
                        <span> | </span>
                        {message.role === 'node' ? (
                          <a href={`/clusters/cluster/node?clusterId=${message.cluster.id}&nodeId=${message.node.id}`}>节点：{message.node.name}</a>
                        ) : null}
                        {message.role === 'dns' ? (
                          <a href={`/dns/clusters/cluster?clusterId=${message.cluster.id}&nodeId=${message.node.id}`}>DNS节点：{message.node.name}</a>
                        ) : null}
                      </span>
                    ) : null}
                    <a
                      href=""
                      style={{ position: 'absolute', right: '1em' }}
                      title="标为已读"
                      onClick={(event) => {
                        event.preventDefault()
                        if (!reading) {
                          void postRead('/messages/readPage', [message.id])
                        }
                      }}
                    >
                      <Check size={14} />
                    </a>
                  </td>
                </tr>
                <tr className={messageClass(message.level)}>
                  <td>
                    <pre style={{ padding: 0, margin: 0, wordBreak: 'break-all' }}>{message.body}</pre>

                    {message.type === 'HealthCheckFailed'
                      ? paramItems.map((param, index) => (
                          <a
                            key={index}
                            href={`/clusters/cluster/node?clusterId=${message.cluster.id}&nodeId=${param.node?.id ?? ''}`}
                            className="ui label small basic"
                            style={{ marginBottom: '0.5em' }}
                          >
                            {param.node?.name}: {param.error}
                          </a>
                        ))
                      : null}

                    {message.type === 'ClusterDNSSyncFailed' ? (
                      <div style={{ marginTop: '0.8em' }}>
                        <a href={`/dns/clusters/cluster?clusterId=${message.cluster.id}`}>查看问题 &raquo;</a>
                      </div>
                    ) : null}

                    {message.type === 'SSLCertExpiring' || message.type === 'SSLCertACMETaskSuccess' || message.type === 'SSLCertACMETaskFailed' ? (
                      <div style={{ marginTop: '0.8em' }}>
                        <a href={`/servers/certs/certPopup?certId=${String(params?.certId ?? '')}`}>查看证书</a>
                        {params && Number(params.acmeTaskId) > 0 ? (
                          <span>
                            {' '}
                            | <a href="/servers/certs/acme">查看任务&raquo;</a>
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {message.type === 'serverNamesRequireAuditing' ? (
                      <div style={{ marginTop: '0.8em' }}>
                        <a href={`/servers/server/settings/serverNames?serverId=${String(params?.serverId ?? '')}`}>去审核</a>
                      </div>
                    ) : null}

                    {message.type === 'NodeSchedule' ? (
                      <div style={{ marginTop: '0.8em' }}>
                        <a href={`/clusters/cluster/node/update?clusterId=${message.cluster.id}&nodeId=${message.node.id}`}>
                          查看调度状态 &raquo;
                        </a>
                      </div>
                    ) : null}

                    {message.type === 'NodeOfflineDay' ? (
                      <div style={{ marginTop: '0.8em' }}>
                        <a href={`/clusters/cluster/node/detail?clusterId=${message.cluster.id}&nodeId=${message.node.id}`}>查看详情 &raquo;</a>
                      </div>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="margin" />
          </div>
        )
      })}

      <LegacyPagination html={query.data.page} />
    </div>
  )
}
