import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable } from '../../components/form'

type Step = 'intro' | 'api' | 'db' | 'admin' | 'finish'

interface ApiNodeInfo {
  mode: string
  newPort: string
  newHost: string
  oldProtocol: string
  oldHost: string
  oldPort: string
  oldNodeId: string
  oldNodeSecret: string
}

interface DbInfo {
  host: string
  port: string
  database: string
  username: string
  password: string
  accessLogKeepDays: number
}

interface AdminInfo {
  username: string
  password: string
}

const steps: { code: Step; name: string }[] = [
  { code: 'intro', name: '1. 介绍' },
  { code: 'api', name: '2. 设置API节点' },
  { code: 'db', name: '3. 设置MySQL数据库' },
  { code: 'admin', name: '4. 设置管理员账号' },
  { code: 'finish', name: '5. 完成安装' },
]

export function SetupPage() {
  const info = useQuery({ queryKey: ['setup'], queryFn: () => apiGet<{ currentHost: string }>('/setup') })
  const [step, setStep] = useState<Step>('intro')
  const [error, setError] = useState('')
  const [apiMode, setApiMode] = useState<'new' | 'old'>('new')
  const [apiNode, setApiNode] = useState<ApiNodeInfo>({ mode: 'new', newPort: '8001', newHost: '', oldProtocol: 'http', oldHost: '', oldPort: '', oldNodeId: '', oldNodeSecret: '' })
  const [db, setDb] = useState<DbInfo>({ host: '', port: '3306', database: 'edges', username: '', password: '', accessLogKeepDays: 30 })
  const [localDB, setLocalDB] = useState<{ host: string; port: string; username: string; password: string } | null>(null)
  const [admin, setAdmin] = useState({ username: 'admin', password: '', password2: '' })
  const [adminResult, setAdminResult] = useState<AdminInfo | null>(null)
  const [installing, setInstalling] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (info.data?.currentHost) {
      setApiNode((current) => ({ ...current, newHost: info.data?.currentHost || '' }))
    }
  }, [info.data])

  useEffect(() => {
    if (step === 'db') {
      apiPost<{ localDB: { host: string; port: string; username: string; password: string } }>('/setup/detectDB')
        .then((data) => {
          setLocalDB(data.localDB)
          if (data.localDB.host) {
            setDb((current) => ({
              ...current,
              host: data.localDB.host,
              port: data.localDB.port,
              username: data.localDB.username,
              password: data.localDB.password,
            }))
          }
        })
        .catch(() => undefined)
    }
  }, [step])

  useEffect(() => {
    if (!installing) {
      return
    }
    const timer = window.setInterval(() => {
      apiPost<{ statusText: string }>('/setup/status')
        .then((data) => setStatusText(data.statusText || ''))
        .catch(() => undefined)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [installing])

  if (info.isLoading) {
    return <LoadingBlock />
  }

  async function validateApi() {
    setError('')
    try {
      const data = await apiPost<{ apiNode: ApiNodeInfo }>('/setup/validateApi', {
        mode: apiMode,
        newPort: apiNode.newPort,
        newHost: apiNode.newHost,
        oldProtocol: apiNode.oldProtocol,
        oldHost: apiNode.oldHost,
        oldPort: apiNode.oldPort,
        oldNodeId: apiNode.oldNodeId,
        oldNodeSecret: apiNode.oldNodeSecret,
      })
      setApiNode(data.apiNode)
      setStep('db')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    }
  }

  async function validateDb() {
    setError('')
    try {
      const data = await apiPost<{ db: DbInfo }>('/setup/validateDb', { ...db })
      setDb(data.db)
      setStep('admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    }
  }

  async function validateAdmin() {
    setError('')
    try {
      const data = await apiPost<{ admin: AdminInfo }>('/setup/validateAdmin', {
        adminUsername: admin.username,
        adminPassword: admin.password,
        adminPassword2: admin.password2,
      })
      setAdminResult(data.admin)
      setStep('finish')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    }
  }

  async function install() {
    setError('')
    setInstalling(true)
    try {
      await apiPost('/setup/install', {
        apiNodeJSON: JSON.stringify({ ...apiNode, mode: apiMode }),
        dbJSON: JSON.stringify(db),
        adminJSON: JSON.stringify(adminResult),
      })
      setInstalled(true)
      window.setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装失败')
      setInstalling(false)
    }
  }

  return (
    <div className="install-box">
      <div className="ui steps fluid small">
        {steps.map((item) => (
          <div key={item.code} className={`ui step${step === item.code ? ' active' : ''}`}>
            <div className="content"><div className={step === item.code ? 'title' : ''}>{item.name}</div></div>
          </div>
        ))}
      </div>

      {error ? <div className="ui negative message">{error}</div> : null}

      {step === 'intro' ? (
        <div>
          <div>感谢你选择使用<strong>GoEdge</strong> CDN系统,下面让我们一起开始配置系统.</div>
          <div className="margin">在这之前如果你还没有可用的MySQL数据库(支持MySQL 5.7.8/8.0/8.1/TiDB 3.0及以上版本),请先安装MySQL数据库再进行.</div>
          <div className="margin" style={{ color: 'grey' }}>免责声明:GoEdge软件开发者并不对您的软件使用方法,服务对象,服务内容负道德或法律上的约束责任,在使用本软件时产生的一切法律风险自负.</div>
          <button className="ui button primary" style={{ marginTop: '10em' }} type="button" onClick={() => setStep('api')}>开始 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'api' ? (
        <div>
          <div className="ui message"><strong>API节点</strong>是管理系统和数据库之间通讯的桥梁,新安装时可以先使用自动启动的API节点.</div>
          <FormTable>
            <FormRow title="API节点类型">
              <label><input type="radio" checked={apiMode === 'new'} onChange={() => setApiMode('new')} /> 自动启动新API节点</label>
              <label style={{ marginLeft: '1em' }}><input type="radio" checked={apiMode === 'old'} onChange={() => setApiMode('old')} /> 使用已安装节点</label>
            </FormRow>
            {apiMode === 'new' ? (
              <>
                <FormRow title="节点端口 *">
                  <input type="text" style={{ width: '6em' }} maxLength={5} value={apiNode.newPort} onChange={(event) => setApiNode({ ...apiNode, newPort: event.target.value })} />
                </FormRow>
                <FormRow title="节点主机地址 *">
                  <input type="text" value={apiNode.newHost} onChange={(event) => setApiNode({ ...apiNode, newHost: event.target.value })} />
                </FormRow>
              </>
            ) : (
              <>
                <FormRow title="节点协议 *">
                  <select className="ui dropdown" value={apiNode.oldProtocol} onChange={(event) => setApiNode({ ...apiNode, oldProtocol: event.target.value })}>
                    <option value="http">HTTP</option><option value="https">HTTPS</option>
                  </select>
                </FormRow>
                <FormRow title="主机地址 *"><input type="text" value={apiNode.oldHost} onChange={(event) => setApiNode({ ...apiNode, oldHost: event.target.value })} /></FormRow>
                <FormRow title="服务端口 *"><input type="text" style={{ width: '6em' }} maxLength={5} value={apiNode.oldPort} onChange={(event) => setApiNode({ ...apiNode, oldPort: event.target.value })} /></FormRow>
                <FormRow title="节点nodeId *"><input type="text" value={apiNode.oldNodeId} onChange={(event) => setApiNode({ ...apiNode, oldNodeId: event.target.value })} /></FormRow>
                <FormRow title="节点secret *"><input type="password" value={apiNode.oldNodeSecret} onChange={(event) => setApiNode({ ...apiNode, oldNodeSecret: event.target.value })} /></FormRow>
              </>
            )}
          </FormTable>
          <button className="ui button" type="button" onClick={() => setStep('intro')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" onClick={() => void validateApi()}>下一步 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'db' ? (
        <div>
          <FormTable>
            {localDB?.host ? (
              <FormRow title="本地数据库">
                <span className="green">已检测到本地MySQL:{localDB.host}:{localDB.port}</span>
              </FormRow>
            ) : null}
            <FormRow title="主机地址 *"><input type="text" value={db.host} onChange={(event) => setDb({ ...db, host: event.target.value })} /></FormRow>
            <FormRow title="端口 *"><input type="text" style={{ width: '6em' }} value={db.port} onChange={(event) => setDb({ ...db, port: event.target.value })} /></FormRow>
            <FormRow title="数据库名称 *"><input type="text" value={db.database} onChange={(event) => setDb({ ...db, database: event.target.value })} /></FormRow>
            <FormRow title="用户名 *"><input type="text" value={db.username} onChange={(event) => setDb({ ...db, username: event.target.value })} /></FormRow>
            <FormRow title="密码"><input type="password" value={db.password} onChange={(event) => setDb({ ...db, password: event.target.value })} /></FormRow>
            <FormRow title="访问日志保留天数">
              <input type="text" style={{ width: '5em' }} value={String(db.accessLogKeepDays)} onChange={(event) => setDb({ ...db, accessLogKeepDays: Number(event.target.value) || 0 })} />
            </FormRow>
          </FormTable>
          <button className="ui button" type="button" onClick={() => setStep('api')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" onClick={() => void validateDb()}>下一步 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'admin' ? (
        <div>
          <FormTable>
            <FormRow title="管理员用户名 *"><input type="text" value={admin.username} onChange={(event) => setAdmin({ ...admin, username: event.target.value })} /></FormRow>
            <FormRow title="管理员密码 *"><input type="password" value={admin.password} onChange={(event) => setAdmin({ ...admin, password: event.target.value })} /></FormRow>
            <FormRow title="确认密码 *"><input type="password" value={admin.password2} onChange={(event) => setAdmin({ ...admin, password2: event.target.value })} /></FormRow>
          </FormTable>
          <button className="ui button" type="button" onClick={() => setStep('db')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" onClick={() => void validateAdmin()}>下一步 <ArrowRight size={14} /></button>
        </div>
      ) : null}

      {step === 'finish' ? (
        <div>
          <h3>确认安装信息</h3>
          <FormTable>
            <FormRow title="API节点">{apiMode === 'new' ? `${apiNode.newHost}:${apiNode.newPort}` : `${apiNode.oldProtocol}://${apiNode.oldHost}:${apiNode.oldPort}`}</FormRow>
            <FormRow title="数据库">{db.username}@{db.host}:{db.port}/{db.database}</FormRow>
            <FormRow title="管理员">{adminResult?.username}</FormRow>
          </FormTable>
          {installing ? <div className="ui message">{statusText || '正在安装...'}</div> : null}
          {installed ? <div className="ui positive message">安装完成,正在跳转...</div> : null}
          <button className="ui button" type="button" disabled={installing} onClick={() => setStep('admin')}><ArrowLeft size={14} /> 上一步</button>
          &nbsp;
          <button className="ui button primary" type="button" disabled={installing} onClick={() => void install()}>{installing ? '安装中...' : '开始安装'}</button>
        </div>
      ) : null}
    </div>
  )
}
