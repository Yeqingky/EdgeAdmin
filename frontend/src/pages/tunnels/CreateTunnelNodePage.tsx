import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'

interface Option {
  id: number
  name: string
}

interface UserOption {
  id: number
  username: string
  fullname?: string
}

interface CreateData {
  clusters: Option[]
  users: UserOption[]
  currentUserId: number
}

interface CreatedTunnel {
  node: {
    id: number
    name: string
    token: string
  }
}

export function CreateTunnelNodePage() {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['tunnel-node-create'],
    queryFn: () => apiGet<CreateData>('/tunnels/nodes/create'),
  })
  const [step, setStep] = useState<'info' | 'install'>('info')
  const [name, setName] = useState('')
  const [clusterId, setClusterId] = useState(0)
  const [userId, setUserId] = useState(0)
  const [osName, setOsName] = useState('linux')
  const [arch, setArch] = useState('amd64')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CreatedTunnel | null>(null)

  useEffect(() => {
    if (query.data) {
      setClusterId(query.data.clusters[0]?.id || 0)
      setUserId(query.data.currentUserId || query.data.users[0]?.id || 0)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入名称', 'error')
      return
    }
    if (clusterId <= 0) {
      toast('请选择集群', 'error')
      return
    }
    setSubmitting(true)
    try {
      const result = await apiPost<CreatedTunnel>('/tunnels/nodes/create', {
        name: name.trim(),
        clusterId,
        userId,
        os: osName,
        arch,
      })
      setCreated(result)
      setStep('install')
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const origin = window.location.origin
  const linuxCommand = created
    ? `curl -fsSL '${origin}/tunnels/install?token=${created.node.token}&os=linux' -o install.sh && bash install.sh install`
    : ''
  const windowsCommand = created
    ? `Invoke-WebRequest -UseBasicParsing '${origin}/tunnels/install?token=${created.node.token}&os=windows' -OutFile install.ps1; .\\install.ps1 install`
    : ''

  return (
    <div>
      <div className="ui steps small fluid">
        <div className={`ui step${step === 'info' ? ' active' : ''}`}>
          <div className="content">1. 填写节点信息</div>
        </div>
        <div className={`ui step${step === 'install' ? ' active' : ''}`}>
          <div className="content">2. 安装节点</div>
        </div>
      </div>

      {step === 'info' ? (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="名称 *">
              <TextInput type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </FormRow>
            <FormRow title="集群 *">
              <Select value={clusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
                {query.data.clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                ))}
              </Select>
            </FormRow>
            <FormRow title="所属用户">
              <Select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
                {query.data.users.map((user) => (
                  <option key={user.id} value={user.id}>{user.fullname ? `${user.username} (${user.fullname})` : user.username}</option>
                ))}
              </Select>
            </FormRow>
            <FormRow title="操作系统">
              <Select value={osName} onChange={(event) => setOsName(event.target.value)}>
                <option value="linux">Linux</option>
                <option value="windows">Windows</option>
              </Select>
            </FormRow>
            <FormRow title="CPU 架构">
              <Select value={arch} onChange={(event) => setArch(event.target.value)}>
                <option value="amd64">x86_64 / amd64</option>
                <option value="arm64">arm64</option>
              </Select>
            </FormRow>
          </FormTable>
          <SubmitButton submitting={submitting}>创建</SubmitButton>
          <Link className="ui button" to="/tunnels/nodes" style={{ marginLeft: '0.5em' }}>返回</Link>
        </form>
      ) : (
        <div>
          <div className="ui positive message">隧道节点已创建, Token: <code>{created?.node.token}</code></div>
          <h4>Linux 安装</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{linuxCommand}</pre>
          <h4>Windows 安装 (PowerShell, 管理员)</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{windowsCommand}</pre>
          <Link className="ui button" to="/tunnels/nodes">返回列表</Link>
        </div>
      )}
    </div>
  )
}
