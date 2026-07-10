/** Client-side avatar compress — keeps data URLs small for localStorage / profiles.avatar_url */

export const MAX_AVATAR_DATA_URL_CHARS = 72_000
const MAX_SIDE = 256
const MAX_INPUT_BYTES = 8 * 1024 * 1024
const AVATAR_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function sanitizeAvatarUrl(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  if (value.length > MAX_AVATAR_DATA_URL_CHARS) return null
  if (!AVATAR_DATA_URL_RE.test(value)) return null
  return value
}

/**
 * @param {File} file
 * @returns {Promise<string>} JPEG data URL
 */
export function compressAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('invalid_type'))
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error('too_large'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      try {
        const side = Math.max(img.width, img.height)
        const scale = Math.min(1, MAX_SIDE / side)
        let w = Math.max(1, Math.round(img.width * scale))
        let h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('load_failed'))
          return
        }

        const encode = (width, height, quality) => {
          canvas.width = width
          canvas.height = height
          ctx.fillStyle = '#0a0c10'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          return canvas.toDataURL('image/jpeg', quality)
        }

        let quality = 0.82
        let dataUrl = encode(w, h, quality)
        while (dataUrl.length > MAX_AVATAR_DATA_URL_CHARS && quality > 0.45) {
          quality -= 0.12
          dataUrl = encode(w, h, quality)
        }
        if (dataUrl.length > MAX_AVATAR_DATA_URL_CHARS) {
          w = Math.max(1, Math.round(w * 0.7))
          h = Math.max(1, Math.round(h * 0.7))
          dataUrl = encode(w, h, 0.7)
        }
        if (dataUrl.length > MAX_AVATAR_DATA_URL_CHARS) {
          reject(new Error('too_large'))
          return
        }
        resolve(dataUrl)
      } catch {
        reject(new Error('load_failed'))
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('load_failed'))
    }

    img.src = objectUrl
  })
}
