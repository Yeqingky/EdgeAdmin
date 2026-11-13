import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { MoreOptionsRow, PriorRow } from './fields'
import { LocationShell } from './LocationShell'
import type { AccessLogConfig, AccessLogField, LocationPageBase } from './types'

interface AccessLogData extends LocationPageBase {
  accessLogConfig?: AccessLogConfig | null
  fields: AccessLogField[]
  defaultFieldCodes: number[]
}

function AccessLogForm({ data }: { data: AccessLogData }) {
  const toast = useToast()
  const config = data.accessLogConfig
  const [isPrior, setIsPrior] = useState(config?.isPrior ?? false)
  const [isOn, setIsOn] = useState(config?.isOn ?? false)
  const [fields, setFields] = useState<number[]>(
    config ? (config.fields || []) : data.defaultFieldCodes,
  )
  const [status1, setStatus1] = useState(config?.status1 ?? true)
  const [status2, setStatus2] = useState(config?.status2 ?? true)
  const [status3, setStatus3] = useState(config?.status3 ?? true)
  const [status4, setStatus4] = useState(config?.status4 ?? true)
  const [status5, setStatus5] = useState(config?.status5 ?? true)
  const [enableClientClosed, setEnableClientClosed] = useState(config?.enableClientClosed ?? false)
  const [firewallOnly, setFirewallOnly] = useState(config?.firewallOnly ?? false)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const hasRequestBodyField = fields.includes(8)
  const statusLabels: { label: string; checked: boolean; onChange: (value: boolean) => void }[] = [
    { label: '1xx', checked: status1, onChange: setStatus1 },
    { label: '2xx', checked: status2, onChange: setStatus2 },
    { label: '3xx', checked: status3, onChange: setStatus3 },
    { label: '4xx', checked: status4, onChange: setStatus4 },
    { label: '5xx', checked: status5, onChange: setStatus5 },
  ]

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/accessLog', {
        webId: data.webId,
        accessLogJSON: JSON.stringify({
          isPrior,
          isOn,
          fields,
          status1,
          status2,
          status3,
          status4,
          status5,
          enableClientClosed,
          firewallOnly,
        }),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <div style={firewallOnly ? { opacity: 0.5 } : undefined}>
        <FormTable>
          <PriorRow isPrior={isPrior} onChange={setIsPrior} />
        </FormTable>
        {isPrior ? (
          <FormTable>
            <FormRow title="启用访问日志">
              <Checkbox checked={isOn} onChange={setIsOn} />
            </FormRow>
          </FormTable>
        ) : null}
        {isPrior && isOn ? (
          <table className="ui table definition selectable">
            <MoreOptionsRow visible={advancedVisible} onToggle={() => setAdvancedVisible((visible) => !visible)} />
            <tbody>
            {advancedVisible ? (
              <>
                <FormRow title="基础信息">
                  <p className="comment" style={{ paddingTop: 0 }}>默认记录客户端IP,请求URL等基础信息.</p>
                </FormRow>
                <FormRow title="高级信息">
                  {data.fields.map((field, index) => (
                    <div key={field.code} className="ui checkbox" style={{ width: '10em', marginBottom: '0.8em' }}>
                      <input
                        id={`access-log-field-${index}`}
                        type="checkbox"
                        checked={fields.includes(field.code)}
                        onChange={(event) => {
                          setFields((current) =>
                            event.target.checked
                              ? [...current, field.code]
                              : current.filter((code) => code !== field.code),
                          )
                        }}
                      />
                      <label htmlFor={`access-log-field-${index}`}>{field.name}</label>
                    </div>
                  ))}
                  <p className="comment">
                    在基础信息之外要存储的信息.
                    {hasRequestBodyField ? (
                      <span className="red">记录"请求Body"将会显著消耗更多的系统资源,建议仅在调试时启用,最大记录尺寸为2MiB.</span>
                    ) : null}
                  </p>
                </FormRow>
                <FormRow title="要存储的访问日志状态码">
                  {statusLabels.map((item) => (
                    <div key={item.label} className="ui checkbox" style={{ width: '3.5em' }}>
                      <input type="checkbox" checked={item.checked} onChange={(event) => item.onChange(event.target.checked)} />
                      <label>{item.label}</label>
                    </div>
                  ))}
                </FormRow>
                <FormRow title="记录客户端中断日志">
                  <Checkbox checked={enableClientClosed} onChange={setEnableClientClosed} />
                  <p className="comment">以<code>499</code>的状态码记录客户端主动中断日志.</p>
                </FormRow>
              </>
            ) : null}
            </tbody>
          </table>
        ) : null}
      </div>

      {isPrior && isOn ? (
        <div>
          <h4>WAF相关</h4>
          <FormTable>
            <FormRow title="只记录WAF相关日志">
              <Checkbox checked={firewallOnly} onChange={setFirewallOnly} />
              <p className="comment">选中后只记录WAF相关的日志.通过此选项可有效减少访问日志数量,降低网络带宽和存储压力.</p>
            </FormRow>
          </FormTable>
        </div>
      ) : null}

      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function LocationAccessLogPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-access-log', serverId, locationId],
    queryFn: () =>
      apiGet<AccessLogData>('/servers/server/settings/locations/accessLog', {
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
      <AccessLogForm data={data} />
    </LocationShell>
  )
}
