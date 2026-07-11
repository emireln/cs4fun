const KEY = 'cs4fun_last_match_log_v1'

/** Store last live match log for “Watch last” replay from history. */
export function saveLastMatchLog(payload) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readLastMatchLog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
