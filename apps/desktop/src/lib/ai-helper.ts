import { eq } from 'drizzle-orm'
import { AiProvider, apiKeys, db } from '~/drizzle'
import { keychain } from './keychain'
import { isPrivateMode } from './private-mode'

/**
 * Get the user's API key for a provider in private mode
 * Returns null if not in private mode or no key configured
 */
export async function getUserApiKey(provider: AiProvider = AiProvider.Anthropic): Promise<string | null> {
  if (!isPrivateMode()) {
    return null // Use backend's keys
  }

  // Find active key for this provider
  const activeKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.provider, provider))
    .where(eq(apiKeys.isActive, true))
    .limit(1)
    .then(rows => rows[0])

  if (!activeKey) {
    return null
  }

  // Get actual key from keychain
  const apiKey = await keychain.get(activeKey.id)

  return apiKey
}

/**
 * Check if user has a local API key configured for a provider
 */
export async function hasUserApiKey(provider: AiProvider = AiProvider.Anthropic): Promise<boolean> {
  if (!isPrivateMode())
    return false

  const key = await getUserApiKey(provider)
  return !!key
}
