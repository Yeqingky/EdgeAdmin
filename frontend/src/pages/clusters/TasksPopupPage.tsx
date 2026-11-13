import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { Checkbox } from '../../components/form'
import { apiPostMulti } from './shared'

interface TaskRow {
  id: number
  type: string
  node: { id: number; name: string }
  isOk: boolean
  error: string
  isDone: boolean
  updatedTime: string
}

interface ClusterTasks {
  id: number
  name: string
  tasks: TaskRow[]
}

interface TasksData {
  clusters: ClusterTasks[]
  countTasks: number
}

const taskTypeLabels = (type: string) => {
  if (type === 'configChanged' || type === 'globalServerConfigChanged') return '同步配置'
  if (type === 'ipItemChanged') return '同步IP名单'
  if (type === 'scriptsChanged') return '同步脚本'
  if (type === 'nodeLevelChanged') return '同步L2节点'
  if (type === 'ddosProtectionChanged') return 'DDoS配置'
  if (type === 'userServersStateChanged') return '用户网站状态'
  if (type.startsWith('ipListDeleted')) return '删除IP名单'
  return type
}

export function ClusterTasksPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const query = useQuery({ queryKey: ['cluster-tasks'], queryFn: () => apiGet<TasksData>('/clusters/tasks/listPopup') })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const checkedIds = Object.keys(checked).filter((key) => checked[Number(key)]).map(Number)

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: ['cluster-tasks'] })
  }

  async function removeTask(taskId: number) {
    try {
      await apiPost('/clusters/tasks/delete', { taskId })
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <h3>
        正在同步的节点任务
        {data.countTasks > 0 ? `(共${data.countTasks}个)` : ''}
      </h3>
      {data.clusters.length === 0 ? <p className="comment">暂时没有同步的任务.</p> : null}
      {data.clusters.length > 0 ? (
        <div>
          <button
            className="ui button basic tiny"
            onClick={async () => {
              if (!(await confirm({ message: '确定要清空所有任务吗?', danger: true, confirmText: '清空' }))) {
                return
              }
              try {
                await apiPost('/clusters/tasks/deleteAll', {})
                toast('清空成功')
                await reload()
              } catch (error) {
                toast(error instanceof Error ? error.message : '清空失败', 'error')
              }
            }}
          >
            清空所有任务
          </button>{' '}
          &nbsp;
          {checkedIds.length > 0 ? (
            <button
              className="ui button basic tiny"
              onClick={async () => {
                try {
                  await apiPostMulti('/clusters/tasks/deleteBatch', { taskIds: checkedIds })
                  toast('删除成功')
                  setChecked({})
                  await reload()
                } catch (error) {
                  toast(error instanceof Error ? error.message : '删除失败', 'error')
                }
              }}
            >
              批量删除{checkedIds.length}个任务
            </button>
          ) : null}

          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '3em' }} />
                <th className="three wide">集群</th>
                <th>节点</th>
                <th>任务</th>
                <th>状态</th>
                <th>触发时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.clusters.map((cluster) =>
                cluster.tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <Checkbox
                        label=""
                        checked={!!checked[task.id]}
                        onChange={(value) => setChecked((current) => ({ ...current, [task.id]: value }))}
                      />
                    </td>
                    <td>{cluster.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {task.node.name} &nbsp;{' '}
                      <a href={`/clusters/cluster/node?clusterId=${cluster.id}&nodeId=${task.node.id}`} target="_blank" rel="noreferrer">
                        查看
                      </a>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{taskTypeLabels(task.type)}</td>
                    <td>{task.isDone ? <span className="red">{task.error}</span> : <span>正在同步...</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{task.updatedTime}</td>
                    <td>
                      <a
                        href=""
                        title="删除"
                        onClick={(event) => {
                          event.preventDefault()
                          void removeTask(task.id)
                        }}
                      >
                        <Trash2 size={13} className="grey" />
                      </a>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          <p className="comment">
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                void reload()
              }}
            >
              <RefreshCw size={13} /> [刷新]
            </a>
          </p>
        </div>
      ) : null}
    </div>
  )
}
