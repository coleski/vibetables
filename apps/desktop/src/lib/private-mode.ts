const PRIVATE_MODE_KEY = 'conar.private_mode'
const PRIVATE_MODE_DONT_ASK_KEY = 'conar.private_mode_dont_ask'

export const privateMode = {
  get: () => localStorage.getItem(PRIVATE_MODE_KEY) === 'true',
  set: (enabled: boolean) => localStorage.setItem(PRIVATE_MODE_KEY, String(enabled)),
  remove: () => localStorage.removeItem(PRIVATE_MODE_KEY),
}

export const privateModeDontAsk = {
  get: () => localStorage.getItem(PRIVATE_MODE_DONT_ASK_KEY) === 'true',
  set: (enabled: boolean) => localStorage.setItem(PRIVATE_MODE_DONT_ASK_KEY, String(enabled)),
  remove: () => localStorage.removeItem(PRIVATE_MODE_DONT_ASK_KEY),
}

export function isPrivateMode(): boolean {
  return privateMode.get()
}

export function enablePrivateMode(dontAskAgain: boolean = false): void {
  privateMode.set(true)
  if (dontAskAgain) {
    privateModeDontAsk.set(true)
  }
}

export function disablePrivateMode(): void {
  privateMode.remove()
  privateModeDontAsk.remove()
}
