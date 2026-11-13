import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPostForm, getCsrfToken } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { SettingsTabs, StringListEditor } from '../common'
import {
  CountrySelectionModal,
  ProvinceSelectionModal,
  RegionTags,
  type RegionCountry,
  type RegionProvince,
} from '../ui/RegionSelectors'

interface SecurityConfig {
  frame: string
  allowCountryIds: number[]
  allowProvinceIds: number[]
  allowLocal: boolean
  allowIPs: string[]
  allowRememberLogin: boolean
  denySearchEngines: boolean
  denySpiders: boolean
  allowDomains: string[]
  checkClientFingerprint: boolean
  checkClientRegion: boolean
  clientIPHeaderNames: string
  clientIPHeaderOnly: boolean
}

interface SecurityData {
  showAll: boolean
  countries: RegionCountry[]
  provinces: RegionProvince[]
  config: SecurityConfig
}

const DEFAULT_CLIENT_IP_HEADERS = 'X-Forwarded-For X-Real-IP True-Client-IP Client-IP'

export function SecuritySettingsPage() {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['settings-security'],
    queryFn: () => apiGet<SecurityData>('/settings/security'),
  })
  const [config, setConfig] = useState<SecurityConfig | null>(null)
  const [countries, setCountries] = useState<RegionCountry[]>([])
  const [provinces, setProvinces] = useState<RegionProvince[]>([])
  const [moreVisible, setMoreVisible] = useState(false)
  const [countryModal, setCountryModal] = useState(false)
  const [provinceModal, setProvinceModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
      setCountries(query.data.countries)
      setProvinces(query.data.provinces)
      setMoreVisible(query.data.showAll)
    }
  }, [query.data])

  if (query.isLoading || !config) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  function update<K extends keyof SecurityConfig>(key: K, value: SecurityConfig[K]) {
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
      form.set('frame', config.frame)
      form.set('countryIdsJSON', JSON.stringify(countries.map((country) => country.id)))
      form.set('provinceIdsJSON', JSON.stringify(provinces.map((province) => province.id)))
      form.set('allowLocal', config.allowLocal ? '1' : '0')
      form.set('allowRememberLogin', config.allowRememberLogin ? '1' : '0')
      for (const ip of config.allowIPs) {
        form.append('allowIPs', ip)
      }
      form.set('clientIPHeaderNames', config.clientIPHeaderNames)
      form.set('clientIPHeaderOnly', config.clientIPHeaderOnly ? '1' : '0')
      form.set('denySearchEngines', config.denySearchEngines ? '1' : '0')
      form.set('denySpiders', config.denySpiders ? '1' : '0')
      form.set('domainsJSON', JSON.stringify(config.allowDomains))
      form.set('checkClientFingerprint', config.checkClientFingerprint ? '1' : '0')
      form.set('checkClientRegion', config.checkClientRegion ? '1' : '0')
      await apiPostForm('/settings/security', form)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SettingsTabs kind="basic" active="security" />
      <div className="margin" />
      <p className="comment">当前安全设置只适用于管理系统,对用户网站没有任何影响.</p>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="Frame嵌套条件">
            <Select value={config.frame} onChange={(event) => update('frame', event.target.value)}>
              <option value="">不限制</option>
              <option value="SAMEORIGIN">仅限同域名</option>
            </Select>
            <p className="comment">当前服务被别的网页框架嵌套的条件限制.</p>
          </FormRow>
          <FormRow title="允许访问的国家和地区">
            <RegionTags
              items={countries}
              addTitle="添加国家和地区"
              onAdd={() => setCountryModal(true)}
              onRemove={(id) => setCountries((current) => current.filter((country) => country.id !== id))}
            />
            <p className="comment">设置后,只有这些国家和地区才能访问管理界面,如果不设置表示没有限制.</p>
          </FormRow>
          <FormRow title="允许访问的省份(中国)">
            <RegionTags
              items={provinces}
              addTitle="添加省份"
              onAdd={() => setProvinceModal(true)}
              onRemove={(id) => setProvinces((current) => current.filter((province) => province.id !== id))}
            />
            <p className="comment">设置后,只有这些省份才能访问管理界面,如果不设置表示没有限制.</p>
          </FormRow>
          <FormRow title="允许访问的IP">
            <StringListEditor
              values={config.allowIPs}
              onChange={(values) => update('allowIPs', values)}
              placeholder="IP或者CIDR IP段"
              maxLength={100}
              emptyText="不限制"
            />
            <p className="comment">
              如果不为空,则<strong>仅仅允许</strong>这些IP访问,其他的IP访问时会被拒绝.
            </p>
          </FormRow>
          <FormRow title="允许局域网访问">
            <Checkbox checked={config.allowLocal} onChange={(checked) => update('allowLocal', checked)} />
            <p className="comment">选中表示总是允许在本机和局域网访问,不需要其他限制条件.</p>
          </FormRow>
          <FormRow title="允许记住登录">
            <Checkbox checked={config.allowRememberLogin} onChange={(checked) => update('allowRememberLogin', checked)} />
            <p className="comment">选中表示允许在登录界面可以选择记住登录.</p>
          </FormRow>
          <tr>
            <td colSpan={2}>
              <a href="" style={{ fontWeight: 'normal' }} onClick={(event) => { event.preventDefault(); setMoreVisible(!moreVisible) }}>
                {moreVisible ? '收起选项' : '更多选项'} {moreVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </a>
            </td>
          </tr>
          {moreVisible ? (
            <>
              <FormRow title={<span className="color-border">自定义客户端IP报头</span>}>
                <TextInput
                  type="text"
                  value={config.clientIPHeaderNames}
                  onChange={(event) => update('clientIPHeaderNames', event.target.value)}
                />
                <p className="comment">
                  可以通过此报头获取客户端IP,类似于
                  <span className="ui label basic small" style={{ padding: 3, marginLeft: 2, marginRight: 2 }}>
                    {DEFAULT_CLIENT_IP_HEADERS}
                  </span>
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      update(
                        'clientIPHeaderNames',
                        config.clientIPHeaderNames.length > 0
                          ? `${config.clientIPHeaderNames} ${DEFAULT_CLIENT_IP_HEADERS}`
                          : DEFAULT_CLIENT_IP_HEADERS,
                      )
                    }}
                  >
                    <span className="small">[填入]</span>
                  </a>
                  ,用于使用反向代理访问管理系统的情形;如果有多个报头可以使用空格隔开.
                </p>
              </FormRow>
              {config.clientIPHeaderNames.length > 0 ? (
                <FormRow title={<span className="color-border">仅从自定义报头中获取IP</span>}>
                  <Checkbox checked={config.clientIPHeaderOnly} onChange={(checked) => update('clientIPHeaderOnly', checked)} />
                  <p className="comment">
                    选中后,表示仅从自定义报头中获取IP,意味着客户端必须使用反向代理访问当前系统,不允许直接访问.
                  </p>
                </FormRow>
              ) : null}
              <FormRow title="禁止搜索引擎">
                <Checkbox checked={config.denySearchEngines} onChange={(checked) => update('denySearchEngines', checked)} />
                <p className="comment">禁止常见的搜索引擎访问.</p>
              </FormRow>
              <FormRow title="禁止爬虫">
                <Checkbox checked={config.denySpiders} onChange={(checked) => update('denySpiders', checked)} />
                <p className="comment">禁止常见的爬虫访问.</p>
              </FormRow>
              <FormRow title="允许访问的域名">
                <StringListEditor
                  values={config.allowDomains}
                  onChange={(values) => update('allowDomains', values)}
                  placeholder="example.com,*.example.com"
                  maxLength={100}
                  emptyText="不限制"
                />
                <p className="comment">只允许通过这些域名(或者IP作为主机地址)访问当前管理系统,不填表示没有限制.</p>
              </FormRow>
              <FormRow title="检查客户端指纹">
                <Checkbox checked={config.checkClientFingerprint} onChange={(checked) => update('checkClientFingerprint', checked)} />
                <p className="comment">
                  选中后,表示每次管理员访问时都检查客户端相关信息是否跟登录时一致;如果客户端IP或User-Agent信息变化比较频繁,请不要启用此选项;如果当前系统下游有反向代理设置,请设置当前表单中的"自定义客户端IP报头"选项.
                </p>
              </FormRow>
              <FormRow title="检查客户端区域">
                <Checkbox checked={config.checkClientRegion} onChange={(checked) => update('checkClientRegion', checked)} />
                <p className="comment">
                  选中后,表示每次管理员访问时都检查客户端所在地理区域是否和登录时一致;如果客户端所处地理区域变化比较频繁,请不要启用此选项;如果当前系统下游有反向代理设置,请设置当前表单中的"自定义客户端IP报头"选项.
                </p>
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>

      {countryModal ? (
        <CountrySelectionModal countries={countries} onClose={() => setCountryModal(false)} onChange={setCountries} />
      ) : null}
      {provinceModal ? (
        <ProvinceSelectionModal provinces={provinces} onClose={() => setProvinceModal(false)} onChange={setProvinces} />
      ) : null}
    </div>
  )
}
