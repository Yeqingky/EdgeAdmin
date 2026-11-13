import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, X } from 'lucide-react'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { Modal } from './Modal'
import { PriorRow } from './fields'
import { LocationShell } from './LocationShell'
import type { AuthConfig, AuthPolicy, AuthPolicyRef, LocationPageBase } from './types'

interface AccessData extends LocationPageBase {
  authConfig?: AuthConfig | null
}

interface BasicAuthUser {
  username: string
  password: string
}

interface EditorState {
  index: number
  policyId?: number
  name: string
  type: string
  isOn: boolean
  users: BasicAuthUser[]
  realm: string
  charset: string
  subRequestURL: string
  subRequestMethod: string
  followRequest: boolean
  exts: string
  domains: string
  isNew: boolean
}

function methodName(type?: string): string {
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
  }
  return ''
}

function PolicyParams({ policy }: { policy?: AuthPolicy | null }) {
  if (!policy) {
    return null
  }
  const params = policy.params || {}
  const notes: string[] = []
  if (policy.type === 'basicAuth') {
    notes.push(`${(params.users || []).length}个用户`)
  } else if (policy.type === 'subRequest') {
    if (params.method) {
      notes.push(`[${params.method}]`)
    }
    notes.push(params.url || '')
  } else if (policy.type === 'typeA') {
    notes.push(`${params.signParamName || ''}/有效期${params.life || 0}秒`)
  } else if (policy.type === 'typeB' || policy.type === 'typeC') {
    notes.push(`有效期${params.life || 0}秒`)
  } else if (policy.type === 'typeD') {
    notes.push(`${params.signParamName || ''}/${params.timestampParamName || ''}/有效期${params.life || 0}秒`)
  }

  return (
    <span>
      {notes.join(' ')}
      {(params.exts || []).map((ext) => (
        <span key={ext} className="ui label tiny basic grey">扩展名:{ext}</span>
      ))}
      {(params.domains || []).map((domain) => (
        <span key={domain} className="ui label tiny basic grey">域名:{domain}</span>
      ))}
    </span>
  )
}

