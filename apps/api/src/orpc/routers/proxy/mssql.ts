import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { IRecordSet, IResult } from 'mssql'
import { parseConnectionString } from '@conar/connection'
import { type } from 'arktype'
import sql from 'mssql'
import { authMiddleware, orpc } from '~/orpc'

// Pool cache to reuse connections
const poolCache = new Map<string, Promise<typeof sql.ConnectionPool.prototype>>()

async function getPool(connectionString: string) {
  if (!poolCache.has(connectionString)) {
    const config = parseConnectionString(connectionString)

    const poolPromise = sql.connect({
      server: config.host ?? 'localhost',
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      requestTimeout: 300000, // 5 minutes
      connectionTimeout: 60000,
      options: {
        encrypt: config.ssl !== false,
        trustServerCertificate: config.ssl === false || (typeof config.ssl === 'object' && config.ssl.rejectUnauthorized === false),
        connectTimeout: 60000,
      },
    })

    poolCache.set(connectionString, poolPromise)

    // Remove from cache on error
    poolPromise.catch(() => {
      poolCache.delete(connectionString)
    })
  }

  return poolCache.get(connectionString)!
}

export const mssqlProxy = orpc
  .use(authMiddleware)
  .input(type({
    'connectionString': 'string',
    'query': 'string',
    'values?': 'unknown[]',
  }))
  .handler(async ({ input }): Promise<DatabaseQueryResult[]> => {
    const pool = await getPool(input.connectionString)
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
  })

export const mssqlTestConnection = orpc
  .use(authMiddleware)
  .input(type({
    connectionString: 'string',
  }))
  .handler(async ({ input }): Promise<boolean> => {
    const pool = await getPool(input.connectionString)
    // Simple query to test the connection
    await pool.request().query('SELECT 1')
    return true
  })
