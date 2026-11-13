import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { IpAdminMenu, postFormValues, WafMenu } from './common'

interface NamedItem {
  id: number
  name: string
  fullname?: string
}

interface WafMenuData {
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

interface URLPattern {
  type: string
  pattern: string
}

const patternTypes = [
  { value: 'wildcard', name: '通配符' },
  { value: 'regexp', name: '正则' },
  { value: 'images', name: '常见图片文件' },
  { value: 'audios', name: '常见音频文件' },
  { value: 'videos', name: '常见视频文件' },
]

function URLPatternsEditor({ title, patterns, onChange }: { title: string; patterns: URLPattern[]; onChange: (patterns: URLPattern[]) => void }) {
  return (
    <div>
      <div className="small grey">{title}</div>
      {patterns.map((pattern, index) => (
        <div key={index} className="ui fields inline" style={{ marginTop: '0.3em' }}>
          <div className="ui field">
            <select
              className="ui dropdown"
              value={pattern.type}
              onChange={(event) =>
                onChange(patterns.map((item, itemIndex) => (itemIndex === index ? { ...item, type: event.target.value } : item)))
              }
            >
              {patternTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <input
              type="text"
              placeholder="URL或目录"
              style={{ width: '24em' }}
              value={pattern.pattern}
              onChange={(event) =>
                onChange(patterns.map((item, itemIndex) => (itemIndex === index ? { ...item, pattern: event.target.value } : item)))
              }
            />
          </div>
          <div className="ui field">
            <button
              className="ui button tiny"
              type="button"
              onClick={() => onChange(patterns.filter((_, itemIndex) => itemIndex !== index))}
            >
              删除
            </button>
          </div>
        </div>
      ))}
      <button className="ui button tiny" type="button" onClick={() => onChange([...patterns, { type: 'wildcard', pattern: '' }])}>
        + {title}
      </button>
    </div>
  )
}

function MultiSelector({ options, selected, onChange }: { options: NamedItem[]; selected: number[]; onChange: (selected: number[]) => void }) {
  const [keyword, setKeyword] = useState('')
  const filtered = options.filter((option) => {
    if (!keyword) {
      return true
    }
    const haystack = `${option.name} ${option.fullname || ''}`.toLowerCase()
    return haystack.includes(keyword.toLowerCase())
  })
  return (
    <div>
      <input
        type="text"
        placeholder="搜索名称..."
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        style={{ marginBottom: '0.5em' }}
      />
      <div style={{ maxHeight: '18em', overflow: 'auto', border: '1px solid #eee', padding: '0.5em' }}>
        {filtered.length === 0 ? <span className="disabled">没有可选的项目.</span> : null}
        {filtered.map((option) => (
          <label key={option.id} style={{ display: 'block', marginBottom: '0.3em' }}>
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))
              }
            />{' '}
            {option.fullname || option.name}
          </label>
        ))}
      </div>
    </div>
  )
}

function RegionPageShell({
  firewallPolicyId,
  subMenuItem,
  children,
  data,
}: {
  firewallPolicyId: number
  subMenuItem: string
  children: ReactNode
  data: WafMenuData
}) {
  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="ipadmin"
      />
      <IpAdminMenu firewallPolicyId={firewallPolicyId} subMenuItem={subMenuItem} />
      {children}
    </div>
  )
}

interface RegionData extends WafMenuData {
  countryHTML: string
  allowSearchEngine: boolean
  deniedCountries: NamedItem[]
  allowedCountries: NamedItem[]
  exceptURLPatterns: URLPattern[]
  onlyURLPatterns: URLPattern[]
}

function useRegionOptions(endpoint: string, key: string) {
  return useQuery({
    queryKey: ['ipadmin-options', endpoint],
    queryFn: async () => {
      const data = await apiPost<Record<string, NamedItem[]>>(endpoint)
      return data[key] || []
    },
    staleTime: 300_000,
  })
}

