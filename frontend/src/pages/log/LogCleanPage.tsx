import { useState, type FormEvent } from 'react'
import { apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LogTabs } from './LogTabs'
import { FormRow, FormTable, SubmitButton } from '../../components/form'

export function LogCleanPage() {
  const toast = useToast()
  const [type, setType] = useState<'all' | 'days'>('all')
  const [days, setDays] = useState(30)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/log/clean', { csrfToken: await getCsrfToken(), type, days })
      toast('操作成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <LogTabs active="clean" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="清理方式">
            <label><input type="radio" checked={type === 'all'} onChange={() => setType('all')} /> 全部清除</label>
            &nbsp;&nbsp;
            <label><input type="radio" checked={type === 'days'} onChange={() => setType('days')} /> 按天数清除</label>
          </FormRow>
          {type === 'days' ? (
            <FormRow title="天数">
              <div className="ui input right labeled">
                <input type="text" style={{ width: '5em' }} maxLength={3} value={String(days)} onChange={(event) => setDays(Number(event.target.value) || 0)} />
                <span className="ui label">天以外</span>
              </div>
            </FormRow>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
