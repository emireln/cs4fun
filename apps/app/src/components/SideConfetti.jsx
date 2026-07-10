import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#e8c547', '#f0d878', '#f5f0e1', '#c9a227', '#ffe08a', '#ffffff']

function makePieces(side, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${side}-${i}`,
    side,
    left: side === 'left' ? 2 + Math.random() * 10 : undefined,
    right: side === 'right' ? 2 + Math.random() * 10 : undefined,
    bottom: 4 + Math.random() * 28,
    size: 4 + Math.random() * 7,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 1.4,
    duration: 2.4 + Math.random() * 1.8,
    drift: (side === 'left' ? 1 : -1) * (12 + Math.random() * 36),
    rise: 120 + Math.random() * 180,
    rotate: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    round: Math.random() > 0.55,
    repeatDelay: 0.6 + Math.random() * 1.2,
  }))
}

/** Gold confetti rising from both sides, then fading out. */
export default function SideConfetti({ pieces = 18 }) {
  const items = useMemo(
    () => [...makePieces('left', pieces), ...makePieces('right', pieces)],
    [pieces],
  )

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      aria-hidden
    >
      {items.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{
            left: p.left != null ? `${p.left}%` : undefined,
            right: p.right != null ? `${p.right}%` : undefined,
            bottom: `${p.bottom}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.55,
            borderRadius: p.round ? '50%' : 1,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}55`,
          }}
          initial={{ opacity: 0, y: 24, x: 0, rotate: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [24, -p.rise * 0.45, -p.rise],
            x: [0, p.drift * 0.4, p.drift],
            rotate: [0, p.rotate * 0.5, p.rotate],
            scale: [0.6, 1, 0.85],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
            times: [0, 0.2, 0.7, 1],
            repeat: Infinity,
            repeatDelay: p.repeatDelay,
          }}
        />
      ))}
    </div>
  )
}
