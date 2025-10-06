import type { DatabaseType } from '@conar/shared/enums/database-type'
import type { databases } from '~/drizzle'
import posthog from 'posthog-js'
import { databasesCollection } from '~/entities/database'
import { orpc } from './orpc'

export function dbQuery(databaseOrId: string | typeof databases.$inferSelect, params: {
  query: string
  values?: unknown[]
}) {
  const database = typeof databaseOrId === 'string'
    ? databasesCollection.get(databaseOrId)
    : databaseOrId

  if (!database) {
    throw new Error('Database not found')
  }

  if (!window.electron) {
    return orpc.proxy.databases[database.type].query({
      connectionString: database.connectionString,
      ...params,
    }).catch((err) => {
      console.error('dbQuery error', database.type, params.query, err)
      posthog.capture('database_query_error', {
        type: database.type,
        query: params.query,
        values: params.values,
        error: err.message,
      })
      throw err
    })
  }

  return window.electron.databases.query({
    type: database.type,
    connectionString: database.connectionString,
    ...params,
  }).catch((err) => {
    console.error('dbQuery error', database.type, params.query, err)
    posthog.capture('database_query_error', {
      type: database.type,
      query: params.query,
      values: params.values,
      error: err.message,
    })
    throw err
  })
}

export function dbTestConnection(params: {
  type: DatabaseType
  connectionString: string
}) {
  console.log('dbTestConnection called', { hasElectron: !!window.electron, params })

  if (!window.electron) {
    console.log('Using API route (no window.electron)')
    return orpc.proxy.databases[params.type].test({
      connectionString: params.connectionString,
    })
  }

  console.log('Using Electron IPC')
  return window.electron.databases.test(params)
    .then((result) => {
      console.log('Test connection result:', result)
      return result
    })
    .catch((error) => {
      console.error('Test connection error:', error)
      throw error
    })
}
