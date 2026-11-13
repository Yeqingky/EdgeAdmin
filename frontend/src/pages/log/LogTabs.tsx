export function LogTabs({ active }: { active: 'list' | 'setting' | 'clean' }) {
  const items = [
    { code: 'list', name: '操作日志', url: '/log' },
    { code: 'setting', name: '日志设置', url: '/log/settings' },
    { code: 'clean', name: '清理日志', url: '/log/clean' },
  ] as const
  return (
    <div className="ui menu text blue first-menu">
      {items.map((item) => (
        <a key={item.code} className={`item${item.code === active ? ' active' : ''}`} href={`#${item.url}`}>{item.name}</a>
      ))}
    </div>
  )
}
