import { SettingsTabs } from '../settings-admin/common'

export function DbTabs({ nodeId, active }: { nodeId?: number; active: 'index' | 'node' | 'update' | 'clean' | 'log' }) {
  return (
    <div>
      <SettingsTabs kind="advanced" active="dbNodes" />
      <div className="ui menu text blue first-menu">
        <a className={`item${active === 'index' ? ' active' : ''}`} href="/db">
          所有节点
        </a>
        {nodeId ? <span className="disabled item">|</span> : null}
        {nodeId ? (
          <>
            <a className={`item${active === 'node' ? ' active' : ''}`} href={`/db/node?nodeId=${nodeId}`}>
              详情
            </a>
            <a className={`item${active === 'clean' ? ' active' : ''}`} href={`/db/clean?nodeId=${nodeId}`}>
              清理
            </a>
            <a className={`item${active === 'log' ? ' active' : ''}`} href={`/db/logs?nodeId=${nodeId}`}>
              运行日志
            </a>
            <a className={`item${active === 'update' ? ' active' : ''}`} href={`/db/update?nodeId=${nodeId}`}>
              修改
            </a>
          </>
        ) : null}
      </div>
    </div>
  )
}
