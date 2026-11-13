import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { PriorCheckbox } from './editors'
import type { LocationBaseData } from './types'

interface StatRef {
  isPrior: boolean
  isOn: boolean
}

interface StatData extends LocationBaseData {
  webId: number
  statConfig: StatRef | null
}

export function StatPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<StatData>('/servers/server/settings/locations/stat', 'location-stat')
  const [stat, setStat] = useState<StatRef>({ isPrior: false, isOn: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setStat(query.data.statConfig ? { isPrior: query.data.statConfig.isPrior, isOn: query.data.statConfig.isOn } : { isPrior: false, isOn: false })
    }
  }, [query.data])

  if (locationId === 0) {
    return <MissingLocation />
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.data) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/stat', {
        webId: query.data.webId,
        statJSON: JSON.stringify(stat),
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-stat', serverId, locationId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocationShell data={query.data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <PriorCheckbox checked={stat.isPrior} onChange={(isPrior) => setStat({ ...stat, isPrior })} />
          {stat.isPrior ? (
            <tbody>
              <FormRow title="启用统计">
                <Checkbox checked={stat.isOn} onChange={(isOn) => setStat({ ...stat, isOn })} />
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </LocationShell>
  )
}
