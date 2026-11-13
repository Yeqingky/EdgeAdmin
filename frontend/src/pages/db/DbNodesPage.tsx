import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'

interface DbNode {
  id: number
  isOn: boolean
  name: string
  host: string
  port: number
  database: string
  status: { isOk: boolean; error: string; size: string; version: string }
}

export function DbNodesPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const query = useQuery({ queryKey: ['db-nodes'], queryFn: () => apiGet<{ nodes: DbNode[]; page: string }>('/db') })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function remove(node: DbNode) {
    if (!(await confirm({ message: `确定要删除数据库节点 ${node.name} 吗？`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/db/delete', { nodeId: node.id })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['db-nodes'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <div className="ui menu text blue first-menu">
        <a className="item" href="#/db/create"><Plus size={14} /> [添加节点]</a>
      </div>
      {query.data.nodes.length === 0 ? <p className="comment">暂时还没有数据库节点。</p> : (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>节点名称</th>
              <th>连接地址</th>
              <th>数据库名</th>
              <th>数据库版本</th>
              <th>用量</th>
              <th className="center width10">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {query.data.nodes.map((node) => (
              <tr key={node.id}>
                <td><a href={`#/db/node?nodeId=${node.id}`}>{node.name}</a></td>
                <td>{node.host}:{node.port}</td>
                <td>{node.database}</td>
                <td>{node.status.version ? `v${node.status.version}` : <span className="disabled">-</span>}</td>
                <td>{node.status.isOk ? node.status.size : <span className="disabled">-</span>}</td>
                <td className="center">
                  {node.isOn ? (
                    node.status.isOk ? <span className="green">连接正常</span> : <span className="red" title={node.status.error}>连接错误</span>
                  ) : <span className="disabled">已禁用</span>}
                </td>
                <td>
                  <a href={`#/db/node?nodeId=${node.id}`}>详情</a> &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void remove(node) }}>删除</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
