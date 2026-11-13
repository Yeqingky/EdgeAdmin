import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, Modal, parseId } from '../shared'

interface TimeDuration {
  count: number
  unit: string
}

interface HealthCheckConfig {
  isOn: boolean
  url: string
  interval: TimeDuration
  statusCodes: number[]
  timeout: TimeDuration
  countTries: number
  tryDelay: TimeDuration
  autoDown: boolean
  countUp: number
  countDown: number
  userAgent: string
  onlyBasicRequest: boolean
  accessLogIsOn: boolean
}

const durationUnits = [
  { code: 'ms', name: '毫秒' },
  { code: 'second', name: '秒' },
  { code: 'minute', name: '分钟' },
  { code: 'hour', name: '小时' },
]

function TimeDurationInput({ value, onChange }: { value: TimeDuration; onChange: (value: TimeDuration) => void }) {
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <TextInput
          type="text"
          style={{ width: '5em' }}
          value={String(value.count)}
          onChange={(event) => onChange({ ...value, count: Number(event.target.value) || 0 })}
        />
      </div>
      <div className="ui field">
        <Select value={value.unit} onChange={(event) => onChange({ ...value, unit: event.target.value })}>
          {durationUnits.map((unit) => (
            <option key={unit.code} value={unit.code}>
              {unit.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export function ClusterSettingsHealthPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings-health', clusterId],
    queryFn: () => apiGet<{ healthCheckConfig: HealthCheckConfig | null }>('/clusters/cluster/settings/health', { clusterId }),
    enabled: clusterId > 0,
  })
  const [config, setConfig] = useState<HealthCheckConfig | null>(null)
  const [statusCodes, setStatusCodes] = useState('')
  const [showRun, setShowRun] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.healthCheckConfig)
      setStatusCodes((query.data.healthCheckConfig?.statusCodes || []).join(','))
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const current: HealthCheckConfig = config || {
    isOn: false,
    url: '',
    interval: { count: 60, unit: 'second' },
    statusCodes: [],
    timeout: { count: 10, unit: 'second' },
    countTries: 1,
    tryDelay: { count: 10, unit: 'second' },
    autoDown: false,
    countUp: 1,
    countDown: 1,
    userAgent: '',
    onlyBasicRequest: false,
    accessLogIsOn: true,
  }

  const update = (patch: Partial<HealthCheckConfig>) => setConfig({ ...current, ...patch })

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/health">
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            const next: HealthCheckConfig = {
              ...current,
              statusCodes: statusCodes
                .split(',')
                .map((code) => Number(code.trim()))
                .filter((code) => code > 0),
            }
            await apiPost('/clusters/cluster/settings/health', { clusterId, healthCheckJSON: JSON.stringify(next) })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="启用健康检查">
            <Checkbox label="" checked={current.isOn} onChange={(value) => update({ isOn: value })} />
            <p className="comment">选中后，表示对当前集群下的网站进行健康检查。</p>
          </FormRow>
          <FormRow title="检查URL">
            <TextInput type="text" value={current.url} onChange={(event) => update({ url: event.target.value })} />
            <p className="comment">可以是一个URL路径，比如 /ping。</p>
          </FormRow>
          <FormRow title="检查周期">
            <TimeDurationInput value={current.interval} onChange={(value) => update({ interval: value })} />
          </FormRow>
          <FormRow title="超时时间">
            <TimeDurationInput value={current.timeout} onChange={(value) => update({ timeout: value })} />
          </FormRow>
          <FormRow title="期望的状态码">
            <TextInput type="text" placeholder="200,301" value={statusCodes} onChange={(event) => setStatusCodes(event.target.value)} />
            <p className="comment">多个状态码使用英文逗号分隔。</p>
          </FormRow>
          <FormRow title="尝试次数">
            <TextInput
              type="text"
              style={{ width: '5em' }}
              value={String(current.countTries)}
              onChange={(event) => update({ countTries: Number(event.target.value) || 0 })}
            />
          </FormRow>
          <FormRow title="尝试间隔">
            <TimeDurationInput value={current.tryDelay} onChange={(value) => update({ tryDelay: value })} />
          </FormRow>
          <FormRow title="自动下线">
            <Checkbox label="" checked={current.autoDown} onChange={(value) => update({ autoDown: value })} />
            <p className="comment">选中后，连续检查失败达到次数后自动将节点下线。</p>
          </FormRow>
          <FormRow title="连续在线认定次数">
            <TextInput
              type="text"
              style={{ width: '5em' }}
              value={String(current.countUp)}
              onChange={(event) => update({ countUp: Number(event.target.value) || 0 })}
            />
          </FormRow>
          <FormRow title="连续离线认定次数">
            <TextInput
              type="text"
              style={{ width: '5em' }}
              value={String(current.countDown)}
              onChange={(event) => update({ countDown: Number(event.target.value) || 0 })}
            />
          </FormRow>
          <FormRow title="User-Agent">
            <TextInput type="text" value={current.userAgent} onChange={(event) => update({ userAgent: event.target.value })} />
          </FormRow>
          <FormRow title="只做基础请求">
            <Checkbox label="" checked={current.onlyBasicRequest} onChange={(value) => update({ onlyBasicRequest: value })} />
            <p className="comment">选中后，表示不处理WAF、反向代理等，直接返回检查结果。</p>
          </FormRow>
          <FormRow title="记录访问日志">
            <Checkbox label="" checked={current.accessLogIsOn} onChange={(value) => update({ accessLogIsOn: value })} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} /> &nbsp;{' '}
        {current.isOn ? (
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              setShowRun(true)
            }}
          >
            立即检查
          </a>
        ) : null}
      </form>

      {showRun ? <HealthRunModal clusterId={clusterId} onClose={() => setShowRun(false)} /> : null}
    </ClusterSettingsLayout>
  )
}

