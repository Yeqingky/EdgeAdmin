import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import {
  Comment,
  PopupPage,
  ServerSettingsShell,
  URLPatternsEditor,
  buildSettingsURL,
  useSearchInt,
  useSearchString,
} from './common'
import { WafMenu } from './waf'

interface IPItem {
  id: number
  value: string
  ipFrom: string
  ipTo: string
  createdTime: string
  expiredTime: string
  lifeSeconds: number
  reason: string
  type: string
  isExpired: boolean
  eventLevelName: string
  sourcePolicy: { id: number; name?: string } | null
  sourceGroup: { id: number; name?: string } | null
  sourceSet: { id: number; name?: string } | null
  sourceServer: { id: number; name?: string } | null
}

interface IPListData {
  featureIsOn: boolean
  firewallPolicyId: number
  listId: number
  page: string
  items: IPItem[] | null
  wafIsOn: boolean
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}分钟`
  }
  if (seconds < 86400) {
    return `${Math.ceil(seconds / 3600)}小时`
  }
  return `${Math.ceil(seconds / 86400)}天`
}

function IPBindBox({ firewallPolicyId, type }: { firewallPolicyId: number; type: string }) {
  const toast = useToast()
  const confirm = useConfirm()
  const query = useQuery({
    queryKey: ['ip-list-bind', firewallPolicyId, type],
    queryFn: () => apiPost<{ lists: { id: number; name: string }[] }>('/servers/iplists/httpFirewall', {
      httpFirewallPolicyId: firewallPolicyId,
      type,
    }),
  })

  const lists = query.data?.lists || []

  return (
    <span>
      <a href={`#/servers/iplists/bindHTTPFirewallPopup?httpFirewallPolicyId=${firewallPolicyId}&type=${type}`} style={{ color: 'rgba(0,0,0,.6)' }}>
        绑定+
      </a>{' '}
      &nbsp;
      {lists.length > 0 ? <span className="disabled small">|&nbsp; 已绑定：</span> : null}
      {lists.map((list) => (
        <span className="ui label basic small" key={list.id}>
          <a href={`#/servers/iplists/list?listId=${list.id}`} style={{ opacity: 1 }}>
            {list.name}
          </a>
          <a
            href=""
            title="删除"
            onClick={(event) => {
              event.preventDefault()
              void confirm({ message: '确定要删除这个绑定的IP名单吗？' }).then((ok) => {
                if (ok) {
                  void apiPost('/servers/iplists/unbindHTTPFirewall', {
                    httpFirewallPolicyId: firewallPolicyId,
                    listId: list.id,
                  })
                    .then(() => window.location.reload())
                    .catch((error: Error) => toast(error.message, 'error'))
                }
              })
            }}
          >
            ×
          </a>
        </span>
      ))}
    </span>
  )
}

