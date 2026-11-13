import { SettingsTabs } from '../common'

function RetiredPlaceholder() {
  return <p className="comment">此功能暂未开放,敬请期待.</p>
}

export function BackupSettingsPage() {
  return (
    <div>
      <SettingsTabs kind="advanced" active="backup" />
      <RetiredPlaceholder />
    </div>
  )
}

export function UpgradeSettingsPage() {
  return (
    <div>
      <SettingsTabs kind="basic" active="upgrade" />
      <RetiredPlaceholder />
    </div>
  )
}

export function AboutQQPage() {
  return (
    <div>
      <h3>关于</h3>
      <p className="comment">QQ群信息已下线,如需帮助请访问项目主页.</p>
    </div>
  )
}