export function WafIpAdminRegionPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-ipadmin-region', firewallPolicyId],
    queryFn: () => apiGet<RegionData>('/servers/components/waf/ipadmin', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const countriesQuery = useRegionOptions('/ui/countryOptions', 'countries')
  const [allowed, setAllowed] = useState<number[]>([])
  const [denied, setDenied] = useState<number[]>([])
  const [countryHTML, setCountryHTML] = useState('')
  const [allowSearchEngine, setAllowSearchEngine] = useState(false)
  const [exceptPatterns, setExceptPatterns] = useState<URLPattern[]>([])
  const [onlyPatterns, setOnlyPatterns] = useState<URLPattern[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setInitialized(true)
      setAllowed((query.data.allowedCountries || []).map((item) => item.id))
      setDenied((query.data.deniedCountries || []).map((item) => item.id))
      setCountryHTML(query.data.countryHTML || '')
      setAllowSearchEngine(Boolean(query.data.allowSearchEngine))
      setExceptPatterns(query.data.exceptURLPatterns || [])
      setOnlyPatterns(query.data.onlyURLPatterns || [])
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
      await postFormValues('/servers/components/waf/ipadmin', {
        firewallPolicyId,
        denyCountryIds: denied,
        allowCountryIds: allowed,
        exceptURLPatternsJSON: JSON.stringify(exceptPatterns),
        onlyURLPatternsJSON: JSON.stringify(onlyPatterns),
        countryHTML,
        allowSearchEngine: allowSearchEngine ? 1 : '',
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-region', firewallPolicyId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegionPageShell firewallPolicyId={firewallPolicyId} subMenuItem="region" data={data}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">仅允许的区域</td>
              <td>
                <MultiSelector options={countriesQuery.data || []} selected={allowed} onChange={setAllowed} />
              </td>
            </tr>
            <tr>
              <td className="title">仅封禁的区域</td>
              <td>
                {allowed.length > 0 ? (
                  <p className="comment">由于你已设置&quot;仅允许的区域&quot;,所以不需要再设置封禁区域.</p>
                ) : (
                  <MultiSelector options={countriesQuery.data || []} selected={denied} onChange={setDenied} />
                )}
              </td>
            </tr>
            <tr>
              <td>例外URL</td>
              <td>
                <URLPatternsEditor title="添加例外URL" patterns={exceptPatterns} onChange={setExceptPatterns} />
                <p className="comment">对这些URL将不做任何限制.</p>
              </td>
            </tr>
            <tr>
              <td>限制URL</td>
              <td>
                <URLPatternsEditor title="添加限制URL" patterns={onlyPatterns} onChange={setOnlyPatterns} />
                <p className="comment">只对这些URL做限制.</p>
              </td>
            </tr>
            <tr>
              <td>提示内容</td>
              <td>
                <textarea rows={3} value={countryHTML} onChange={(event) => setCountryHTML(event.target.value)} />
                <p className="comment">当客户端所在区域被封禁时提示页面的HTML内容;不填则表示使用默认的提示内容;支持请求变量.</p>
              </td>
            </tr>
            <tr>
              <td>允许搜索引擎</td>
              <td>
                <div className="ui checkbox">
                  <input type="checkbox" checked={allowSearchEngine} onChange={(event) => setAllowSearchEngine(event.target.checked)} />
                  <label />
                </div>
                <p className="comment">选中后,表示如果请求来自常见搜索引擎的IP,则不受区域限制.</p>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </RegionPageShell>
  )
}

interface ProvincesData extends WafMenuData {
  provinceHTML: string
  deniedProvinces: NamedItem[]
  allowedProvinces: NamedItem[]
  exceptURLPatterns: URLPattern[]
  onlyURLPatterns: URLPattern[]
}

export function WafIpAdminProvincesPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-ipadmin-provinces', firewallPolicyId],
    queryFn: () => apiGet<ProvincesData>('/servers/components/waf/ipadmin/provinces', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const provincesQuery = useRegionOptions('/ui/provinceOptions', 'provinces')
  const [allowed, setAllowed] = useState<number[]>([])
  const [denied, setDenied] = useState<number[]>([])
  const [provinceHTML, setProvinceHTML] = useState('')
  const [exceptPatterns, setExceptPatterns] = useState<URLPattern[]>([])
  const [onlyPatterns, setOnlyPatterns] = useState<URLPattern[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setInitialized(true)
      setAllowed((query.data.allowedProvinces || []).map((item) => item.id))
      setDenied((query.data.deniedProvinces || []).map((item) => item.id))
      setProvinceHTML(query.data.provinceHTML || '')
      setExceptPatterns(query.data.exceptURLPatterns || [])
      setOnlyPatterns(query.data.onlyURLPatterns || [])
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
      await postFormValues('/servers/components/waf/ipadmin/provinces', {
        firewallPolicyId,
        denyProvinceIds: denied,
        allowProvinceIds: allowed,
        exceptURLPatternsJSON: JSON.stringify(exceptPatterns),
        onlyURLPatternsJSON: JSON.stringify(onlyPatterns),
        provinceHTML,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-provinces', firewallPolicyId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegionPageShell firewallPolicyId={firewallPolicyId} subMenuItem="province" data={data}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">仅允许的省份</td>
              <td>
                <MultiSelector options={provincesQuery.data || []} selected={allowed} onChange={setAllowed} />
              </td>
            </tr>
            <tr>
              <td className="title">仅封禁的省份</td>
              <td>
                {allowed.length > 0 ? (
                  <p className="comment">由于你已设置&quot;仅允许的省份&quot;,所以不需要再设置封禁省份.</p>
                ) : (
                  <MultiSelector options={provincesQuery.data || []} selected={denied} onChange={setDenied} />
                )}
              </td>
            </tr>
            <tr>
              <td>例外URL</td>
              <td>
                <URLPatternsEditor title="添加例外URL" patterns={exceptPatterns} onChange={setExceptPatterns} />
                <p className="comment">对这些URL将不做任何限制.</p>
              </td>
            </tr>
            <tr>
              <td>限制URL</td>
              <td>
                <URLPatternsEditor title="添加限制URL" patterns={onlyPatterns} onChange={setOnlyPatterns} />
                <p className="comment">只对这些URL做限制.</p>
              </td>
            </tr>
            <tr>
              <td>提示内容</td>
              <td>
                <textarea rows={3} value={provinceHTML} onChange={(event) => setProvinceHTML(event.target.value)} />
                <p className="comment">当客户端所在省份被封禁时提示页面的HTML内容;不填则表示使用默认的提示内容;支持请求变量.</p>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </RegionPageShell>
  )
}

interface ProvidersData extends WafMenuData {
  providerHTML: string
  deniedProviders: NamedItem[]
  allowedProviders: NamedItem[]
  exceptURLPatterns: URLPattern[]
  onlyURLPatterns: URLPattern[]
}

export function WafIpAdminProvidersPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['waf-ipadmin-providers', firewallPolicyId],
    queryFn: () => apiGet<ProvidersData>('/servers/components/waf/ipadmin/providers', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const providersQuery = useRegionOptions('/ui/providerOptions', 'providers')
  const [allowed, setAllowed] = useState<number[]>([])
  const [denied, setDenied] = useState<number[]>([])
  const [providerHTML, setProviderHTML] = useState('')
  const [exceptPatterns, setExceptPatterns] = useState<URLPattern[]>([])
  const [onlyPatterns, setOnlyPatterns] = useState<URLPattern[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setInitialized(true)
      setAllowed((query.data.allowedProviders || []).map((item) => item.id))
      setDenied((query.data.deniedProviders || []).map((item) => item.id))
      setProviderHTML(query.data.providerHTML || '')
      setExceptPatterns(query.data.exceptURLPatterns || [])
      setOnlyPatterns(query.data.onlyURLPatterns || [])
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
      await postFormValues('/servers/components/waf/ipadmin/providers', {
        firewallPolicyId,
        denyProviderIds: denied,
        allowProviderIds: allowed,
        exceptURLPatternsJSON: JSON.stringify(exceptPatterns),
        onlyURLPatternsJSON: JSON.stringify(onlyPatterns),
        providerHTML,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-providers', firewallPolicyId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegionPageShell firewallPolicyId={firewallPolicyId} subMenuItem="provider" data={data}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table selectable definition">
          <tbody>
            <tr>
              <td className="title">仅允许的运营商</td>
              <td>
                <MultiSelector options={providersQuery.data || []} selected={allowed} onChange={setAllowed} />
              </td>
            </tr>
            <tr>
              <td className="title">仅封禁的运营商</td>
              <td>
                {allowed.length > 0 ? (
                  <p className="comment">由于你已设置&quot;仅允许的运营商&quot;,所以不需要再设置封禁运营商.</p>
                ) : (
                  <MultiSelector options={providersQuery.data || []} selected={denied} onChange={setDenied} />
                )}
              </td>
            </tr>
            <tr>
              <td>例外URL</td>
              <td>
                <URLPatternsEditor title="添加例外URL" patterns={exceptPatterns} onChange={setExceptPatterns} />
                <p className="comment">对这些URL将不做任何限制.</p>
              </td>
            </tr>
            <tr>
              <td>限制URL</td>
              <td>
                <URLPatternsEditor title="添加限制URL" patterns={onlyPatterns} onChange={setOnlyPatterns} />
                <p className="comment">只对这些URL做限制.</p>
              </td>
            </tr>
            <tr>
              <td>提示内容</td>
              <td>
                <textarea rows={3} value={providerHTML} onChange={(event) => setProviderHTML(event.target.value)} />
                <p className="comment">当客户端所在区域被封禁时提示页面的HTML内容;不填则表示使用默认的提示内容;支持请求变量.</p>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </RegionPageShell>
  )
}
