import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'

export function ValidatePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const sid = localStorage.getItem('sid') || ''
    const ip = localStorage.getItem('ip') || ''
    if (!sid || !ip) {
      window.location.href = '/logout'
      return
    }
    apiPost<{ isOk: boolean; localSid?: string; ip?: string }>('/login/validate', { localSid: sid, ip })
      .then((data) => {
        if (!data.isOk) {
          window.location.href = '/logout'
          return
        }
        if (data.localSid) {
          localStorage.setItem('sid', data.localSid)
        }
        if (data.ip) {
          localStorage.setItem('ip', data.ip)
        }
        const from = params.get('from') || ''
        window.setTimeout(() => {
          if (from) {
            window.location.href = from
          } else {
            navigate('/dashboard')
          }
        }, 100)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '验证失败'))
  }, [navigate, params])

  if (error) {
    return <div className="ui negative message">{error}</div>
  }
  return <LoadingBlock />
}
