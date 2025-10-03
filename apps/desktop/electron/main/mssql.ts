import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { IRecordSet, IResult } from 'mssql'
import { createRequire } from 'node:module'
import { parseConnectionString } from '@conar/connection'

// MSSQL connection using tedious driver
const sql = createRequire(import.meta.url)('mssql') as typeof import('mssql')

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

export async function mssqlQuery({
  connectionString,
  query,
  values,
}: {
  connectionString: string
  query: string
  values?: unknown[]
}): Promise<DatabaseQueryResult[]> {
  const pool = await getPool(connectionString)
  const request = pool.request()

  // Add parameters if values are provided
  if (values) {
    values.forEach((value, index) => {
      request.input(`param${index}`, value)
    })
  }

  const result = await request.query(query) as IResult<unknown>
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

export async function mssqlTestConnection({ connectionString }: { connectionString: string }) {
  const pool = await getPool(connectionString)
  // Simple query to test the connection
  await pool.request().query('SELECT 1')
  return true
}
