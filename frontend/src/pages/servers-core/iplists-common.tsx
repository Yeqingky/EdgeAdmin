import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { FirstMenu, IPTypeLabel, Keyword, Modal, apiPostMulti } from './common'

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export interface IpItemRow {
  id: number
  value: string
  ipFrom: string
  ipTo: string
  createdTime: string
  isExpired?: boolean
  expiredTime: string
  reason: string
  type: string
  isRead?: boolean
  lifeSeconds: number
  eventLevelName: string
  sourcePolicy: { id: number; name?: string; serverId?: number }
  sourceGroup: { id: number; name?: string }
  sourceSet: { id: number; name?: string }
  sourceServer: { id: number; name?: string }
  sourceNode: { id: number; name?: string; clusterId?: number }
  list?: { id: number; name: string; type: string }
  policy?: { id: number; name: string; server?: { id: number; name: string } }
  region: string
  isp: string
}

export interface IpListRow {
  id: number
  isOn: boolean
  name: string
  code: string
  description: string
  countItems: number
  type: string
  isGlobal: boolean
}

export interface IpListDetail {
  id: number
  name: string
  code: string
  type: string
  typeName: string
  description: string
  isOn: boolean
  countItems: number
  isGlobal: boolean
}

export interface EventLevel {
  code: string
  name: string
  description?: string
}

export const eventLevels: EventLevel[] = [
  { code: 'debug', name: '调试' },
  { code: 'notice', name: '通知' },
  { code: 'warning', name: '警告' },
  { code: 'error', name: '错误' },
  { code: 'critical', name: '严重' },
  { code: 'fatal', name: '致命' },
]

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