interface HealthResult {
  node: { id: number; name: string }
  nodeAddr: string
  isOk: boolean
  error: string
  costMs: number
}

function HealthRunModal({ clusterId, onClose }: { clusterId: number; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['cluster-health-run-info', clusterId],
    queryFn: () => apiGet<{ hasServers: boolean }>('/clusters/cluster/settings/health/runPopup', { clusterId }),
  })
  const [results, setResults] = useState<HealthResult[] | null>(null)
  const [errorString, setErrorString] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  if (query.isLoading) {
    return (
      <Modal title="健康检查" onClose={onClose}>
        <LoadingBlock />
      </Modal>
    )
  }

  const hasServers = query.data?.hasServers ?? false
  const countSuccess = results?.filter((result) => result.isOk).length || 0
  const countFail = results?.filter((result) => !result.isOk).length || 0

  return (
    <Modal title="健康检查" onClose={onClose}>
      {!hasServers ? (
        <span className="red">当前集群尚未部署网站，无法进行健康检查；请至少部署至少一个网站后再试。</span>
      ) : (
        <div>
          {isRequesting ? <span className="red">正在执行中，请等待执行完毕...</span> : null}
          {!isRequesting && errorString ? <span className="red">{errorString}</span> : null}
          {!isRequesting && !errorString && results === null ? (
            <button
              className="ui button primary"
              type="button"
              onClick={async () => {
                setIsRequesting(true)
                try {
                  const resp = await apiPost<{ results: HealthResult[] }>('/clusters/cluster/settings/health/runPopup', { clusterId })
                  setResults(resp.results || [])
                } catch (error) {
                  setErrorString(error instanceof Error ? error.message : '执行失败')
                } finally {
                  setIsRequesting(false)
                }
              }}
            >
              开始检查
            </button>
          ) : null}
          {results !== null ? (
            <form className="ui form">
              <p>
                成功节点：<span className="green">{countSuccess}</span> &nbsp; 失败节点：<span className="red">{countFail}</span>
              </p>
              {results.length > 0 ? (
                <table className="ui table selectable celled">
                  <thead>
                    <tr>
                      <th>节点</th>
                      <th>结果</th>
                      <th>耗时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.node.id}>
                        <td>
                          {result.node.name}
                          {result.nodeAddr ? <span className="small">（{result.nodeAddr}）</span> : null}
                        </td>
                        <td>{result.isOk ? <span className="green">成功</span> : <span className="red">失败：{result.error}</span>}</td>
                        <td>{result.costMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              <button className="ui button primary" type="button" onClick={onClose}>
                完成
              </button>
            </form>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

export function ClusterSettingsHealthRunPopupPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  return <HealthRunModal clusterId={clusterId} onClose={() => { window.location.hash = `#/clusters/cluster/settings/health?clusterId=${clusterId}` }} />
}
