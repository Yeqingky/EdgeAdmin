import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LogTabs } from './LogTabs'

interface LogConfig {
  canDelete: boolean
  canClean: boolean
  days: number
  canChange: boolean
  capacity: { count: number; unit: string }
}

export function LogSettingsPage() {
  const toast = useToast()
  const query = useQuery({ queryKey: ['log-settings'], queryFn: () => apiGet<{ logConfig: LogConfig }>('/log/settings') })
  const [config, setConfig] = useState<LogConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.logConfig)
    }
  }, [query.data])

  if (query.isLoading || !config) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/log/settings', {
        csrfToken: await getCsrfToken(),
        canDelete: config?.canDelete ? 1 : '',
        canClean: config?.canClean ? 1 : '',
        days: config?.days,
        canChange: config?.canChange ? 1 : '',
        capacityJSON: JSON.stringify(config?.capacity),
      })
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <LogTabs active="setting" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          {config.canChange ? (
            <FormRow title="允许手动删除日志"><Checkbox checked={config.canDelete} onChange={(checked) => setConfig({ ...config, canDelete: checked })} /></FormRow>
          ) : null}
          {config.canChange ? (
            <FormRow title="允许手动清理"><Checkbox checked={config.canClean} onChange={(checked) => setConfig({ ...config, canClean: checked })} /></FormRow>
          ) : null}
          {config.canChange ? (
            <FormRow title="日志保留天数">
              <input type="text" style={{ width: '5em' }} maxLength={3} value={String(config.days)} onChange={(event) => setConfig({ ...config, days: Number(event.target.value) || 0 })} />
              <p className="comment">超过此天数的日志将会被自动清理，0表示不自动清理。</p>
            </FormRow>
          ) : null}
          <FormRow title="最大容量限制">
            <div className="ui fields inline">
              <div className="ui field">
                <input type="text" style={{ width: '6em' }} value={config.capacity?.count >= 0 ? String(config.capacity.count) : ''} onChange={(event) => setConfig({ ...config, capacity: { ...config.capacity, count: Number(event.target.value) } })} />
              </div>
              <div className="ui field">
                <select className="ui dropdown" value={config.capacity?.unit || 'mb'} onChange={(event) => setConfig({ ...config, capacity: { ...config.capacity, unit: event.target.value } })}>
                  <option value="byte">字节</option><option value="kb">KB</option><option value="mb">MB</option><option value="gb">GB</option>
                </select>
              </div>
            </div>
          </FormRow>
          {config.canChange ? (
            <FormRow title="允许修改清除配置">
              <Checkbox checked={config.canChange} onChange={(checked) => setConfig({ ...config, canChange: checked })} />
            </FormRow>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
