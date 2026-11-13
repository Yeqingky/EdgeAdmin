import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { EVENT_LEVELS, IpAdminMenu, postActionResult, postFormValues, WafMenu } from './common'

interface WafMenuData {
  firewallPolicyName: string
  countInboundGroups: number
  countOutboundGroups: number
}

interface SourceRef {
  id: number
  name?: string
  serverId?: number
}

interface IPItem {
  id: number
  value: string
  ipFrom: string
  ipTo: string
  createdTime: string
  expiredTime: string
  reason: string
  type: string
  eventLevelName: string
  sourcePolicy: SourceRef
  sourceGroup: SourceRef
  sourceSet: SourceRef
  sourceServer: SourceRef
  lifeSeconds: number
}

interface IPListData extends WafMenuData {
  listId: number
  type: string
  items: IPItem[]
  page: string
  subMenuItem: string
}

interface BoundList {
  id: number
  name: string
}

interface AvailableList {
  id: number
  isOn: boolean
  name: string
  description: string
  countItems: number
  type: string
  isSelected: boolean
}

interface BindData {
  httpFirewallPolicyId: number
  page: string
  lists: AvailableList[]
}

function IPTypeName({ type }: { type: string }) {
  if (type === 'ipv4') {
    return <>IPv4</>
  }
  if (type === 'ipv6') {
    return <>IPv6</>
  }
  if (type === 'all') {
    return <>所有IP</>
  }
  return <>{type}</>
}

function SourceInfo({ item }: { item: IPItem }) {
  const pieces: string[] = []
  if (item.sourcePolicy?.id > 0) {
    pieces.push(`策略：${item.sourcePolicy.name || item.sourcePolicy.id}`)
  }
  if (item.sourceGroup?.id > 0) {
    pieces.push(`分组：${item.sourceGroup.name || item.sourceGroup.id}`)
  }
  if (item.sourceSet?.id > 0) {
    pieces.push(`规则集：${item.sourceSet.name || item.sourceSet.id}`)
  }
  if (item.sourceServer?.id > 0) {
    pieces.push(`网站：${item.sourceServer.name || item.sourceServer.id}`)
  }
  if (pieces.length === 0) {
    return null
  }
  return <div className="small grey">{pieces.join(' / ')}</div>
}

