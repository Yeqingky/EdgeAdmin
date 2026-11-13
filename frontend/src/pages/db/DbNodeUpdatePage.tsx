import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import { DbTabs } from './DbTabs'

interface Node {
  id: number
  isOn: boolean
  name: string
  description: string
  host: string
  port: number
  username: string
  password: string
  database: string
}

export function DbNodeUpdatePage() {
  const [params] = useSearchParams()
  const nodeId = Number(params.get('nodeId') || 0)
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({ queryKey: ['db-node-update', nodeId], queryFn: () => apiGet<{ node: Node }>('/db/update', { nodeId }) })
  const [node, setNode] = useState<Node | null>(null)
  const [more, setMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setNode(query.data.node)
    }
  }, [query.data])

  if (query.isLoading || !node) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  function update<K extends keyof Node>(key: K, value: Node[K]) {
    setNode((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!node) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/db/update', {
        nodeId: node.id,
        name: node.name,
        host: node.host,
        port: node.port,
        database: node.database,
        username: node.username,
        password: node.password,
        description: node.description,
        isOn: node.isOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/db/node?nodeId=${node.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <DbTabs nodeId={node.id} active="update" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="节点名称 *"><TextInput value={node.name} maxLength={100} onChange={(event) => update('name', event.target.value)} /></FormRow>
          <FormRow title="主机地址(Host)*"><TextInput value={node.host} maxLength={100} onChange={(event) => update('host', event.target.value)} /></FormRow>
          <FormRow title="数据库端口(Port)*">
            <TextInput value={String(node.port)} maxLength={5} style={{ width: '6em' }} onChange={(event) => update('port', Number(event.target.value) || 0)} />
          </FormRow>
          <FormRow title="数据库名称(Database)*"><TextInput value={node.database} maxLength={100} onChange={(event) => update('database', event.target.value)} /></FormRow>
          <FormRow title="用户名(Username)*"><TextInput value={node.username} onChange={(event) => update('username', event.target.value)} /></FormRow>
          <FormRow title="密码(Password)">
            <input type="password" value={node.password} onChange={(event) => update('password', event.target.value)} />
          </FormRow>
          <tr><td colSpan={2}><a href="" onClick={(event) => { event.preventDefault(); setMore((value) => !value) }}>更多选项</a></td></tr>
          {more ? (
            <>
              <FormRow title="详细描述"><textarea rows={3} value={node.description} onChange={(event) => update('description', event.target.value)} /></FormRow>
              <FormRow title="启用当前数据库"><Checkbox checked={node.isOn} onChange={(checked) => update('isOn', checked)} /></FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
