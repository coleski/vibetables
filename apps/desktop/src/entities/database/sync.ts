import type { MutationOptions } from '@tanstack/react-query'
import { parseConnectionString } from '@conar/connection'
import { SyncType } from '@conar/shared/enums/sync-type'
import { SafeURL } from '@conar/shared/utils/safe-url'
import { createCollection } from '@tanstack/react-db'
import { useIsMutating, useMutation } from '@tanstack/react-query'
import { drizzleCollectionOptions } from 'tanstack-db-pglite'
import { databases, db, waitForMigrations } from '~/drizzle'
import { bearerToken } from '~/lib/auth'
import { isPrivateMode } from '~/lib/private-mode'
import { orpc } from '~/lib/orpc'
import { router } from '~/main'

const { promise, resolve } = Promise.withResolvers()

export function waitForDatabasesSync() {
  return promise
}

function getPassword(connectionString: string): string {
  const config = parseConnectionString(connectionString.trim())
  return config.password || ''
}

function setPassword(connectionString: string, password: string): string {
  const trimmed = connectionString.trim()

  // ADO.NET format
  if (!trimmed.includes('://') && trimmed.includes(';')) {
    // Remove existing password
    const withoutPassword = trimmed.replace(/password=[^;]*/i, '')
    // Add new password if provided
    if (password) {
      return `${withoutPassword};password=${password}`.replace(/;+/g, ';').replace(/^;|;$/g, '')
    }
    return withoutPassword.replace(/;+/g, ';').replace(/^;|;$/g, '')
  }

  // URL format
  const url = new SafeURL(trimmed)
  url.password = password
  return url.toString()
}

function prepareConnectionStringToCloud(connectionString: string, syncType: SyncType) {
  if (syncType !== SyncType.Cloud) {
    return setPassword(connectionString, '')
  }
  return connectionString.trim()
}

export interface DatabaseMutationMetadata {
  sync?: boolean
}

export const databasesCollection = createCollection(drizzleCollectionOptions({
  db,
  table: databases,
  primaryColumn: databases.id,
  startSync: false,
  prepare: waitForMigrations,
  sync: async ({ write, collection }) => {
    if (isPrivateMode() || !bearerToken.get() || !navigator.onLine) {
      return
    }

    const sync = await orpc.databases.sync(collection.toArray.map(c => ({ id: c.id, updatedAt: c.updatedAt })))

    for (const item of sync) {
      if (item.type === 'insert') {
        write({
          type: 'insert',
          value: {
            ...item.value,
            isPasswordPopulated: !!getPassword(item.value.connectionString),
            isOffline: null, // Cloud-synced connections (not private mode)
          },
        })
      }
      else if (item.type === 'update') {
        const existed = collection.get(item.value.id)

        if (!existed) {
          throw new Error('Entity not found')
        }

        const cloudPassword = getPassword(item.value.connectionString)
        const localPassword = getPassword(existed.connectionString)
        let newConnectionString = item.value.connectionString

        if (item.value.syncType === SyncType.CloudWithoutPassword && localPassword && !cloudPassword) {
          newConnectionString = setPassword(item.value.connectionString, localPassword)
        }

        write({
          type: 'update',
          value: {
            ...item.value,
            connectionString: newConnectionString,
            isPasswordPopulated: !!getPassword(newConnectionString),
            syncType: item.value.syncType ?? SyncType.CloudWithoutPassword,
            isOffline: existed.isOffline, // Preserve private mode flag
          },
        })
      }
      else if (item.type === 'delete') {
        const existed = collection.get(item.value)

        if (!existed) {
          throw new Error('Entity not found')
        }

        write({
          type: 'delete',
          value: existed,
        })
      }
    }
    resolve()
  },
  onInsert: async ({ transaction }) => {
    if (isPrivateMode()) {
      return
    }
    await Promise.all(transaction.mutations.map(m => orpc.databases.create({
      ...m.modified,
      // Don't send isOffline to cloud - it's a local-only field
      connectionString: prepareConnectionStringToCloud(m.modified.connectionString, m.modified.syncType),
    })))
  },
  onUpdate: async ({ transaction }) => {
    if (isPrivateMode()) {
      router.invalidate({ filter: r => r.routeId === '/(protected)/_protected/database/$id' })
      return
    }
    await Promise.all(transaction.mutations
      .filter(m => (m.metadata as DatabaseMutationMetadata)?.sync !== false)
      .map(m => orpc.databases.update({
        id: m.key,
        ...m.changes,
        ...(m.changes.connectionString
          ? { connectionString: prepareConnectionStringToCloud(m.changes.connectionString, m.modified.syncType) }
          : {}),
      })))
    router.invalidate({ filter: r => r.routeId === '/(protected)/_protected/database/$id' })
  },
  onDelete: async ({ transaction }) => {
    if (isPrivateMode()) {
      return
    }
    await orpc.databases.remove(transaction.mutations.map(m => ({ id: m.key })))
  },
}))

const syncDatabasesMutationOptions = {
  mutationKey: ['sync-databases'],
  mutationFn: databasesCollection.utils.runSync,
  onError: () => {},
} satisfies MutationOptions

export function useDatabasesSync() {
  const { mutate } = useMutation(syncDatabasesMutationOptions)

  return {
    sync: mutate,
    isSyncing: useIsMutating(syncDatabasesMutationOptions) > 0,
  }
}
