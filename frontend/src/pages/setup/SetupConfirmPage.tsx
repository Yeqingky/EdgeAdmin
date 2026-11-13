import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable } from '../../components/form'

export function SetupConfirmPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['setup-confirm'],
    queryFn: () => apiGet<{ endpoints: string[]; nodeId: string; secret: string; canInstall: boolean }>('/setup/confirm'),
  })
  const [endpoints, setEndpoints] = useState<string[]>([])
  const [nodeId, setNodeId] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (query.data && !loaded) {
    setEndpoints(query.data.endpoints)
    setNodeId(query.data.nodeId)
    setSecret(query.data.secret)
    setLoaded(true)
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }

  async function submit() {
    setError('')
    setSubmitting(true)
    try {
      await apiPost('/setup/confirm', { endpoints, nodeId, secret })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="install-box">
      <h4>系统发现你可能将管理系统迁移到了新的服务器，为了让系统能正常运行，请做以下确认：</h4>
      {error ? <div className="ui negative message">{error}</div> : null}
      <FormTable>
        {endpoints.map((endpoint, index) => (
          <FormRow key={index} title={`新的API节点地址${endpoints.length > 1 ? index + 1 : ''} *`}>
            <input
              type="text"
              value={endpoint}
              onChange={(event) => setEndpoints((current) => current.map((value, i) => (i === index ? event.target.value : value)))}
            />
          </FormRow>
        ))}
        <FormRow title="管理系统NodeId *"><input type="text" maxLength={64} value={nodeId} onChange={(event) => setNodeId(event.target.value)} /></FormRow>
        <FormRow title="管理系统Secret *"><input type="text" maxLength={64} value={secret} onChange={(event) => setSecret(event.target.value)} /></FormRow>
      </FormTable>
      <div style={{ marginTop: '2em' }} />
      {query.data?.canInstall ? <a href="#/setup" className="ui button">重新安装</a> : null}
      <button className="ui button primary" type="button" disabled={submitting} onClick={() => void submit()}>{submitting ? '检查中...' : '确认'}</button>
    </div>
  )
}
