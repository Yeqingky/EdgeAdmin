import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { MoreOptionsIndicator, PriorRow } from './fields'
import { LocationShell } from './LocationShell'
import type { LocationPageBase, RedirectToHttpsConfig } from './types'

interface HttpData extends LocationPageBase {
  redirectToHTTPSConfig?: RedirectToHttpsConfig | null
}

const statusOptions = [
  { code: 301, text: 'Moved Permanently' },
  { code: 308, text: 'Permanent Redirect' },
  { code: 302, text: 'Found' },
  { code: 303, text: 'See Other' },
  { code: 307, text: 'Temporary Redirect' },
]

function emptyConfig(): RedirectToHttpsConfig {
  return { isPrior: false, isOn: false, host: '', port: 0, status: 0, onlyDomains: [], exceptDomains: [] }
}

function HttpForm({ webId, config }: { webId: number; config?: RedirectToHttpsConfig | null }) {
  const toast = useToast()
  const [state, setState] = useState<RedirectToHttpsConfig>({ ...emptyConfig(), ...(config || {}) })
  const [portString, setPortString] = useState(config && config.port > 0 ? String(config.port) : '')
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<RedirectToHttpsConfig>) {
    setState((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/locations/http', {
        webId,
        redirectToHTTPSJSON: JSON.stringify(state),
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
      <FormTable>
        <PriorRow isPrior={state.isPrior} onChange={(isPrior) => update({ isPrior })} />
      </FormTable>

      {state.isPrior ? (
        <FormTable>
          <FormRow title="自动跳转到HTTPS">
            <Checkbox checked={state.isOn} onChange={(isOn) => update({ isOn })} />
            <p className="comment">
              开启后,所有HTTP的请求都会自动跳转到对应的HTTPS URL上,
              <MoreOptionsIndicator visible={moreOptionsVisible} onToggle={() => setMoreOptionsVisible((visible) => !visible)} />
            </p>
          </FormRow>
        </FormTable>
      ) : null}

      {state.isPrior && moreOptionsVisible ? (
        <FormTable>
          <FormRow title="状态码">
            <Select value={String(state.status)} onChange={(event) => update({ status: Number(event.target.value) })}>
              <option value="0">[使用默认]</option>
              {statusOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.code} {option.text}</option>
              ))}
            </Select>
          </FormRow>
          <FormRow title="域名或IP地址">
            <input type="text" value={state.host} onChange={(event) => update({ host: event.target.value })} />
            <p className="comment">默认和用户正在访问的域名或IP地址一致.</p>
          </FormRow>
          <FormRow title="端口">
            <input
              type="text"
              maxLength={5}
              style={{ width: '6em' }}
              value={portString}
              onChange={(event) => {
                const value = event.target.value
                setPortString(value)
                const port = Number.parseInt(value, 10)
                update({ port: Number.isNaN(port) ? 0 : port })
              }}
            />
            <p className="comment">默认端口为443.</p>
          </FormRow>
        </FormTable>
      ) : null}

      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function LocationHttpPage({ serverId, locationId }: { serverId: string; locationId: string }) {
  const query = useQuery({
    queryKey: ['location-http', serverId, locationId],
    queryFn: () =>
      apiGet<HttpData>('/servers/server/settings/locations/http', {
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
      <HttpForm webId={data.webId} config={data.redirectToHTTPSConfig} />
    </LocationShell>
  )
}
