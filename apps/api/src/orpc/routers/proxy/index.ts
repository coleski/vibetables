import type { DatabaseType } from '@conar/shared/enums/database-type'
import { mssqlProxy, mssqlTestConnection } from './mssql'
import { pgProxy, pgTestConnection } from './pg'
import { mysqlProxy, mysqlTestConnection } from './mysql'

export const proxy = {
  databases: {
    postgres: {
      query: pgProxy,
      test: pgTestConnection,
    },
    mysql: {
      query: mysqlProxy,
      test: mysqlTestConnection,
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
