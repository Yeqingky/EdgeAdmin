import { useState, type FormEvent } from 'react'
import { apiPost, apiPostForm } from '../../../api/client'
import { useToast } from '../../../components/Toast'

type Step = 'intro' | 'newAPI' | 'apiList' | 'finish'

interface APINodeInfo {
  protocol: string
  host: string
  port: string
  nodeId: string
  nodeSecret: string
  hosts: string[]
}

export function RecoverPage() {
  const toast = useToast()
  const [step, setStep] = useState<Step>('intro')
  const [protocol, setProtocol] = useState('http')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [nodeSecret, setNodeSecret] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [apiNode, setAPINode] = useState<APINodeInfo | null>(null)
  const [newHosts, setNewHosts] = useState<string[]>([])

  async function validateAPI(event: FormEvent) {
    event.preventDefault()
    setRequesting(true)
    try {
      const data = await apiPost<{ apiNode: APINodeInfo }>('/recover/validateApi', { protocol, host, port, nodeId, nodeSecret })
      setAPINode(data.apiNode)
      setNewHosts((data.apiNode.hosts ?? []).map(() => ''))
      setStep('apiList')
    } catch (error) {
      toast(error instanceof Error ? error.message : '验证失败', 'error')
    } finally {
      setRequesting(false)
    }
  }

  async function updateHosts(event: FormEvent) {
    event.preventDefault()
    if (!apiNode) {
      return
    }
    try {
      const form = new FormData()
      form.set('protocol', apiNode.protocol)
      form.set('host', apiNode.host)
      form.set('port', apiNode.port)
      form.set('nodeId', apiNode.nodeId)
      form.set('nodeSecret', apiNode.nodeSecret)
      for (const oldHost of apiNode.hosts) {
        form.append('oldHosts', oldHost)
      }
      for (const newHost of newHosts) {
        form.append('newHosts', newHost)
      }
      await apiPostForm('/recover/updateHosts', form)
      setStep('finish')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  return (
    <div className="install-box">
      <div className="ui steps fluid small">
        <div className={`ui step${step === 'intro' ? ' active' : ''}`}>
          <div className="content">
            <div className={step === 'intro' ? 'title' : undefined}>1. 介绍</div>
          </div>
        </div>
        <div className={`ui step${step === 'newAPI' ? ' active' : ''}`}>
          <div className="content">
            <div className={step === 'newAPI' ? 'title' : undefined}>2. 新API地址</div>
          </div>
        </div>
        <div className={`ui step${step === 'apiList' ? ' active' : ''}`}>
          <div className="content">
            <div className={step === 'apiList' ? 'title' : undefined}>3. 修改API节点地址</div>
          </div>
        </div>
        <div className={`ui step${step === 'finish' ? ' active' : ''}`}>
          <div className="content">
            <div className={step === 'finish' ? 'title' : undefined}>4. 完成</div>
          </div>
        </div>
      </div>

      {step === 'intro' ? (
        <div>
          可以通过恢复模式重新设置系统的API节点。
          <button className="ui button primary" style={{ marginTop: '10em' }} type="button" onClick={() => setStep('newAPI')}>
            开始
          </button>
        </div>
      ) : null}

      {step === 'newAPI' ? (
        <div>
          <p className="comment">输入一个可用的API节点信息：</p>
          <form className="ui form" onSubmit={validateAPI}>
            <table className="ui table definition selectable">
              <tbody>
                <tr>
                  <td className="title">节点协议 *</td>
                  <td>
                    <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>
                    <p className="comment">API节点使用的协议。</p>
                  </td>
                </tr>
                <tr>
                  <td>主机地址 *</td>
                  <td>
                    <input type="text" maxLength={100} style={{ width: '20em' }} value={host} onChange={(event) => setHost(event.target.value)} />
                    <p className="comment">API节点所在主机地址。</p>
                  </td>
                </tr>
                <tr>
                  <td>服务端口 *</td>
                  <td>
                    <input type="text" style={{ width: '6em' }} maxLength={5} value={port} onChange={(event) => setPort(event.target.value)} />
                    <p className="comment">API节点启动的端口。</p>
                  </td>
                </tr>
                <tr>
                  <td>节点nodeId *</td>
                  <td>
                    <input type="text" maxLength={100} value={nodeId} onChange={(event) => setNodeId(event.target.value)} />
                    <p className="comment">
                      在节点的配置文件中<span className="ui label basic small">configs/api.yaml</span>中获取，不需要带双引号。
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>节点secret *</td>
                  <td>
                    <input type="password" maxLength={100} value={nodeSecret} onChange={(event) => setNodeSecret(event.target.value)} />
                    <p className="comment">
                      在节点的配置文件中<span className="ui label basic small">configs/api.yaml</span>中获取，不需要带双引号。
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <button className="ui button" type="button" onClick={() => setStep('intro')}>
              上一步
            </button>{' '}
            &nbsp;
            {!requesting ? (
              <button className="ui button primary" type="submit">
                下一步
              </button>
            ) : (
              <button className="ui button primary" type="button">
                提交中
              </button>
            )}
          </form>
        </div>
      ) : null}

      {step === 'apiList' && apiNode ? (
        <div>
          <form className="ui form" onSubmit={updateHosts}>
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>原地址</th>
                  <th>新地址（留空表示不修改）</th>
                </tr>
              </thead>
              <tbody>
                {apiNode.hosts.map((oldHost, index) => (
                  <tr key={oldHost}>
                    <td>{oldHost}</td>
                    <td>
                      <input
                        type="text"
                        maxLength={100}
                        value={newHosts[index] ?? ''}
                        onChange={(event) =>
                          setNewHosts((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="ui button" type="button" onClick={() => setStep('newAPI')}>
              上一步
            </button>{' '}
            &nbsp;
            <button className="ui button primary" type="submit">
              保存
            </button>
          </form>
        </div>
      ) : null}

      {step === 'finish' ? (
        <div>
          修改成功，请<a href="#/dashboard">刷新</a>此页面后，进入系统。
        </div>
      ) : null}
    </div>
  )
}
