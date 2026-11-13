import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { apiPost } from '../../api/client'
import { FormRow, FormTable } from '../../components/form'

type Step = 'intro' | 'newAPI' | 'apiList' | 'finish'

interface ApiNodeInfo {
  protocol: string
  host: string
  port: string
  nodeId: string
  nodeSecret: string
  hosts: string[]
}

export function RecoverPage() {
  const [step, setStep] = useState<Step>('intro')
  const [protocol, setProtocol] = useState('http')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [nodeSecret, setNodeSecret] = useState('')
  const [apiNode, setApiNode] = useState<ApiNodeInfo | null>(null)
  const [newHosts, setNewHosts] = useState<string[]>([])
  const [error, setError] = useState('')

  async function validateApi() {
    setError('')
    try {
      const data = await apiPost<{ apiNode: ApiNodeInfo }>('/recover/validateApi', { protocol, host, port, nodeId, nodeSecret })
      setApiNode(data.apiNode)
      setNewHosts(data.apiNode.hosts.map(() => ''))
      setStep('apiList')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    }
  }

  async function updateHosts() {
    setError('')
    try {
      await apiPost('/recover/updateHosts', {
        protocol: apiNode?.protocol,
        host: apiNode?.host,
        port: apiNode?.port,
        nodeId: apiNode?.nodeId,
        nodeSecret: apiNode?.nodeSecret,
        oldHosts: apiNode?.hosts || [],
        newHosts,
      })
      setStep('finish')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <div className="install-box">
      <div className="ui steps fluid small">
        {[
          ['intro', '1. 介绍'],
          ['newAPI', '2. 新API地址'],
          ['apiList', '3. 修改API节点地址'],
          ['finish', '4. 完成'],
        ].map(([code, name]) => (
          <div key={code} className={`ui step${step === code ? ' active' : ''}`}>
            <div className="content"><div className={step === code ? 'title' : ''}>{name}</div></div>
          </div>
        ))}
      </div>
      {error ? <div className="ui negative message">{error}</div> : null}

      {step === 'intro' ? (
        <div>
          可以通过恢复模式重新设置系统的API节点.
          <button className="ui button primary" style={{ marginTop: '10em' }} type="button" onClick={() => setStep('newAPI')}>开始 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'newAPI' ? (
        <div>
          <p className="comment">输入一个可用的API节点信息:</p>
          <FormTable>
            <FormRow title="节点协议 *">
              <select className="ui dropdown" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                <option value="http">HTTP</option><option value="https">HTTPS</option>
              </select>
            </FormRow>
            <FormRow title="主机地址 *"><input type="text" value={host} onChange={(event) => setHost(event.target.value)} /></FormRow>
            <FormRow title="服务端口 *"><input type="text" style={{ width: '6em' }} maxLength={5} value={port} onChange={(event) => setPort(event.target.value)} /></FormRow>
            <FormRow title="节点nodeId *"><input type="text" value={nodeId} onChange={(event) => setNodeId(event.target.value)} /></FormRow>
            <FormRow title="节点secret *"><input type="password" value={nodeSecret} onChange={(event) => setNodeSecret(event.target.value)} /></FormRow>
          </FormTable>
          <button className="ui button" type="button" onClick={() => setStep('intro')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" onClick={() => void validateApi()}>下一步 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'apiList' ? (
        <div>
          <table className="ui table selectable celled">
            <thead><tr><th style={{ width: '50%' }}>原地址</th><th>新地址(留空表示不修改)</th></tr></thead>
            <tbody>
              {(apiNode?.hosts || []).map((oldHost, index) => (
                <tr key={oldHost}>
                  <td>{oldHost}</td>
                  <td>
                    <input
                      type="text"
                      maxLength={100}
                      value={newHosts[index] || ''}
                      onChange={(event) => setNewHosts((current) => current.map((value, i) => (i === index ? event.target.value : value)))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="ui button" type="button" onClick={() => setStep('newAPI')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" onClick={() => void updateHosts()}>保存 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'finish' ? <div>修改成功,请<a href="/">刷新</a>此页面后,进入系统.</div> : null}
    </div>
  )
}
