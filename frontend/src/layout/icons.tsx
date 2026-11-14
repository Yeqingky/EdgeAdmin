import {
  Bell,
  Boxes,
  Cpu,
  Database,
  FileText,
  Folder,
  Gauge,
  Globe,
  Key,
  LayoutDashboard,
  MapPin,
  Network,
  ScrollText,
  Server,
  Settings,
  Shield,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const iconsByCode: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  servers: Server,
  clusters: Network,
  users: Users,
  dns: Globe,
  nodes: Cpu,
  db: Database,
  log: ScrollText,
  messages: Bell,
  settings: Settings,
  admins: Shield,
  files: Folder,
  finance: Wallet,
  plans: FileText,
  gauge: Gauge,
}

export function menuIcon(code: string): LucideIcon {
  return iconsByCode[code] || Boxes
}

const subItemIcons: Record<string, LucideIcon> = {
  boxes: Boxes,
  'file-text': FileText,
  key: Key,
  'map-pin': MapPin,
  server: Server,
}

export function subItemIcon(name?: string): LucideIcon | null {
  if (!name) {
    return null
  }
  return subItemIcons[name] || null
}
