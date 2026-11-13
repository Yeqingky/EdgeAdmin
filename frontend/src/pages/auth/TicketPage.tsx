import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'

export function TicketPage() {
  const [params] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<{ errorMsg: string; redirect: string; localSid?: string; ip?: string }>('/login/ticket', {
      ticket: params.get('ticket') || '',
      redirect: params.get('redirect') || '',
    })
      .then((data) => {
        setError(data.errorMsg || '')
        if (data.localSid) {
          localStorage.setItem('sid', data.localSid)
        }
        if (data.ip) {
          localStorage.setItem('ip', data.ip)
        }
        if (!data.errorMsg) {
          window.location.href = data.redirect || '/spa/#/dashboard'
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '登录失败'))
  }, [params])

  if (error) {
    return <div className="ui message warning">ERROR: {error}</div>
  }
  return <LoadingBlock />
}
