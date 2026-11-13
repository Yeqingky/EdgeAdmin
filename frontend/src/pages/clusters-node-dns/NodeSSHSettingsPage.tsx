import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { GrantSelector, MenuLinks } from './ui'
import { postForm, type NodeGrantRef, type NodeSSHData } from './shared'

interface TestResult {
  isOk: boolean
  error: string
}

export function NodeSSHSettingsPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-settings-ssh', clusterId, nodeId],
    queryFn: () => apiGet<NodeSSHData>('/clusters/cluster/node/settings/ssh', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [loginId, setLoginId] = useState(0)
  const [sshHost, setSshHost] = useState('')
  const [sshPort, setSshPort] = useState('')
  const [grant, setGrant] = useState<NodeGrantRef | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    if (query.data && !initialized) {
      const login = query.data.node.login
      setLoginId(login ? login.id : 0)
      setSshHost(login?.params?.host || '')
      const port = Number(login?.params?.port || 0)
      setSshPort(port > 0 ? String(port) : '')
      setGrant(login?.grant && login.grant.id > 0 ? login.grant : null)
      setInitialized(true)
    }
  }, [query.data, initialized])

  const data = query.data

  async function testConnection(host: string, port: string, grantId: number) {
    if (!host || !port || grantId <= 0) {
      return
    }
    setTesting(true)
    try {
      const result = await apiPost<TestResult>('/clusters/cluster/node/settings/ssh/test', {
        grantId,
        host,
        port: Number(port),
      })
      setTestResult(result)
    } catch (error) {
      setTestResult({ isOk: false, error: error instanceof Error ? error.message : '测试失败' })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    if (!data || !initialized) {
      return
    }
    void testConnection(sshHost, sshPort, grant ? grant.id : 0)
    // only run once after initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, initialized])

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数。</div>
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <LoadingBlock />
  }
  if (!data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await postForm(
        '/clusters/cluster/node/settings/ssh',
        {
          nodeId,
          loginId,
          grantId: grant ? grant.id : 0,
          sshHost: sshHost.trim(),
          sshPort: Number(sshPort) || 0,
        },
        true,
      )
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={data.node} active="update" />
      <MenuLinks
        items={[
          { name: '基本设置', to: `/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DNS设置', to: `/clusters/cluster/node/settings/dns?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '缓存设置', to: `/clusters/cluster/node/settings/cache?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DDoS防护', to: `/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'SSH设置', to: `/clusters/cluster/node/settings/ssh?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
          { name: '系统设置', to: `/clusters/cluster/node/settings/system?clusterId=${clusterId}&nodeId=${nodeId}` },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="SSH主机地址">
            <input type="text" maxLength={64} value={sshHost} onChange={(event) => setSshHost(event.target.value)} />
            <p className="comment">
              {data.hostIsAutoFilled ? (
                <span className="red">
                  <strong>已自动填充</strong>，需要点击"保存"按钮后生效。
                </span>
              ) : null}
              比如192.168.1.100。
            </p>
          </FormRow>
          <FormRow title="SSH主机端口">
            <input type="text" maxLength={5} style={{ width: '6em' }} value={sshPort} onChange={(event) => setSshPort(event.target.value)} />
            <p className="comment">比如22。</p>
          </FormRow>
          <FormRow title="SSH登录认证">
            <GrantSelector clusterId={clusterId} value={grant} onChange={setGrant} />
          </FormRow>
        </FormTable>

        {testing ? <div className="ui message">正在测试连接 ...</div> : null}
        {!testing && testResult && testResult.isOk ? <div className="ui message green">连接成功！</div> : null}
        {!testing && testResult && !testResult.isOk ? <div className="ui message red">连接失败：{testResult.error}</div> : null}

        <div style={{ marginTop: '0.6em' }}>
          <button
            className="ui button"
            type="button"
            onClick={() => void testConnection(sshHost, sshPort, grant ? grant.id : 0)}
            disabled={testing}
          >
            测试连接
          </button>
        </div>

        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
