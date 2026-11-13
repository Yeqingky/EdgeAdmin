export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}

export function formatBytes(bytes: number): string {
  if (!bytes) {
    return '0B'
  }
  const units = ['B', 'K', 'M', 'G', 'T', 'P']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${Math.round(value * 100) / 100}${units[unit]}`
}

export function splitBytes(bytes: number): { value: string; unit: string } {
  if (!bytes) {
    return { value: '0', unit: 'B' }
  }
  const units = ['B', 'K', 'M', 'G', 'T', 'P']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return { value: String(Math.round(value * 100) / 100), unit: units[unit] }
}
