import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import {
  GroupConfigWarning,
  MoreOptionsIndicator,
  ServerSettingsShell,
  useServerId,
  type ServerSettingsBase,
} from './shared'

interface CharsetConfig {
  isPrior?: boolean
  isOn: boolean
  charset: string
  isUpper: boolean
  force: boolean
}

interface CharsetItem {
  charset: string
  name: string
}

interface CharsetData extends ServerSettingsBase {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  charsetConfig: CharsetConfig | null
  usualCharsets: CharsetItem[]
  allCharsets: CharsetItem[]
}

const DEFAULT_CONFIG: CharsetConfig = {
  isOn: false,
  charset: '',
  isUpper: false,
  force: false,
}

export function ServerCharsetSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-charset', serverId],
    queryFn: () => apiGet<CharsetData>('/servers/server/settings/charset', { serverId }),
    enabled: serverId > 0,
  })
  const [config, setConfig] = useState<CharsetConfig>(DEFAULT_CONFIG)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.charsetConfig) {
      setConfig(query.data.charsetConfig)
    }
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

  function update<K extends keyof CharsetConfig>(key: K, value: CharsetConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/charset', { webId: data.webId, charsetJSON: JSON.stringify(config) })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell data={data} header={data.hasGroupConfig ? <GroupConfigWarning href={data.groupSettingURL} /> : null}>
      <div className={data.hasGroupConfig ? 'opacity-mask' : undefined}>
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="启用字符编码">
              <Checkbox checked={config.isOn} onChange={(checked) => update('isOn', checked)} />
            </FormRow>
            {config.isOn ? (
              <FormRow title="选择字符编码">
                <Select style={{ width: '20em' }} value={config.charset} onChange={(event) => update('charset', event.target.value)}>
                  <option value="">[未选择]</option>
                  <optgroup label="常用字符编码" />
                  {data.usualCharsets.map((item) => (
                    <option key={`usual-${item.charset}`} value={item.charset}>
                      {item.charset}（{item.name}）
                    </option>
                  ))}
                  <optgroup label="全部字符编码" />
                  {data.allCharsets.map((item) => (
                    <option key={`all-${item.charset}`} value={item.charset}>
                      {item.charset}（{item.name}）
                    </option>
                  ))}
                </Select>
              </FormRow>
            ) : null}
          </FormTable>
          {config.isOn ? (
            <>
              <MoreOptionsIndicator visible={advancedVisible} onChange={setAdvancedVisible} />
              {advancedVisible ? (
                <FormTable>
                  <FormRow title="强制替换">
                    <Checkbox checked={config.force} onChange={(checked) => update('force', checked)} />
                    <p className="comment">选中后，表示强制覆盖已经设置的字符集；不选中，表示如果源站已经设置了字符集，则保留不修改。</p>
                  </FormRow>
                  <FormRow title="字符编码大写">
                    <Checkbox checked={config.isUpper} onChange={(checked) => update('isUpper', checked)} />
                    <p className="comment">
                      选中后将指定的字符编码转换为大写，比如默认为<code>utf-8</code>，选中后将改为<code>UTF-8</code>。
                    </p>
                  </FormRow>
                </FormTable>
              ) : null}
            </>
          ) : null}
          <SubmitButton submitting={submitting} />
        </form>
      </div>
    </ServerSettingsShell>
  )
}
