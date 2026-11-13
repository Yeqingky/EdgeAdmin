export function AdminTabs({ adminId, active }: { adminId: number; active: 'index' | 'update' | 'accessKey' }) {
  const items = [
    { code: 'index', name: '管理员详情', url: `/admins/admin?adminId=${adminId}` },
    { code: 'update', name: '修改管理员', url: `/admins/update?adminId=${adminId}` },
    { code: 'accessKey', name: 'AccessKey', url: `/admins/accesskeys?adminId=${adminId}` },
  ] as const
  return (
    <div className="ui menu text blue first-menu">
      {items.map((item) => (
        <a key={item.code} className={`item${item.code === active ? ' active' : ''}`} href={`${item.url}`}>{item.name}</a>
      ))}
    </div>
  )
}
