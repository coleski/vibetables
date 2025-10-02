export const keychain = {
  /**
   * Store an API key in the OS keychain
   */
  async set(id: string, apiKey: string): Promise<void> {
    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    await window.electron.keychain.set({ id, apiKey })
  },

  /**
   * Retrieve an API key from the OS keychain
   */
  async get(id: string): Promise<string | null> {
    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    return await window.electron.keychain.get({ id })
  },

  /**
   * Delete an API key from the OS keychain
   */
  async delete(id: string): Promise<boolean> {
    if (!window.electron?.keychain) {
      throw new Error('Keychain API not available - electron bridge not initialized')
    }

    return await window.electron.keychain.delete({ id })
  },
}
