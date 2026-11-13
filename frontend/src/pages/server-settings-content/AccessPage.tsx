import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  MoreOptionsIndicator,
  Modal,
  ServerSettingsShell,
  StringListEditor,
  useServerId,
  type ServerSettingsBase,
} from './shared'

interface AuthTypeDefinition {
  name: string
  code: string
  description: string
}

interface AuthPolicyUser {
  username: string
  password: string
}

interface AuthPolicyParams {
  secret?: string
  signParamName?: string
  timestampParamName?: string
  life?: number
  users?: AuthPolicyUser[]
  realm?: string
  charset?: string
  url?: string
  method?: string
  exts?: string[]
  domains?: string[]
}

interface AuthPolicy {
  id: number
  isOn: boolean
  name: string
  type: string
  params?: AuthPolicyParams
}

interface AuthPolicyRef {
  isOn: boolean
  authPolicyId: number
  authPolicy?: AuthPolicy
}

interface AuthConfig {
  isPrior?: boolean
  isOn: boolean
  policyRefs: AuthPolicyRef[]
}

interface AccessData extends ServerSettingsBase {
  webId: number
  authConfig: AuthConfig | null
}

interface AuthTypesData {
  authTypes: AuthTypeDefinition[]
}

interface PolicyEditorState {
  policy: AuthPolicy | null
  type: string
}

const EMPTY_PARAMS: AuthPolicyParams = { life: 30, exts: [], domains: [] }

function methodName(type: string): string {
  switch (type) {
    case 'basicAuth':
      return 'BasicAuth'
    case 'subRequest':
      return '子请求'
    case 'typeA':
      return 'URL鉴权A'
    case 'typeB':
      return 'URL鉴权B'
    case 'typeC':
      return 'URL鉴权C'
    case 'typeD':
      return 'URL鉴权D'
    default:
      return type
  }
}

