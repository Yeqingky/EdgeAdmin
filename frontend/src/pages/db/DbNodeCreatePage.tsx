import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'

export function DbNodeCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('3306')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [more, setMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/db/createPopup', { name, host, port, database, username, password, description, isOn: isOn ? 1 : '' })
      toast('保存成功')
      navigate('/db')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>添加节点</h3>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="节点名称 *"><TextInput value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></FormRow>
          <FormRow title="主机地址(Host)*"><TextInput value={host} maxLength={100} onChange={(event) => setHost(event.target.value)} /></FormRow>
          <FormRow title="数据库端口(Port)*">
            <TextInput value={port} maxLength={5} style={{ width: '6em' }} onChange={(event) => setPort(event.target.value)} />
          </FormRow>
          <FormRow title="数据库名称(Database)*">
            <TextInput value={database} maxLength={100} placeholder="比如 edge_logs" onChange={(event) => setDatabase(event.target.value)} />
          </FormRow>
          <FormRow title="用户名(Username)*"><TextInput value={username} onChange={(event) => setUsername(event.target.value)} /></FormRow>
          <FormRow title="密码(Password)">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </FormRow>
          <tr><td colSpan={2}><a href="" onClick={(event) => { event.preventDefault(); setMore((value) => !value) }}>更多选项</a></td></tr>
          {more ? (
            <>
              <FormRow title="详细描述"><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></FormRow>
              <FormRow title="启用当前数据库"><Checkbox checked={isOn} onChange={setIsOn} /></FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
