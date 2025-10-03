import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { IRecordSet, IResult } from 'mssql'
import { parseConnectionString } from '@conar/connection'
import { type } from 'arktype'
import sql from 'mssql'
import { authMiddleware, orpc } from '~/orpc'

export const mssqlProxy = orpc
  .use(authMiddleware)
  .input(type({
    'connectionString': 'string',
    'query': 'string',
    'values?': 'unknown[]',
  }))
  .handler(async ({ input }): Promise<DatabaseQueryResult[]> => {
    const config = parseConnectionString(input.connectionString)

    const pool = await sql.connect({
      server: config.host ?? 'localhost',
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      options: {
        encrypt: !!config.ssl,
        trustServerCertificate: !config.ssl,
      },
    })

    try {
      const request = pool.request()

      // Add parameters if values are provided
      if (input.values) {
        input.values.forEach((value, index) => {
          request.input(`param${index}`, value)
        })
      }

      const result = await request.query(input.query) as IResult<unknown>
      const recordset = result.recordset as IRecordSet<unknown>

      return [{
        count: recordset.length,
        columns: recordset.columns
          ? Object.keys(recordset.columns).map(name => ({
              id: name,
            }))
          : [],
        rows: recordset as unknown as Record<string, unknown>[],
      }]
    }
    finally {
      await pool.close()
    }
  })

export const mssqlTestConnection = orpc
  .use(authMiddleware)
  .input(type({
    connectionString: 'string',
  }))
  .handler(async ({ input }): Promise<boolean> => {
    const config = parseConnectionString(input.connectionString)
    const pool = await sql.connect({
      server: config.host ?? 'localhost',
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      options: {
        encrypt: !!config.ssl,
        trustServerCertificate: !config.ssl,
      },
    })

    try {
      // Simple query to test the connection
      await pool.request().query('SELECT 1')
      return true
    }
    finally {
      await pool.close()
    }
  })
