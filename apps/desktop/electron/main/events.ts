import type { DatabaseQueryResult } from '@conar/shared/databases'
import { createRequire } from 'node:module'
import { decrypt, encrypt } from '@conar/shared/encryption'
import { DatabaseType } from '@conar/shared/enums/database-type'
import { app, ipcMain } from 'electron'
import Store from 'electron-store'
import { mssqlQuery, mssqlTestConnection } from './mssql'
import { mysqlQuery, mysqlTestConnection } from './mysql'
import { pgQuery, pgTestConnection } from './pg'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater') as typeof import('electron-updater')

// Secure store for API keys
const apiKeyStore = new Store({
  name: 'api-keys',
  encryptionKey: 'conar-api-keys-encryption',
})

const encryption = {
  encrypt,
  decrypt,
}

const databases = {
  test: async ({
    type,
    connectionString,
  }: {
    type: DatabaseType
    connectionString: string
  }) => {
    const queryMap = {
      [DatabaseType.Postgres]: pgTestConnection,
      postgres: pgTestConnection,
      postgresql: pgTestConnection,
      [DatabaseType.MySQL]: mysqlTestConnection,
      mysql: mysqlTestConnection,
      [DatabaseType.MSSQL]: mssqlTestConnection,
      mssql: mssqlTestConnection,
      sqlserver: mssqlTestConnection, // Legacy support
    }

    try {
      return await queryMap[type as keyof typeof queryMap]({ connectionString })
    }
    catch (error) {
      if (error instanceof AggregateError) {
        throw error.errors[0]
      }

      throw error
    }
  },
  query: async ({
    type,
    connectionString,
    query,
    values,
  }: {
    type: DatabaseType
    connectionString: string
    query: string
    values?: unknown[]
  }) => {
    const queryMap = {
      [DatabaseType.Postgres]: pgQuery,
      postgres: pgQuery,
      postgresql: pgQuery,
      [DatabaseType.MySQL]: mysqlQuery,
      mysql: mysqlQuery,
      [DatabaseType.MSSQL]: mssqlQuery,
      mssql: mssqlQuery,
      sqlserver: mssqlQuery, // Legacy support
    }

    try {
      return await queryMap[type as keyof typeof queryMap]({ connectionString, query, values }) satisfies DatabaseQueryResult[]
    }
    catch (error) {
      if (error instanceof AggregateError) {
        throw error.errors[0]
      }

      throw error
    }
  },
}

const _app = {
  checkForUpdates: () => {
    return autoUpdater.checkForUpdates()
  },
  quitAndInstall: () => {
    autoUpdater.quitAndInstall()
  },
}

const versions = {
  app: () => app.getVersion(),
}

const _keychain = {
  set: ({ id, apiKey }: { id: string, apiKey: string }) => {
    apiKeyStore.set(id, apiKey)
  },
  get: ({ id }: { id: string }) => {
    return apiKeyStore.get(id) as string | null ?? null
  },
  delete: ({ id }: { id: string }) => {
    apiKeyStore.delete(id)
    return true
  },
}

export const electron = {
  databases,
  encryption,
  app: _app,
  versions,
  keychain: _keychain,
}

export function initElectronEvents() {
  for (const [key, events] of Object.entries(electron)) {
    for (const [key2, handler] of Object.entries(events)) {
      ipcMain.handle(`${key}.${key2}`, (_event, arg) => handler(arg))
    }
  }
}
