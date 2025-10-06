import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { FieldPacket, RowDataPacket } from 'mysql2/promise'
import { createRequire } from 'node:module'
import { parseConnectionString } from '@conar/connection'
import { readSSLFiles } from '@conar/connection/server'

const mysql = createRequire(import.meta.url)('mysql2/promise') as typeof import('mysql2/promise')

export async function mysqlQuery({
  connectionString,
  query,
  values,
}: {
  connectionString: string
  query: string
  values?: unknown[]
}): Promise<DatabaseQueryResult[]> {
  const config = parseConnectionString(connectionString)
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ...(config.ssl ? { ssl: readSSLFiles(config.ssl) } : {}),
  })

  try {
    const [rows, fields] = await connection.execute(query, values) as [RowDataPacket[], FieldPacket[]]

    // Convert MySQL's 1/0 to boolean for TINYINT(1) columns
    const processedRows = Array.isArray(rows)
      ? rows.map((row) => {
          const processed = { ...row }
          for (const key in processed) {
            const value = processed[key]
            if (value === 1 || value === 0) {
              const field = fields.find(f => f.name === key)
              if (field && field.columnLength === 1) {
                processed[key] = value === 1
              }
            }
          }
          return processed
        })
      : []

    return [{
      count: processedRows.length,
      columns: fields.map(f => ({
        id: f.name,
      })),
      rows: processedRows,
    }]
  }
  finally {
    await connection.end()
  }
}

export async function mysqlTestConnection({ connectionString }: { connectionString: string }) {
  const config = parseConnectionString(connectionString)
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ...(config.ssl ? { ssl: readSSLFiles(config.ssl) } : {}),
  })

  try {
    await connection.ping()
    return true
  }
  finally {
    await connection.end()
  }
}
