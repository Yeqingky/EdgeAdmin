import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton, TextInput } from '../../../components/form'
import { SettingsTabs } from '../common'

interface AdminInfo {
  username: string
  fullname: string
}

export function LoginSettingsPage() {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['settings-login'],
    queryFn: () => apiGet<{ admin: AdminInfo }>('/settings/login'),
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setUsername(query.data.admin.username)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/settings/login', { username, password, password2 })
      toast('保存成功')
      setPassword('')
      setPassword2('')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SettingsTabs kind="basic" active="login" />
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="登录用户名 *">
            <TextInput type="text" value={username} maxLength={50} onChange={(event) => setUsername(event.target.value)} />
            <p className="comment">只能含有英文、数字或下划线。</p>
          </FormRow>
          <FormRow title="登录密码">
            <TextInput type="password" value={password} maxLength={50} onChange={(event) => setPassword(event.target.value)} />
            <p className="comment">不填表示保留原有密码。</p>
          </FormRow>
          <FormRow title="确认密码">
            <TextInput type="password" value={password2} maxLength={50} onChange={(event) => setPassword2(event.target.value)} />
            <p className="comment">不填表示保留原有密码。</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}

export function ProfileSettingsPage() {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => apiGet<{ admin: AdminInfo }>('/settings/profile'),
  })
  const [fullname, setFullname] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setFullname(query.data.admin.fullname)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/settings/profile', { fullname })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SettingsTabs kind="basic" active="profile" />
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="你的姓名 *">
            <TextInput type="text" value={fullname} maxLength={50} onChange={(event) => setFullname(event.target.value)} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
