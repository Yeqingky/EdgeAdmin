import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { PageHeader } from '../../components/PageHeader'
import { StatusLabel } from '../../components/StatusLabel'
import { LocationLabels } from './LocationLabels'
import { ServerSettingsBreadcrumb, ServerSettingsLeftMenu } from './LocationShell'
import { spaLink, type LeftMenuData, type LocationListItem } from './types'

interface LocationsData extends LeftMenuData {
  webId: number
  locations: LocationListItem[]
}

export function LocationsIndexPage({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [items, setItems] = useState<LocationListItem[]>([])
  const [draggingIndex, setDraggingIndex] = useState(-1)

  const query = useQuery({
    queryKey: ['server-locations', serverId],
    queryFn: () =>
      apiGet<LocationsData>('/servers/server/settings/locations', {
        serverId,
      }),
  })

  useEffect(() => {
    if (query.data) {
      setItems(query.data.locations || [])
    }
  }, [query.data])

  const remove = useMutation({
    mutationFn: (locationId: number) =>
      apiPost('/servers/server/settings/locations/delete', {
        webId: query.data?.webId ?? 0,
        locationId,
      }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['server-locations', serverId] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  async function deleteLocation(locationId: number) {
    if (!(await confirm({ message: '确定要删除此路由规则吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(locationId)
  }

  async function saveOrder(nextItems: LocationListItem[]) {
    if (!query.data) {
      return
    }
    const search = nextItems.map((item) => `locationIds=${item.id}`).join('&')
    try {
      await apiPost(`/servers/server/settings/locations/sort?webId=${query.data.webId}&${search}`)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  function dropOn(targetIndex: number) {
    if (draggingIndex < 0 || draggingIndex === targetIndex) {
      setDraggingIndex(-1)
      return
    }
    const next = items.slice()
    const [moved] = next.splice(draggingIndex, 1)
    next.splice(targetIndex, 0, moved)
    setItems(next)
    setDraggingIndex(-1)
    void saveOrder(next)
  }

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <div>
      <ServerSettingsBreadcrumb serverId={serverId} server={data.server} />
      <div className="margin" />
      <ServerSettingsLeftMenu items={data.leftMenuItems} disabled={data.leftMenuItemIsDisabled} />
      <div className="right-box">
        <PageHeader
          items={[
            { name: '列表', active: true },
            { name: '创建', href: spaLink(`/servers/server/settings/locations/create?serverId=${serverId}`) },
          ]}
        />

        {items.length === 0 ? <p className="comment">暂时还没有路由规则。</p> : null}

        {items.length > 0 ? (
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '1em' }} />
                <th>匹配规则</th>
                <th className="two wide">匹配类型</th>
                <th className="two wide">状态</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            {items.map((location, index) => (
              <tbody
                key={location.id}
                draggable
                onDragStart={() => setDraggingIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(index)}
              >
                <tr>
                  <td>
                    <span className="handle" style={{ cursor: 'move', color: '#999' }}>
                      <GripVertical size={14} />
                    </span>
                  </td>
                  <td>
                    <a href={spaLink(`/servers/server/settings/locations/location?serverId=${serverId}&locationId=${location.id}`)}>
                      {location.pattern}
                    </a>
                    <LocationLabels location={location} serverId={serverId} />
                  </td>
                  <td>{location.patternTypeName}</td>
                  <td>
                    <StatusLabel isOn={location.isOn} />
                  </td>
                  <td>
                    <a href={spaLink(`/servers/server/settings/locations/location?serverId=${serverId}&locationId=${location.id}`)}>详情</a>{' '}
                    &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteLocation(location.id)
                      }}
                    >
                      删除
                    </a>{' '}
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        ) : null}

        {items.length > 0 ? (
          <p className="comment">拖动左侧的
            <GripVertical size={12} style={{ verticalAlign: 'middle' }} />
            图标可以对路由规则进行排序。
          </p>
        ) : null}
      </div>
    </div>
  )
}
