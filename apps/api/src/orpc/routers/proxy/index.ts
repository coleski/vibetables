import type { DatabaseType } from '@conar/shared/enums/database-type'
import { mssqlProxy, mssqlTestConnection } from './mssql'
import { pgProxy, pgTestConnection } from './pg'

export const proxy = {
  databases: {
    postgres: {
      query: pgProxy,
      test: pgTestConnection,
    },
    mssql: {
      query: mssqlProxy,
      test: mssqlTestConnection,
    },
  } satisfies Record<DatabaseType, {
    query: typeof pgProxy
    test: typeof pgTestConnection
  }>,
}
