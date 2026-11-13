import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPostForm, getCsrfToken } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { buildFormData, WafMenu } from './common'

interface ExportGroup {
  id: number
  name: string
}

interface WafExportData {
  enabledInboundGroups: ExportGroup[]
  enabledOutboundGroups: ExportGroup[]
  disabledInboundGroups: ExportGroup[]
  disabledOutboundGroups: ExportGroup[]
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

function GroupCheckboxes({
  groups,
  disabled,
  selected,
  onChange,
}: {
  groups: ExportGroup[]
  disabled?: boolean
  selected: number[]
  onChange: (selected: number[]) => void
}) {
  if (groups.length === 0) {
    return <span className="disabled">暂时还没有规则。</span>
  }
  return (
    <div>
      {groups.map((group) => (
        <div key={group.id} className="ui checkbox" style={{ width: '14em', marginBottom: '0.5em' }}>
          <input
            type="checkbox"
            checked={selected.includes(group.id)}
            onChange={(event) =>
              onChange(event.target.checked ? [...selected, group.id] : selected.filter((id) => id !== group.id))
            }
          />
          <label>
            {group.name}
            {disabled ? (
              <sup>
                <span className="red"> 停用</span>
              </sup>
            ) : null}
          </label>
        </div>
      ))}
    </div>
  )
}

export function WafExportPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['waf-export', firewallPolicyId],
    queryFn: () => apiGet<WafExportData>('/servers/components/waf/export', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const [inboundIds, setInboundIds] = useState<number[]>([])
  const [outboundIds, setOutboundIds] = useState<number[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setInitialized(true)
      setInboundIds(query.data.enabledInboundGroups.map((group) => group.id))
      setOutboundIds(query.data.enabledOutboundGroups.map((group) => group.id))
    }
  }, [query.data, initialized])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function submit() {
    setSubmitting(true)
    try {
      const csrfToken = await getCsrfToken()
      const form = buildFormData({
        csrfToken,
        firewallPolicyId,
        inboundGroupIds: inboundIds,
        outboundGroupIds: outboundIds,
      })
      const result = await apiPostForm<{ key: string; id: number }>('/servers/components/waf/export', form)
      window.location.href = `/servers/components/waf/exportDownload?key=${encodeURIComponent(result.key)}&policyId=${result.id}`
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="export"
      />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">启用的入站规则</td>
              <td>
                <GroupCheckboxes groups={data.enabledInboundGroups} selected={inboundIds} onChange={setInboundIds} />
              </td>
            </tr>
            {data.disabledInboundGroups.length > 0 ? (
              <tr>
                <td className="title">停用的入站规则</td>
                <td>
                  <GroupCheckboxes
                    groups={data.disabledInboundGroups}
                    disabled
                    selected={inboundIds}
                    onChange={setInboundIds}
                  />
                </td>
              </tr>
            ) : null}
            <tr>
              <td>启用的出站规则</td>
              <td>
                <GroupCheckboxes groups={data.enabledOutboundGroups} selected={outboundIds} onChange={setOutboundIds} />
              </td>
            </tr>
            {data.disabledOutboundGroups.length > 0 ? (
              <tr>
                <td>停用的出站规则</td>
                <td>
                  <GroupCheckboxes
                    groups={data.disabledOutboundGroups}
                    disabled
                    selected={outboundIds}
                    onChange={setOutboundIds}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            导出
          </button>
        </div>
      </form>
    </div>
  )
}

interface WafImportData {
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

export function WafImportPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['waf-import', firewallPolicyId],
    queryFn: () => apiGet<WafImportData>('/servers/components/waf/import', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function submit() {
    if (!file) {
      toast('请选择要导入的规则文件', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('file', file)
      await apiPostForm('/servers/components/waf/import', form)
      toast('导入成功')
      navigate(`/servers/components/waf/policy?firewallPolicyId=${firewallPolicyId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="import"
      />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">选择要导入的规则文件</td>
              <td>
                <input type="file" accept=".json" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            导入
          </button>
        </div>
      </form>
    </div>
  )
}

export function WafTestPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  return (
    <div>
      <WafMenu firewallPolicyId={firewallPolicyId} active="test" />
      <p className="ui message">此功能暂未开放，敬请期待。</p>
    </div>
  )
}
