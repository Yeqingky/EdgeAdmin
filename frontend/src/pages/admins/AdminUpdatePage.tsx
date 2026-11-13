import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import { AdminTabs } from './AdminTabs'

interface Admin {
  id: number
  fullname: string
  username: string
  isOn: boolean
  isSuper: boolean
  canLogin: boolean
  otpLoginIsOn: boolean
}

interface ModuleItem { code: string; name: string; isChecked?: boolean }

export function AdminUpdatePage() {
  const [params] = useSearchParams()
  const adminId = Number(params.get('adminId') || 0)
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['admin-update', adminId],
    queryFn: () => apiGet<{ admin: Admin; modules: ModuleItem[] }>('/admins/update', { adminId }),
  })
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setAdmin(query.data.admin)
      setModules(query.data.modules)
    }
  }, [query.data])

  if (query.isLoading || !admin) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  function update<K extends keyof Admin>(key: K, value: Admin[K]) {
    setAdmin((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!admin) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/admins/update', {
        csrfToken: await getCsrfToken(),
        adminId: admin.id,
        fullname: admin.fullname,
        username: admin.username,
        pass1,
        pass2,
        moduleCodes: modules.filter((module) => module.isChecked).map((module) => module.code),
        isOn: admin.isOn ? 1 : '',
        isSuper: admin.isSuper ? 1 : '',
        canLogin: admin.canLogin ? 1 : '',
        otpOn: admin.otpLoginIsOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/admins/admin?adminId=${admin.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <AdminTabs adminId={admin.id} active="update" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="全名 *">
            <TextInput value={admin.fullname} maxLength={100} onChange={(event) => update('fullname', event.target.value)} />
          </FormRow>
          <FormRow title="登录用户名 *">
            <TextInput value={admin.username} maxLength={100} onChange={(event) => update('username', event.target.value)} />
          </FormRow>
          <FormRow title="登录密码">
            <input type="password" value={pass1} maxLength={100} onChange={(event) => setPass1(event.target.value)} />
            <p className="comment">留空表示不修改.</p>
          </FormRow>
          <FormRow title="确认登录密码">
            <input type="password" value={pass2} maxLength={100} onChange={(event) => setPass2(event.target.value)} />
          </FormRow>
          <FormRow title="允许登录">
            <Checkbox checked={admin.canLogin} onChange={(checked) => update('canLogin', checked)} />
          </FormRow>
          <FormRow title="超级管理员">
            <Checkbox checked={admin.isSuper} onChange={(checked) => update('isSuper', checked)} />
          </FormRow>
          {!admin.isSuper ? (
            <FormRow title="权限">
              <div className="modules-box">
                {modules.map((module) => (
                  <div className="module-box" key={module.code}>
                    <Checkbox
                      label={module.name}
                      checked={Boolean(module.isChecked)}
                      onChange={(checked) =>
                        setModules((current) => current.map((item) => (item.code === module.code ? { ...item, isChecked: checked } : item)))
                      }
                    />
                  </div>
                ))}
              </div>
            </FormRow>
          ) : null}
          <FormRow title="OTP认证">
            <Checkbox label="启用OTP" checked={admin.otpLoginIsOn} onChange={(checked) => update('otpLoginIsOn', checked)} />
          </FormRow>
          <FormRow title="启用当前管理员">
            <Checkbox checked={admin.isOn} onChange={(checked) => update('isOn', checked)} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
