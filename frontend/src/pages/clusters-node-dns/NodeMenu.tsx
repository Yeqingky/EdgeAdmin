import { Link } from 'react-router-dom'
import { useSession } from '../../api/session'
import type { NodeBase } from './shared'

export type NodeMenuActive = 'node' | 'log' | 'install' | 'update'

export function NodeMenu({ clusterId, node, active }: { clusterId: number; node: NodeBase; active: NodeMenuActive }) {
  const session = useSession()
  const isPlus = session.data?.teaIsPlus ?? false
  const base = `/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`

  const items: { name: string; to: string; active: boolean; hidden?: boolean }[] = [
    { name: '节点详情', to: `/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${node.id}`, active: active === 'node', hidden: !isPlus },
    { name: '节点看板', to: `/clusters/cluster/node/boards?clusterId=${clusterId}&nodeId=${node.id}`, active: false, hidden: isPlus },
    { name: '节点详情', to: `/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${node.id}`, active: active === 'node', hidden: isPlus },
    { name: '运行日志', to: `/clusters/cluster/node/logs?clusterId=${clusterId}&nodeId=${node.id}`, active: active === 'log' },
    { name: '安装节点', to: `/clusters/cluster/node/install?clusterId=${clusterId}&nodeId=${node.id}`, active: active === 'install' },
    { name: '节点设置', to: `/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${node.id}`, active: active === 'update' },
  ]

  return (
    <div className="ui menu text blue first-menu">
      <Link className="item" to={`/clusters/cluster/nodes?clusterId=${clusterId}`}>
        {node.group ? node.group.name : '所有节点'}
      </Link>
      <span className="item">»</span>
      <Link className="item" to={base}>
        {node.name}
        {node.level > 1 ? (
          <sup>
            &nbsp;<span className="blue">L{node.level}</span>
          </sup>
        ) : null}
      </Link>
      <span className="item">»</span>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <Link key={`${item.name}-${item.to}`} className={`item${item.active ? ' active' : ''}`} to={item.to}>
            {item.name}
          </Link>
        ))}
    </div>
  )
}
