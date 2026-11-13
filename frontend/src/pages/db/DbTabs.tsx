export function DbTabs({ nodeId, active }: { nodeId?: number; active: 'index' | 'node' | 'update' | 'clean' | 'log' }) {
  const items = nodeId
    ? [
        { code: 'node', name: '节点详情', url: `/db/node?nodeId=${nodeId}` },
        { code: 'update', name: '修改节点', url: `/db/update?nodeId=${nodeId}` },
        { code: 'clean', name: '清理数据', url: `/db/clean?nodeId=${nodeId}` },
        { code: 'log', name: '节点日志', url: `/db/logs?nodeId=${nodeId}` },
      ]
    : [{ code: 'index', name: '数据库节点', url: '/db' }]
  return (
    <div className="ui menu text blue first-menu">
      {items.map((item) => (
        <a key={item.code} className={`item${item.code === active ? ' active' : ''}`} href={`${item.url}`}>{item.name}</a>
      ))}
    </div>
  )
}
