import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { MenuLinks } from './ui'
import { postForm, type DNSTaskItem, type DNSTasksData } from './shared'

export function DnsTasksPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dns-tasks'],
    queryFn: () => apiGet<DNSTasksData>('/dns/tasks/listPopup'),
    refetchInterval: 3000,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const tasks = query.data.tasks || []

  async function deleteTask(taskId: number) {
    if (!(await confirm({ message: '确定要删除这个任务吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postForm('/dns/tasks/delete', { taskId })
      await queryClient.invalidateQueries({ queryKey: ['dns-tasks'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function deleteAllTasks() {
    if (!(await confirm({ message: '确定要清空所有的任务吗?', danger: true, confirmText: '清空' }))) {
      return
    }
    try {
      await postForm('/dns/tasks/deleteAll', {})
      await queryClient.invalidateQueries({ queryKey: ['dns-tasks'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '清空失败', 'error')
    }
  }

  function taskTypeName(type: string): string {
    if (type === 'clusterChange' || type === 'clusterNodesChange' || type === 'clusterRemoveDomain') {
      return '集群'
    }
    if (type === 'nodeChange') {
      return '节点'
    }
    if (type === 'serverChange') {
      return '网站'
    }
    if (type === 'domainChange') {
      return '域名'
    }
    return type
  }

  function renderTarget(task: DNSTaskItem) {
    if ((task.type === 'clusterChange' || task.type === 'clusterNodesChange' || task.type === 'clusterRemoveDomain') && task.cluster) {
      return (
        <span>
          {task.cluster.name}{' '}
          <Link to={`/dns/clusters/cluster?clusterId=${task.cluster.id}`} target="_top">
            »
          </Link>
        </span>
      )
    }
    if (task.type === 'nodeChange' && task.node) {
      return <span>{task.node.name}</span>
    }
    if (task.type === 'serverChange' && task.server) {
      return <span>{task.server.name}</span>
    }
    if (task.type === 'domainChange' && task.domain) {
      return <span>{task.domain.name}</span>
    }
    return <span className="disabled">-</span>
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns' },
          { name: 'DNS服务商', to: '/dns/providers' },
          { name: '问题修复', to: '/dns/issues' },
          { name: '同步任务', to: '/dns/tasks/listPopup', active: true },
        ]}
      />

      <h3>正在同步的DNS任务{tasks.length > 0 ? `(共${tasks.length}个)` : ''}</h3>
      {tasks.length === 0 ? <p className="comment">暂时没有同步的任务.</p> : null}
      {tasks.length > 0 ? (
        <div>
          <button className="ui button tiny basic" type="button" onClick={() => void deleteAllTasks()}>
            清空所有任务
          </button>

          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th className="three wide">对象</th>
                <th>任务</th>
                <th>状态</th>
                <th>触发时间</th>
                <th className="one op" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{renderTarget(task)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{taskTypeName(task.type)}</td>
                  <td style={{ wordBreak: 'break-word', width: '26em' }}>
                    {task.isDone ? <span className="red">{task.error}</span> : <span>正在同步...</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{task.updatedTime}</td>
                  <td>
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); void deleteTask(task.id) }}>
                      <Trash2 size={12} className="grey" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
