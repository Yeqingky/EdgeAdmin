import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import SparkMD5 from 'spark-md5'
import { Leaf, Lock, User } from 'lucide-react'
import { apiPost, getCsrfToken, ApiError } from '../api/client'
import { useLoginInfo } from '../api/login'
import { SESSION_KEY } from '../api/session'
import { LoadingBlock } from '../components/LoadingBlock'

interface LoginResult {
  ip: string
  localSid: string
  requireOTP: boolean
  sid?: string
  remember?: boolean
}

export function LoginPage() {
  const info = useLoginInfo()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (info.isLoading) {
    return <LoadingBlock />
  }
  if (info.isError || !info.data) {
    return <div className="login-error">无法连接管理服务</div>
  }
  if (!info.data.isConfigured) {
    window.location.href = '/setup'
    return <LoadingBlock />
  }
  if (info.data.isNewInstalled) {
    window.location.href = '/setup/confirm'
    return <LoadingBlock />
  }
  if (info.data.isUser) {
    return <Navigate to={searchParams.get('from') || '/dashboard'} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const csrfToken = await getCsrfToken()
      const data = await apiPost<LoginResult>('/', {
        username: username.trim(),
        password: SparkMD5.hash(password.trim()),
        token: info.data?.token,
        csrfToken,
        remember: remember ? 1 : 0,
      })
      localStorage.setItem('sid', data.localSid)
      localStorage.setItem('ip', data.ip)
      if (data.requireOTP) {
        navigate(`/login/otp?sid=${encodeURIComponent(data.sid || '')}&remember=${data.remember ? 1 : 0}`)
        return
      }
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY })
      navigate(searchParams.get('from') || '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="ui menu top-nav blue inverted small borderless theme2 login-top-nav">
        <a href="/" className="item">
          <Leaf size={16} /> &nbsp; {info.data.systemName}
          {info.data.showVersion ? (
            <sup>
              v{info.data.version}
              {info.data.version.split('.').length === 4 ? <span title="当前版本为测试版"> beta</span> : null}
            </sup>
          ) : null}
        </a>
      </div>
      <div className="form-box">
        <form className="ui form" onSubmit={submit} autoComplete="off">
          <div className="ui segment stacked">
            <div className="ui header">登录{info.data.systemName}</div>
            <div className="ui field">
              <div className="ui left icon input">
                <User className="icon" size={16} />
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入用户名"
                  maxLength={200}
                  autoFocus
                />
              </div>
            </div>
            <div className="ui field">
              <div className="ui left icon input">
                <Lock className="icon" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  maxLength={200}
                />
              </div>
            </div>
            <div className="ui field">
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setMoreOptions((value) => !value)
                }}
              >
                更多选项 <i className={`icon angle ${moreOptions ? 'up' : 'down'}`} />
              </a>
            </div>
            {moreOptions ? (
              <div className="ui field">
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <label>在这个电脑上记住登录（14天）</label>
                </div>
              </div>
            ) : null}
            {error ? <div className="ui negative message">{error}</div> : null}
            <button className="ui button primary fluid" type="submit" disabled={submitting}>
              {submitting ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
