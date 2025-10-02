import type { Context } from './context'
import { ORPCError, os } from '@orpc/server'
import { auth } from '~/lib/auth'

export const orpc = os.$context<Context>()

export const authMiddleware = orpc.middleware(async ({ context, next, input }) => {
  const session = await auth.api.getSession({
    headers: context.headers,
  })

  // Allow unauthenticated requests if userApiKey is provided (private mode)
  const hasUserApiKey = input && typeof input === 'object' && 'userApiKey' in input && input.userApiKey

  if (!session && !hasUserApiKey) {
    throw new ORPCError('UNAUTHORIZED', { message: 'We could not find your session. Please sign in again.' })
  }

  // For private mode requests with userApiKey, create a minimal user context
  if (!session && hasUserApiKey) {
    return next({
      context: {
        user: {
          id: 'private-mode-user',
          name: 'Private Mode',
          email: 'private@local',
        },
        session: {
          id: 'private-mode-session',
        },
      },
    })
  }

  return next({
    context: session,
  })
})
