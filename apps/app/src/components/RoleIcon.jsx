import { Crosshair, Crown, Eye, Shield, Zap } from 'lucide-react'

const ICONS = { Crown, Crosshair, Zap, Eye, Shield }

export default function RoleIcon({ name, className = 'w-4 h-4' }) {
  const Icon = ICONS[name] || Crosshair
  return <Icon className={className} strokeWidth={2} />
}
