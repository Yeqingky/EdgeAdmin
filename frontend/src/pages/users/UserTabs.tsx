export function UserTabs({ userId, active }: { userId: number; active: 'index' | 'update' | 'feature' | 'accessKey' }) {
  const items = [
    { code: 'index', name: '用户详情', url: `/users/user?userId=${userId}` },
    { code: 'update', name: '修改用户', url: `/users/update?userId=${userId}` },
    { code: 'feature', name: '功能设置', url: `/users/features?userId=${userId}` },
    { code: 'accessKey', name: 'AccessKey', url: `/users/accesskeys?userId=${userId}` },
  ] as const
  return (
    <div className="ui menu text blue first-menu">
      {items.map((item) => (
        <a key={item.code} className={`item${item.code === active ? ' active' : ''}`} href={`#${item.url}`}>
          {item.name}
        </a>
      ))}
    </div>
  )
}
