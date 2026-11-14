import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'

interface TunnelNode {
  id: number
  name: string
  token: string
  clusterId: number
  clusterName: string
  userId: number
  userName: string
  serverAddr: string
  serverPort: number
  os: string
  arch: string
  isOn: boolean
  isInstalled: boolean
  createdAtText: string
}

interface TunnelNodesData {
  nodes: TunnelNode[]
  count: number
  page: number
  size: number
  keyword: string
  clusterId: number
  userId: number
}

export function TunnelNodesPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [installNode, setInstallNode] = useState<TunnelNode | null>(null)

  const query = useQuery({
    queryKey: ['tunnel-nodes', page, keyword],
    queryFn: () => apiGet<TunnelNodesData>('/tunnels/nodes', { page, keyword }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => apiPost('/tunnels/nodes/delete', { tunnelNodeId: id }),
    onSuccess: async () => {
      toast('已删除')
      await queryClient.invalidateQueries({ queryKey: ['tunnel-nodes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const markInstalled = useMutation({
    mutationFn: ({ id, isInstalled }: { id: number; isInstalled: boolean }) =>
      apiPost('/tunnels/nodes/updateInstalled', { tunnelNodeId: id, isInstalled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tunnel-nodes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const totalPages = Math.max(1, Math.ceil(data.count / data.size))
  const origin = window.location.origin
  const linuxCommand = (node: TunnelNode) =>
    `curl -fsSL '${origin}/tunnels/install?token=${node.token}&os=linux' -o install.sh && bash install.sh install`
  const windowsCommand = (node: TunnelNode) =>
    `Invoke-WebRequest -UseBasicParsing '${origin}/tunnels/install?token=${node.token}&os=windows' -OutFile install.ps1; .\\install.ps1 install`

  return (
    <div>
      <div className="ui menu text blue second-menu">
        <a className="item active" href="/tunnels/nodes">节点</a>
        <span className="disabled item">|</span>
        <Link className="item" to="/tunnels/nodes/create">[创建节点]</Link>
      </div>

      <div className="ui form">
        <div className="ui fields inline">
          <div className="field">
            <input
              type="text"
              placeholder="搜索名称"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>

      <table className="ui table selectable celled">
        <thead>
          <tr>
            <th>名称</th>
            <th>集群</th>
            <th>用户</th>
            <th>FRPS</th>
            <th>系统</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.nodes.length === 0 ? (
            <tr><td colSpan={8}>暂无隧道节点</td></tr>
          ) : data.nodes.map((node) => (
            <tr key={node.id}>
              <td>{node.name}</td>
              <td>{node.clusterName || node.clusterId}</td>
              <td>{node.userName || node.userId}</td>
              <td>{node.serverAddr}:{node.serverPort}</td>
              <td>{node.os}/{node.arch}</td>
              <td>{node.isInstalled ? <span className="green">已安装</span> : <span className="grey">未安装</span>}</td>
              <td>{node.createdAtText}</td>
              <td>
                <button className="ui button mini" type="button" onClick={() => setInstallNode(node)}>安装命令</button>
                <button
                  className="ui button mini"
                  type="button"
                  onClick={() => markInstalled.mutate({ id: node.id, isInstalled: !node.isInstalled })}
                >
                  {node.isInstalled ? '标记未安装' : '标记已安装'}
                </button>
                <button
                  className="ui button mini red"
                  type="button"
                  onClick={async () => {
                    if (await confirm({ message: `确定删除隧道节点"${node.name}"?`, confirmText: '删除' })) {
                      remove.mutate(node.id)
                    }
                  }}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {installNode ? (
        <div className="ui segment">
          <div className="ui header">安装 {installNode.name}</div>
          <p>Linux:</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{linuxCommand(installNode)}</pre>
          <p>Windows (PowerShell, 管理员):</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{windowsCommand(installNode)}</pre>
          <button className="ui button small" type="button" onClick={() => setInstallNode(null)}>关闭</button>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="ui pagination menu">
          <a className={`item${page <= 1 ? ' disabled' : ''}`} href="" onClick={(event) => { event.preventDefault(); setPage(Math.max(1, page - 1)) }}>上一页</a>
          <span className="item">{page} / {totalPages}</span>
          <a className={`item${page >= totalPages ? ' disabled' : ''}`} href="" onClick={(event) => { event.preventDefault(); setPage(Math.min(totalPages, page + 1)) }}>下一页</a>
        </div>
      ) : null}
    </div>
  )
}