function PolicyEditor({ state, onClose, onSaved }: {
  state: EditorState
  onClose: () => void
  onSaved: (createdRef?: AuthPolicyRef) => Promise<void> | void
}) {
  const toast = useToast()
  const [editor, setEditor] = useState<EditorState>(state)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<EditorState>) {
    setEditor((current) => ({ ...current, ...patch }))
  }

  async function save() {
    if (editor.name.length === 0) {
      toast('请输入名称', 'error')
      return
    }
    if (editor.type === 'basicAuth' && editor.users.length === 0) {
      toast('请添加至少一个用户', 'error')
      return
    }
    if (editor.type === 'subRequest' && editor.subRequestURL.length === 0) {
      toast('请输入子请求URL', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('name', editor.name)
      form.set('type', editor.type)
      form.set('isOn', editor.isOn ? '1' : '0')
      form.set('httpAuthBasicAuthUsersJSON', JSON.stringify(editor.users))
      form.set('basicAuthRealm', editor.realm)
      form.set('basicAuthCharset', editor.charset)
      form.set('subRequestURL', editor.subRequestURL)
      form.set('subRequestMethod', editor.subRequestMethod)
      form.set('subRequestFollowRequest', editor.followRequest ? '1' : '0')
      form.set('domainsJSON', JSON.stringify(
        editor.domains.split(/[,,,;\n]/).map((item) => item.trim()).filter((item) => item.length > 0),
      ))
      editor.exts
        .split(/[,,,;\n]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .forEach((ext) => form.append('exts', ext))

      if (editor.isNew) {
        const result = await apiPostForm<{ policyRef: AuthPolicyRef }>('/servers/server/settings/access/createPopup', form)
        toast('添加成功')
        await onSaved(result.policyRef)
      } else {
        form.set('policyId', String(editor.policyId))
        await apiPostForm('/servers/server/settings/access/updatePopup', form)
        toast('保存成功')
        await onSaved()
      }
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editor.isNew ? '添加鉴权方式' : '修改鉴权方式'}
      onClose={onClose}
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>取消</button>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="button" onClick={() => void save()}>
            保存
          </button>
        </>
      }
    >
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <FormTable>
          <FormRow title="名称 *">
            <input type="text" maxLength={100} value={editor.name} onChange={(event) => update({ name: event.target.value })} />
          </FormRow>
          <FormRow title="鉴权方法">
            <Select
              value={editor.type}
              disabled={!editor.isNew}
              onChange={(event) => update({ type: event.target.value })}
            >
              <option value="basicAuth">基本认证(BasicAuth)</option>
              <option value="subRequest">子请求</option>
            </Select>
          </FormRow>
          <FormRow title="启用">
            <Checkbox checked={editor.isOn} onChange={(isOn) => update({ isOn })} />
          </FormRow>

          {editor.type === 'basicAuth' ? (
            <>
              <FormRow title="用户">
                {editor.users.length === 0 ? <p className="comment">还没有用户.</p> : null}
                {editor.users.map((user, index) => (
                  <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="用户名"
                        value={user.username}
                        onChange={(event) => {
                          const users = editor.users.slice()
                          users[index] = { ...user, username: event.target.value }
                          update({ users })
                        }}
                      />
                    </div>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder="密码"
                        value={user.password}
                        onChange={(event) => {
                          const users = editor.users.slice()
                          users[index] = { ...user, password: event.target.value }
                          update({ users })
                        }}
                      />
                    </div>
                    <div className="ui field">
                      <a
                        href=""
                        title="删除"
                        onClick={(event) => {
                          event.preventDefault()
                          update({ users: editor.users.filter((_, i) => i !== index) })
                        }}
                      >
                        <X size={13} />
                      </a>
                    </div>
                  </div>
                ))}
                <button
                  className="ui button tiny"
                  type="button"
                  onClick={() => update({ users: [...editor.users, { username: '', password: '' }] })}
                >
                  <Plus size={12} /> 添加用户
                </button>
              </FormRow>
              <FormRow title="Realm">
                <input type="text" value={editor.realm} onChange={(event) => update({ realm: event.target.value })} />
              </FormRow>
              <FormRow title="字符集">
                <input type="text" value={editor.charset} onChange={(event) => update({ charset: event.target.value })} />
              </FormRow>
            </>
          ) : null}

          {editor.type === 'subRequest' ? (
            <>
              <FormRow title="子请求URL *">
                <input type="text" value={editor.subRequestURL} onChange={(event) => update({ subRequestURL: event.target.value })} />
              </FormRow>
              <FormRow title="子请求方法">
                <input type="text" value={editor.subRequestMethod} placeholder="比如 GET" onChange={(event) => update({ subRequestMethod: event.target.value })} />
                <p className="comment">留空表示使用默认方法.</p>
              </FormRow>
              <FormRow title="跟随跳转">
                <Checkbox checked={editor.followRequest} onChange={(followRequest) => update({ followRequest })} />
              </FormRow>
            </>
          ) : null}

          <FormRow title="扩展名">
            <input type="text" value={editor.exts} placeholder="比如 .html, .json" onChange={(event) => update({ exts: event.target.value })} />
            <p className="comment">如果填写了扩展名,则只对这些扩展名的请求进行鉴权,使用逗号分隔.</p>
          </FormRow>
          <FormRow title="专属域名">
            <input type="text" value={editor.domains} placeholder="比如 example.com" onChange={(event) => update({ domains: event.target.value })} />
            <p className="comment">如果填写了域名,则只对这些域名的请求进行鉴权,使用逗号分隔.</p>
          </FormRow>
        </FormTable>
      </form>
    </Modal>
  )
}

