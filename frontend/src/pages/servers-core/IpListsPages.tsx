import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import {
  AccessLogDetailModal,
  FirstMenu,
  IPTypeLabel,
  Keyword,
  Modal,
  type AccessLog,
} from './common'
import {
  CreateIPModal,
  CreateListModal,
  IpListMenu,
  IpListTable,
  PublicIpListTable,
  UpdateIPModal,
  eventLevels,
  type EventLevel,
  type IpItemRow,
  type IpListDetail,
  type IpListRow,
} from './iplists-common'

/* ------------------------------------------------------------------ */
/* 公用                                                                */
/* ------------------------------------------------------------------ */

function IpListsTopMenu({ type }: { type?: string }) {
  return (
    <FirstMenu
      items={[
        { name: 'IP列表', href: '/servers/iplists', active: !type },
        { name: '黑名单', href: '/servers/iplists/lists?type=black', active: type === 'black' },
        { name: '白名单', href: '/servers/iplists/lists?type=white', active: type === 'white' },
        { name: '灰名单', href: '/servers/iplists/lists?type=grey', active: type === 'grey' },
      ]}
    >
      {type ? <span className="item disabled">|</span> : null}
    </FirstMenu>
  )
}

interface AccessLogsPopupData {
  ipFrom: string
  ipTo: string
  accessLogs: AccessLog[]
}

