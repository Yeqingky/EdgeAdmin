import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPostForm, getCsrfToken } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { SettingsTabs } from '../settings-admin/common'

interface UIConfig {
  productName: string
  adminSystemName: string
  showVersion: boolean
  version: string
  showFinance: boolean
  faviconFileId: number
  logoFileId: number
  defaultPageSize: number
  timeZone: string
  dnsResolver: { type: string }
  modules?: string[]
}

interface TimeZoneGroup {
  code: string
  name: string
}

interface TimeZoneLocation {
  name: string
  group: string
  offset: string
}

interface SettingsUIData {
  config: UIConfig
  timeZoneGroups: TimeZoneGroup[]
  timeZoneLocations: TimeZoneLocation[]
  timeZoneLocation: TimeZoneLocation
}

export function SettingsUIPage() {
  const session = useSession()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['settings-ui'],
    queryFn: () => apiGet<SettingsUIData>('/settings/ui'),
  })
  const [config, setConfig] = useState<UIConfig | null>(null)
  const [groupCode, setGroupCode] = useState('')
  const [supportCDN, setSupportCDN] = useState(false)
  const [supportNS, setSupportNS] = useState(false)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
      setGroupCode(query.data.timeZoneLocation?.group || query.data.timeZoneGroups[0]?.code || '')
      setSupportCDN(query.data.config.modules?.includes('cdn') ?? false)
      setSupportNS(query.data.config.modules?.includes('ns') ?? false)
    }
  }, [query.data])

  if (query.isLoading || !config) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data!
  const locations = data.timeZoneLocations.filter((location) => location.group === groupCode)

  function update<K extends keyof UIConfig>(key: K, value: UIConfig[K]) {
    setConfig((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!config) {
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('productName', config.productName)
      form.set('adminSystemName', config.adminSystemName)
      form.set('showVersion', config.showVersion ? '1' : '')
      form.set('version', config.version)
      form.set('showFinance', config.showFinance ? '1' : '')
      form.set('defaultPageSize', String(config.defaultPageSize))
      form.set('timeZone', config.timeZone)
      form.set('dnsResolverType', config.dnsResolver.type)
      form.set('supportModuleCDN', supportCDN ? '1' : '')
      form.set('supportModuleNS', supportNS ? '1' : '')
      if (faviconFile) {
        form.set('faviconFile', faviconFile)
      }
      if (logoFile) {
        form.set('logoFile', logoFile)
      }
      await apiPostForm('/settings/ui', form)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
    <SettingsTabs kind="basic" active="ui" />
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="产品名称 *">
          <TextInput
            type="text"
            value={config.productName}
            maxLength={100}
            onChange={(event) => update('productName', event.target.value)}
          />
          <p className="comment">可以使用变量 <code>${'{product.name}'}</code> 在网页里展示此名称,建议仅包含英文和数字字符.</p>
        </FormRow>
        <FormRow title="管理员系统名称 *">
          <TextInput
            type="text"
            value={config.adminSystemName}
            maxLength={100}
            onChange={(event) => update('adminSystemName', event.target.value)}
          />
          <p className="comment">当前管理系统界面上显示的名称.</p>
        </FormRow>
        <FormRow title="显示版本号">
          <Checkbox checked={config.showVersion} onChange={(checked) => update('showVersion', checked)} />
          <p className="comment">选中后,在界面中显示系统版本号.</p>
        </FormRow>
        <FormRow title="定制版本号">
          <TextInput type="text" value={config.version} maxLength={100} onChange={(event) => update('version', event.target.value)} />
          <p className="comment">定制自己的版本号,留空表示使用系统自带的版本号.</p>
        </FormRow>
        {session.data?.teaIsPlus ? (
          <FormRow title="显示模块">
            <Checkbox label="CDN" checked={supportCDN} onChange={setSupportCDN} /> &nbsp;&nbsp;&nbsp;
            <Checkbox label="智能DNS" checked={supportNS} onChange={setSupportNS} />
            <p className="comment">当前管理系统中可以显示的模块,不能为空.</p>
          </FormRow>
        ) : null}
        <FormRow title="显示财务相关功能">
          <Checkbox checked={config.showFinance} onChange={(checked) => update('showFinance', checked)} />
          <p className="comment">选中后,表示在菜单中显示财务管理功能.</p>
        </FormRow>
        <FormRow title="浏览器图标">
          {config.faviconFileId > 0 ? (
            <a href={`/ui/image/${config.faviconFileId}`} target="_blank" rel="noreferrer">
              <img alt="" src={`/ui/image/${config.faviconFileId}`} style={{ width: 32, border: '1px #ccc solid' }} />
            </a>
          ) : (
            <span className="disabled">还没有上传.</span>
          )}
          <div style={{ marginTop: '0.8em' }}>
            <input type="file" accept=".png" onChange={(event) => setFaviconFile(event.target.files?.[0] || null)} />
          </div>
          <p className="comment">在浏览器标签栏显示的图标,请使用PNG格式.</p>
        </FormRow>
        <FormRow title="Logo">
          {config.logoFileId > 0 ? (
            <a href={`/ui/image/${config.logoFileId}`} target="_blank" rel="noreferrer">
              <img alt="" src={`/ui/image/${config.logoFileId}`} style={{ width: 32, border: '1px #ccc solid' }} />
            </a>
          ) : (
            <span className="disabled">还没有上传.</span>
          )}
          <div style={{ marginTop: '0.8em' }}>
            <input type="file" accept=".png" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
          </div>
          <p className="comment">显示在系统界面上的图标,请使用PNG格式.</p>
        </FormRow>
      </FormTable>

      <h4>其他</h4>
      <FormTable>
        <FormRow title="每页显示数">
          <TextInput
            type="text"
            value={String(config.defaultPageSize)}
            maxLength={3}
            style={{ width: '4em' }}
            onChange={(event) => update('defaultPageSize', Number(event.target.value) || 10)}
          />
          <p className="comment">在有分页的地方每页显示数量;不能超过100.</p>
        </FormRow>
        <FormRow title="时区">
          <div className="ui fields inline">
            <div className="ui field">
              <Select value={groupCode} onChange={(event) => {
                const code = event.target.value
                setGroupCode(code)
                const first = data.timeZoneLocations.find((location) => location.group === code)
                if (first) {
                  update('timeZone', first.name)
                }
              }}>
                {data.timeZoneGroups.map((group) => (
                  <option key={group.code} value={group.code}>{group.name}</option>
                ))}
              </Select>
            </div>
            <div className="ui field">
              <Select value={config.timeZone} onChange={(event) => update('timeZone', event.target.value)}>
                {locations.map((location) => (
                  <option key={location.name} value={location.name}>
                    {location.name} ({location.offset})
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="comment">当前管理系统显示时间使用的时区.</p>
        </FormRow>
        <FormRow title="使用的DNS解析库">
          <Select value={config.dnsResolver.type} onChange={(event) => update('dnsResolver', { type: event.target.value })}>
            <option value="default">默认</option>
            <option value="cgo">CGO</option>
            <option value="goNative">Go原生</option>
          </Select>
          <p className="comment">当前管理系统使用的DNS解析库;修改此项配置后,需要重启管理系统进程才会生效;通常不需要修改;如要修改,请在专家指导下进行.</p>
        </FormRow>
      </FormTable>

      <SubmitButton submitting={submitting} />
    </form>
    </div>
  )
}
