/** Official CS2 map assets (Valve icons/thumbs mirrored from game depot). */
const BASE = 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images'

export const MAP_ASSETS = {
  Mirage: {
    code: 'de_mirage',
    icon: `${BASE}/de_mirage.png`,
    thumb: `${BASE}/thumbs/de_mirage_1_png.png`,
    radar: `${BASE}/radars/de_mirage_radar_psd.png`,
    accent: '#c4a574',
  },
  Inferno: {
    code: 'de_inferno',
    icon: `${BASE}/de_inferno.png`,
    thumb: `${BASE}/thumbs/de_inferno_1_png.png`,
    radar: `${BASE}/radars/de_inferno_radar_psd.png`,
    accent: '#d4784a',
  },
  Nuke: {
    code: 'de_nuke',
    icon: `${BASE}/de_nuke.png`,
    thumb: `${BASE}/thumbs/de_nuke_1_png.png`,
    radar: `${BASE}/radars/de_nuke_radar_psd.png`,
    accent: '#7a9bb8',
  },
  Ancient: {
    code: 'de_ancient',
    icon: `${BASE}/de_ancient.png`,
    thumb: `${BASE}/thumbs/de_ancient_1_png.png`,
    radar: `${BASE}/radars/de_ancient_radar_psd.png`,
    accent: '#6b8f71',
  },
  Anubis: {
    code: 'de_anubis',
    icon: `${BASE}/de_anubis.png`,
    thumb: `${BASE}/thumbs/de_anubis_1_png.png`,
    radar: `${BASE}/radars/de_anubis_radar_psd.png`,
    accent: '#c9a227',
  },
  Dust2: {
    code: 'de_dust2',
    icon: `${BASE}/de_dust2.png`,
    thumb: `${BASE}/thumbs/de_dust2_1_png.png`,
    radar: `${BASE}/radars/de_dust2_radar_psd.png`,
    accent: '#d4b56a',
  },
  Overpass: {
    code: 'de_overpass',
    icon: `${BASE}/de_overpass.png`,
    thumb: `${BASE}/thumbs/de_overpass_1_png.png`,
    radar: `${BASE}/radars/de_overpass_radar_psd.png`,
    accent: '#6a8f9e',
  },
  Cache: {
    code: 'de_cache',
    icon: `${BASE}/de_cache.png`,
    thumb: `${BASE}/thumbs/de_cache_1_png.png`,
    radar: `${BASE}/radars/de_cache_radar_psd.png`,
    accent: '#7a9e6a',
  },
  Vertigo: {
    code: 'de_vertigo',
    icon: `${BASE}/de_vertigo.png`,
    thumb: `${BASE}/thumbs/de_vertigo_1_png.png`,
    radar: `${BASE}/radars/de_vertigo_radar_psd.png`,
    accent: '#8a9bb0',
  },
  Train: {
    code: 'de_train',
    icon: `${BASE}/de_train.png`,
    thumb: `${BASE}/thumbs/de_train_1_png.png`,
    radar: `${BASE}/radars/de_train_radar_psd.png`,
    accent: '#9aa3ad',
  },
}

export function getMapAsset(name) {
  return MAP_ASSETS[name] || {
    code: `de_${(name || 'unknown').toLowerCase()}`,
    icon: null,
    thumb: null,
    radar: null,
    accent: '#e8c547',
  }
}
