import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, parseId } from '../shared'

interface FrpConfig {
  isOn: boolean
  bindAddr: string
  bindPort: number
  token: string
}

const defaultConfig: FrpConfig = {
  isOn: false,
  bindAddr: '0.0.0.0',
  bindPort: 7000,
  token: '',
}

export function ClusterSettingsFrpPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const [config, setConfig] = useState<FrpConfig>(defaultConfig)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['cluster-settings-frp', clusterId],
    queryFn: () => apiGet<{ frpConfig: FrpConfig | null }>('/clusters/cluster/settings/frp', { clusterId }),
    enabled: clusterId > 0,
  })

  useEffect(() => {
    if (query.data?.frpConfig) {
      setConfig({ ...defaultConfig, ...query.data.frpConfig })
    }
  }, [query.data])

  if (clusterId <= 0) {
    return <div className="ui negative message">缺少集群参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const update = (patch: Partial<FrpConfig>) => setConfig({ ...config, ...patch })

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/frp">
      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await apiPost('/clusters/cluster/settings/frp', {
              clusterId,
              frpJSON: JSON.stringify(config),
            })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <FormTable>
          <FormRow title="启用 FRP">
            <Checkbox label="" checked={config.isOn} onChange={(value) => update({ isOn: value })} />
          </FormRow>
          <FormRow title="监听地址">
            <TextInput type="text" value={config.bindAddr} onChange={(event) => update({ bindAddr: event.target.value })} />
          </FormRow>
          <FormRow title="监听端口">
            <TextInput
              type="number"
              value={String(config.bindPort)}
              onChange={(event) => update({ bindPort: Number(event.target.value) || 0 })}
            />
          </FormRow>
          <FormRow title="认证 Token">
            <TextInput type="text" value={config.token} onChange={(event) => update({ token: event.target.value })} />
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting}>保存</SubmitButton>
      </form>
    </ClusterSettingsLayout>
  )
}
