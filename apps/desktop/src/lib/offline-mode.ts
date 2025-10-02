const OFFLINE_MODE_KEY = 'conar.offline_mode'
const OFFLINE_MODE_DONT_ASK_KEY = 'conar.offline_mode_dont_ask'

export const offlineMode = {
  get: () => localStorage.getItem(OFFLINE_MODE_KEY) === 'true',
  set: (enabled: boolean) => localStorage.setItem(OFFLINE_MODE_KEY, String(enabled)),
  remove: () => localStorage.removeItem(OFFLINE_MODE_KEY),
}

export const offlineModeDontAsk = {
  get: () => localStorage.getItem(OFFLINE_MODE_DONT_ASK_KEY) === 'true',
  set: (enabled: boolean) => localStorage.setItem(OFFLINE_MODE_DONT_ASK_KEY, String(enabled)),
  remove: () => localStorage.removeItem(OFFLINE_MODE_DONT_ASK_KEY),
}

export function isOfflineMode(): boolean {
  return offlineMode.get()
}

export function enableOfflineMode(dontAskAgain: boolean = false): void {
  offlineMode.set(true)
  if (dontAskAgain) {
    offlineModeDontAsk.set(true)
  }
}

export function disableOfflineMode(): void {
  offlineMode.remove()
  offlineModeDontAsk.remove()
}
