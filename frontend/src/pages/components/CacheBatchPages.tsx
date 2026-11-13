import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { CacheBatchMenu, FailedKeyList, postActionResult, postFormValues, type FailedKey } from './common'

interface BatchBaseData {
  countDoingTasks: number
}

interface BatchTaskUser {
  id: number
  username: string
  fullname: string
}

interface BatchTaskSummary {
  id: number
  type: string
  keyType: string
  isDone: boolean
  isOk: boolean
  createdTime: string
  description: string
  user: BatchTaskUser
}

interface BatchTaskKey {
  key: string
  isDone: boolean
  isDoing: boolean
  errors: { nodeId: number; error: string }[]
  cluster: { id: number; name: string }
}

interface BatchTaskDetail extends BatchTaskSummary {
  doneTime: string
  keys: BatchTaskKey[]
}

interface BatchPurgeData extends BatchBaseData {
  keyType: string
}

interface BatchTasksData extends BatchBaseData {
  tasks: BatchTaskSummary[]
  page: string
}

interface BatchTaskData extends BatchBaseData {
  task: BatchTaskDetail
}

function TaskTypeLabel({ type }: { type: string }) {
  return <>{type === 'purge' ? '刷新' : type === 'fetch' ? '预热' : type}</>
}

function TaskStatus({ task }: { task: BatchTaskSummary }) {
  if (task.isOk) {
    return <span className="green">已完成</span>
  }
  if (task.isDone) {
    return <span className="red">失败</span>
  }
  return <span className="grey">等待执行</span>
}

