import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { ServerSettingsShell, useServerId, type ServerSettingsBase } from './shared'

interface ServerNameConfig {
  name: string
  type: string
  subNames?: string[] | null
}

interface ServerNamesData extends ServerSettingsBase {
  passedDomains: string[]
  isAuditing: boolean
  auditingTime: string
  auditingResult: { isOk: boolean; reason?: string; createdTime?: string }
  serverNames: ServerNameConfig[] | null
}

export function ServerNamesSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-server-names', serverId],
    queryFn: () => apiGet<ServerNamesData>('/servers/server/settings/serverNames', { serverId }),
    enabled: serverId > 0,
  })
  const [serverNames, setServerNames] = useState<ServerNameConfig[]>([])
  const [auditing, setAuditing] = useState(true)
  const [auditingReason, setAuditingReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setServerNames(query.data.serverNames || [])
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
  const allServerNames: { name: string; isPassed: boolean }[] = []
  ;(data.serverNames || []).forEach((config) => {
    if (!config.subNames || config.subNames.length === 0) {
      allServerNames.push({ name: config.name, isPassed: data.passedDomains.includes(config.name) })
    } else {
      config.subNames.forEach((subName) => {
        allServerNames.push({ name: subName, isPassed: data.passedDomains.includes(subName) })
      })
    }
  })
  const hasPassedDomains = allServerNames.some((serverName) => serverName.isPassed)

  function updateName(index: number, patch: Partial<ServerNameConfig>) {
    const next = [...serverNames]
    next[index] = { ...next[index], ...patch }
    setServerNames(next)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/serverNames', {
        csrfToken: await getCsrfToken(),
        serverId,
        serverNames: JSON.stringify(serverNames),
      })
      toast('保存成功,请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAudit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/serverNames/audit', {
        csrfToken: await getCsrfToken(),
        serverId,
        auditingOK: auditing ? 1 : '',
        auditingReason,
      })
      toast('保存成功')
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (data.isAuditing) {
    return (
      <ServerSettingsShell data={data}>
        <div className="margin" />
        <div className="ui message warning">当前域名正在审核中,请审核域名的所有人,备案情况等.</div>
        <form className="ui form" onSubmit={submitAudit}>
          <FormTable>
            <FormRow title="审核中域名">
              <div>
                {allServerNames.map((serverName) => (
                  <span key={serverName.name} className={`ui label basic${serverName.isPassed ? ' green' : ''}`}>
                    {serverName.name}
                  </span>
                ))}
                {hasPassedDomains ? (
                  <p className="comment">
                    <span className="green">绿色</span>标注的域名表示之前已经审核通过的域名.
                  </p>
                ) : null}
              </div>
            </FormRow>
            {data.auditingTime.length > 0 ? <FormRow title="提交审核时间">{data.auditingTime}</FormRow> : null}
            <FormRow title="审核结果">
              <label>
                <input type="radio" checked={auditing} onChange={() => setAuditing(true)} /> 审核通过
              </label>
              &nbsp;
              <label>
                <input type="radio" checked={!auditing} onChange={() => setAuditing(false)} /> 审核不通过
              </label>
            </FormRow>
            {!auditing ? (
              <FormRow title="审核不通过原因 *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="包含审核不通过的域名等"
                  value={auditingReason}
                  onChange={(event) => setAuditingReason(event.target.value)}
                />
              </FormRow>
            ) : null}
          </FormTable>
          <SubmitButton submitting={submitting}>提交审核结果</SubmitButton>
        </form>
      </ServerSettingsShell>
    )
  }

  if (!data.auditingResult.isOk) {
    return (
      <ServerSettingsShell data={data}>
        <div className="ui message error">
          审核不通过,原因:{data.auditingResult.reason} ({data.auditingResult.createdTime}).等待用户重新提交.
        </div>
      </ServerSettingsShell>
    )
  }

  return (
    <ServerSettingsShell data={data}>
      <form className="ui form" onSubmit={save}>
        <FormTable>
          <FormRow title="已绑定的域名">
            <div>
              {serverNames.map((config, index) => (
                <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
                  <div className="ui field">
                    <Select value={config.type || 'full'} onChange={(event) => updateName(index, { type: event.target.value })}>
                      <option value="full">完整域名</option>
                      <option value="prefix">前缀</option>
                      <option value="suffix">后缀</option>
                      <option value="match">正则匹配</option>
                    </Select>
                  </div>
                  <div className="ui field" style={{ minWidth: '20em' }}>
                    <input
                      type="text"
                      placeholder="比如 example.com"
                      value={config.subNames && config.subNames.length > 0 ? config.subNames.join('\n') : config.name}
                      onChange={(event) =>
                        updateName(
                          index,
                          config.subNames && config.subNames.length > 0
                            ? { subNames: event.target.value.split('\n').map((value) => value.trim()).filter((value) => value.length > 0) }
                            : { name: event.target.value },
                        )
                      }
                    />
                    {config.subNames && config.subNames.length > 0 ? <p className="comment">每行一个域名,共{config.subNames.length}个.</p> : null}
                  </div>
                  <div className="ui field" style={{ padding: 0 }}>
                    <a href="" title="删除" onClick={(event) => { event.preventDefault(); setServerNames(serverNames.filter((_, i) => i !== index)) }}>
                      <Trash2 size={13} />
                    </a>
                  </div>
                </div>
              ))}
              <div className="ui divider" />
              <a href="" onClick={(event) => { event.preventDefault(); setServerNames([...serverNames, { type: 'full', name: '', subNames: [] }]) }}>
                [添加域名绑定]
              </a>
              <p className="comment">用户可以通过这些域名访问当前网站.</p>
            </div>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}
