export function StatusLabel({ isOn }: { isOn: boolean }) {
  return isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>
}
