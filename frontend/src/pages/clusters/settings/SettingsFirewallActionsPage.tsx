import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { apiGet, apiPost, getCsrfToken } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, Modal, parseId } from '../shared'

interface FirewallActionRow {
  id: number
  name: string
  type: string
  typeName: string
}

interface FirewallLevel {
  name: string
  code: string
  actions: FirewallActionRow[]
}

interface FirewallActionsData {
  levels: FirewallLevel[]
  hasActions: boolean
}

interface ActionType {
  name: string
  code: string
  description: string
}

const eventLevels = [
  { name: '调试', code: 'debug' },
  { name: '通知', code: 'notice' },
  { name: '警告', code: 'warning' },
  { name: '错误', code: 'error' },
  { name: '严重', code: 'critical' },
  { name: '致命', code: 'fatal' },
]

const defaultHtml = `<!DOCTYPE html>
<html lang="zh">
<head>
<title></title>
</head>
<body>
<!-- 这里写提示文字 -->

</body>
</html>`

export function ClusterSettingsFirewallActionsPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(0)
  const query = useQuery({
    queryKey: ['cluster-firewall-actions', clusterId],
    queryFn: () => apiGet<FirewallActionsData>('/clusters/cluster/settings/firewall-actions', { clusterId }),
    enabled: clusterId > 0,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function remove(actionId: number) {
    if (!(await confirm({ message: '确定要删除此动作吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/clusters/cluster/settings/firewall-actions/delete', { actionId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-firewall-actions', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/firewall-actions">
      <div className="ui menu text blue first-menu">
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setCreating(true)
            setEditingId(0)
          }}
        >
          <Plus size={14} /> 添加动作
        </a>
        <span className="disabled item">|</span>
        <span className="item">可以设置WAF中的规则集和IP名单中的IP级别，从而在匹配时触发对应的动作。</span>
      </div>

      <div className="margin" />
      {!data.hasActions ? <p className="comment">暂时还没有自定义动作。</p> : null}
      {data.levels
        .filter((level) => level.actions.length > 0)
        .map((level) => (
          <div key={level.code}>
            <h4 style={{ marginBottom: 0 }}>{level.name}级别</h4>
            <table className="ui table selectable">
              <thead>
                <tr>
                  <th>名称</th>
                  <th className="four wide">类型</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {level.actions.map((action) => (
                  <tr key={action.id}>
                    <td>{action.name}</td>
                    <td>{action.typeName}</td>
                    <td>
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setEditingId(action.id)
                          setCreating(false)
                        }}
                      >
                        修改
                      </a>{' '}
                      &nbsp;{' '}
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void remove(action.id)
                        }}
                      >
                        删除
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ui divider" />
          </div>
        ))}

      {creating ? (
        <Modal title="添加动作" onClose={() => setCreating(false)}>
          <FirewallActionForm
            clusterId={clusterId}
            actionId={0}
            onCancel={() => setCreating(false)}
            onSaved={async () => {
              setCreating(false)
              await queryClient.invalidateQueries({ queryKey: ['cluster-firewall-actions', clusterId] })
            }}
          />
        </Modal>
      ) : null}
      {editingId > 0 ? (
        <Modal title="修改动作" onClose={() => setEditingId(0)}>
          <FirewallActionForm
            clusterId={clusterId}
            actionId={editingId}
            onCancel={() => setEditingId(0)}
            onSaved={async () => {
              setEditingId(0)
              await queryClient.invalidateQueries({ queryKey: ['cluster-firewall-actions', clusterId] })
            }}
          />
        </Modal>
      ) : null}
    </ClusterSettingsLayout>
  )
}

interface ActionPopupData {
  action?: {
    id: number
    name: string
    eventLevel: string
    type: string
    params: Record<string, unknown>
  }
  actionTypes: ActionType[]
  clusterId?: number
}

export function FirewallActionForm({
  clusterId,
  actionId,
  onCancel,
  onSaved,
}: {
  clusterId: number
  actionId: number
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const title = actionId > 0 ? 'updatePopup' : 'createPopup'
  const query = useQuery({
    queryKey: ['firewall-action-form', actionId, clusterId],
    queryFn: () => apiGet<ActionPopupData>(`/clusters/cluster/settings/firewall-actions/${title}`, actionId > 0 ? { actionId } : { clusterId }),
  })
  const [name, setName] = useState('')
  const [eventLevel, setEventLevel] = useState('critical')
  const [type, setType] = useState('')
  const [whiteName, setWhiteName] = useState('edge_white_list')
  const [whiteNameIPv6, setWhiteNameIPv6] = useState('edge_white_list_ipv6')
  const [blackName, setBlackName] = useState('edge_black_list')
  const [blackNameIPv6, setBlackNameIPv6] = useState('edge_black_list_ipv6')
  const [autoAddToIPTables, setAutoAddToIPTables] = useState(true)
  const [autoAddToFirewalld, setAutoAddToFirewalld] = useState(true)
  const [scriptPath, setScriptPath] = useState('')
  const [httpAPIURL, setHttpAPIURL] = useState('')
  const [htmlContent, setHtmlContent] = useState(defaultHtml)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!query.data) {
      return
    }
    const action = query.data.action
    if (action) {
      const params = action.params || {}
      setName(action.name)
      setEventLevel(action.eventLevel)
      setType(action.type)
      setWhiteName(String(params.whiteName || 'edge_white_list'))
      setWhiteNameIPv6(String(params.whiteNameIPv6 || 'edge_white_list_ipv6'))
      setBlackName(String(params.blackName || 'edge_black_list'))
      setBlackNameIPv6(String(params.blackNameIPv6 || 'edge_black_list_ipv6'))
      setAutoAddToIPTables(Boolean(params.autoAddToIPTables))
      setAutoAddToFirewalld(Boolean(params.autoAddToFirewalld))
      setScriptPath(String(params.path || ''))
      setHttpAPIURL(String(params.url || ''))
      setHtmlContent(String(params.content || defaultHtml))
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const actionTypes = query.data.actionTypes
  const typeDescription = actionTypes.find((item) => item.code === type)?.description || ''

  return (
    <form
      className="ui form"
      onSubmit={async (event) => {
        event.preventDefault()
        setSubmitting(true)
        try {
          const csrfToken = await getCsrfToken()
          await apiPost(`/clusters/cluster/settings/firewall-actions/${title}`, {
            actionId: actionId > 0 ? actionId : undefined,
            clusterId,
            name,
            eventLevel,
            type,
            ipsetWhiteName: whiteName,
            ipsetBlackName: blackName,
            ipsetWhiteNameIPv6: whiteNameIPv6,
            ipsetBlackNameIPv6: blackNameIPv6,
            ipsetAutoAddToIPTables: autoAddToIPTables ? 1 : '',
            ipsetAutoAddToFirewalld: autoAddToFirewalld ? 1 : '',
            scriptPath,
            httpAPIURL,
            htmlContent,
            csrfToken,
          })
          toast('保存成功')
          await onSaved()
        } catch (error) {
          toast(error instanceof Error ? error.message : '保存失败', 'error')
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <FormTable>
        <FormRow title="名称 *">
          <TextInput type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </FormRow>
        <FormRow title="级别">
          <Select value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}>
            {eventLevels.map((level) => (
              <option key={level.code} value={level.code}>
                {level.name}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow title="类型">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">[请选择]</option>
            {actionTypes.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </Select>
          <p className="comment">{typeDescription}</p>
        </FormRow>
        {type === 'ipset' ? (
          <>
            <FormRow title="IPv4白名单名称 *">
              <TextInput type="text" maxLength={64} value={whiteName} onChange={(event) => setWhiteName(event.target.value)} />
            </FormRow>
            <FormRow title="IPv6白名单名称 *">
              <TextInput type="text" maxLength={64} value={whiteNameIPv6} onChange={(event) => setWhiteNameIPv6(event.target.value)} />
            </FormRow>
            <FormRow title="IPv4黑名单名称 *">
              <TextInput type="text" maxLength={64} value={blackName} onChange={(event) => setBlackName(event.target.value)} />
            </FormRow>
            <FormRow title="IPv6黑名单名称 *">
              <TextInput type="text" maxLength={64} value={blackNameIPv6} onChange={(event) => setBlackNameIPv6(event.target.value)} />
            </FormRow>
            <FormRow title="创建IPTables规则">
              <Checkbox label="" checked={autoAddToIPTables} onChange={setAutoAddToIPTables} />
            </FormRow>
            <FormRow title="创建Firewalld规则">
              <Checkbox label="" checked={autoAddToFirewalld} onChange={setAutoAddToFirewalld} />
            </FormRow>
          </>
        ) : null}
        {type === 'script' ? (
          <FormRow title="脚本路径 *">
            <TextInput type="text" maxLength={200} value={scriptPath} onChange={(event) => setScriptPath(event.target.value)} />
            <p className="comment">可执行脚本文件的完整路径。</p>
          </FormRow>
        ) : null}
        {type === 'httpAPI' ? (
          <FormRow title="API URL *">
            <TextInput type="text" maxLength={200} placeholder="http|https://..." value={httpAPIURL} onChange={(event) => setHttpAPIURL(event.target.value)} />
          </FormRow>
        ) : null}
        {type === 'html' ? (
          <FormRow title="HTML内容 *">
            <textarea name="htmlContent" rows={10} maxLength={128000} value={htmlContent} onChange={(event) => setHtmlContent(event.target.value)} />
          </FormRow>
        ) : null}
      </FormTable>
      <SubmitButton submitting={submitting} />
      <button className="ui button" type="button" onClick={onCancel} style={{ marginLeft: '0.5em' }}>
        取消
      </button>
    </form>
  )
}

export function ClusterSettingsFirewallActionCreatePopupPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  return (
    <div>
      <h3>添加动作</h3>
      <FirewallActionForm
        clusterId={clusterId}
        actionId={0}
        onCancel={() => {
          window.location.hash = `#/clusters/cluster/settings/firewall-actions?clusterId=${clusterId}`
        }}
        onSaved={async () => {
          window.location.hash = `#/clusters/cluster/settings/firewall-actions?clusterId=${clusterId}`
        }}
      />
    </div>
  )
}

export function ClusterSettingsFirewallActionUpdatePopupPage() {
  const [searchParams] = useSearchParams()
  const actionId = parseId(searchParams.get('actionId'))
  return (
    <div>
      <h3>修改动作</h3>
      <FirewallActionForm
        clusterId={0}
        actionId={actionId}
        onCancel={() => {
          window.location.hash = '#/clusters/cluster/settings/firewall-actions'
        }}
        onSaved={async () => {
          window.location.hash = '#/clusters/cluster/settings/firewall-actions'
        }}
      />
    </div>
  )
}