function AccessForm({ data, serverId, locationId }: { data: AccessData; serverId: string; locationId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [config, setConfig] = useState<AuthConfig>(
    data.authConfig || { isPrior: false, isOn: false, policyRefs: [] },
  )
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function save(nextConfig: AuthConfig, message?: string) {
    await apiPost('/servers/server/settings/locations/access', {
      webId: data.webId,
      authJSON: JSON.stringify(nextConfig),
    })
    toast(message || '保存成功')
    await queryClient.invalidateQueries({ queryKey: ['location-access', serverId, locationId] })
  }

  function update(patch: Partial<AuthConfig>, autoSave?: boolean) {
    const next = { ...config, ...patch }
    setConfig(next)
    if (autoSave) {
      void save(next).catch((error: Error) => toast(error.message, 'error'))
    }
  }

  function openCreate() {
    setEditor({
      index: -1,
      name: '',
      type: 'basicAuth',
      isOn: true,
      users: [],
      realm: '',
      charset: '',
      subRequestURL: '',
      subRequestMethod: '',
      followRequest: false,
      exts: '',
      domains: '',
      isNew: true,
    })
  }

  function openEdit(index: number, ref: AuthPolicyRef) {
    const policy = ref.authPolicy
    const params = policy?.params || {}
    setEditor({
      index,
      policyId: policy?.id || ref.authPolicyId,
      name: policy?.name || '',
      type: policy?.type || 'basicAuth',
      isOn: policy?.isOn ?? true,
      users: (params.users as BasicAuthUser[] | undefined) || [],
      realm: '',
      charset: '',
      subRequestURL: params.url || '',
      subRequestMethod: params.method || '',
      followRequest: false,
      exts: (params.exts || []).join(','),
      domains: (params.domains || []).join(','),
      isNew: false,
    })
  }

  async function handleSaved(createdRef?: AuthPolicyRef) {
    if (createdRef) {
      const nextConfig = { ...config, policyRefs: [...config.policyRefs, createdRef] }
      setConfig(nextConfig)
      await save(nextConfig)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['location-access', serverId, locationId] })
  }

  async function removeRef(index: number) {
    if (!(await confirm({ message: '确定要删除此鉴权方式吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    const policyRefs = config.policyRefs.filter((_, i) => i !== index)
    update({ policyRefs }, true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await save(config)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const isOn = config.isPrior && config.isOn

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <PriorRow isPrior={config.isPrior} onChange={(isPrior) => update({ isPrior })} />
      </FormTable>

      {config.isPrior ? (
        <FormTable>
          <FormRow title="启用鉴权">
            <Checkbox checked={config.isOn} onChange={(value) => update({ isOn: value }, true)} />
          </FormRow>
        </FormTable>
      ) : null}

      {isOn ? (
        <div>
          <h4>鉴权方式</h4>
          {config.policyRefs.length > 0 ? (
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
                {config.policyRefs.map((ref, index) => (
                  <tr key={`${ref.authPolicyId}-${index}`}>
                    <td>{ref.authPolicy?.name}</td>
                    <td>{methodName(ref.authPolicy?.type)}</td>
                    <td>
                      <PolicyParams policy={ref.authPolicy} />
                    </td>
                    <td>
                      {ref.authPolicy?.isOn ? (
                        <span className="ui label green basic">已启用</span>
                      ) : (
                        <span className="ui label grey basic">已禁用</span>
                      )}
                    </td>
                    <td>
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          openEdit(index, ref)
                        }}
                      >
                        <Pencil size={12} /> 修改
                      </a>{' '}
                      &nbsp;
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void removeRef(index)
                        }}
                      >
                        删除
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <button className="ui button small" type="button" onClick={openCreate}>
            <Plus size={12} /> 添加鉴权方式
          </button>
        </div>
      ) : null}

      <SubmitButton submitting={submitting} />

      {editor ? (
        <PolicyEditor
          state={editor}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </form>
  )
}

export function LocationAccessPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-access', serverId, locationId],
    queryFn: () =>
      apiGet<AccessData>('/servers/server/settings/locations/access', {
        serverId,
        locationId,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <LocationShell
      serverId={serverId}
      locationId={locationId}
      pattern={data.locationConfig?.pattern}
      tinyLeftMenuItems={data.tinyLeftMenuItems}
      leftMenuItemIsDisabled={data.leftMenuItemIsDisabled}
    >
      <AccessForm data={data} serverId={serverId} locationId={locationId} />
    </LocationShell>
  )
}
