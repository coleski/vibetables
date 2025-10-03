import type { DatabaseType } from '@conar/shared/enums/database-type'
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
  } satisfies Record<DatabaseType, {
    query: typeof pgProxy
    test: typeof pgTestConnection
  }>,
}