function datetimeLocalFromTimestamp(timestamp: number): string {
  if (timestamp <= 0) {
    return ''
  }
  const date = new Date(timestamp * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

function timestampFromDatetimeLocal(value: string): number {
  if (!value) {
    return 0
  }
  return Math.floor(new Date(value).getTime() / 1000)
}

/* ------------------------------------------------------------------ */
/* 名单菜单                                                            */
/* ------------------------------------------------------------------ */

export function IpListMenu({ list, current }: { list: IpListDetail; current: 'list' | 'item' | 'update' | 'test' | 'export' | 'import' }) {
  return (
    <FirstMenu
      items={[
        { name: 'IP列表', href: '/servers/iplists' },
        { name: list.typeName, href: `/servers/iplists/lists?type=${list.type}` },
        {
          name: `"${list.name}"详情`,
          href: `/servers/iplists/list?listId=${list.id}`,
          active: current === 'list',
        },
        { name: `IP(${list.countItems})`, href: `/servers/iplists/items?listId=${list.id}`, active: current === 'item' },
        { name: '修改', href: `/servers/iplists/update?listId=${list.id}`, active: current === 'update' },
        { name: 'IP检查', href: `/servers/iplists/test?listId=${list.id}`, active: current === 'test' },
        { name: '导出', href: `/servers/iplists/export?listId=${list.id}`, active: current === 'export' },
        { name: '导入', href: `/servers/iplists/import?listId=${list.id}`, active: current === 'import' },
      ]}
    />
  )
}

/* ------------------------------------------------------------------ */
/* IP 表格                                                             */
/* ------------------------------------------------------------------ */

export function IpListTable({
  items,
  keyword,
  total,
  showSearchButton,
  deleteCountParams,
  onUpdate,
  onDelete,
  onViewLogs,
  onRefresh,
}: {
  items: IpItemRow[]
  keyword?: string
  total?: number
  showSearchButton?: boolean
  deleteCountParams: Record<string, string | number>
  onUpdate: (itemId: number) => void
  onDelete: (itemId: number) => void
  onViewLogs: (itemId: number) => void
  onRefresh: () => void
}) {
  const confirm = useConfirm()
  const toast = useToast()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedAll, setSelectedAll] = useState(false)
  const maxDeletes = total && total > 0 && total < 10000 ? total : 10000

  useEffect(() => {
    setSelectedIds([])
    setSelectedAll(false)
  }, [items])

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      return
    }
    try {
      await apiPostMulti(
        '/servers/iplists/deleteItems',
        selectedIds.map((id) => ['itemIds', id] as [string, number]),
      )
      toast('批量删除成功')
      onRefresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function deleteAll() {
    if (!(await confirm({ message: `确定要批量删除当前列表中的${maxDeletes}个IP吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      const entries: Array<[string, string | number]> = []
      for (const [key, value] of Object.entries(deleteCountParams)) {
        if (value !== '' && value !== undefined && value !== null) {
          entries.push([key, value])
        }
      }
      entries.push(['count', maxDeletes])
      await apiPostMulti('/servers/iplists/deleteCount', entries)
      toast('批量删除成功')
      onRefresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div>
      {selectedIds.length > 0 ? (
        <div>
          <div className="ui divider" />
          <button className="ui button basic" type="button" onClick={() => void deleteSelected()}>
            批量删除所选
          </button>
          &nbsp; &nbsp;
          {total !== undefined && total >= maxDeletes ? (
            <>
              <button className="ui button basic" type="button" onClick={() => void deleteAll()}>
                批量删除所有搜索结果({maxDeletes}个)
              </button>
              &nbsp; &nbsp;
            </>
          ) : null}
          <button className="ui button basic" type="button" onClick={() => setSelectedIds([])}>
            取消选中
          </button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '1em' }}>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={selectedAll}
                    onChange={(event) => {
                      setSelectedAll(event.target.checked)
                      setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])
                    }}
                  />
                  <label />
                </div>
              </th>
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
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <label />
                  </div>
                </td>
                <td>
                  {item.type !== 'all' ? (
                    <span
                      className={
                        item.list?.type === 'white' ? 'green' : item.list?.type === 'grey' ? 'grey' : undefined
                      }
                    >
                      {item.value ? (
                        <Keyword word={keyword}>{item.value}</Keyword>
                      ) : (
                        <span>
                          <Keyword word={keyword}>{item.ipFrom}</Keyword>
                          <span>
                            {item.isRead === false ? <span className="small red">&nbsp;New&nbsp;</span> : null}
                            {showSearchButton ? (
                              <a href={`/servers/iplists?ip=${item.ipFrom}`} title="搜索此IP">
                                <span className="grey small"> 搜索</span>
                              </a>
                            ) : null}
                          </span>
                          {item.ipTo.length > 0 ? (
                            <span>
                              {' '}
                              - <Keyword word={keyword}>{item.ipTo}</Keyword>
                            </span>
                          ) : null}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="disabled">*</span>
                  )}

                  {item.region ? (
                    <div>
                      <span className="grey small">{item.region}</span>
                      {item.isp && item.isp !== '内网IP' ? <span className="grey small"> | {item.isp}</span> : null}
                    </div>
                  ) : item.isp && item.isp !== '内网IP' ? (
                    <div>
                      <span className="grey small">{item.isp}</span>
                    </div>
                  ) : null}

                  <div>
                    <span className="small grey">
                      添加于 {item.createdTime}
                      {item.list && item.list.id > 0 ? (
                        <span>
                          {' @ '}
                          {item.policy && item.policy.id === 0 ? (
                            <a href={`/servers/iplists/list?listId=${item.list.id}`}>
                              [
                              {item.list.type === 'black' ? '黑' : item.list.type === 'white' ? '白' : '灰'}
                              名单:{item.list.name}]
                            </a>
                          ) : (
                            <span>
                              [
                              {item.list.type === 'black' ? '黑' : item.list.type === 'white' ? '白' : '灰'}
                              名单:{item.list.name}]
                              {item.policy && item.policy.id > 0 ? (
                                <span>
                                  {item.policy.server ? (
                                    <a
                                      href={`/servers/server/settings/waf/ipadmin/${item.list.type === 'white' ? 'allowList' : item.list.type === 'grey' ? 'greyList' : 'denyList'}?serverId=${item.policy.server.id}&firewallPolicyId=${item.policy.id}`}
                                    >
                                      [网站:{item.policy.server.name}]
                                    </a>
                                  ) : (
                                    <a
                                      href={`/servers/components/waf/ipadmin/lists?firewallPolicyId=${item.policy.id}&type=${item.list.type}`}
                                    >
                                      [策略:{item.policy.name}]
                                    </a>
                                  )}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td>
                  {!item.type || item.type === 'ipv4' ? <span>IPv4</span> : null}
                  {item.type === 'ipv6' ? <span>IPv6</span> : null}
                  {item.type === 'all' ? <strong>所有IP</strong> : null}
                </td>
                <td>{item.eventLevelName ? item.eventLevelName : <span className="disabled">-</span>}</td>
                <td>
                  {item.expiredTime.length > 0 ? (
                    <div>
                      {item.expiredTime}
                      {item.isExpired && item.lifeSeconds == null ? (
                        <div style={{ marginTop: '0.5em' }}>
                          <span className="ui label tiny basic red">已过期</span>
                        </div>
                      ) : null}
                      {item.lifeSeconds != null ? (
                        <div>
                          {item.lifeSeconds > 0 ? (
                            <span className="small grey">{formatSeconds(item.lifeSeconds)}</span>
                          ) : (
                            <span className="small red">已过期</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="disabled">不过期</span>
                  )}
                </td>
                <td>
                  {item.reason.length > 0 ? item.reason : <span className="disabled">-</span>}
                  {item.sourceNode && item.sourceNode.id > 0 ? (
                    <div style={{ marginTop: '0.4em' }}>
                      <a href={`/clusters/cluster/node?clusterId=${item.sourceNode.clusterId}&nodeId=${item.sourceNode.id}`}>
                        <span className="small">{item.sourceNode.name}</span>
                      </a>
                    </div>
                  ) : null}
                  {item.sourceServer && item.sourceServer.id > 0 ? (
                    <div style={{ marginTop: '0.4em' }}>
                      <a href={`/servers/server?serverId=${item.sourceServer.id}`}>
                        <span className="small">{item.sourceServer.name}</span>
                      </a>
                    </div>
                  ) : null}
                  {item.sourcePolicy && item.sourcePolicy.id > 0 ? (
                    <div style={{ marginTop: '0.4em' }}>
                      {item.sourcePolicy.serverId === 0 ? (
                        <a
                          href={`/servers/components/waf/group?firewallPolicyId=${item.sourcePolicy.id}&type=inbound&groupId=${item.sourceGroup.id}`}
                        >
                          <span className="small">
                            {item.sourcePolicy.name} &raquo; {item.sourceGroup.name} &raquo; {item.sourceSet.name}
                          </span>
                        </a>
                      ) : (
                        <a
                          href={`/servers/server/settings/waf/group?serverId=${item.sourcePolicy.serverId}&firewallPolicyId=${item.sourcePolicy.id}&type=inbound&groupId=${item.sourceGroup.id}`}
                        >
                          <span className="small">
                            {item.sourcePolicy.name} &raquo; {item.sourceGroup.name} &raquo; {item.sourceSet.name}
                          </span>
                        </a>
                      )}
                    </div>
                  ) : null}
                </td>
                <td>
                  <a href="" onClick={(event) => { event.preventDefault(); onViewLogs(item.id) }}>
                    日志
                  </a>{' '}
                  &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); onUpdate(item.id) }}>
                    修改
                  </a>{' '}
                  &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); onDelete(item.id) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 创建 / 修改 IP                                                      */
/* ------------------------------------------------------------------ */

interface CreateIPModalProps {
  listId: number
  listType: string
  onClose: () => void
  onCreated: () => void
}

export function CreateIPModal({ listId, listType, onClose, onCreated }: CreateIPModalProps) {
  const toast = useToast()
  const [type, setType] = useState('ip')
  const [method, setMethod] = useState<'single' | 'batch'>('single')
  const [value, setValue] = useState('')
  const [ipData, setIpData] = useState('')
  const [expiredAt, setExpiredAt] = useState('')
  const [reason, setReason] = useState('')
  const [eventLevel, setEventLevel] = useState(listType === 'white' ? 'debug' : 'critical')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (type === 'ip') {
      if (method === 'single' && !value) {
        setError('请输入IP或IP段')
        return
      }
      if (method === 'batch' && !ipData) {
        setError('请输入IP')
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/iplists/createIPPopup', {
        csrfToken: await getCsrfToken(),
        listId,
        type,
        method,
        value,
        ipData,
        expiredAt: timestampFromDatetimeLocal(expiredAt),
        reason,
        eventLevel,
      })
      toast('保存成功')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={
        listType === 'white' ? '添加IP到白名单' : listType === 'black' ? '添加IP到黑名单' : '添加IP到灰名单'
      }
      onClose={onClose}
      width="44em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      {error ? <div className="ui negative message">{error}</div> : null}
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">类型 *</td>
            <td>
              <select className="ui dropdown auto-width" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="ip">单IP或IP段</option>
                <option value="all">所有IP</option>
              </select>
              <p className="comment">
                {type === 'ip' ? '单个IP或一个IP范围.' : '允许或禁用所有的IP.'}
              </p>
            </td>
          </tr>
          {type !== 'all' ? (
            <tr>
              <td>添加方式</td>
              <td>
                <div className="ui checkbox" style={{ marginRight: '1em' }}>
                  <input
                    type="checkbox"
                    id="ip-method-single"
                    checked={method === 'single'}
                    onChange={() => setMethod('single')}
                  />
                  <label htmlFor="ip-method-single">单个添加</label>
                </div>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    id="ip-method-batch"
                    checked={method === 'batch'}
                    onChange={() => setMethod('batch')}
                  />
                  <label htmlFor="ip-method-batch">批量添加</label>
                </div>
              </td>
            </tr>
          ) : null}
          {method === 'single' && type === 'ip' ? (
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
                />
                <p className="comment">
                  支持IPv4和IPv6;支持三种格式:单个IP(比如192.168.1.100),IP范围(比如192.168.1.1-192.168.1.255),CIDR(比如192.168.1.1/24).
                </p>
              </td>
            </tr>
          ) : null}
          {method === 'batch' && type === 'ip' ? (
            <tr>
              <td>IP列表</td>
              <td>
                <textarea
                  rows={3}
                  style={{ width: '20em' }}
                  placeholder={'x.x.x.x\nx.x.x.x/24\nx.x.x.x-y.y.y.y'}
                  value={ipData}
                  onChange={(event) => setIpData(event.target.value)}
                />
                <p className="comment">
                  每行一个IP,支持三种格式:192.168.1.100,192.168.1.1-192.168.1.255,192.168.1.1/24.
                </p>
              </td>
            </tr>
          ) : null}
          <tr>
            <td>过期时间</td>
            <td>
              <input
                type="datetime-local"
                value={expiredAt}
                onChange={(event) => setExpiredAt(event.target.value)}
              />
              <p className="comment">在加入名单某一段时间后会失效,留空表示永久有效.</p>
            </td>
          </tr>
          <tr>
            <td>级别</td>
            <td>
              <select className="ui dropdown" value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}>
                {eventLevels.map((level) => (
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
    </Modal>
  )
}

interface IpItemDetail {
  id: number
  value: string
  ipFrom: string
  ipTo: string
  expiredAt: number
  reason: string
  type: string
  eventLevel: string
}

interface UpdateIPModalProps {
  itemId: number
  onClose: () => void
  onUpdated: () => void
}

export function UpdateIPModal({ itemId, onClose, onUpdated }: UpdateIPModalProps) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['servers-core', 'ip-item', itemId],
    queryFn: () => apiGet<{ item: IpItemDetail; type: string }>('/servers/iplists/updateIPPopup', { itemId }),
  })
  const [form, setForm] = useState<IpItemDetail | null>(null)
  const [expiredAt, setExpiredAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.data) {
      setForm(query.data.item)
      setExpiredAt(datetimeLocalFromTimestamp(query.data.item.expiredAt))
    }
  }, [query.data])

  async function submit() {
    if (!form) {
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/iplists/updateIPPopup', {
        csrfToken: await getCsrfToken(),
        itemId,
        value: form.value,
        expiredAt: timestampFromDatetimeLocal(expiredAt),
        reason: form.reason,
        type: form.type,
        eventLevel: form.eventLevel,
      })
      toast('保存成功')
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="修改IP"
      onClose={onClose}
      width="44em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      {query.isLoading || !form ? (
        <div className="loading-block">加载中...</div>
      ) : (
        <>
          {error ? <div className="ui negative message">{error}</div> : null}
          <table className="ui table definition selectable">
            <tbody>
              <tr>
                <td className="title">类型 *</td>
                <td>
                  {form.type === 'ipv4' || !form.type ? <span>IPv4</span> : null}
                  {form.type === 'ipv6' ? <span>IPv6</span> : null}
                  {form.type === 'all' ? <span>所有IP</span> : null}
                </td>
              </tr>
              {form.type !== 'all' ? (
                <tr>
                  <td>IP或IP段 *</td>
                  <td>
                    <input
                      type="text"
                      maxLength={64}
                      placeholder="x.x.x.x"
                      style={{ width: '20em' }}
                      value={form.value}
                      onChange={(event) => setForm({ ...form, value: event.target.value })}
                    />
                  </td>
                </tr>
              ) : null}
              <tr>
                <td>过期时间</td>
                <td>
                  <input
                    type="datetime-local"
                    value={expiredAt}
                    onChange={(event) => setExpiredAt(event.target.value)}
                  />
                  <p className="comment">在加入名单某一段时间后会失效,留空表示永久有效.</p>
                </td>
              </tr>
              <tr>
                <td>级别</td>
                <td>
                  <select
                    className="ui dropdown"
                    value={form.eventLevel}
                    onChange={(event) => setForm({ ...form, eventLevel: event.target.value })}
                  >
                    {eventLevels.map((level) => (
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
                  <input
                    type="text"
                    maxLength={100}
                    value={form.reason}
                    onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* 创建名单                                                            */
/* ------------------------------------------------------------------ */

interface CreateListModalProps {
  type: string
  onClose: () => void
  onCreated: (type: string) => void
}

export function CreateListModal({ type, onClose, onCreated }: CreateListModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [listType, setListType] = useState(type || 'black')
  const [isGlobal, setIsGlobal] = useState(true)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name) {
      setError('请输入名称')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/iplists/createPopup', {
        csrfToken: await getCsrfToken(),
        name,
        code,
        type: listType,
        description,
        isGlobal: isGlobal ? 1 : '',
      })
      toast('保存成功')
      onCreated(listType)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`创建${listType === 'black' ? '黑名单' : listType === 'white' ? '白名单' : '灰名单'}`}
      onClose={onClose}
      width="44em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      {error ? <div className="ui negative message">{error}</div> : null}
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">名称 *</td>
            <td>
              <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            </td>
          </tr>
          <tr>
            <td>代号</td>
            <td>
              <input type="text" maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} />
              <p className="comment">可选参数,只能是英文字母,数字,中划线,下划线的组合.</p>
            </td>
          </tr>
          <tr>
            <td>类型</td>
            <td>
              <select
                className="ui dropdown auto-width"
                value={listType}
                onChange={(event) => setListType(event.target.value)}
              >
                <option value="black">黑名单</option>
                <option value="white">白名单</option>
                <option value="grey">灰名单</option>
              </select>
              <p className="comment">
                {listType === 'black'
                  ? '黑名单中的IP将会被禁止访问.'
                  : listType === 'white'
                    ? '白名单中的IP将会自动放行,优先级高于黑名单.'
                    : '灰名单中的IP仅作为记录和观察使用,不影响黑名单和白名单的作用.'}
              </p>
            </td>
          </tr>
          <tr>
            <td>全局有效</td>
            <td>
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  id="ip-list-is-global"
                  checked={isGlobal}
                  onChange={(event) => setIsGlobal(event.target.checked)}
                />
                <label htmlFor="ip-list-is-global" />
              </div>
              <p className="comment">
                选中后,所有网站都自动使用此名单,不需要再次绑定;否则只有在WAF策略中绑定此名单后才会生效.
              </p>
            </td>
          </tr>
          <tr>
            <td>备注</td>
            <td>
              <textarea
                rows={2}
                maxLength={200}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* 公用名单表格(selectPopup / bindHTTPFirewallPopup)                 */
/* ------------------------------------------------------------------ */

export function PublicIpListTable({
  lists,
  onAction,
  actionText,
  actionFor,
}: {
  lists: (IpListRow & { isSelected?: boolean })[]
  actionText: string
  actionFor?: (list: IpListRow & { isSelected?: boolean }) => string
  onAction: (list: IpListRow & { isSelected?: boolean }) => void
}) {
  if (lists.length === 0) {
    return <p className="comment">暂时还没有可用的公用IP名单.</p>
  }
  return (
    <table className="ui table selectable celled">
      <thead>
        <tr>
          <th className="two wide center">ID</th>
          <th>名称</th>
          <th className="two wide center">类型</th>
          <th>备注</th>
          <th className="two wide center">IP数量</th>
          <th className="two op">操作</th>
        </tr>
      </thead>
      <tbody>
        {lists.map((list) => (
          <tr key={list.id}>
            <td className="center">{list.id}</td>
            <td>{list.name}</td>
            <td className="center">
              <IPTypeLabel type={list.type} />
            </td>
            <td>{list.description || <span className="disabled">-</span>}</td>
            <td className="center">
              {list.countItems > 0 ? list.countItems : <span className="disabled">0</span>}
            </td>
            <td>
              <a href="" onClick={(event) => { event.preventDefault(); onAction(list) }}>
                {actionFor ? actionFor(list) : actionText}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
