import { useState } from 'react'
import { getMapAsset } from '../data/maps'
import { useI18n } from '../i18n'

export default function MapThumb({
  name,
  variant = 'thumb', // thumb | icon | radar
  className = '',
  overlay = null,
  banned = false,
  selected = false,
}) {
  const { t } = useI18n()
  const asset = getMapAsset(name)
  const src = asset[variant] || asset.thumb || asset.icon
  const [ok, setOk] = useState(true)

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${
        banned
          ? 'border-cs-loss/40 opacity-60'
          : selected
            ? 'border-cs-gold/60 ring-1 ring-cs-gold/30'
            : 'border-cs-border'
      } ${className}`}
    >
      {src && ok ? (
        <img
          src={src}
          alt={name}
          className={`absolute inset-0 h-full w-full max-h-none object-cover object-center ${banned ? 'grayscale' : ''}`}
          style={{ height: '100%' }}
          onError={() => setOk(false)}
        />
      ) : (
        <div
          className="absolute inset-0 flex min-h-[72px] w-full items-center justify-center"
          style={{ background: `linear-gradient(145deg, ${asset.accent}44, #11151c)` }}
        >
          <span className="font-display text-sm font-bold text-cs-text">{name}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-[1] p-2">
        <span
          className={`font-display text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
            banned ? 'text-cs-loss line-through' : 'text-white'
          }`}
        >
          {name}
        </span>
        {overlay ? <div className="mt-1">{overlay}</div> : null}
      </div>
      {banned && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/40">
          <span className="rotate-[-12deg] font-display text-sm font-bold tracking-widest text-cs-loss">
            {t('veto.ban')}
          </span>
        </div>
      )}
    </div>
  )
}