export function CacheBatchPurgePage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const initialKeyType = searchParams.get('keyType') || 'key'
  const [keyType, setKeyType] = useState(initialKeyType === 'prefix' ? 'prefix' : 'key')
  const [keys, setKeys] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [failKeys, setFailKeys] = useState<FailedKey[]>([])

  const query = useQuery({
    queryKey: ['cache-batch-purge'],
    queryFn: () => apiGet<BatchPurgeData>('/servers/components/cache/batch', { keyType: initialKeyType }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setFailKeys([])
    try {
      const csrfToken = await getCsrfToken()
      const response = await postActionResult<{ failKeys: FailedKey[] | null }>('/servers/components/cache/batch', {
        keyType,
        keys,
        csrfToken,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        setFailKeys(response.data?.failKeys || [])
        return
      }
      setOk(true)
      toast('任务提交成功')
      setKeys('')
      await queryClient.invalidateQueries({ queryKey: ['cache-batch-purge'] })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CacheBatchMenu active="purge" countDoingTasks={query.data.countDoingTasks} />
      <div className="margin" />
      <div>
        <span className="grey">
          刷新缓存指的是标记URL列表或目录为失效状态，当有新的用户请求这些URL时，会再次从源站读取最新的内容。
        </span>
      </div>
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
              <td>{keyType === 'key' ? '要刷新的URL列表' : '要刷新的URL目录列表'}</td>
              <td>
                <textarea rows={20} value={keys} onChange={(event) => setKeys(event.target.value)} autoFocus />
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

export function CacheBatchFetchPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [keys, setKeys] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [ok, setOk] = useState(false)
  const [message, setMessage] = useState('')
  const [failKeys, setFailKeys] = useState<FailedKey[]>([])

  const query = useQuery({
    queryKey: ['cache-batch-fetch'],
    queryFn: () => apiGet<BatchBaseData>('/servers/components/cache/batch/fetch'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    setRequesting(true)
    setOk(false)
    setMessage('')
    setFailKeys([])
    try {
      const csrfToken = await getCsrfToken()
      const response = await postActionResult<{ failKeys: FailedKey[] | null }>('/servers/components/cache/batch/fetch', {
        keys,
        csrfToken,
      })
      if (response.code !== 200) {
        setMessage(response.message)
        setFailKeys(response.data?.failKeys || [])
        return
      }
      setOk(true)
      toast('任务提交成功')
      setKeys('')
      await queryClient.invalidateQueries({ queryKey: ['cache-batch-fetch'] })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <CacheBatchMenu active="fetch" countDoingTasks={query.data.countDoingTasks} />
      <div className="margin" />
      <div>
        <span className="grey">
          预热缓存指的是预先从源站读取最新内容，当用户访问预热后的URL时直接从缓存中返回内容，不需要再次回源。
        </span>
      </div>
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
              <td>要预热的URL列表</td>
              <td>
                <textarea rows={20} value={keys} onChange={(event) => setKeys(event.target.value)} autoFocus />
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

export function CacheBatchTasksPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cache-batch-tasks'],
    queryFn: () => apiGet<BatchTasksData>('/servers/components/cache/batch/tasks'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const tasks = query.data.tasks || []

  async function deleteTask(taskId: number) {
    if (!(await confirm({ message: '确定要删除此任务吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/cache/batch/deleteTask', { taskId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cache-batch-tasks'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <CacheBatchMenu active="task" countDoingTasks={query.data.countDoingTasks} />
      {tasks.length === 0 ? <p className="comment">暂时还没有任务。</p> : null}
      {tasks.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '7em' }}>任务编号</th>
              <th>任务类型</th>
              <th>URL类型</th>
              <th>创建时间</th>
              <th className="four wide">所属用户</th>
              <th className="two wide">任务状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <a href={`#/servers/components/cache/batch/task?taskId=${task.id}`}>{task.id}</a>
                </td>
                <td>
                  <TaskTypeLabel type={task.type} />
                </td>
                <td>{task.keyType === 'key' ? 'URL' : task.keyType === 'prefix' ? '目录' : task.keyType}</td>
                <td>{task.createdTime}</td>
                <td>
                  {task.user && task.user.id > 0 ? <span>{task.user.fullname || task.user.username}</span> : null}
                  {task.description ? <span className="grey"> {task.description}</span> : <span className="disabled"> -</span>}
                </td>
                <td>
                  <TaskStatus task={task} />
                </td>
                <td>
                  <a href={`#/servers/components/cache/batch/task?taskId=${task.id}`}>详情</a> &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteTask(task.id)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}

export function CacheBatchTaskPage({ taskId }: { taskId: number }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cache-batch-task', taskId],
    queryFn: () => apiGet<BatchTaskData>('/servers/components/cache/batch/task', { taskId }),
    enabled: taskId > 0,
    refetchInterval: 10_000,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const task = query.data.task

  async function deleteTask() {
    if (!(await confirm({ message: '确定要删除此任务吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/cache/batch/deleteTask', { taskId })
      toast('删除成功')
      navigate('/servers/components/cache/batch/tasks')
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function resetTask() {
    if (!(await confirm({ message: '确定要重置任务状态吗？' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/cache/batch/resetTask', { taskId })
      toast('重置成功')
      await queryClient.invalidateQueries({ queryKey: ['cache-batch-task', taskId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '重置失败', 'error')
    }
  }

  return (
    <div>
      <CacheBatchMenu active="task" countDoingTasks={query.data.countDoingTasks} />
      <div className="ui menu text blue second-menu">
        <a className="item" href="#/servers/components/cache/batch/tasks">
          所有任务
        </a>
        <span className="disabled item" style={{ padding: 0 }}>
          »
        </span>
        <span className="item">任务详情</span>
      </div>

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">任务编号</td>
            <td>{task.id}</td>
          </tr>
          <tr>
            <td>任务类型</td>
            <td>
              <TaskTypeLabel type={task.type} />
            </td>
          </tr>
          <tr>
            <td>缓存URL类型</td>
            <td>{task.keyType === 'key' ? 'URL' : task.keyType === 'prefix' ? '目录' : task.keyType}</td>
          </tr>
          <tr>
            <td>创建时间</td>
            <td>{task.createdTime}</td>
          </tr>
          <tr>
            <td>完成时间</td>
            <td>{task.isDone ? task.doneTime : <span className="disabled">尚未完成</span>}</td>
          </tr>
          <tr>
            <td>所属用户</td>
            <td>{task.user && task.user.id > 0 ? task.user.fullname || task.user.username : <span className="disabled">-</span>}</td>
          </tr>
          <tr>
            <td>任务状态</td>
            <td>
              <TaskStatus task={task} />
            </td>
          </tr>
          <tr>
            <td>操作</td>
            <td>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  void deleteTask()
                }}
              >
                [删除]
              </a>{' '}
              &nbsp; &nbsp;
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  void resetTask()
                }}
              >
                [重置状态]
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <h4>要操作的缓存Key</h4>
      <table className="ui table selectable celled">
        <thead>
          <tr>
            <th>{task.keyType === 'key' ? 'URL' : task.keyType === 'prefix' ? '前缀' : 'Key'}</th>
            <th className="two wide">所属集群</th>
            <th className="width6">状态</th>
          </tr>
        </thead>
        <tbody>
          {task.keys.map((key, index) => (
            <tr key={`${key.key}-${index}`}>
              <td>
                {key.key}
                {key.errors.length > 0 ? (
                  <div style={{ marginTop: '0.5em' }}>
                    {key.errors.map((error) => (
                      <a
                        key={error.nodeId}
                        href={`#/clusters/cluster/node?nodeId=${error.nodeId}`}
                        className="ui label basic tiny red"
                        style={{ marginBottom: '0.2em' }}
                      >
                        节点{error.nodeId}：{error.error}
                      </a>
                    ))}
                  </div>
                ) : null}
              </td>
              <td>{key.cluster && key.cluster.id > 0 ? key.cluster.name : <span className="disabled">-</span>}</td>
              <td>
                {key.isDone && key.errors.length === 0 ? <span className="green">完成</span> : null}
                {key.isDone && key.errors.length > 0 ? <span className="red">失败</span> : null}
                {!key.isDone && !key.isDoing ? <span className="grey">未执行</span> : null}
                {!key.isDone && key.isDoing ? <span className="grey">部分完成</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