export function WafIpAdminListsPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'white'
  const [adding, setAdding] = useState(false)
  const [binding, setBinding] = useState(false)
  const [addType, setAddType] = useState('ip')
  const [method, setMethod] = useState('single')
  const [value, setValue] = useState('')
  const [ipData, setIpData] = useState('')
  const [expiredAt, setExpiredAt] = useState('')
  const [eventLevel, setEventLevel] = useState('critical')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['waf-ipadmin-lists', firewallPolicyId, type],
    queryFn: () => apiGet<IPListData>('/servers/components/waf/ipadmin/lists', { firewallPolicyId, type }),
    enabled: firewallPolicyId > 0,
  })
  const boundQuery = useQuery({
    queryKey: ['waf-ipadmin-bound-lists', firewallPolicyId, type],
    queryFn: () => apiPost<{ lists: BoundList[] }>('/servers/iplists/httpFirewall', { httpFirewallPolicyId: firewallPolicyId, type }),
    enabled: firewallPolicyId > 0,
  })
  const bindQuery = useQuery({
    queryKey: ['waf-ipadmin-bind-lists', firewallPolicyId, type],
    queryFn: () =>
      apiGet<BindData>('/servers/iplists/bindHTTPFirewallPopup', { httpFirewallPolicyId: firewallPolicyId, type }),
    enabled: firewallPolicyId > 0 && binding,
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const items = data.items || []
  const boundLists = boundQuery.data?.lists || []
  const availableLists = bindQuery.data?.lists || []

  async function refreshLists() {
    await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-lists', firewallPolicyId, type] })
    await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-bound-lists', firewallPolicyId, type] })
    await queryClient.invalidateQueries({ queryKey: ['waf-ipadmin-bind-lists', firewallPolicyId, type] })
  }

  async function addIP() {
    if (addType === 'ip' && method === 'single' && !value.trim()) {
      toast('请输入IP或IP段', 'error')
      return
    }
    if (addType === 'ip' && method === 'batch' && !ipData.trim()) {
      toast('请输入IP列表', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('listId', String(data.listId))
      form.set('method', method)
      form.set('type', addType)
      form.set('value', value)
      form.set('ipData', ipData)
      form.set('expiredAt', expiredAt ? String(Math.floor(new Date(expiredAt).getTime() / 1000)) : '0')
      form.set('eventLevel', eventLevel)
      form.set('reason', reason)
      await apiPostForm('/servers/iplists/createIPPopup', form)
      toast('保存成功')
      setAdding(false)
      setValue('')
      setIpData('')
      setReason('')
      await refreshLists()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteItem(item: IPItem) {
    if (!(await confirm({ message: '确定要删除这个IP吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postFormValues('/servers/components/waf/ipadmin/deleteIP', { firewallPolicyId, itemId: item.id })
      toast('删除成功')
      await refreshLists()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function bindList(list: AvailableList) {
    try {
      await postFormValues('/servers/iplists/bindHTTPFirewallPopup', {
        httpFirewallPolicyId: firewallPolicyId,
        listId: list.id,
      })
      toast('绑定成功')
      await refreshLists()
    } catch (error) {
      toast(error instanceof Error ? error.message : '绑定失败', 'error')
    }
  }

  async function unbindList(list: BoundList) {
    if (!(await confirm({ message: '确定要删除这个绑定的IP名单吗？' }))) {
      return
    }
    try {
      await postFormValues('/servers/iplists/unbindHTTPFirewall', { httpFirewallPolicyId: firewallPolicyId, listId: list.id })
      toast('解绑成功')
      await refreshLists()
    } catch (error) {
      toast(error instanceof Error ? error.message : '解绑失败', 'error')
    }
  }

  return (
    <div>
      <WafMenu
        firewallPolicyId={firewallPolicyId}
        firewallPolicyName={data.firewallPolicyName}
        countInboundGroups={data.countInboundGroups}
        countOutboundGroups={data.countOutboundGroups}
        active="ipadmin"
      />
      <IpAdminMenu firewallPolicyId={firewallPolicyId} subMenuItem={data.subMenuItem} />

      <div className="ui menu text blue second-menu" style={{ marginTop: '-1em' }}>
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setAdding(true)
          }}
        >
          添加IP
        </a>
        <span className="item disabled">|</span>
        <a
          className="item"
          href=""
          onClick={(event) => {
            event.preventDefault()
            setBinding((current) => !current)
          }}
        >
          绑定+
        </a>
        {boundLists.length > 0 ? (
          <span className="item">
            <span className="disabled small">|&nbsp;</span> 已绑定：
            {boundLists.map((list) => (
              <span key={list.id} className="ui label basic small">
                {list.name}
                <a
                  href=""
                  title="删除"
                  onClick={(event) => {
                    event.preventDefault()
                    void unbindList(list)
                  }}
                >
                  <Trash2 size={11} />
                </a>
              </span>
            ))}
          </span>
        ) : null}
        <span className="item disabled">|</span>
        <span className="item">ID: {data.listId}</span>
      </div>

      {adding ? (
        <div className="ui segment">
          <h4>添加IP</h4>
          <table className="ui table definition selectable">
            <tbody>
              <tr>
                <td className="title">类型 *</td>
                <td>
                  <select className="ui dropdown auto-width" value={addType} onChange={(event) => setAddType(event.target.value)}>
                    <option value="ip">单IP或IP段</option>
                    <option value="all">所有IP</option>
                  </select>
                </td>
              </tr>
              {addType !== 'all' ? (
                <tr>
                  <td>添加方式</td>
                  <td>
                    <label>
                      <input type="radio" checked={method === 'single'} onChange={() => setMethod('single')} /> 单个添加
                    </label>
                    &nbsp; &nbsp;
                    <label>
                      <input type="radio" checked={method === 'batch'} onChange={() => setMethod('batch')} /> 批量添加
                    </label>
                  </td>
                </tr>
              ) : null}
              {method === 'single' && addType === 'ip' ? (
                <tr>
                  <td>IP或IP段 *</td>
                  <td>
                    <input
                      type="text"
                      maxLength={64}
                      placeholder="x.x.x.x"
                      style={{ width: '20em' }}
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      autoFocus
                    />
                    <p className="comment">
                      支持IPv4和IPv6；支持单个IP、IP范围（192.168.1.1-192.168.1.255）和CIDR（192.168.1.1/24）。
                    </p>
                  </td>
                </tr>
              ) : null}
              {method === 'batch' && addType === 'ip' ? (
                <tr>
                  <td>IP列表</td>
                  <td>
                    <textarea rows={3} style={{ width: '20em' }} value={ipData} onChange={(event) => setIpData(event.target.value)} />
                    <p className="comment">每行一个IP，支持单个IP、IP范围和CIDR。</p>
                  </td>
                </tr>
              ) : null}
              <tr>
                <td>过期时间</td>
                <td>
                  <input type="datetime-local" value={expiredAt} onChange={(event) => setExpiredAt(event.target.value)} />
                  <p className="comment">在加入名单某一段时间后会失效，留空表示永久有效。</p>
                </td>
              </tr>
              <tr>
                <td>级别</td>
                <td>
                  <select className="ui dropdown auto-width" value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}>
                    {EVENT_LEVELS.map((level) => (
                      <option key={level.code} value={level.code}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td>备注</td>
                <td>
                  <input type="text" maxLength={100} value={reason} onChange={(event) => setReason(event.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="button" disabled={submitting} onClick={() => void addIP()}>
            保存
          </button>
          &nbsp;
          <button className="ui button" type="button" onClick={() => setAdding(false)}>
            取消
          </button>
        </div>
      ) : null}

      {binding ? (
        <div className="ui segment">
          <h4>绑定公共IP名单</h4>
          {availableLists.length === 0 ? <p className="comment">暂时没有可绑定的IP名单。</p> : null}
          {availableLists.map((list) => (
            <div key={list.id} className="ui label basic" style={{ marginBottom: '0.4em' }}>
              {list.name}（{list.countItems}个IP）
              {list.isSelected ? (
                <span className="small grey"> 已绑定</span>
              ) : (
                <a
                  href=""
                  style={{ marginLeft: '0.4em' }}
                  onClick={(event) => {
                    event.preventDefault()
                    void bindList(list)
                  }}
                >
                  绑定
                </a>
              )}
            </div>
          ))}
          <div style={{ marginTop: '0.5em' }}>
            <button className="ui button" type="button" onClick={() => setBinding(false)}>
              关闭
            </button>
          </div>
          <LegacyPagination html={bindQuery.data?.page} />
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
                  {item.type === 'all' ? '所有IP' : item.value || `${item.ipFrom} - ${item.ipTo}`}
                  <SourceInfo item={item} />
                </td>
                <td>
                  <IPTypeName type={item.type} />
                </td>
                <td>{item.eventLevelName || '-'}</td>
                <td>{item.expiredTime || <span className="disabled">永久有效</span>}</td>
                <td>
                  {item.reason || <span className="disabled">-</span>}
                  <div className="small grey">创建于 {item.createdTime}</div>
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      navigate(`/servers/components/waf/ipadmin/updateIPPopup?firewallPolicyId=${firewallPolicyId}&itemId=${item.id}&type=${type}`)
                    }}
                  >
                    <Pencil size={13} /> 修改
                  </a>{' '}
                  &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deleteItem(item)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data.page} />
    </div>
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
  firewallPolicyName: string
}

export function WafIpAdminUpdateIPPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const listType = searchParams.get('type') || 'black'
  const query = useQuery({
    queryKey: ['waf-ipadmin-update-ip', itemId],
    queryFn: () => apiGet<UpdateIPData>('/servers/components/waf/ipadmin/updateIPPopup', { itemId }),
    enabled: itemId > 0,
  })
  const [value, setValue] = useState('')
  const [expiredAt, setExpiredAt] = useState('')
  const [reason, setReason] = useState('')
  const [eventLevel, setEventLevel] = useState('critical')
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setInitialized(true)
      setValue(query.data.item.value)
      setReason(query.data.item.reason)
      setEventLevel(query.data.item.eventLevel)
      if (query.data.item.expiredAt > 0) {
        const date = new Date(query.data.item.expiredAt * 1000)
        const pad = (input: number) => String(input).padStart(2, '0')
        setExpiredAt(
          `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
        )
      }
    }
  }, [query.data, initialized])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const item = query.data.item

  async function submit() {
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('firewallPolicyId', String(firewallPolicyId))
      form.set('itemId', String(itemId))
      form.set('value', value)
      form.set('expiredAt', expiredAt ? String(Math.floor(new Date(expiredAt).getTime() / 1000)) : '0')
      form.set('reason', reason)
      form.set('type', item.type)
      form.set('eventLevel', eventLevel)
      await apiPostForm('/servers/components/waf/ipadmin/updateIPPopup', form)
      toast('保存成功')
      navigate(`/servers/components/waf/ipadmin/lists?firewallPolicyId=${firewallPolicyId}&type=${listType}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>修改IP</h3>
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
              <td className="title">类型 *</td>
              <td>
                <IPTypeName type={item.type} />
                <p className="comment">
                  {item.type === 'all'
                    ? '允许或禁用所有的IP。'
                    : item.type === 'ipv6'
                      ? '单个IPv6或一个IPv6范围。'
                      : '单个IPv4或一个IPv4范围。'}
                </p>
              </td>
            </tr>
            {item.type !== 'all' ? (
              <tr>
                <td>IP或IP段 *</td>
                <td>
                  <input
                    type="text"
                    maxLength={64}
                    placeholder="x.x.x.x"
                    style={{ width: '20em' }}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    autoFocus
                  />
                </td>
              </tr>
            ) : null}
            <tr>
              <td>过期时间</td>
              <td>
                <input type="datetime-local" value={expiredAt} onChange={(event) => setExpiredAt(event.target.value)} />
                <p className="comment">在加入名单某一段时间后会失效，留空表示永久有效。</p>
              </td>
            </tr>
            <tr>
              <td>级别</td>
              <td>
                <select className="ui dropdown auto-width" value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}>
                  {EVENT_LEVELS.map((level) => (
                    <option key={level.code} value={level.code}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>备注</td>
              <td>
                <input type="text" maxLength={100} value={reason} onChange={(event) => setReason(event.target.value)} />
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
    </div>
  )
}

interface IPTestResult {
  isDone: boolean
  isOk: boolean
  isFound: boolean
  isAllowed: boolean
  error: string
  list?: { id: number; name: string }
  item?: {
    id: number
    value: string
    ipFrom: string
    ipTo: string
    reason: string
    createdTime: string
    expiredTime: string
    type: string
    eventLevelName: string
    listType: string
  }
  country?: { id: number; name: string }
  province?: { id: number; name: string }
}

interface WafIpTestData extends WafMenuData {
  subMenuItem: string
}

export function WafIpAdminTestPage({ firewallPolicyId }: { firewallPolicyId: number }) {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['waf-ipadmin-test', firewallPolicyId],
    queryFn: () => apiGet<WafIpTestData>('/servers/components/waf/ipadmin/test', { firewallPolicyId }),
    enabled: firewallPolicyId > 0,
  })
  const [ip, setIp] = useState('')
  const [result, setResult] = useState<IPTestResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      const response = await postActionResult<{ result: IPTestResult }>('/servers/components/waf/ipadmin/test', {
        firewallPolicyId,
        ip,
      })
      if (response.code === 200) {
        setResult(response.data.result)
      } else {
        setResult({
          isDone: true,
          isOk: false,
          isFound: false,
          isAllowed: false,
          error: response.message,
        })
      }
    } catch (error) {
      setResult({
        isDone: true,
        isOk: false,
        isFound: false,
        isAllowed: false,
        error: error instanceof Error ? error.message : '请求失败',
      })
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
        active="ipadmin"
      />
      <IpAdminMenu firewallPolicyId={firewallPolicyId} subMenuItem={data.subMenuItem} />

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
              <td className="title">IP *</td>
              <td>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="x.x.x.x"
                  value={ip}
                  onChange={(event) => {
                    setIp(event.target.value)
                    setResult(null)
                  }}
                  autoFocus
                />
                <p className="comment">要检查的IP</p>
              </td>
            </tr>
            <tr>
              <td>检查结果</td>
              <td>
                {result?.isDone ? (
                  <>
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
                              <span className="green">
                                在 {result.list?.name} 中 {result.item.value || `${result.item.ipFrom}-${result.item.ipTo}`}
                              </span>
                            ) : (
                              <span className="red">
                                在 {result.list?.name} 中 {result.item.value || `${result.item.ipFrom}-${result.item.ipTo}`}
                              </span>
                            )}
                            &nbsp;
                            <a
                              href=""
                              title="查看和修改"
                              onClick={(event) => {
                                event.preventDefault()
                                navigate(
                                  `/servers/components/waf/ipadmin/updateIPPopup?firewallPolicyId=${firewallPolicyId}&itemId=${result.item?.id || 0}&type=${result.item?.listType || 'black'}`,
                                )
                              }}
                            >
                              <Pencil size={13} />
                            </a>
                          </div>
                        ) : null}
                        {result.province ? (
                          <div>
                            <span className="red">在省份封禁中 &quot;{result.province.name}&quot;</span>
                          </div>
                        ) : null}
                        {result.country && !result.province ? (
                          <div>
                            <span className="red">在国家/地区封禁中 &quot;{result.country.name}&quot;</span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {!result.isFound ? <div>没有找到和{ip}匹配的配置。</div> : null}
                  </>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            检查IP状态
          </button>
        </div>
      </form>
    </div>
  )
}
