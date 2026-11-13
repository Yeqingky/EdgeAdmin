import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { GrantMenu, GrantsTopMenu, parseId } from './shared'

interface GrantMethodOption {
  name: string
  value: string
}

interface GrantRow {
  id: number
  name: string
  method: { type: string; name: string }
  username: string
  countClusters: number
  countNodes: number
}

interface GrantsData {
  keyword: string
  page: string
  grants: GrantRow[]
}

export function GrantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const [keywordInput, setKeywordInput] = useState(keyword)
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const query = useQuery({ queryKey: ['grants', keyword], queryFn: () => apiGet<GrantsData>('/clusters/grants', { keyword }) })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function deleteGrant(grantId: number) {
    if (!(await confirm({ message: '确定要删除此认证吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/clusters/grants/delete', { grantId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['grants'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      <GrantsTopMenu active="index" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          const next = new URLSearchParams()
          if (keywordInput) {
            next.set('keyword', keywordInput)
          }
          setSearchParams(next)
        }}
      >
        <div className="margin" />
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="名称、用户名等..." value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {keyword ? <a href="/clusters/grants">[清除条件]</a> : null}
          </div>
        </div>
      </form>

      {data.grants.length === 0 ? <div className="ui message">暂时还没有认证信息。</div> : null}
      {data.grants.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>用户名</th>
              <th className="center width5">集群数</th>
              <th className="center width5">节点数</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.grants.map((grant) => (
              <tr key={grant.id}>
                <td>
                  <a href={`/clusters/grants/grant?grantId=${grant.id}`}>{grant.name}</a>
                </td>
                <td>
                  <span className="ui label tiny basic">{grant.method.name}</span>
                </td>
                <td>{grant.username ? grant.username : <span className="disabled">-</span>}</td>
                <td className="center">{grant.countClusters > 0 ? grant.countClusters : <span className="disabled">0</span>}</td>
                <td className="center">{grant.countNodes > 0 ? grant.countNodes : <span className="disabled">0</span>}</td>
                <td>
                  <a href={`/clusters/grants/grant?grantId=${grant.id}`}>详情</a> &nbsp;{' '}
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteGrant(grant.id)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data.page} />
    </div>
  )
}

interface Grant {
  id: number
  name: string
  method: string
  methodName?: string
  username: string
  password: string
  privateKey: string
  passphrase: string
  description: string
  su: boolean
}

interface MethodsData {
  methods: GrantMethodOption[]
}

function GrantForm({
  grantId,
  initial,
  methods,
  onSubmit,
  onCancel,
}: {
  grantId: number
  initial?: Partial<Grant>
  methods: GrantMethodOption[]
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [method, setMethod] = useState(initial?.method || 'user')
  const [username, setUsername] = useState(initial?.username || 'root')
  const [password, setPassword] = useState(initial?.password || '')
  const [privateKey, setPrivateKey] = useState(initial?.privateKey || '')
  const [passphrase, setPassphrase] = useState(initial?.passphrase || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [su, setSu] = useState(initial?.su || false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        grantId,
        name,
        method,
        username,
        password,
        privateKey,
        passphrase,
        description,
        su: su ? 1 : '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="名称 *">
          <TextInput type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <p className="comment">为当前认证信息起一个容易识别的名称。</p>
        </FormRow>
        <FormRow title="认证方式">
          <Select style={{ width: '10em' }} value={method} onChange={(event) => setMethod(event.target.value)}>
            {methods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormRow>
        {method === 'user' ? (
          <>
            <FormRow title="SSH用户名 *">
              <TextInput type="text" maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} />
              <p className="comment">SSH登录用户名。</p>
            </FormRow>
            <FormRow title="SSH密码">
              <TextInput type="password" maxLength={100} value={password} onChange={(event) => setPassword(event.target.value)} />
              <p className="comment">SSH登录用户密码。</p>
            </FormRow>
          </>
        ) : null}
        {method === 'privateKey' ? (
          <>
            <FormRow title="SSH用户名 *">
              <TextInput type="text" maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} />
              <p className="comment">SSH登录用户名。</p>
            </FormRow>
            <FormRow title="RSA私钥 *">
              <textarea
                name="privateKey"
                spellCheck={false}
                rows={10}
                placeholder="填入RSA私钥内容"
                value={privateKey}
                onChange={(event) => setPrivateKey(event.target.value)}
              />
              <p className="comment">用来生成登录SSH公钥的私钥。</p>
            </FormRow>
            <FormRow title="私钥密码（Passphrase）">
              <TextInput type="password" maxLength={200} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
              <p className="comment">为私钥设置了密码（Passphrase）后需要填写。</p>
            </FormRow>
          </>
        ) : null}
        {username !== 'root' ? (
          <FormRow title="执行sudo">
            <Checkbox label="" checked={su} onChange={setSu} />
            <p className="comment">非root的用户可以使用 sudo 获得更高权限来执行命令。</p>
          </FormRow>
        ) : null}
        <FormRow title="备注">
          <textarea name="description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormRow>
      </FormTable>
      <SubmitButton submitting={submitting} />
      {onCancel ? (
        <button className="ui button" type="button" onClick={onCancel} style={{ marginLeft: '0.5em' }}>
          取消
        </button>
      ) : null}
    </form>
  )
}

export function GrantCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({ queryKey: ['grant-methods'], queryFn: () => apiGet<MethodsData>('/clusters/grants/create') })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <GrantsTopMenu active="create" />
      <div className="margin" />
      <GrantForm
        grantId={0}
        methods={query.data.methods}
        onSubmit={async (values) => {
          try {
            await apiPost('/clusters/grants/create', values)
            toast('保存成功')
            navigate('/clusters/grants')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          }
        }}
      />
    </div>
  )
}

export function GrantUpdatePage() {
  const [searchParams] = useSearchParams()
  const grantId = parseId(searchParams.get('grantId'))
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['grant-update', grantId],
    queryFn: () => apiGet<MethodsData & { grant: Grant }>('/clusters/grants/update', { grantId }),
    enabled: grantId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const grant = query.data.grant

  return (
    <div>
      <GrantMenu grantId={grant.id} grantName={grant.name} active="update" />
      <div className="margin" />
      <GrantForm
        grantId={grant.id}
        initial={grant}
        methods={query.data.methods}
        onSubmit={async (values) => {
          try {
            await apiPost('/clusters/grants/update', values)
            toast('保存成功')
            navigate('/clusters/grants')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          }
        }}
      />
    </div>
  )
}

interface GrantDetailData {
  grant: Grant & { methodName: string }
  clusters: { id: number; name: string }[]
  nodes: { id: number; name: string; cluster: { id: number; name: string }; isOn: boolean }[]
}

export function GrantDetailPage() {
  const [searchParams] = useSearchParams()
  const grantId = parseId(searchParams.get('grantId'))
  const query = useQuery({
    queryKey: ['grant-detail', grantId],
    queryFn: () => apiGet<GrantDetailData>('/clusters/grants/grant', { grantId }),
    enabled: grantId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const { grant, clusters, nodes } = query.data

  return (
    <div>
      <GrantMenu grantId={grant.id} grantName={grant.name} active="index" />
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td>名称</td>
            <td>{grant.name}</td>
          </tr>
          <tr>
            <td className="title">认证方式</td>
            <td>{grant.methodName}</td>
          </tr>
          {grant.method === 'user' ? (
            <>
              <tr>
                <td>SSH用户名</td>
                <td>{grant.username}</td>
              </tr>
              <tr>
                <td>SSH密码</td>
                <td>{grant.password}</td>
              </tr>
            </>
          ) : null}
          {grant.method === 'privateKey' ? (
            <>
              <tr>
                <td>SSH用户名</td>
                <td>{grant.username}</td>
              </tr>
              <tr>
                <td>RSA私钥</td>
                <td>
                  <pre className="pre-box">{grant.privateKey}</pre>
                </td>
              </tr>
              <tr>
                <td>私钥密码（Passphrase）</td>
                <td>{grant.passphrase ? grant.passphrase : <span className="disabled">-</span>}</td>
              </tr>
            </>
          ) : null}
          <tr>
            <td>执行sudo</td>
            <td>{grant.su ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
          </tr>
          <tr>
            <td>备注</td>
            <td>{grant.description ? grant.description : '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="ui divider" />
      <h3>使用此认证的集群</h3>
      <div>
        {clusters.length === 0 ? <p className="comment">暂时还没有集群使用此认证。</p> : null}
        {clusters.map((cluster) => (
          <a key={cluster.id} href={`/clusters/cluster?clusterId=${cluster.id}`} className="ui label small basic">
            {cluster.name}
          </a>
        ))}
      </div>

      <div className="ui divider" />
      <h3>使用此认证的节点</h3>
      <div>
        {nodes.length === 0 ? <p className="comment">暂时还没有节点使用此认证。</p> : null}
        {nodes.map((node) => (
          <a
            key={node.id}
            href={`/clusters/cluster/node?clusterId=${node.cluster.id}&nodeId=${node.id}`}
            className={`ui label small basic${node.isOn ? '' : ' red'}`}
          >
            {node.name}
            <span className="small">（{node.cluster.name}）</span>
          </a>
        ))}
      </div>
    </div>
  )
}

interface GrantTestData {
  grant: Grant & { methodName: string }
}

export function GrantTestPage() {
  const [searchParams] = useSearchParams()
  const grantId = parseId(searchParams.get('grantId'))
  const query = useQuery({
    queryKey: ['grant-test', grantId],
    queryFn: () => apiGet<GrantTestData>('/clusters/grants/test', { grantId }),
    enabled: grantId > 0,
  })
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [result, setResult] = useState<{ isOk: boolean; error: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const grant = query.data.grant

  return (
    <div>
      <GrantMenu grantId={grant.id} grantName={grant.name} active="test" />
      <div className="ui message">可以在这里测试SSH主机连接是否正常。</div>
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            const csrfToken = await getCsrfToken()
            const resp = await apiPost<{ isOk: boolean; error: string }>('/clusters/grants/test', { grantId: grant.id, host, port, csrfToken })
            setResult(resp)
          } catch (error) {
            setResult({ isOk: false, error: error instanceof Error ? error.message : '测试失败' })
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="节点主机地址 *">
            <TextInput type="text" placeholder="x.x.x.x" style={{ width: '10em' }} value={host} onChange={(event) => setHost(event.target.value)} autoFocus />
          </FormRow>
          <FormRow title="节点主机端口 *">
            <TextInput type="text" style={{ width: '5em' }} maxLength={5} value={port} onChange={(event) => setPort(event.target.value)} />
          </FormRow>
          <FormRow title="认证方式">{grant.methodName}</FormRow>
          {grant.method === 'user' ? (
            <>
              <FormRow title="SSH用户名">{grant.username}</FormRow>
              <FormRow title="SSH密码">{grant.password}</FormRow>
            </>
          ) : null}
          {grant.method === 'privateKey' ? (
            <>
              <FormRow title="SSH用户名">{grant.username}</FormRow>
              <FormRow title="RSA私钥">
                <pre className="pre-box" style={{ maxHeight: '10em', overflowY: 'auto' }}>
                  {grant.privateKey}
                </pre>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        {result ? (
          <div className={`ui message ${result.isOk ? 'green' : 'red'}`}>{result.isOk ? '连接成功！' : `连接失败：${result.error}`}</div>
        ) : null}
        <SubmitButton submitting={submitting}>{submitting ? '连接中...' : '提交测试'}</SubmitButton>
      </form>
    </div>
  )
}

export function GrantCreatePopupPage() {
  const toast = useToast()
  const query = useQuery({ queryKey: ['grant-methods'], queryFn: () => apiGet<MethodsData>('/clusters/grants/createPopup') })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>添加新认证</h3>
      <GrantForm
        grantId={0}
        methods={query.data.methods}
        onSubmit={async (values) => {
          try {
            await apiPost('/clusters/grants/createPopup', values)
            toast('保存成功')
            window.location.href = '/clusters/grants'
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          }
        }}
      />
    </div>
  )
}

export function GrantUpdatePopupPage() {
  const [searchParams] = useSearchParams()
  const grantId = parseId(searchParams.get('grantId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['grant-updatePopup', grantId],
    queryFn: () => apiGet<MethodsData & { grant: Grant }>('/clusters/grants/updatePopup', { grantId }),
    enabled: grantId > 0,
  })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>修改认证</h3>
      <GrantForm
        grantId={grantId}
        initial={query.data.grant}
        methods={query.data.methods}
        onSubmit={async (values) => {
          try {
            await apiPost('/clusters/grants/updatePopup', values)
            toast('保存成功')
            window.location.href = '/clusters/grants'
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          }
        }}
      />
    </div>
  )
}

interface GrantSelectData {
  grants: { id: number; name: string; method: string; methodName: string; username: string; description: string }[]
  suggestGrants: { id: number; name: string; method: string; methodName: string; username: string; description: string }[]
}

export function GrantSelectPopupPage() {
  const [searchParams] = useSearchParams()
  const nodeClusterId = parseId(searchParams.get('nodeClusterId'))
  const [keyword, setKeyword] = useState('')
  const query = useQuery({
    queryKey: ['grant-select', nodeClusterId],
    queryFn: () => apiGet<GrantSelectData>('/clusters/grants/selectPopup', { nodeClusterId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const grants = keyword
    ? query.data.grants.filter((grant) => grant.name.includes(keyword) || grant.username.includes(keyword))
    : query.data.grants
  const suggestGrants = keyword
    ? query.data.suggestGrants.filter((grant) => grant.name.includes(keyword) || grant.username.includes(keyword))
    : query.data.suggestGrants

  return (
    <div>
      <h3>选择SSH认证</h3>
      <form className="ui form">
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="搜索名称、用户名等" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
        </div>
      </form>
      <div className="ui divider" />
      {grants.length === 0 ? <span>暂时还没有可用的认证。</span> : null}
      {suggestGrants.length > 0 ? (
        <>
          <h4>可能的认证</h4>
          <div>
            {suggestGrants.map((grant) => (
              <a key={grant.id} href={`/clusters/grants/grant?grantId=${grant.id}`} className="ui label basic" style={{ marginBottom: '0.4em' }}>
                {grant.name}
                {grant.username ? <span className="small grey">（{grant.username}）</span> : null}
              </a>
            ))}
          </div>
        </>
      ) : null}
      <h4>全部认证</h4>
      <div>
        {grants.map((grant) => (
          <a key={grant.id} href={`/clusters/grants/grant?grantId=${grant.id}`} className="ui label basic" style={{ marginBottom: '0.4em' }}>
            {grant.name}
            {grant.username ? <span className="small grey">（{grant.username}）</span> : null}
          </a>
        ))}
      </div>
      <p className="comment">请点击使用某个认证。</p>
    </div>
  )
}
