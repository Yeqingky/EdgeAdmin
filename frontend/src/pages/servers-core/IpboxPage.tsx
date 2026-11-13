import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { AccessLogDetailModal, AccessLogList, FirstMenu, type AccessLog } from './common'

interface IpListMembership {
  id: number
  name: string
  type: string
  itemExpiredTime: string
  itemId: number
}

interface PublicBlackList {
  id: number
  name: string
  type: string
}

interface IpboxData {
  ip: string
  regions: string
  isp: string
  ipLists: IpListMembership[]
  publicBlackIPLists: PublicBlackList[]
  accessLogs: AccessLog[]
}

function toDatetimeLocal(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function IpboxPage() {
  const [searchParams] = useSearchParams()
  const ip = searchParams.get('ip') || ''
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [blackListsVisible, setBlackListsVisible] = useState(false)
  const [expiredAt, setExpiredAt] = useState(() => toDatetimeLocal(Math.floor(Date.now() / 1000) + 86400))
  const [detailRequestId, setDetailRequestId] = useState('')

  const query = useQuery({
    queryKey: ['servers-core', 'ipbox', ip],
    enabled: ip.length > 0,
    queryFn: () => apiGet<IpboxData>('/servers/ipbox', { ip }),
  })

  const addIP = useMutation({
    mutationFn: (listId: number) =>
      apiPost('/servers/ipbox/addIP', {
        listId,
        ip,
        expiredAt: Math.floor(new Date(expiredAt).getTime() / 1000),
      }),
    onSuccess: async () => {
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ipbox'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const deleteFromList = useMutation({
    mutationFn: (payload: { listId: number; itemId: number }) =>
      apiPost('/servers/ipbox/deleteFromList', payload),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'ipbox'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (!ip) {
    return <div className="ui negative message">请指定要查询的IP地址.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const joinedListIds = data.ipLists.map((item) => item.id)
  const availableLists = data.publicBlackIPLists.filter((list) => !joinedListIds.includes(list.id))

  async function addToList(list: PublicBlackList) {
    if (!(await confirm({ message: `确定要将此IP添加到黑名单'${list.name}'吗?` }))) {
      return
    }
    addIP.mutate(list.id)
  }

  async function removeFromList(membership: IpListMembership) {
    if (!(await confirm({ message: '确定要从此名单中删除此IP吗?', danger: true, confirmText: '删除' }))) {
      return
    }
    deleteFromList.mutate({ listId: membership.id, itemId: membership.itemId })
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: '网站列表', href: '/servers' },
          { name: 'IP列表', href: '/servers/iplists' },
        ]}
      >
        <span className="item disabled">|</span>
        <span className="item active">IP最近访问日志({data.ip})</span>
      </FirstMenu>

      <table className="ui table definition celled selectable">
        <tbody>
          <tr>
            <td className="title">IP</td>
            <td>{data.ip}</td>
            <td className="title">区域</td>
            <td>{data.regions ? data.regions : <span className="disabled">-</span>}</td>
            <td className="title">ISP</td>
            <td>{data.isp ? data.isp : <span className="disabled">-</span>}</td>
          </tr>
          <tr>
            <td>所在IP名单</td>
            <td colSpan={5}>
              {data.ipLists.length > 0 ? (
                data.ipLists.map((membership) => (
                  <span key={membership.id} className="ui label basic small" style={{ marginBottom: '0.5em' }}>
                    {membership.name}
                    {membership.itemExpiredTime.length === 0 ? (
                      <span className="grey small">(不过期)</span>
                    ) : (
                      <span className="grey small">(有效至:{membership.itemExpiredTime})</span>
                    )}
                    <a
                      href=""
                      title="删除"
                      style={{ marginLeft: '0.4em' }}
                      onClick={(event) => {
                        event.preventDefault()
                        void removeFromList(membership)
                      }}
                    >
                      ×
                    </a>
                  </span>
                ))
              ) : (
                <span className="disabled">暂时未在任何名单.</span>
              )}
              &nbsp; &nbsp;
              {data.publicBlackIPLists.length > 0 ? (
                <div>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setBlackListsVisible(!blackListsVisible)
                    }}
                  >
                    {blackListsVisible ? '收起' : '展开'} 加入到
                    {data.ipLists.length > 0 ? '其他' : ''}黑名单
                  </a>
                </div>
              ) : null}
            </td>
          </tr>
          {blackListsVisible ? (
            <tr>
              <td>加入黑名单</td>
              <td colSpan={5}>
                <table className="ui table">
                  <tbody>
                    <tr>
                      <td className="title">过期时间</td>
                      <td>
                        <input
                          type="datetime-local"
                          value={expiredAt}
                          onChange={(event) => setExpiredAt(event.target.value)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>选择名单 *</td>
                      <td>
                        {availableLists.length === 0 ? (
                          <span className="disabled">当前IP已经在所有黑名单中.</span>
                        ) : (
                          availableLists.map((list) => (
                            <a
                              key={list.id}
                              className="ui label basic small"
                              href=""
                              style={{ marginTop: '0.3em' }}
                              onClick={(event) => {
                                event.preventDefault()
                                void addToList(list)
                              }}
                            >
                              {list.name}
                            </a>
                          ))
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <AccessLogList
        accessLogs={data.accessLogs || []}
        onShowDetail={setDetailRequestId}
      />

      {detailRequestId ? (
        <AccessLogDetailModal requestId={detailRequestId} onClose={() => setDetailRequestId('')} />
      ) : null}
    </div>
  )
}
