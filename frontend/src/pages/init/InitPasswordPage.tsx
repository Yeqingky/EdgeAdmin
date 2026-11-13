import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'

export function InitPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiGet('/index/initPassword')
      await apiPost('/index/initPassword', { csrfToken: await getCsrfToken(), username, password })
      toast('用户名和密码保存成功，现在去登录')
      navigate('/login')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-box">
      <form className="ui form" onSubmit={submit} autoComplete="off">
        <div className="ui segment stacked">
          <div className="ui header">
            设置管理员初始密码
            <p className="comment">由于你是第一次登录，所以需要设置管理员用户名和密码。</p>
          </div>
          <div className="ui field">
            <div className="ui left icon input">
              <User className="icon" size={16} />
              <input value={username} maxLength={200} placeholder="请输入用户名" onChange={(event) => setUsername(event.target.value)} autoFocus />
            </div>
          </div>
          <div className="ui field">
            <div className="ui left icon input">
              <Lock className="icon" size={16} />
              <input type="password" value={password} maxLength={200} placeholder="请输入密码" onChange={(event) => setPassword(event.target.value)} />
            </div>
          </div>
          <button className="ui button primary fluid" type="submit" disabled={submitting}>
            {submitting ? '保存中...' : '保存用户名密码'}
          </button>
        </div>
      </form>
    </div>
  )
}