function IpAccessLogsContent({ itemId }: { itemId: number }) {
  const [detailRequestId, setDetailRequestId] = useState('')
  const query = useQuery({
    queryKey: ['servers-core', 'ip-access-logs', itemId],
    queryFn: () => apiGet<AccessLogsPopupData>('/servers/iplists/accessLogsPopup', { itemId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  return (
    <div>
      {data.accessLogs.length === 0 ? <p className="comment">暂时还没有访问日志。</p> : null}
      {data.accessLogs.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {data.accessLogs.map((accessLog) => (
              <tr key={accessLog.requestId}>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setDetailRequestId(accessLog.requestId)
                    }}
                  >
                    [{accessLog.timeLocal}] {accessLog.remoteAddr} {accessLog.requestMethod} {accessLog.host}
                    {accessLog.requestURI} {accessLog.status}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* IP 列表（全部IP）                                                   */
/* ------------------------------------------------------------------ */

interface ItemsData {
  type: string
  keyword: string
  globalOnly: boolean
  unread: boolean
  eventLevel: string
  listType: string
  countUnread: number
  totalItems: number
  page: string
  items: IpItemRow[]
  eventLevels: EventLevel[]
}

export function IpListsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [listType, setListType] = useState(searchParams.get('listType') || '')
  const [eventLevel, setEventLevel] = useState(searchParams.get('eventLevel') || '')
  const [globalOnly, setGlobalOnly] = useState(searchParams.get('globalOnly') === '1')
  const [unread, setUnread] = useState(searchParams.get('unread') === '1')
  const [updateItemId, setUpdateItemId] = useState(0)
  const [logsItemId, setLogsItemId] = useState(0)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-items', searchParams.toString()],
    queryFn: () =>
      apiGet<ItemsData>('/servers/iplists', {
        keyword: searchParams.get('keyword') || '',
        listType: searchParams.get('listType') || '',
        eventLevel: searchParams.get('eventLevel') || '',
        globalOnly: searchParams.get('globalOnly') || '',
        unread: searchParams.get('unread') || '',
        ip: searchParams.get('ip') || '',
        page: searchParams.get('page') || 1,
      }),
  })

  const readAll = useMutation({
    mutationFn: () => apiPost('/servers/iplists/readAll'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-items'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: number) => apiPost('/servers/iplists/deleteIP', { itemId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-items'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  function applyFilters() {
    const next = new URLSearchParams()
    if (keyword.trim()) {
      next.set('keyword', keyword.trim())
    }
    if (listType) {
      next.set('listType', listType)
    }
    if (eventLevel) {
      next.set('eventLevel', eventLevel)
    }
    if (globalOnly) {
      next.set('globalOnly', '1')
    }
    if (unread) {
      next.set('unread', '1')
    }
    setSearchParams(next)
  }

  async function deleteItem(itemId: number) {
    if (!(await confirm({ message: '确定要删除这个IP吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    removeItem.mutate(itemId)
  }

  return (
    <div>
      <IpListsTopMenu />
      <div className="margin" />
      <form className="ui form" onSubmit={(event) => { event.preventDefault(); applyFilters() }}>
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="x.x.x.x" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <div className="ui field">
            <select
              className="ui dropdown auto-width"
              value={listType}
              onChange={(event) => setListType(event.target.value)}
            >
              <option value="">[所有类型]</option>
              <option value="black">黑名单</option>
              <option value="white">白名单</option>
              <option value="grey">灰名单</option>
            </select>
          </div>
          <div className="ui field">
            <select
              className="ui dropdown"
              value={eventLevel}
              onChange={(event) => setEventLevel(event.target.value)}
            >
              <option value="">[所有级别]</option>
              {(data.eventLevels || eventLevels).map((level) => (
                <option key={level.code} value={level.code}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <div className="ui checkbox">
              <input
                type="checkbox"
                id="ip-global-only"
                checked={globalOnly}
                onChange={(event) => setGlobalOnly(event.target.checked)}
              />
              <label htmlFor="ip-global-only">系统自动拦截</label>
            </div>
          </div>
          {data.countUnread > 0 ? (
            <div className="ui field">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  id="ip-unread"
                  checked={unread}
                  onChange={(event) => setUnread(event.target.checked)}
                />
                <label htmlFor="ip-unread">
                  <span className="red">New</span>
                </label>
              </div>
            </div>
          ) : null}
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {keyword || listType || eventLevel || globalOnly || unread ? (
              <a
                href="/servers/iplists"
                onClick={(event) => {
                  event.preventDefault()
                  setKeyword('')
                  setListType('')
                  setEventLevel('')
                  setGlobalOnly(false)
                  setUnread(false)
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
          {data.countUnread > 0 ? (
            <>
              <div className="ui field">
                <span className="disabled">|</span>
              </div>
              <div className="ui field">
                <a
                  href=""
                  title="消除未读标记New"
                  onClick={(event) => {
                    event.preventDefault()
                    readAll.mutate()
                  }}
                >
                  [全部设为已读]
                </a>
              </div>
            </>
          ) : null}
        </div>
      </form>

      <div className="margin" />
      {data.items.length === 0 ? <p className="comment">暂时还没有IP。</p> : null}

      <IpListTable
        items={data.items}
        keyword={data.keyword}
        total={data.totalItems}
        showSearchButton
        deleteCountParams={{
          keyword: data.keyword,
          globalOnly: data.globalOnly ? 1 : '',
          unread: data.unread ? 1 : '',
          eventLevel: data.eventLevel,
          listType: data.listType,
          ip: searchParams.get('ip') || '',
        }}
        onUpdate={setUpdateItemId}
        onDelete={(itemId) => void deleteItem(itemId)}
        onViewLogs={setLogsItemId}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-items'] })}
      />

      <LegacyPagination html={data.page} />

      {updateItemId > 0 ? (
        <UpdateIPModal
          itemId={updateItemId}
          onClose={() => setUpdateItemId(0)}
          onUpdated={() => void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-items'] })}
        />
      ) : null}
      {logsItemId > 0 ? (
        <Modal title="访问日志" onClose={() => setLogsItemId(0)} width="50em">
          <IpAccessLogsContent itemId={logsItemId} />
        </Modal>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 公用名单列表                                                        */
/* ------------------------------------------------------------------ */

interface ListsData {
  type: string
  keyword: string
  page: string
  lists: IpListRow[]
}

export function IpListListsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const type = searchParams.get('type') || 'black'
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [showCreate, setShowCreate] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-lists', type, searchParams.toString()],
    queryFn: () =>
      apiGet<ListsData>('/servers/iplists/lists', {
        type,
        keyword: searchParams.get('keyword') || '',
        page: searchParams.get('page') || 1,
      }),
  })

  const remove = useMutation({
    mutationFn: (listId: number) => apiPost('/servers/iplists/delete', { listId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-lists'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function deleteList(list: IpListRow) {
    if (!(await confirm({ message: '确定要删除此IP名单吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(list.id)
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: 'IP列表', href: '/servers/iplists' },
          { name: '黑名单', href: '/servers/iplists/lists?type=black', active: type === 'black' },
          { name: '白名单', href: '/servers/iplists/lists?type=white', active: type === 'white' },
          { name: '灰名单', href: '/servers/iplists/lists?type=grey', active: type === 'grey' },
        ]}
      >
        <span className="item disabled">|</span>
        <a className="item" href="" onClick={(event) => { event.preventDefault(); setShowCreate(true) }}>
          [创建名单]
        </a>
        <span className="item disabled">|</span>
        <span
          className="item"
          title="创建名单时可以选择“全局有效”就会成为全局有效名单，全局有效名单对所有网站自动生效；非全局有效名单可以在WAF策略里引用。黑名单：其中的IP将会被禁止访问。白名单：其中的IP将会自动放行，优先级高于黑名单。灰名单：其中的IP仅作为记录和观察使用。"
        >
          ?
        </span>
      </FirstMenu>

      <div className="ui info message">这里是公用的IP名单，可以在WAF策略里直接引用。</div>

      <div className="margin" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          const next = new URLSearchParams()
          next.set('type', type)
          if (keyword.trim()) {
            next.set('keyword', keyword.trim())
          }
          setSearchParams(next)
        }}
      >
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="IP名单名称、代号..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            &nbsp;
            {searchParams.get('keyword') ? (
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setKeyword('')
                  setSearchParams(new URLSearchParams({ type }))
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {data.lists.length === 0 ? <p className="comment">暂时还没有公用IP名单。</p> : null}

      {data.lists.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th className="one wide center">ID</th>
              <th className="three wide">IP名单名称</th>
              <th className="three wide">代号</th>
              <th className="two wide center">类型</th>
              <th>备注</th>
              <th className="two wide center">IP数量</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.lists.map((list) => (
              <tr key={list.id}>
                <td className="center">{list.id}</td>
                <td>
                  <a href={`/servers/iplists/list?listId=${list.id}`}>
                    <Keyword word={data.keyword}>{list.name}</Keyword>
                  </a>
                  {list.isGlobal ? (
                    <div style={{ marginTop: '0.3em' }}>
                      <span className="ui label basic grey tiny">全局</span>
                    </div>
                  ) : null}
                </td>
                <td>
                  {list.code ? <Keyword word={data.keyword}>{list.code}</Keyword> : <span className="disabled">-</span>}
                </td>
                <td className="center">
                  <IPTypeLabel type={list.type} />
                </td>
                <td>{list.description ? list.description : <span className="disabled">-</span>}</td>
                <td className="center">
                  {list.countItems > 0 ? (
                    <a href={`/servers/iplists/items?listId=${list.id}`}>{list.countItems}</a>
                  ) : (
                    <span className="disabled">0</span>
                  )}
                </td>
                <td>
                  <a href={`/servers/iplists/list?listId=${list.id}`}>详情</a> &nbsp;
                  <a href="" onClick={(event) => { event.preventDefault(); void deleteList(list) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {showCreate ? (
        <CreateListModal
          type={type}
          onClose={() => setShowCreate(false)}
          onCreated={(listType) => {
            void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-lists'] })
            navigate(`/servers/iplists/lists?type=${listType}`)
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 名单详情                                                            */
/* ------------------------------------------------------------------ */

export function IpListDetailPage() {
  const [searchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'ip-list', listId],
    enabled: listId > 0,
    queryFn: () => apiGet<{ list: IpListDetail }>('/servers/iplists/list', { listId }),
  })

  if (listId <= 0) {
    return <div className="ui negative message">请选择要查看的IP名单。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const list = query.data.list

  return (
    <div>
      <IpListMenu list={list} current="list" />
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">名称</td>
            <td>{list.name}</td>
          </tr>
          <tr>
            <td>ID</td>
            <td>{list.id}</td>
          </tr>
          <tr>
            <td>代号</td>
            <td>{list.code.length > 0 ? list.code : <span className="disabled">没有设置</span>}</td>
          </tr>
          <tr>
            <td>类型</td>
            <td>{list.typeName}</td>
          </tr>
          <tr>
            <td>全局有效</td>
            <td>{list.isGlobal ? <span className="green">Y</span> : <span className="disabled">N</span>}</td>
          </tr>
          <tr>
            <td>备注</td>
            <td>{list.description.length > 0 ? list.description : <span className="disabled">-</span>}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 名单中的IP                                                          */
/* ------------------------------------------------------------------ */

interface ListItemsData {
  keyword: string
  eventLevel: string
  list: IpListDetail
  page: string
  items: IpItemRow[]
  eventLevels: EventLevel[]
}

export function IpListItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [eventLevel, setEventLevel] = useState(searchParams.get('eventLevel') || '')
  const [showCreate, setShowCreate] = useState(false)
  const [updateItemId, setUpdateItemId] = useState(0)
  const [logsItemId, setLogsItemId] = useState(0)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list-items', listId, searchParams.toString()],
    enabled: listId > 0,
    queryFn: () =>
      apiGet<ListItemsData>('/servers/iplists/items', {
        listId,
        keyword: searchParams.get('keyword') || '',
        eventLevel: searchParams.get('eventLevel') || '',
        page: searchParams.get('page') || 1,
      }),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: number) => apiPost('/servers/iplists/deleteIP', { itemId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list-items'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (listId <= 0) {
    return <div className="ui negative message">请选择IP名单。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  function applyFilters() {
    const next = new URLSearchParams()
    next.set('listId', String(listId))
    if (keyword.trim()) {
      next.set('keyword', keyword.trim())
    }
    if (eventLevel) {
      next.set('eventLevel', eventLevel)
    }
    setSearchParams(next)
  }

  async function deleteItem(itemId: number) {
    if (!(await confirm({ message: '确定要删除这个IP吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    removeItem.mutate(itemId)
  }

  return (
    <div>
      <IpListMenu list={data.list} current="item" />
      <FirstMenu>
        <a className="item" href="" onClick={(event) => { event.preventDefault(); setShowCreate(true) }}>
          [创建IP]
        </a>
      </FirstMenu>

      <form className="ui form" onSubmit={(event) => { event.preventDefault(); applyFilters() }}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              size={20}
              placeholder="x.x.x.x"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}>
              <option value="">[级别]</option>
              {(data.eventLevels || eventLevels).map((level) => (
                <option key={level.code} value={level.code}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {keyword || eventLevel ? (
              <a
                href={`/servers/iplists/items?listId=${listId}`}
                onClick={(event) => {
                  event.preventDefault()
                  setKeyword('')
                  setEventLevel('')
                  setSearchParams(new URLSearchParams({ listId: String(listId) }))
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
        <div className="margin" />
      </form>

      {data.items.length === 0 ? <p className="comment">暂时还没有IP。</p> : null}

      <IpListTable
        items={data.items}
        keyword={data.keyword}
        deleteCountParams={{ keyword: data.keyword, eventLevel: data.eventLevel }}
        onUpdate={setUpdateItemId}
        onDelete={(itemId) => void deleteItem(itemId)}
        onViewLogs={setLogsItemId}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list-items'] })}
      />

      <LegacyPagination html={data.page} />

      {showCreate ? (
        <CreateIPModal
          listId={listId}
          listType={data.list.type}
          onClose={() => setShowCreate(false)}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list-items'] })}
        />
      ) : null}
      {updateItemId > 0 ? (
        <UpdateIPModal
          itemId={updateItemId}
          onClose={() => setUpdateItemId(0)}
          onUpdated={() => void queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list-items'] })}
        />
      ) : null}
      {logsItemId > 0 ? (
        <Modal title="访问日志" onClose={() => setLogsItemId(0)} width="50em">
          <IpAccessLogsContent itemId={logsItemId} />
        </Modal>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 修改名单                                                            */
/* ------------------------------------------------------------------ */

export function IpListUpdatePage() {
  const [searchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<IpListDetail | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list', listId],
    enabled: listId > 0,
    queryFn: () => apiGet<{ list: IpListDetail }>('/servers/iplists/update', { listId }),
  })

  if (query.data && !form) {
    setForm(query.data.list)
  }

  if (listId <= 0) {
    return <div className="ui negative message">请选择IP名单。</div>
  }
  if (query.isLoading || !query.data || !form) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const list = query.data.list

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/servers/iplists/update', {
        csrfToken: await getCsrfToken(),
        listId,
        name: form.name,
        code: form.code,
        type: form.type,
        description: form.description,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <IpListMenu list={list} current="update" />
      <form className="ui form" onSubmit={(event) => void submit(event)}>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">名称 *</td>
              <td>
                <input
                  type="text"
                  maxLength={100}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </td>
            </tr>
            <tr>
              <td>代号</td>
              <td>
                <input
                  type="text"
                  maxLength={100}
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                />
                <p className="comment">可选参数，只能是英文字母、数字、中划线、下划线的组合。</p>
              </td>
            </tr>
            <tr>
              <td>类型</td>
              <td>{list.typeName}</td>
            </tr>
            <tr>
              <td>备注</td>
              <td>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
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

/* ------------------------------------------------------------------ */
/* IP 检查                                                             */
/* ------------------------------------------------------------------ */

interface TestResult {
  isDone: boolean
  isFound: boolean
  isOk: boolean
  isAllowed: boolean
  error: string
  item?: {
    id: number
    value: string
    ipFrom: string
    ipTo: string
    reason: string
    expiredTime: string
    eventLevelName: string
    listType: string
  }
}

interface TestPageData {
  list: IpListDetail
}

export function IpListTestPage() {
  const [searchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const toast = useToast()
  const [ip, setIp] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list', listId],
    enabled: listId > 0,
    queryFn: () => apiGet<TestPageData>('/servers/iplists/test', { listId }),
  })

  if (listId <= 0) {
    return <div className="ui negative message">请选择IP名单。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const data = await apiPost<{ result: TestResult }>('/servers/iplists/test', {
        csrfToken: await getCsrfToken(),
        listId,
        ip,
      })
      setResult(data.result)
    } catch (error) {
      toast(error instanceof Error ? error.message : '检查失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <IpListMenu list={query.data.list} current="test" />
      <form className="ui form" onSubmit={(event) => void submit(event)}>
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
                  onChange={(event) => setIp(event.target.value)}
                />
                <p className="comment">要检查的IP</p>
              </td>
            </tr>
            <tr>
              <td>检查结果</td>
              <td>
                {result && result.isDone ? (
                  <div>
                    {!result.isOk ? (
                      <div>
                        <span className="red">{result.error}</span>
                      </div>
                    ) : null}
                    {result.isFound && result.item ? (
                      <div>
                        {result.item.listType === 'white' ? (
                          <span className="green">
                            在白名单中 {result.item.ipFrom}
                            {result.item.ipTo ? ` - ${result.item.ipTo}` : ''}
                          </span>
                        ) : result.item.listType === 'grey' ? (
                          <span className="grey">
                            在灰名单中 {result.item.ipFrom}
                            {result.item.ipTo ? ` - ${result.item.ipTo}` : ''}
                          </span>
                        ) : (
                          <span className="red">
                            在黑名单中 {result.item.ipFrom}
                            {result.item.ipTo ? ` - ${result.item.ipTo}` : ''}
                          </span>
                        )}
                        <div className="small grey">
                          级别：{result.item.eventLevelName || '-'}，过期时间：
                          {result.item.expiredTime || '不过期'}
                          {result.item.reason ? `，备注：${result.item.reason}` : ''}
                        </div>
                      </div>
                    ) : null}
                    {!result.isFound ? <div>没有找到和{ip}匹配的配置。</div> : null}
                  </div>
                ) : (
                  <span className="disabled">-</span>
                )}
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

/* ------------------------------------------------------------------ */
/* 导入 / 导出                                                         */
/* ------------------------------------------------------------------ */

export function IpListImportPage() {
  const [searchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list', listId],
    enabled: listId > 0,
    queryFn: () => apiGet<{ list: IpListDetail }>('/servers/iplists/import', { listId }),
  })

  if (listId <= 0) {
    return <div className="ui negative message">请选择IP名单。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      toast('请选择要导入的IP文件', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('csrfToken', await getCsrfToken())
      form.set('listId', String(listId))
      form.set('file', file)
      const data = await apiPostForm<{ count: number; countIgnore: number }>('/servers/iplists/import', form)
      let message = `成功导入${data.count}个IP`
      if (data.countIgnore > 0) {
        message += `，并忽略${data.countIgnore}个格式错误的IP`
      }
      toast(message)
      setFile(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <IpListMenu list={query.data.list} current="import" />
      <div className="margin" />
      <form className="ui form" onSubmit={(event) => void submit(event)}>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">选择IP文件 *</td>
              <td>
                <input
                  type="file"
                  accept=".xlsx, .json, .txt, .csv"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <p className="comment">
                  文件名类似于<span className="ui label tiny basic">ip-list-123.xxx</span>，支持Excel、CSV、JSON和纯文本TXT。
                </p>
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

export function IpListExportPage() {
  const [searchParams] = useSearchParams()
  const listId = Number(searchParams.get('listId') || 0) || 0
  const [format, setFormat] = useState('xlsx')

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list', listId],
    enabled: listId > 0,
    queryFn: () => apiGet<{ list: IpListDetail }>('/servers/iplists/export', { listId }),
  })

  if (listId <= 0) {
    return <div className="ui negative message">请选择IP名单。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <IpListMenu list={query.data.list} current="export" />
      <div className="margin" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          window.location.href = `/servers/iplists/exportData?listId=${listId}&format=${format}`
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">说明</td>
              <td>导出所有的IP，并以文件格式下载。注意v1.3.5版本及以后导出的数据不能在之前的版本中导入。</td>
            </tr>
            <tr>
              <td>格式</td>
              <td>
                <select className="ui dropdown auto-width" value={format} onChange={(event) => setFormat(event.target.value)}>
                  <option value="xlsx">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="txt">TXT</option>
                  <option value="json">JSON</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className="ui button primary" type="submit">
            导出
          </button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 选择公用IP名单                                                      */
/* ------------------------------------------------------------------ */

interface PublicListsData {
  lists: IpListRow[]
  page: string
}

export function IpListSelectPopupPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const listType = searchParams.get('type') || ''
  const toast = useToast()
  const query = useQuery({
    queryKey: ['servers-core', 'ip-list-select', searchParams.toString()],
    queryFn: () =>
      apiGet<PublicListsData>('/servers/iplists/selectPopup', {
        type: searchParams.get('type') || '',
        page: searchParams.get('page') || 1,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: '全部', href: '', active: !listType, onClick: () => setSearchParams({}) },
          { name: '黑名单', href: '', active: listType === 'black', onClick: () => setSearchParams({ type: 'black' }) },
          { name: '白名单', href: '', active: listType === 'white', onClick: () => setSearchParams({ type: 'white' }) },
          { name: '灰名单', href: '', active: listType === 'grey', onClick: () => setSearchParams({ type: 'grey' }) },
        ]}
      />
      <h3>选择公用IP名单</h3>
      <PublicIpListTable
        lists={query.data.lists}
        actionText="选择"
        onAction={(list) => toast(`已选择：${list.name}（ID: ${list.id}）`)}
      />
      <LegacyPagination html={query.data.page} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 绑定公用IP名单到WAF策略                                              */
/* ------------------------------------------------------------------ */

interface BindData {
  httpFirewallPolicyId: number
  lists: (IpListRow & { isSelected: boolean })[]
  page: string
}

export function IpListBindFirewallPopupPage() {
  const [searchParams] = useSearchParams()
  const httpFirewallPolicyId = Number(searchParams.get('httpFirewallPolicyId') || 0) || 0
  const toast = useToast()
  const queryClient = useQueryClient()
  const [bound, setBound] = useState<Record<number, boolean>>({})

  const query = useQuery({
    queryKey: ['servers-core', 'ip-list-bind', httpFirewallPolicyId, searchParams.toString()],
    enabled: httpFirewallPolicyId > 0,
    queryFn: () =>
      apiGet<BindData>('/servers/iplists/bindHTTPFirewallPopup', {
        httpFirewallPolicyId,
        type: searchParams.get('type') || 'black',
        page: searchParams.get('page') || 1,
      }),
  })

  if (httpFirewallPolicyId <= 0) {
    return <div className="ui negative message">请指定要绑定的WAF策略。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  async function bind(list: IpListRow) {
    try {
      await apiPost('/servers/iplists/bindHTTPFirewallPopup', { httpFirewallPolicyId, listId: list.id })
      setBound((current) => ({ ...current, [list.id]: true }))
      toast('绑定成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '绑定失败', 'error')
    }
  }

  async function unbind(list: IpListRow) {
    try {
      await apiPost('/servers/iplists/unbindHTTPFirewall', { httpFirewallPolicyId, listId: list.id })
      setBound((current) => ({ ...current, [list.id]: false }))
      toast('取消绑定成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ip-list-bind'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <div>
      <h3>绑定公用IP名单</h3>
      <PublicIpListTable
        lists={data.lists.map((list) => ({ ...list, isSelected: bound[list.id] ?? list.isSelected }))}
        actionText="绑定"
        actionFor={(list) => (list.isSelected ? '已绑定' : '绑定')}
        onAction={(list) => void (list.isSelected ? unbind(list) : bind(list))}
      />
      <LegacyPagination html={data.page} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* IP访问日志                                                          */
/* ------------------------------------------------------------------ */

export function IpListAccessLogsPopupPage() {
  const [searchParams] = useSearchParams()
  const itemId = Number(searchParams.get('itemId') || 0) || 0
  const query = useQuery({
    queryKey: ['servers-core', 'ip-access-logs-page', itemId],
    enabled: itemId > 0,
    queryFn: () => apiGet<AccessLogsPopupData>('/servers/iplists/accessLogsPopup', { itemId }),
  })

  if (itemId <= 0) {
    return <div className="ui negative message">请选择要查看的IP。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  return (
    <div>
      <h3>
        访问日志
        <span className="grey">
          （{query.data.ipFrom}
          {query.data.ipTo.length > 0 ? ` - ${query.data.ipTo}` : ''}）
        </span>
      </h3>
      <IpAccessLogsContent itemId={itemId} />
    </div>
  )
}
