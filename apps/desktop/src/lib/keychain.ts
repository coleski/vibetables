export const keychain = {
  /**
   * Store an API key in the OS keychain
   */
  async set(id: string, apiKey: string): Promise<void> {
    console.log('[keychain.set] Called with id:', id)
    console.log('[keychain.set] window.electron:', window.electron)
    console.log('[keychain.set] window.electron.keychain:', window.electron?.keychain)

    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    await window.electron.keychain.set({ id, apiKey })
    console.log('[keychain.set] Successfully stored key')
  },

  /**
   * Retrieve an API key from the OS keychain
   */
  async get(id: string): Promise<string | null> {
    console.log('[keychain.get] Called with id:', id)

    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    const result = await window.electron.keychain.get({ id })
    console.log('[keychain.get] Retrieved key:', result ? 'exists' : 'null')
    return result
  },

  /**
   * Delete an API key from the OS keychain
   */
  async delete(id: string): Promise<boolean> {
    console.log('[keychain.delete] Called with id:', id)

    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    const result = await window.electron.keychain.delete({ id })
    console.log('[keychain.delete] Deleted:', result)
    return result
  },
}
