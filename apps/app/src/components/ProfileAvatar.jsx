import { getAvatar, AVATAR_ICONS } from '../data/avatars'
import {
  Trophy,
  Crown,
  Gamepad2,
  Flame,
  Medal,
  Swords,
  Zap,
  Calendar,
  Users,
  Star,
  BookOpen,
  Award,
  Crosshair,
  Target,
  Dices,
  Rocket,
  Gem,
  Skull,
  Mountain,
  Sun,
  PartyPopper,
  Handshake,
  Sparkles,
  Package,
} from 'lucide-react'

const BADGE_ICONS = {
  crosshair: Crosshair,
  target: Target,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  gamepad: Gamepad2,
  dices: Dices,
  rocket: Rocket,
  award: Award,
  gem: Gem,
  swords: Swords,
  skull: Skull,
  zap: Zap,
  flame: Flame,
  mountain: Mountain,
  sun: Sun,
  calendar: Calendar,
  party: PartyPopper,
  package: Package,
  users: Users,
  star: Star,
  book: BookOpen,
  handshake: Handshake,
  sparkles: Sparkles,
}

const SIZE_MAP = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
}

const ICON_CLASS = {
  sm: 'h-[55%] w-[55%]',
  md: 'h-[52%] w-[52%]',
  lg: 'h-[48%] w-[48%]',
  xl: 'h-[46%] w-[46%]',
}

const BADGE_SIZE = {
  sm: 'h-4 w-4 -right-0.5 -top-0.5',
  md: 'h-5 w-5 -right-1 -top-1',
  lg: 'h-7 w-7 -right-1 -top-1',
  xl: 'h-8 w-8 -right-1.5 -top-1.5',
}

export default function ProfileAvatar({
  avatarId = 'cs4fun',
  avatarUrl = null,
  showcaseBadge = null,
  badgeIcon = 'award',
  ultra = false,
  size = 'md',
  className = '',
  frameId = null,
  ringId = null,
}) {
  const avatar = getAvatar(avatarId)
  const BadgeIcon = BADGE_ICONS[badgeIcon] || Award
  const hasPhoto = Boolean(avatarUrl)
  const highlighted = Boolean(ultra)
  const LucideIcon = avatar.kind === 'icon' ? AVATAR_ICONS[avatar.icon] : null

  const frameClass =
    frameId === 'frame_gold'
      ? 'border-cs-gold shadow-[0_0_16px_rgba(232,197,71,0.45)]'
      : frameId === 'frame_fire'
        ? 'border-orange-400 shadow-[0_0_16px_rgba(251,146,60,0.45)]'
        : frameId === 'frame_weekly'
          ? 'border-emerald-400/80 shadow-[0_0_14px_rgba(52,211,153,0.35)]'
          : null

  const ringClass =
    ringId === 'ring_ember'
      ? 'ring-2 ring-orange-400/70 ring-offset-1 ring-offset-[#0a0c10]'
      : ringId === 'ring_case'
        ? 'ring-2 ring-cs-gold/70 ring-offset-1 ring-offset-[#0a0c10]'
        : ''

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {highlighted && (
        <span
          className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-br from-cs-gold via-amber-200/40 to-cs-gold opacity-80 blur-[2px] animate-pulse"
          aria-hidden
        />
      )}
      <div
        className={`${SIZE_MAP[size] || SIZE_MAP.md} relative flex items-center justify-center overflow-hidden rounded-full border-2 ${
          frameClass ||
          (highlighted
            ? 'border-cs-gold shadow-[0_0_18px_rgba(232,197,71,0.55),0_0_4px_rgba(232,197,71,0.9)] ring-2 ring-cs-gold/35 ring-offset-1 ring-offset-[#0a0c10]'
            : 'border-cs-gold/40 shadow-[0_0_20px_rgba(232,197,71,0.15)]')
        } ${ringClass}`}
        style={{ background: hasPhoto ? '#0a0c10' : avatar.bg }}
      >
        {hasPhoto ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : avatar.kind === 'brand' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 128 128"
            fill="none"
            className="h-[72%] w-[72%]"
            aria-hidden
          >
            <circle cx="64" cy="64" r="38" stroke="#E8EDF5" strokeWidth="5" />
            <path
              d="M64 18v20M64 90v20M18 64h20M90 64h20"
              stroke="#E8EDF5"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path d="M64 52l12 12-12 12-12-12 12-12z" fill="#E8C547" />
          </svg>
        ) : LucideIcon ? (
          <LucideIcon
            className={ICON_CLASS[size] || ICON_CLASS.md}
            color={avatar.accent}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : null}
      </div>
      {showcaseBadge && (
        <div
          className={`absolute z-[1] ${BADGE_SIZE[size] || BADGE_SIZE.md} flex items-center justify-center rounded-full border ${
            showcaseBadge === 'completionist'
              ? 'border-cs-gold bg-cs-gold text-black shadow-[0_0_10px_rgba(232,197,71,0.7)]'
              : 'border-cs-gold/60 bg-[#0a0c10] text-cs-gold shadow-md'
          }`}
          title={showcaseBadge}
        >
          <BadgeIcon className="h-[60%] w-[60%]" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}

export { BADGE_ICONS }
