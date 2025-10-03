import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { IRecordSet, IResult } from 'mssql'
import { createRequire } from 'node:module'
import { parseConnectionString } from '@conar/connection'

const sql = createRequire(import.meta.url)('mssql') as typeof import('mssql')

export async function mssqlQuery({
  connectionString,
  query,
  values,
}: {
  connectionString: string
  query: string
  values?: unknown[]
}): Promise<DatabaseQueryResult[]> {
  const config = parseConnectionString(connectionString)

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
  finally {
    await pool.close()
  }
}

export async function mssqlTestConnection({ connectionString }: { connectionString: string }) {
  const config = parseConnectionString(connectionString)
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
}