export function IPListPage({ listType }: { listType: 'white' | 'black' | 'grey' }) {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const page = useSearchInt('page')
  const toast = useToast()
  const confirm = useConfirm()
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)

  const path =
    listType === 'white' ? '/servers/server/settings/waf/ipadmin/allowList' : listType === 'black' ? '/servers/server/settings/waf/ipadmin/denyList' : '/servers/server/settings/waf/ipadmin/greyList'
  const active = listType === 'white' ? 'allowList' : listType === 'black' ? 'denyList' : 'greyList'

  const query = useQuery({
    queryKey: ['server-settings-waf-iplist', path, serverId, firewallPolicyId, page],
    queryFn: () => apiGet<IPListData>(path, { serverId, firewallPolicyId, page }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const items = data.items || []
  const addType = listType === 'white' ? 'white' : listType === 'black' ? 'black' : 'grey'

  async function remove(itemId: number) {
    if (!(await confirm({ message: '确定要删除这个IP吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/waf/ipadmin/deleteIP', { firewallPolicyId, itemId })
      toast('删除成功')
      await query.refetch()
    } catch (event) {
      toast(event instanceof Error ? event.message : '删除失败', 'error')
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active={active} />
      {!data.featureIsOn ? <div className="ui message warning">尚未为当前用户开通此功能。</div> : null}
      {data.featureIsOn ? (
        <>
          <div className="ui menu text blue first-menu">
            <a
              className="item"
              href={`#/servers/iplists/createIPPopup?listId=${data.listId}&type=${addType}`}
            >
              添加IP
            </a>
            <span className="item disabled">|</span>
            <div className="item">
              <IPBindBox firewallPolicyId={firewallPolicyId} type={addType} />
            </div>
            <span className="item disabled">|</span>
            <span className="item">ID: {data.listId}</span>
          </div>
          {!data.wafIsOn ? (
            <div className="ui message warning">
              当前WAF未启用，设置将在
              <a href={`#${buildSettingsURL('/waf', { serverId })}`}>[启用Web防火墙]</a>
              后生效。
            </div>
          ) : null}
          {items.length === 0 ? <p className="comment">暂时还没有IP。</p> : null}
          {items.length > 0 ? (
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th style={{ width: '18em' }}>IP</th>
                  <th style={{ width: '6em' }}>类型</th>
                  <th style={{ width: '6em' }}>级别</th>
                  <th style={{ width: '12em' }}>过期时间</th>
                  <th>备注</th>
                  <th className="three op">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.type !== 'all' ? (
                        <span>
                          {item.value ? item.value : item.ipFrom}
                          {!item.value && item.ipTo ? ` - ${item.ipTo}` : ''}
                        </span>
                      ) : (
                        <span className="disabled">*</span>
                      )}
                      {item.createdTime ? <div className="small grey">添加于 {item.createdTime}</div> : null}
                    </td>
                    <td>
                      {item.type === '' || item.type === 'ipv4' ? 'IPv4' : null}
                      {item.type === 'ipv6' ? 'IPv6' : null}
                      {item.type === 'all' ? <strong>所有IP</strong> : null}
                    </td>
                    <td>{item.eventLevelName ? item.eventLevelName : <span className="disabled">-</span>}</td>
                    <td>
                      {item.expiredTime ? (
                        <div>
                          {item.expiredTime}
                          {item.lifeSeconds !== null ? (
                            <div>
                              {item.lifeSeconds > 0 ? (
                                <span className="small grey">{formatSeconds(item.lifeSeconds)}</span>
                              ) : (
                                <span className="small red">已过期</span>
                              )}
                            </div>
                          ) : item.isExpired ? (
                            <span className="ui label tiny basic red">已过期</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="disabled">不过期</span>
                      )}
                    </td>
                    <td>
                      {item.reason ? item.reason : <span className="disabled">-</span>}
                      {item.sourceServer && item.sourceServer.id > 0 ? (
                        <div style={{ marginTop: '0.4em' }}>
                          <span className="small">{item.sourceServer.name}</span>
                        </div>
                      ) : null}
                      {item.sourcePolicy && item.sourcePolicy.id > 0 ? (
                        <div style={{ marginTop: '0.4em' }}>
                          <span className="small">
                            {item.sourcePolicy.name} &raquo; {item.sourceGroup?.name} &raquo; {item.sourceSet?.name}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <a
                        href={`#/servers/iplists/accessLogsPopup?itemId=${item.id}`}
                      >
                        日志
                      </a>{' '}
                      &nbsp;
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setUpdatingItemId(item.id)
                        }}
                      >
                        修改
                      </a>{' '}
                      &nbsp;
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          void remove(item.id)
                        }}
                      >
                        删除
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <LegacyPagination html={data.page} />

          {updatingItemId !== null ? (
            <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
              <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '40em' }}>
                <div className="header">修改IP</div>
                <div className="content">
                  <UpdateIPForm
                    itemId={updatingItemId}
                    onSaved={() => {
                      setUpdatingItemId(null)
                      void query.refetch()
                    }}
                  />
                </div>
                <div className="actions">
                  <button className="ui button" onClick={() => setUpdatingItemId(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ServerSettingsShell>
  )
}

interface UpdateIPData {
  item: {
    id: number
    value: string
    ipFrom: string
    ipTo: string
    expiredAt: number
    reason: string
    type: string
    eventLevel: string
  }
  type: string
}

export function UpdateIPForm({ itemId, onSaved }: { itemId: number; onSaved: () => void }) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['server-settings-waf-ip-detail', itemId],
    queryFn: () => apiGet<UpdateIPData>('/servers/server/settings/waf/ipadmin/updateIPPopup', { itemId }),
  })
  const [value, setValue] = useState<string | null>(null)
  const [expiredAt, setExpiredAt] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [eventLevel, setEventLevel] = useState<string | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const levelsQuery = useQuery({
    queryKey: ['firewall-event-levels'],
    queryFn: () => apiPost<{ eventLevels: { code: string; name: string; description: string }[] }>('/ui/eventLevelOptions', {}),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const item = data.item
  const levels = levelsQuery.data?.eventLevels || []
  const currentValue = value ?? item.value ?? item.ipFrom
  const currentReason = reason ?? item.reason
  const currentLevel = eventLevel ?? item.eventLevel
  const formatLocalDateTime = (timestamp: number): string => {
    if (timestamp <= 0) {
      return ''
    }
    const date = new Date(timestamp * 1000)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  const currentExpiredAt = expiredAt ?? formatLocalDateTime(item.expiredAt)

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/waf/ipadmin/updateIPPopup', {
        csrfToken,
        itemId: item.id,
        value: currentValue,
        expiredAt: currentExpiredAt,
        reason: currentReason,
        type: item.type,
        eventLevel: currentLevel,
      })
      toast('保存成功')
      onSaved()
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <FormTable>
        <tbody>
          <FormRow title="类型 *">
            {item.type === 'ipv4' ? 'IPv4' : null}
            {item.type === 'ipv6' ? 'IPv6' : null}
            {item.type === 'all' ? '所有IP' : null}
            {item.type === 'ipv4' ? <Comment>单个IPv4或一个IPv4范围。</Comment> : null}
            {item.type === 'ipv6' ? <Comment>单个IPv6或一个IPv6范围。</Comment> : null}
            {item.type === 'all' ? <Comment>允许或禁用所有的IP。</Comment> : null}
          </FormRow>
          {item.type !== 'all' ? (
            <FormRow title="IP或IP段 *">
              <TextInput
                type="text"
                maxLength={64}
                placeholder="x.x.x.x"
                style={{ width: '20em' }}
                value={currentValue}
                onChange={(event) => setValue(event.target.value)}
              />
            </FormRow>
          ) : null}
          <FormRow title="过期时间">
            <TextInput
              type="datetime-local"
              value={currentExpiredAt}
              onChange={(event) => {
                if (event.target.value.length === 0) {
                  setExpiredAt('')
                  return
                }
                const timestamp = Math.floor(new Date(event.target.value).getTime() / 1000)
                setExpiredAt(Number.isFinite(timestamp) ? String(timestamp) : '')
              }}
            />
            <Comment>在加入名单某一段时间后会失效，留空表示永久有效。</Comment>
          </FormRow>
          <FormRow title="级别">
            <Select value={currentLevel} onChange={(event) => setEventLevel(event.target.value)}>
              <option value="">[默认]</option>
              {levels.map((level) => (
                <option key={level.code} value={level.code}>
                  {level.name}
                </option>
              ))}
            </Select>
          </FormRow>
          <tr>
            <td colSpan={2}>
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setMoreOptions(!moreOptions)
                }}
              >
                [{moreOptions ? '收起更多选项' : '更多选项'}]
              </a>
            </td>
          </tr>
        </tbody>
        {moreOptions ? (
          <tbody>
            <FormRow title="备注">
              <TextInput
                type="text"
                maxLength={100}
                value={currentReason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormRow>
          </tbody>
        ) : null}
      </FormTable>
      {error ? <div className="ui negative message">{error}</div> : null}
      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function UpdateIPRoute() {
  const itemId = useSearchInt('itemId')
  const navigate = useNavigate()
  const serverId = useSearchInt('serverId')
  const backTo = serverId > 0 ? buildSettingsURL('/waf', { serverId }) : '/servers'
  return (
    <PopupPage title="修改IP" backTo={backTo}>
      <UpdateIPForm itemId={itemId} onSaved={() => navigate(backTo)} />
    </PopupPage>
  )
}

interface RegionCountry {
  id: number
  name: string
  letter?: string
  pinyin?: string[]
  codes?: string[]
  isCommon?: boolean
  isChecked: boolean
}

interface SelectCountriesData {
  type: string
  countries: RegionCountry[]
}

interface RegionProvider {
  id: number
  name: string
  isChecked: boolean
}

interface SelectProvidersData {
  type: string
  providers: RegionProvider[]
}

interface RegionProvince {
  id: number
  name: string
  isChecked: boolean
}

interface SelectProvincesData {
  type: string
  provinces: RegionProvince[]
}

type RegionKind = 'country' | 'province' | 'provider'

interface SelectionValue {
  id: number
  name: string
  letter?: string
}

function RegionPicker({
  kind,
  type,
  selected,
  onConfirm,
}: {
  kind: RegionKind
  type: string
  selected: SelectionValue[]
  onConfirm: (values: SelectionValue[]) => void
}) {
  const selectedIds = selected.map((item) => item.id).join(',')
  const path =
    kind === 'country'
      ? '/servers/server/settings/waf/ipadmin/selectCountriesPopup'
      : kind === 'province'
        ? '/servers/server/settings/waf/ipadmin/selectProvincesPopup'
        : '/servers/server/settings/waf/ipadmin/selectProvidersPopup'
  const query = useQuery({
    queryKey: ['server-settings-region-picker', kind, type, selectedIds],
    queryFn: () =>
      kind === 'country'
        ? apiGet<SelectCountriesData>(path, { type, selectedCountryIds: selectedIds })
        : kind === 'province'
          ? apiGet<SelectProvincesData>(path, { type, selectedProvinceIds: selectedIds })
          : apiGet<SelectProvidersData>(path, { type, selectedProviderIds: selectedIds }),
  })
  const [checked, setChecked] = useState<Record<number, boolean> | null>(null)
  const [keyword, setKeyword] = useState('')

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const rawItems: SelectionValue[] =
    kind === 'country'
      ? (query.data as SelectCountriesData).countries.map((country) => ({
          id: country.id,
          name: country.name,
          letter: country.letter,
        }))
      : kind === 'province'
        ? (query.data as SelectProvincesData).provinces.map((province) => ({ id: province.id, name: province.name }))
        : (query.data as SelectProvidersData).providers.map((provider) => ({ id: provider.id, name: provider.name }))

  const initialChecked: Record<number, boolean> = {}
  if (kind === 'country') {
    ;(query.data as SelectCountriesData).countries.forEach((country) => {
      initialChecked[country.id] = country.isChecked
    })
  } else if (kind === 'province') {
    ;(query.data as SelectProvincesData).provinces.forEach((province) => {
      initialChecked[province.id] = province.isChecked
    })
  } else {
    ;(query.data as SelectProvidersData).providers.forEach((provider) => {
      initialChecked[provider.id] = provider.isChecked
    })
  }
  const state = checked ?? initialChecked
  const filtered = rawItems.filter((item) => keyword.length === 0 || item.name.toLowerCase().includes(keyword.toLowerCase()))

  function toggle(id: number) {
    setChecked({ ...state, [id]: !state[id] })
  }

  function confirm() {
    const values = rawItems.filter((item) => state[item.id])
    onConfirm(values)
  }

  return (
    <div>
      <div className="ui fields inline" style={{ marginBottom: '0.5em' }}>
        <div className="ui field">
          <input
            type="text"
            placeholder="关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="ui field">
          <label>
            <input
              type="checkbox"
              checked={Object.keys(state).length > 0 && rawItems.every((item) => state[item.id])}
              onChange={(event) => {
                const next: Record<number, boolean> = {}
                rawItems.forEach((item) => {
                  next[item.id] = event.target.checked
                })
                setChecked(next)
              }}
            />{' '}
            全选
          </label>
        </div>
      </div>
      <div className="ui segment" style={{ maxHeight: '20em', overflowY: 'auto' }}>
        {filtered.map((item) => (
          <div key={item.id} style={{ display: 'inline-block', width: '14em', marginBottom: '0.3em' }}>
            <label>
              <input type="checkbox" checked={Boolean(state[item.id])} onChange={() => toggle(item.id)} />{' '}
              {item.letter ? `(${item.letter})` : ''}
              {item.name}
            </label>
          </div>
        ))}
        {filtered.length === 0 ? <span className="disabled">没有匹配的数据。</span> : null}
      </div>
      <button className="ui button primary" type="button" onClick={confirm}>
        确定
      </button>
    </div>
  )
}

interface RegionPageData {
  featureIsOn: boolean
  firewallPolicyId: number
  wafIsOn: boolean
  clusterFirewallPolicy: { id: number; name: string; mode: string; modeInfo: { code: string; name: string } | null } | null
  exceptURLPatterns: { type: string; pattern: string }[]
  onlyURLPatterns: { type: string; pattern: string }[]
}

interface CountriesData extends RegionPageData {
  countryHTML: string
  allowSearchEngine: boolean
  deniedCountries: SelectionValue[]
  allowedCountries: SelectionValue[]
}

interface ProvincesData extends RegionPageData {
  provinceHTML: string
  deniedProvinces: SelectionValue[]
  allowedProvinces: SelectionValue[]
}

interface ProvidersData extends RegionPageData {
  providerHTML: string
  deniedProviders: SelectionValue[]
  allowedProviders: SelectionValue[]
}

function ModeWarning({ data }: { data: RegionPageData }) {
  if (!data.clusterFirewallPolicy || data.clusterFirewallPolicy.mode === 'defend') {
    return null
  }
  return (
    <div className="ui message warning">
      当前网站所在集群的WAF策略模式为
      {data.clusterFirewallPolicy.modeInfo ? <strong>{data.clusterFirewallPolicy.modeInfo.name}</strong> : '非防御模式'}
      ，当前设置将不会生效。
    </div>
  )
}

function WafOnWarning({ serverId, wafIsOn }: { serverId: number; wafIsOn: boolean }) {
  if (wafIsOn) {
    return null
  }
  return (
    <div className="ui message warning">
      当前WAF未启用，设置将在
      <a href={`#${buildSettingsURL('/waf', { serverId })}`}>[启用Web防火墙]</a>
      后生效。
    </div>
  )
}

export function CountriesPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const toast = useToast()
  const [state, setState] = useState<{
    allowed: SelectionValue[]
    denied: SelectionValue[]
    html: string
    allowSearchEngine: boolean
    exceptPatterns: { type: string; pattern: string }[]
    onlyPatterns: { type: string; pattern: string }[]
  } | null>(null)
  const [picking, setPicking] = useState<'allow' | 'deny' | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-waf-countries', serverId, firewallPolicyId],
    queryFn: () =>
      apiGet<CountriesData>('/servers/server/settings/waf/ipadmin/countries', { serverId, firewallPolicyId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current = {
    allowed: state?.allowed ?? data.allowedCountries ?? [],
    denied: state?.denied ?? data.deniedCountries ?? [],
    html: state?.html ?? data.countryHTML ?? '',
    allowSearchEngine: state?.allowSearchEngine ?? data.allowSearchEngine ?? false,
    exceptPatterns: state?.exceptPatterns ?? data.exceptURLPatterns ?? [],
    onlyPatterns: state?.onlyPatterns ?? data.onlyURLPatterns ?? [],
  }
  const update = (patch: Partial<typeof current>) => setState({ ...current, ...patch })

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('exceptURLPatternsJSON', JSON.stringify(current.exceptPatterns))
      form.set('onlyURLPatternsJSON', JSON.stringify(current.onlyPatterns))
      form.set('countryHTML', current.html)
      form.set('allowSearchEngine', current.allowSearchEngine ? '1' : '0')
      current.denied.forEach((country) => form.append('denyCountryIds', String(country.id)))
      current.allowed.forEach((country) => form.append('allowCountryIds', String(country.id)))
      await apiPostForm('/servers/server/settings/waf/ipadmin/countries', form)
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active="country" />
      {!data.featureIsOn ? <div className="ui message warning">尚未为当前用户开通此功能。</div> : null}
      {data.featureIsOn ? (
        <>
          <WafOnWarning serverId={serverId} wafIsOn={data.wafIsOn} />
          <ModeWarning data={data} />
          <form
            className="ui form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <FormTable>
              <tbody>
                <FormRow title="仅允许的区域">
                  <SelectionList values={current.allowed} onRemove={(id) => update({ allowed: current.allowed.filter((item) => item.id !== id) })} />
                  <button className="ui button tiny" type="button" onClick={() => setPicking('allow')}>
                    修改
                  </button>
                  {current.allowed.length > 0 ? (
                    <button className="ui button tiny" type="button" onClick={() => update({ allowed: [] })}>
                      清空
                    </button>
                  ) : null}
                </FormRow>
                <FormRow title="仅封禁的区域">
                  {current.allowed.length > 0 ? (
                    <p className="comment">由于你已设置"仅允许的区域"，所以不需要再设置封禁区域。</p>
                  ) : (
                    <>
                      <SelectionList values={current.denied} onRemove={(id) => update({ denied: current.denied.filter((item) => item.id !== id) })} />
                      <button className="ui button tiny" type="button" onClick={() => setPicking('deny')}>
                        修改
                      </button>
                      {current.denied.length > 0 ? (
                        <button className="ui button tiny" type="button" onClick={() => update({ denied: [] })}>
                          清空
                        </button>
                      ) : null}
                    </>
                  )}
                </FormRow>
                <tr>
                  <td colSpan={2}>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setMoreOptions(!moreOptions)
                      }}
                    >
                      [{moreOptions ? '收起更多选项' : '更多选项'}]
                    </a>
                  </td>
                </tr>
              </tbody>
              {moreOptions ? (
                <tbody>
                  <FormRow title="例外URL">
                    <URLPatternsEditor patterns={current.exceptPatterns} onChange={(values) => update({ exceptPatterns: values })} />
                    <Comment>对这些URL将不做任何限制。</Comment>
                  </FormRow>
                  <FormRow title="限制URL">
                    <URLPatternsEditor patterns={current.onlyPatterns} onChange={(values) => update({ onlyPatterns: values })} />
                    <Comment>只对这些URL做限制。</Comment>
                  </FormRow>
                  <FormRow title="提示内容">
                    <textarea rows={3} value={current.html} onChange={(event) => update({ html: event.target.value })} />
                    <Comment>当客户端所在区域被封禁时提示页面的HTML内容；不填则表示使用默认的提示内容；支持请求变量。</Comment>
                  </FormRow>
                  <FormRow title="允许搜索引擎">
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={current.allowSearchEngine}
                        onChange={(event) => update({ allowSearchEngine: event.target.checked })}
                      />
                      <label></label>
                    </div>
                    <Comment>选中后，表示如果请求来自常见搜索引擎的IP，则不受区域限制。</Comment>
                  </FormRow>
                </tbody>
              ) : null}
            </FormTable>
            {error ? <div className="ui negative message">{error}</div> : null}
            <SubmitButton submitting={submitting} />
          </form>
          {picking ? (
            <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
              <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '52em' }}>
                <div className="header">{picking === 'allow' ? '选择允许的区域' : '选择封禁的区域'}</div>
                <div className="content">
                  <RegionPicker
                    kind="country"
                    type={picking}
                    selected={picking === 'allow' ? current.allowed : current.denied}
                    onConfirm={(values) => {
                      if (picking === 'allow') {
                        update({ allowed: values })
                      } else {
                        update({ denied: values })
                      }
                      setPicking(null)
                    }}
                  />
                </div>
                <div className="actions">
                  <button className="ui button" onClick={() => setPicking(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ServerSettingsShell>
  )
}

function SelectionList({ values, onRemove }: { values: SelectionValue[]; onRemove: (id: number) => void }) {
  if (values.length === 0) {
    return <span className="disabled">暂时没有选择。</span>
  }
  return (
    <div>
      {values.map((value) => (
        <span className="ui label tiny basic" key={value.id} style={{ marginBottom: '0.5em' }}>
          {value.letter ? `(${value.letter})` : ''}
          {value.name}{' '}
          <a
            href=""
            title="删除"
            onClick={(event) => {
              event.preventDefault()
              onRemove(value.id)
            }}
          >
            ×
          </a>
        </span>
      ))}
    </div>
  )
}

export function ProvincesPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const toast = useToast()
  const [state, setState] = useState<{
    allowed: SelectionValue[]
    denied: SelectionValue[]
    html: string
    exceptPatterns: { type: string; pattern: string }[]
    onlyPatterns: { type: string; pattern: string }[]
  } | null>(null)
  const [picking, setPicking] = useState<'allow' | 'deny' | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-waf-provinces', serverId, firewallPolicyId],
    queryFn: () =>
      apiGet<ProvincesData>('/servers/server/settings/waf/ipadmin/provinces', { serverId, firewallPolicyId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current = {
    allowed: state?.allowed ?? data.allowedProvinces ?? [],
    denied: state?.denied ?? data.deniedProvinces ?? [],
    html: state?.html ?? data.provinceHTML ?? '',
    exceptPatterns: state?.exceptPatterns ?? data.exceptURLPatterns ?? [],
    onlyPatterns: state?.onlyPatterns ?? data.onlyURLPatterns ?? [],
  }
  const update = (patch: Partial<typeof current>) => setState({ ...current, ...patch })

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('exceptURLPatternsJSON', JSON.stringify(current.exceptPatterns))
      form.set('onlyURLPatternsJSON', JSON.stringify(current.onlyPatterns))
      form.set('provinceHTML', current.html)
      current.denied.forEach((province) => form.append('denyProvinceIds', String(province.id)))
      current.allowed.forEach((province) => form.append('allowProvinceIds', String(province.id)))
      await apiPostForm('/servers/server/settings/waf/ipadmin/provinces', form)
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active="province" />
      {!data.featureIsOn ? <div className="ui message warning">尚未为当前用户开通此功能。</div> : null}
      {data.featureIsOn ? (
        <>
          <WafOnWarning serverId={serverId} wafIsOn={data.wafIsOn} />
          <ModeWarning data={data} />
          <form
            className="ui form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <FormTable>
              <tbody>
                <FormRow title="仅允许的省份">
                  <SelectionList values={current.allowed} onRemove={(id) => update({ allowed: current.allowed.filter((item) => item.id !== id) })} />
                  <button className="ui button tiny" type="button" onClick={() => setPicking('allow')}>
                    修改
                  </button>
                  {current.allowed.length > 0 ? (
                    <button className="ui button tiny" type="button" onClick={() => update({ allowed: [] })}>
                      清空
                    </button>
                  ) : null}
                </FormRow>
                <FormRow title="仅封禁的省份">
                  {current.allowed.length > 0 ? (
                    <p className="comment">由于你已设置"仅允许的省份"，所以不需要再设置封禁省份。</p>
                  ) : (
                    <>
                      <SelectionList values={current.denied} onRemove={(id) => update({ denied: current.denied.filter((item) => item.id !== id) })} />
                      <button className="ui button tiny" type="button" onClick={() => setPicking('deny')}>
                        修改
                      </button>
                      {current.denied.length > 0 ? (
                        <button className="ui button tiny" type="button" onClick={() => update({ denied: [] })}>
                          清空
                        </button>
                      ) : null}
                    </>
                  )}
                </FormRow>
                <tr>
                  <td colSpan={2}>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setMoreOptions(!moreOptions)
                      }}
                    >
                      [{moreOptions ? '收起更多选项' : '更多选项'}]
                    </a>
                  </td>
                </tr>
              </tbody>
              {moreOptions ? (
                <tbody>
                  <FormRow title="例外URL">
                    <URLPatternsEditor patterns={current.exceptPatterns} onChange={(values) => update({ exceptPatterns: values })} />
                    <Comment>对这些URL将不做任何限制。</Comment>
                  </FormRow>
                  <FormRow title="限制URL">
                    <URLPatternsEditor patterns={current.onlyPatterns} onChange={(values) => update({ onlyPatterns: values })} />
                    <Comment>只对这些URL做限制。</Comment>
                  </FormRow>
                  <FormRow title="提示内容">
                    <textarea rows={3} value={current.html} onChange={(event) => update({ html: event.target.value })} />
                    <Comment>当客户端所在省份被封禁时提示页面的HTML内容。</Comment>
                  </FormRow>
                </tbody>
              ) : null}
            </FormTable>
            {error ? <div className="ui negative message">{error}</div> : null}
            <SubmitButton submitting={submitting} />
          </form>
          {picking ? (
            <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
              <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '50em' }}>
                <div className="header">{picking === 'allow' ? '选择允许的省份' : '选择封禁的省份'}</div>
                <div className="content">
                  <RegionPicker
                    kind="province"
                    type={picking}
                    selected={picking === 'allow' ? current.allowed : current.denied}
                    onConfirm={(values) => {
                      if (picking === 'allow') {
                        update({ allowed: values })
                      } else {
                        update({ denied: values })
                      }
                      setPicking(null)
                    }}
                  />
                </div>
                <div className="actions">
                  <button className="ui button" onClick={() => setPicking(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ServerSettingsShell>
  )
}

export function ProvidersPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const toast = useToast()
  const [state, setState] = useState<{
    allowed: SelectionValue[]
    denied: SelectionValue[]
    html: string
    exceptPatterns: { type: string; pattern: string }[]
    onlyPatterns: { type: string; pattern: string }[]
  } | null>(null)
  const [picking, setPicking] = useState<'allow' | 'deny' | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-waf-providers', serverId, firewallPolicyId],
    queryFn: () =>
      apiGet<ProvidersData>('/servers/server/settings/waf/ipadmin/providers', { serverId, firewallPolicyId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current = {
    allowed: state?.allowed ?? data.allowedProviders ?? [],
    denied: state?.denied ?? data.deniedProviders ?? [],
    html: state?.html ?? data.providerHTML ?? '',
    exceptPatterns: state?.exceptPatterns ?? data.exceptURLPatterns ?? [],
    onlyPatterns: state?.onlyPatterns ?? data.onlyURLPatterns ?? [],
  }
  const update = (patch: Partial<typeof current>) => setState({ ...current, ...patch })

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('exceptURLPatternsJSON', JSON.stringify(current.exceptPatterns))
      form.set('onlyURLPatternsJSON', JSON.stringify(current.onlyPatterns))
      form.set('providerHTML', current.html)
      current.denied.forEach((provider) => form.append('denyProviderIds', String(provider.id)))
      current.allowed.forEach((provider) => form.append('allowProviderIds', String(provider.id)))
      await apiPostForm('/servers/server/settings/waf/ipadmin/providers', form)
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active="provider" />
      {!data.featureIsOn ? <div className="ui message warning">尚未为当前用户开通此功能。</div> : null}
      {data.featureIsOn ? (
        <>
          <WafOnWarning serverId={serverId} wafIsOn={data.wafIsOn} />
          <ModeWarning data={data} />
          <form
            className="ui form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <FormTable>
              <tbody>
                <FormRow title="仅允许的运营商">
                  <SelectionList values={current.allowed} onRemove={(id) => update({ allowed: current.allowed.filter((item) => item.id !== id) })} />
                  <button className="ui button tiny" type="button" onClick={() => setPicking('allow')}>
                    修改
                  </button>
                  {current.allowed.length > 0 ? (
                    <button className="ui button tiny" type="button" onClick={() => update({ allowed: [] })}>
                      清空
                    </button>
                  ) : null}
                </FormRow>
                <FormRow title="仅封禁的运营商">
                  {current.allowed.length > 0 ? (
                    <p className="comment">由于你已设置"仅允许的运营商"，所以不需要再设置封禁运营商。</p>
                  ) : (
                    <>
                      <SelectionList values={current.denied} onRemove={(id) => update({ denied: current.denied.filter((item) => item.id !== id) })} />
                      <button className="ui button tiny" type="button" onClick={() => setPicking('deny')}>
                        修改
                      </button>
                      {current.denied.length > 0 ? (
                        <button className="ui button tiny" type="button" onClick={() => update({ denied: [] })}>
                          清空
                        </button>
                      ) : null}
                    </>
                  )}
                </FormRow>
                <tr>
                  <td colSpan={2}>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setMoreOptions(!moreOptions)
                      }}
                    >
                      [{moreOptions ? '收起更多选项' : '更多选项'}]
                    </a>
                  </td>
                </tr>
              </tbody>
              {moreOptions ? (
                <tbody>
                  <FormRow title="例外URL">
                    <URLPatternsEditor patterns={current.exceptPatterns} onChange={(values) => update({ exceptPatterns: values })} />
                    <Comment>对这些URL将不做任何限制。</Comment>
                  </FormRow>
                  <FormRow title="限制URL">
                    <URLPatternsEditor patterns={current.onlyPatterns} onChange={(values) => update({ onlyPatterns: values })} />
                    <Comment>只对这些URL做限制。</Comment>
                  </FormRow>
                  <FormRow title="提示内容">
                    <textarea rows={3} value={current.html} onChange={(event) => update({ html: event.target.value })} />
                    <Comment>当客户端所在运营商被封禁时提示页面的HTML内容。</Comment>
                  </FormRow>
                </tbody>
              ) : null}
            </FormTable>
            {error ? <div className="ui negative message">{error}</div> : null}
            <SubmitButton submitting={submitting} />
          </form>
          {picking ? (
            <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
              <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '46em' }}>
                <div className="header">{picking === 'allow' ? '选择允许的运营商' : '选择封禁的运营商'}</div>
                <div className="content">
                  <RegionPicker
                    kind="provider"
                    type={picking}
                    selected={picking === 'allow' ? current.allowed : current.denied}
                    onConfirm={(values) => {
                      if (picking === 'allow') {
                        update({ allowed: values })
                      } else {
                        update({ denied: values })
                      }
                      setPicking(null)
                    }}
                  />
                </div>
                <div className="actions">
                  <button className="ui button" onClick={() => setPicking(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ServerSettingsShell>
  )
}

interface TestResult {
  isDone: boolean
  isFound: boolean
  isOk: boolean
  error: string
  isAllowed: boolean
  list?: { id: number; name: string }
  item?: {
    id: number
    value: string
    ipFrom: string
    ipTo: string
    reason: string
    expiredAt: number
    createdTime: string
    expiredTime: string
    type: string
    eventLevelName: string
    listType: string
  }
  country?: { id: number; name: string }
  province?: { id: number; name: string }
}

interface TestData {
  featureIsOn: boolean
  firewallPolicyId: number
  wafIsOn: boolean
}

export function WafTestPage() {
  const serverId = useSearchInt('serverId')
  const firewallPolicyId = useSearchInt('firewallPolicyId')
  const toast = useToast()
  const [ip, setIp] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-waf-test', serverId, firewallPolicyId],
    queryFn: () => apiGet<TestData>('/servers/server/settings/waf/ipadmin/test', { serverId, firewallPolicyId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function checkIP() {
    setSubmitting(true)
    setError('')
    try {
      const response = await apiPost<{ result: TestResult }>('/servers/server/settings/waf/ipadmin/test', {
        firewallPolicyId,
        ip,
      })
      setResult(response.result)
    } catch (event) {
      setError(event instanceof Error ? event.message : '检查失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/waf">
      <WafMenu serverId={serverId} firewallPolicyId={firewallPolicyId} active="test" />
      {!data.featureIsOn ? <div className="ui message warning">尚未为当前用户开通此功能。</div> : null}
      {data.featureIsOn ? (
        <>
          <WafOnWarning serverId={serverId} wafIsOn={data.wafIsOn} />
          <form
            className="ui form"
            onSubmit={(event) => {
              event.preventDefault()
              void checkIP()
            }}
          >
            <FormTable>
              <tbody>
                <FormRow title="IP *">
                  <TextInput
                    type="text"
                    maxLength={100}
                    placeholder="x.x.x.x"
                    value={ip}
                    onChange={(event) => {
                      setIp(event.target.value)
                      setResult(null)
                    }}
                  />
                  <Comment>要检查的IP</Comment>
                </FormRow>
                <FormRow title="检查结果">
                  {result ? (
                    result.isDone ? (
                      <div>
                        {!result.isOk ? (
                          <div>
                            <span className="red">{result.error}</span>
                          </div>
                        ) : null}
                        {result.isFound ? (
                          <>
                            {result.item ? (
                              <div>
                                {result.isAllowed ? (
                                  <span className={result.item.listType === 'white' ? 'green' : 'grey'}>
                                    {result.item.listType === 'white' ? '在白名单中' : '在灰名单中'} {result.item.value || result.item.ipFrom}
                                    {result.item.eventLevelName ? ` 级别：${result.item.eventLevelName}` : ''}{' '}
                                    <a
                                      href=""
                                      onClick={(event) => {
                                        event.preventDefault()
                                        setUpdatingItemId(result.item?.id || 0)
                                      }}
                                    >
                                      [修改]
                                    </a>
                                  </span>
                                ) : (
                                  <span className="red">
                                    在黑名单中 {result.item.value || result.item.ipFrom}{' '}
                                    <a
                                      href=""
                                      onClick={(event) => {
                                        event.preventDefault()
                                        setUpdatingItemId(result.item?.id || 0)
                                      }}
                                    >
                                      [修改]
                                    </a>
                                  </span>
                                )}
                              </div>
                            ) : null}
                            {result.province ? (
                              <div>
                                <span className="red">在省份封禁中 "{result.province.name}"</span>
                              </div>
                            ) : null}
                            {result.country && !result.province ? (
                              <div>
                                <span className="red">在国家/地区封禁中 "{result.country.name}"</span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div>没有找到和{ip}匹配的配置。</div>
                        )}
                      </div>
                    ) : null
                  ) : null}
                </FormRow>
              </tbody>
            </FormTable>
            {error ? <div className="ui negative message">{error}</div> : null}
            <div style={{ marginTop: '1em' }}>
              <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
                检查IP状态
              </button>
            </div>
          </form>
          {result?.item ? (
            <p className="comment">当前IP名单：{result.list?.name || ''}</p>
          ) : null}
          {updatingItemId ? (
            <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
              <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '40em' }}>
                <div className="header">修改IP</div>
                <div className="content">
                  <UpdateIPForm itemId={updatingItemId} onSaved={() => setUpdatingItemId(null)} />
                </div>
                <div className="actions">
                  <button className="ui button" onClick={() => setUpdatingItemId(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ServerSettingsShell>
  )
}

export function SelectCountriesRoute() {
  const type = useSearchString('type', 'allow')
  const selectedIds = useSearchString('selectedCountryIds')
  const [selected, setSelected] = useState<SelectionValue[]>([])
  const toast = useToast()
  const backTo = '/servers'
  const selectedList = selectedIds
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => value > 0)
    .map((id) => ({ id, name: `ID:${id}` }))

  return (
    <PopupPage title={type === 'allow' ? '选择允许的区域' : '选择封禁的区域'} backTo={backTo}>
      <RegionPicker
        kind="country"
        type={type}
        selected={selected.length > 0 ? selected : selectedList}
        onConfirm={(values) => {
          setSelected(values)
          toast(`已选择 ${values.length} 个区域`)
        }}
      />
      <p className="comment">当前已选择：{selected.map((item) => item.name).join('、') || '无'}</p>
    </PopupPage>
  )
}

export function SelectProvincesRoute() {
  const type = useSearchString('type', 'allow')
  const selectedIds = useSearchString('selectedProvinceIds')
  const [selected, setSelected] = useState<SelectionValue[]>([])
  const toast = useToast()
  const selectedList = selectedIds
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => value > 0)
    .map((id) => ({ id, name: `ID:${id}` }))

  return (
    <PopupPage title={type === 'allow' ? '选择允许的省份' : '选择封禁的省份'} backTo="/servers">
      <RegionPicker
        kind="province"
        type={type}
        selected={selected.length > 0 ? selected : selectedList}
        onConfirm={(values) => {
          setSelected(values)
          toast(`已选择 ${values.length} 个省份`)
        }}
      />
      <p className="comment">当前已选择：{selected.map((item) => item.name).join('、') || '无'}</p>
    </PopupPage>
  )
}

export function SelectProvidersRoute() {
  const type = useSearchString('type', 'allow')
  const selectedIds = useSearchString('selectedProviderIds')
  const [selected, setSelected] = useState<SelectionValue[]>([])
  const toast = useToast()
  const selectedList = selectedIds
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => value > 0)
    .map((id) => ({ id, name: `ID:${id}` }))

  return (
    <PopupPage title={type === 'allow' ? '选择允许的运营商' : '选择封禁的运营商'} backTo="/servers">
      <RegionPicker
        kind="provider"
        type={type}
        selected={selected.length > 0 ? selected : selectedList}
        onConfirm={(values) => {
          setSelected(values)
          toast(`已选择 ${values.length} 个运营商`)
        }}
      />
      <p className="comment">当前已选择：{selected.map((item) => item.name).join('、') || '无'}</p>
    </PopupPage>
  )
}
