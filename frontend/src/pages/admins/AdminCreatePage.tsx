import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'

interface ModuleItem { code: string; name: string }

export function AdminCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const modulesQuery = useQuery({ queryKey: ['admin-modules'], queryFn: () => apiGet<{ modules: ModuleItem[] }>('/admins/createPopup') })
  const [fullname, setFullname] = useState('')
  const [username, setUsername] = useState('')
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [canLogin, setCanLogin] = useState(false)
  const [isSuper, setIsSuper] = useState(false)
  const [otpOn, setOtpOn] = useState(false)
  const [moduleCodes, setModuleCodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/admins/createPopup', {
        csrfToken: await getCsrfToken(),
        fullname,
        username,
        pass1,
        pass2,
        canLogin: canLogin ? 1 : '',
        isSuper: isSuper ? 1 : '',
        otpOn: otpOn ? 1 : '',
        moduleCodes,
      })
      toast('保存成功')
      navigate('/admins')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>创建系统用户</h3>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="全名 *">
            <TextInput value={fullname} maxLength={100} onChange={(event) => setFullname(event.target.value)} autoFocus />
          </FormRow>
          <FormRow title="登录用户名 *">
            <TextInput value={username} maxLength={100} onChange={(event) => setUsername(event.target.value)} />
          </FormRow>
          <FormRow title="登录密码 *">
            <input type="password" value={pass1} maxLength={100} onChange={(event) => setPass1(event.target.value)} />
          </FormRow>
          <FormRow title="确认登录密码 *">
            <input type="password" value={pass2} maxLength={100} onChange={(event) => setPass2(event.target.value)} />
          </FormRow>
          <FormRow title="允许登录">
            <Checkbox checked={canLogin} onChange={setCanLogin} />
          </FormRow>
          <FormRow title="超级管理员">
            <Checkbox checked={isSuper} onChange={setIsSuper} />
          </FormRow>
          {!isSuper ? (
            <FormRow title="权限">
              <div className="modules-box">
                {(modulesQuery.data?.modules || []).map((module) => (
                  <div className="module-box" key={module.code}>
                    <Checkbox
                      label={module.name}
                      checked={moduleCodes.includes(module.code)}
                      onChange={(checked) =>
                        setModuleCodes((current) => (checked ? [...current, module.code] : current.filter((code) => code !== module.code)))
                      }
                    />
                  </div>
                ))}
              </div>
            </FormRow>
          ) : null}
          <FormRow title="OTP认证">
            <Checkbox label="启用OTP" checked={otpOn} onChange={setOtpOn} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