export function ServerAccessSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['server-settings-access', serverId],
    queryFn: () => apiGet<AccessData>('/servers/server/settings/access', { serverId }),
    enabled: serverId > 0,
  })
  const typesQuery = useQuery({
    queryKey: ['http-auth-types'],
    queryFn: () => apiGet<AuthTypesData>('/servers/server/settings/access/createPopup'),
  })

  const [authConfig, setAuthConfig] = useState<AuthConfig>({ isOn: false, policyRefs: [] })
  const [editor, setEditor] = useState<PolicyEditorState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      const auth = query.data.authConfig
      setAuthConfig(auth ? { ...auth, policyRefs: auth.policyRefs || [] } : { isOn: false, policyRefs: [] })
    }
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数.</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const authTypes = typesQuery.data?.authTypes || []
  const webId = data.webId

  async function save(next: AuthConfig) {
    setAuthConfig(next)
    try {
      await apiPost('/servers/server/settings/access', { webId, authJSON: JSON.stringify(next) })
      toast('保存成功,请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  async function removePolicy(index: number) {
    if (!(await confirm({ message: '确定要删除此鉴权方式吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    await save({ ...authConfig, policyRefs: authConfig.policyRefs.filter((_, i) => i !== index) })
  }

  async function handlePolicySaved(policyRef: AuthPolicyRef, index: number | null) {
    const refs = [...authConfig.policyRefs]
    if (index === null) {
      refs.push(policyRef)
    } else {
      refs[index] = policyRef
    }
    await save({ ...authConfig, policyRefs: refs })
    setEditor(null)
    await queryClient.invalidateQueries({ queryKey: ['server-settings-access', serverId] })
  }

  return (
    <ServerSettingsShell data={data}>
      <FormTable>
        <FormRow title="启用鉴权">
          <Checkbox checked={authConfig.isOn} onChange={(checked) => void save({ ...authConfig, isOn: checked })} />
        </FormRow>
      </FormTable>

      {authConfig.isOn ? (
        <div>
          <h4>鉴权方式</h4>
          {authConfig.policyRefs.length > 0 ? (
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th className="three wide">名称</th>
                  <th className="three wide">鉴权方法</th>
                  <th>参数</th>
                  <th className="two wide">状态</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {authConfig.policyRefs.map((ref, index) => {
                  const policy = ref.authPolicy
                  const params: AuthPolicyParams = policy?.params || {}
                  return (
                    <tr key={`${ref.authPolicyId}-${index}`}>
                      <td>{policy?.name}</td>
                      <td>{methodName(policy?.type || '')}</td>
                      <td>
                        {policy?.type === 'basicAuth' ? <span>{(params.users || []).length}个用户</span> : null}
                        {policy?.type === 'subRequest' ? (
                          <span>
                            {params.method ? <span className="grey">[{params.method}]</span> : null}
                            {params.url}
                          </span>
                        ) : null}
                        {policy?.type === 'typeA' ? (
                          <span>
                            {params.signParamName}/有效期{params.life}秒
                          </span>
                        ) : null}
                        {policy?.type === 'typeB' || policy?.type === 'typeC' ? <span>有效期{params.life}秒</span> : null}
                        {policy?.type === 'typeD' ? (
                          <span>
                            {params.signParamName}/{params.timestampParamName}/有效期{params.life}秒
                          </span>
                        ) : null}
                        {(params.exts || []).length > 0 || (params.domains || []).length > 0 ? (
                          <div>
                            {(params.exts || []).map((ext) => (
                              <span key={`ext-${ext}`} className="ui label tiny basic">
                                扩展名:{ext}
                              </span>
                            ))}
                            {(params.domains || []).map((domain) => (
                              <span key={`domain-${domain}`} className="ui label tiny basic">
                                域名:{domain}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td>{policy?.isOn ? <span className="green">已启用</span> : <span className="disabled">已禁用</span>}</td>
                      <td>
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            if (policy) {
                              setEditor({ policy, type: policy.type })
                            }
                          }}
                        >
                          修改
                        </a>{' '}
                        &nbsp;
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            void removePolicy(index)
                          }}
                        >
                          删除
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="comment">暂时还没有鉴权方式.</p>
          )}
          <button className="ui button small" type="button" onClick={() => setEditor({ policy: null, type: 'basicAuth' })}>
            +添加鉴权方式
          </button>
        </div>
      ) : null}

      {editor ? (
        <PolicyEditor
          key={editor.policy ? `update-${editor.policy.id}` : 'create'}
          policy={editor.policy}
          authTypes={authTypes}
          submitting={submitting}
          onClose={() => setEditor(null)}
          onSubmit={async (ref) => {
            setSubmitting(true)
            try {
              const index = editor.policy ? authConfig.policyRefs.findIndex((item) => item.authPolicyId === editor.policy?.id) : -1
              await handlePolicySaved(ref, index >= 0 ? index : null)
            } finally {
              setSubmitting(false)
            }
          }}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

function PolicyEditor({
  policy,
  authTypes,
  submitting,
  onClose,
  onSubmit,
}: {
  policy: AuthPolicy | null
  authTypes: AuthTypeDefinition[]
  submitting: boolean
  onClose: () => void
  onSubmit: (ref: AuthPolicyRef) => Promise<void>
}) {
  const toast = useToast()
  const initialParams: AuthPolicyParams = policy?.params || EMPTY_PARAMS
  const [name, setName] = useState(policy?.name || '')
  const [type, setType] = useState(policy?.type || authTypes[0]?.code || 'basicAuth')
  const [isOn, setIsOn] = useState(policy?.isOn ?? true)
  const [secret, setSecret] = useState(initialParams.secret || '')
  const [signParamName, setSignParamName] = useState(initialParams.signParamName || 'sign')
  const [timestampParamName, setTimestampParamName] = useState(initialParams.timestampParamName || 't')
  const [life, setLife] = useState(String(initialParams.life ?? 30))
  const [users, setUsers] = useState<AuthPolicyUser[]>(initialParams.users && initialParams.users.length > 0 ? initialParams.users : [{ username: '', password: '' }])
  const [realm, setRealm] = useState(initialParams.realm || '')
  const [charset, setCharset] = useState(initialParams.charset || '')
  const [url, setUrl] = useState(initialParams.url || '')
  const [followRequest, setFollowRequest] = useState(!initialParams.method)
  const [method, setMethod] = useState(initialParams.method || 'POST')
  const [exts, setExts] = useState<string[]>(initialParams.exts || [])
  const [domains, setDomains] = useState<string[]>(initialParams.domains || [])
  const [moreOptions, setMoreOptions] = useState(false)
  const [moreBasicAuthOptions, setMoreBasicAuthOptions] = useState(false)

  const authType = authTypes.find((item) => item.code === type)
  const description = authType?.description || ''

  async function generateSecret() {
    try {
      const resp = await apiPost<{ random: string }>('/servers/server/settings/access/random')
      setSecret(resp.random)
    } catch (error) {
      toast(error instanceof Error ? error.message : '生成失败', 'error')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const params: AuthPolicyParams = {
      secret,
      life: Number(life) || 0,
      exts: exts.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)).filter((ext) => ext.length > 0),
      domains: domains.filter((domain) => domain.length > 0),
    }
    if (type === 'basicAuth') {
      params.users = users
      params.realm = realm
      params.charset = charset
    } else if (type === 'subRequest') {
      params.url = url
      params.method = followRequest ? '' : method
    } else if (type === 'typeA') {
      params.signParamName = signParamName
    } else if (type === 'typeD') {
      params.signParamName = signParamName
      params.timestampParamName = timestampParamName
    }

    const form = new FormData()
    form.set('csrfToken', await getCsrfToken())
    form.set('name', name)
    form.set('type', type)
    if (policy) {
      form.set('policyId', String(policy.id))
      if (isOn) {
        form.set('isOn', '1')
      }
    }
    if (type === 'basicAuth') {
      form.set('httpAuthBasicAuthUsersJSON', JSON.stringify(users))
      form.set('basicAuthRealm', realm)
      form.set('basicAuthCharset', charset)
    }
    if (type === 'subRequest') {
      form.set('subRequestURL', url)
      form.set('subRequestMethod', followRequest ? '' : method)
      if (followRequest) {
        form.set('subRequestFollowRequest', '1')
      }
    }
    params.exts?.forEach((ext) => form.append('exts', ext))
    form.set('domainsJSON', JSON.stringify(params.domains || []))

    try {
      const path = policy ? '/servers/server/settings/access/updatePopup' : '/servers/server/settings/access/createPopup'
      const resp = await apiPostForm<{ policyRef: AuthPolicyRef }>(path, form)
      await onSubmit(resp.policyRef)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  return (
    <Modal title={policy ? '修改鉴权方式' : '创建鉴权方式'} onClose={onClose}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="名称 *">
            <TextInput type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
          </FormRow>
          <FormRow title="鉴权类型 *">
            {policy ? (
              <span>
                {methodName(policy.type)}
                {description ? <p className="comment" dangerouslySetInnerHTML={{ __html: description }} /> : null}
              </span>
            ) : (
              <div>
                <Select value={type} onChange={(event) => setType(event.target.value)}>
                  {authTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                {description ? <p className="comment" dangerouslySetInnerHTML={{ __html: description }} /> : null}
              </div>
            )}
          </FormRow>

          {type === 'basicAuth' ? (
            <>
              <FormRow title="用户 *">
                <div>
                  {users.map((user, index) => (
                    <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
                      <div className="ui field">
                        <input
                          type="text"
                          placeholder="用户名"
                          value={user.username}
                          onChange={(event) => {
                            const next = [...users]
                            next[index] = { ...user, username: event.target.value }
                            setUsers(next)
                          }}
                        />
                      </div>
                      <div className="ui field">
                        <input
                          type="text"
                          placeholder="密码"
                          value={user.password}
                          onChange={(event) => {
                            const next = [...users]
                            next[index] = { ...user, password: event.target.value }
                            setUsers(next)
                          }}
                        />
                      </div>
                      <div className="ui field" style={{ padding: 0 }}>
                        <a
                          href=""
                          title="删除"
                          onClick={(event) => {
                            event.preventDefault()
                            setUsers(users.filter((_, i) => i !== index))
                          }}
                        >
                          <Trash2 size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                  <button className="ui button tiny" type="button" onClick={() => setUsers([...users, { username: '', password: '' }])}>
                    +
                  </button>
                </div>
              </FormRow>
              <FormRow title={<MoreOptionsIndicator visible={moreBasicAuthOptions} onChange={setMoreBasicAuthOptions} />}>
                <span />
              </FormRow>
              {moreBasicAuthOptions ? (
                <>
                  <FormRow title="认证领域名(Realm)">
                    <TextInput type="text" maxLength={100} value={realm} onChange={(event) => setRealm(event.target.value)} />
                  </FormRow>
                  <FormRow title="字符集">
                    <TextInput type="text" style={{ width: '6em' }} maxLength={50} value={charset} onChange={(event) => setCharset(event.target.value)} />
                    <p className="comment">
                      类似于<code>UTF-8</code>.
                    </p>
                  </FormRow>
                </>
              ) : null}
            </>
          ) : null}

          {type === 'subRequest' ? (
            <>
              <FormRow title="子请求URL *">
                <TextInput type="text" maxLength={1024} value={url} onChange={(event) => setUrl(event.target.value)} />
                <p className="comment">可以是一个完整的URL,也可以是一个路径.</p>
              </FormRow>
              <FormRow title="请求方法">
                <label>
                  <input type="radio" checked={followRequest} onChange={() => setFollowRequest(true)} /> 同当前请求一致
                </label>
                &nbsp; &nbsp;
                <label>
                  <input type="radio" checked={!followRequest} onChange={() => setFollowRequest(false)} /> 自定义
                </label>
                {!followRequest ? (
                  <div style={{ marginTop: '0.8em' }}>
                    <div className="ui divider" />
                    <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                      <option value="HEAD">HEAD</option>
                    </Select>
                  </div>
                ) : null}
              </FormRow>
            </>
          ) : null}

          {type === 'typeA' || type === 'typeB' || type === 'typeC' || type === 'typeD' ? (
            <>
              <FormRow title="鉴权密钥 *">
                <TextInput type="text" maxLength={40} autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} />
                <p className="comment">
                  只能包含字母,数字,长度不超过40.
                  <a href="" onClick={(event) => { event.preventDefault(); void generateSecret() }}>
                    [随机生成]
                  </a>
                </p>
              </FormRow>
              {type === 'typeA' || type === 'typeD' ? (
                <FormRow title="签名参数 *">
                  <TextInput type="text" maxLength={30} value={signParamName} onChange={(event) => setSignParamName(event.target.value)} />
                </FormRow>
              ) : null}
              {type === 'typeD' ? (
                <FormRow title="时间戳参数 *">
                  <TextInput type="text" maxLength={30} value={timestampParamName} onChange={(event) => setTimestampParamName(event.target.value)} />
                </FormRow>
              ) : null}
              <FormRow title="有效时间">
                <div className="ui right labeled input" style={{ width: '10em' }}>
                  <input type="text" maxLength={8} value={life} onChange={(event) => setLife(event.target.value)} />
                  <span className="ui label">秒</span>
                </div>
                <p className="comment">链接有效时间.</p>
              </FormRow>
            </>
          ) : null}

          <FormRow title={<MoreOptionsIndicator visible={moreOptions} onChange={setMoreOptions} />}>
            <span />
          </FormRow>
          {moreOptions ? (
            <>
              <FormRow title="限定文件扩展名">
                <StringListEditor values={exts} onChange={setExts} placeholder="比如 .png" />
                <p className="comment">
                  如果不为空,则表示只有这些扩展名的文件才需要鉴权;扩展名需要包含点符号(.),比如<code>.png</code>
                </p>
              </FormRow>
              <FormRow title="限定域名">
                <StringListEditor values={domains} onChange={setDomains} placeholder="比如 example.com" />
                <p className="comment">如果不为空,则表示只有这些域名的文件才需要鉴权.</p>
              </FormRow>
              {policy ? (
                <FormRow title="启用当前鉴权">
                  <Checkbox checked={isOn} onChange={setIsOn} />
                </FormRow>
              ) : null}
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}
