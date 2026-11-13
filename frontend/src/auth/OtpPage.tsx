import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Barcode } from 'lucide-react'
import { apiPost, ApiError } from '../api/client'
import { SESSION_KEY } from '../api/session'

export function OtpPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = await apiPost<{ ip: string; localSid: string }>('/index/otp', {
        sid: params.get('sid') || '',
        remember: params.get('remember') === '1' ? 1 : 0,
        otpCode: code,
      })
      localStorage.setItem('sid', data.localSid)
      localStorage.setItem('ip', data.ip)
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '验证失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-box">
      <form className="ui form" onSubmit={submit} autoComplete="off">
        <div className="ui segment stacked">
          <div className="ui header">OTP 二次验证</div>
          <div className="ui field">为了保护你的账户安全,需要进行OTP二次身份验证.</div>
          <div className="ui field">
            <div className="ui left icon input">
              <Barcode className="icon" size={16} />
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="请输入OTP动态密码"
                maxLength={6}
                autoFocus
              />
            </div>
          </div>
          {error ? <div className="ui negative message">{error}</div> : null}
          <button className="ui button primary fluid" type="submit" disabled={submitting}>
            {submitting ? '验证中...' : '验证'}
          </button>
          <div className="ui field cancel-login">
            <a href="/login">&laquo; 取消登录</a>
          </div>
        </div>
      </form>
    </div>
  )
}
