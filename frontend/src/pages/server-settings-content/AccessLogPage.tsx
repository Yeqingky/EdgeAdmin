import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import {
  GroupConfigWarning,
  MoreOptionsIndicator,
  ServerSettingsShell,
  useServerId,
  type ServerSettingsBase,
} from './shared'

interface AccessLogConfig {
  isPrior?: boolean
  isOn: boolean
  fields: number[]
  status1: boolean
  status2: boolean
  status3: boolean
  status4: boolean
  status5: boolean
  enableClientClosed: boolean
  storageOnly?: boolean
  storagePolicies?: number[]
  firewallOnly: boolean
}

interface AccessLogField {
  code: number
  name: string
}

interface AccessLogData extends ServerSettingsBase {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  accessLogConfig: AccessLogConfig | null
  fields: AccessLogField[]
  defaultFieldCodes: number[]
}

const DEFAULT_CONFIG: AccessLogConfig = {
  isOn: false,
  fields: [1, 2, 6, 7],
  status1: true,
  status2: true,
  status3: true,
  status4: true,
  status5: true,
  enableClientClosed: false,
  firewallOnly: false,
}

export function ServerAccessLogSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-access-log', serverId],
    queryFn: () => apiGet<AccessLogData>('/servers/server/settings/accessLog', { serverId }),
    enabled: serverId > 0,
  })

  const [config, setConfig] = useState<AccessLogConfig>(DEFAULT_CONFIG)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!query.data) {
      return
    }
    const data = query.data
    const accessLog = data.accessLogConfig
    setConfig(
      accessLog
        ? { ...DEFAULT_CONFIG, ...accessLog, fields: accessLog.fields || data.defaultFieldCodes || DEFAULT_CONFIG.fields }
        : { ...DEFAULT_CONFIG, fields: data.defaultFieldCodes || DEFAULT_CONFIG.fields },
    )
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const hasRequestBodyField = config.fields.includes(8)

  function update<K extends keyof AccessLogConfig>(key: K, value: AccessLogConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  function toggleField(code: number, checked: boolean) {
    update('fields', checked ? [...config.fields, code] : config.fields.filter((item) => item !== code))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/accessLog', { webId: data.webId, accessLogJSON: JSON.stringify(config) })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell
      data={data}
      header={data.hasGroupConfig ? <GroupConfigWarning href={data.groupSettingURL} /> : null}
    >
      <div className={data.hasGroupConfig ? 'opacity-mask' : undefined}>
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="启用访问日志">
              <Checkbox checked={config.isOn} onChange={(checked) => update('isOn', checked)} />
            </FormRow>
          </FormTable>

          {config.isOn ? (
            <>
              <MoreOptionsIndicator visible={advancedVisible} onChange={setAdvancedVisible} />
              {advancedVisible ? (
                <FormTable>
                  <FormRow title="基础信息">
                    <p className="comment" style={{ paddingTop: 0 }}>
                      默认记录客户端IP、请求URL等基础信息。
                    </p>
                  </FormRow>
                  <FormRow title="高级信息">
                    <div>
                      {data.fields.map((field, index) => (
                        <div key={field.code} className="ui checkbox" style={{ width: '10em', marginBottom: '0.8em' }}>
                          <input
                            id={`access-log-field-${index}`}
                            type="checkbox"
                            checked={config.fields.includes(field.code)}
                            onChange={(event) => toggleField(field.code, event.target.checked)}
                          />
                          <label htmlFor={`access-log-field-${index}`}>{field.name}</label>
                        </div>
                      ))}
                    </div>
                    <p className="comment">
                      在基础信息之外要存储的信息。
                      {hasRequestBodyField ? (
                        <span className="red">记录"请求Body"将会显著消耗更多的系统资源，建议仅在调试时启用，最大记录尺寸为2MiB。</span>
                      ) : null}
                    </p>
                  </FormRow>
                  <FormRow title="要存储的访问日志状态码">
                    {(['status1', 'status2', 'status3', 'status4', 'status5'] as const).map((key, index) => (
                      <div key={key} className="ui checkbox" style={{ width: '3.5em' }}>
                        <input type="checkbox" checked={config[key]} onChange={(event) => update(key, event.target.checked)} />
                        <label>{index + 1}xx</label>
                      </div>
                    ))}
                  </FormRow>
                  <FormRow title="记录客户端中断日志">
                    <Checkbox checked={config.enableClientClosed} onChange={(checked) => update('enableClientClosed', checked)} />
                    <p className="comment">
                      以<code>499</code>的状态码记录客户端主动中断日志。
                    </p>
                  </FormRow>
                </FormTable>
              ) : null}

              <h4>WAF相关</h4>
              <FormTable>
                <FormRow title="只记录WAF相关日志">
                  <Checkbox checked={config.firewallOnly} onChange={(checked) => update('firewallOnly', checked)} />
                  <p className="comment">选中后只记录WAF相关的日志。通过此选项可有效减少访问日志数量，降低网络带宽和存储压力。</p>
                </FormRow>
              </FormTable>
            </>
          ) : null}

          <SubmitButton submitting={submitting} />
        </form>
      </div>
    </ServerSettingsShell>
  )
}
