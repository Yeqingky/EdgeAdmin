import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { FormRow, FormTable } from '../../components/form'
import { DbTabs } from './DbTabs'
import { useEffect } from 'react'

interface DbNode {
  id: number
  isOn: boolean
  name: string
  database: string
  host: string
  port: number
  username: string
  password: string
  description: string
}

export function DbNodeDetailPage() {
  const [params] = useSearchParams()
  const nodeId = Number(params.get('nodeId') || 0)
  const query = useQuery({ queryKey: ['db-node', nodeId], queryFn: () => apiGet<{ node: DbNode }>('/db/node', { nodeId }) })
  const [status, setStatus] = useState<{ isOk: boolean; error: string; size: string; version: string } | null>(null)

  useEffect(() => {
    if (nodeId > 0) {
      apiPost<{ status: { isOk: boolean; error: string; size: string; version: string } }>('/db/status', { nodeId })
        .then((data) => setStatus(data.status))
        .catch(() => undefined)
    }
  }, [nodeId])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const node = query.data.node

  return (
    <div>
      <DbTabs nodeId={node.id} active="node" />
      <FormTable>
        <FormRow title="节点名称">{node.name}</FormRow>
        <FormRow title="状态">
          <StatusLabel isOn={node.isOn} />
          {node.isOn && status ? (
            <div style={{ marginTop: '0.8em' }}>
              {status.isOk ? (
                <p className="comment">
                  {status.version ? `版本: v${status.version} / ` : ''}
                  用量:{status.size}
                </p>
              ) : (
                <span className="red">连接错误:{status.error}</span>
              )}
            </div>
          ) : null}
        </FormRow>
        <FormRow title="主机地址(Host)">{node.host}</FormRow>
        <FormRow title="数据库端口(Port)">{node.port}</FormRow>
        <FormRow title="数据库名称(Database)">{node.database}</FormRow>
        <FormRow title="用户名(Username)">{node.username}</FormRow>
        <FormRow title="密码(Password)">{node.password || <span className="disabled">-</span>}</FormRow>
        <FormRow title="详细描述">{node.description || <span className="disabled">-</span>}</FormRow>
      </FormTable>
    </div>
  )
}
