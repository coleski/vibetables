import type { DatabaseQueryResult } from '@conar/shared/databases'
import type { FieldPacket, RowDataPacket } from 'mysql2/promise'
import { parseConnectionString } from '@conar/connection'
import { readSSLFiles } from '@conar/connection/server'
import { type } from 'arktype'
import mysql from 'mysql2/promise'
import { authMiddleware, orpc } from '~/orpc'

export const mysqlProxy = orpc
  .use(authMiddleware)
  .input(type({
    'connectionString': 'string',
    'query': 'string',
    'values?': 'unknown[]',
  }))
  .handler(async ({ input }): Promise<DatabaseQueryResult[]> => {
    const config = parseConnectionString(input.connectionString)

    const connectionConfig: Parameters<typeof mysql.createConnection>[0] = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    }

    if (config.ssl) {
      if (typeof config.ssl === 'object') {
        connectionConfig.ssl = readSSLFiles(config.ssl) as Exclude<ReturnType<typeof readSSLFiles>, boolean>
      }
      else if (config.ssl === true) {
        connectionConfig.ssl = {}
      }
    }

    const connection = await mysql.createConnection(connectionConfig)

    try {
      const [rows, fields] = await connection.execute(input.query, input.values) as [RowDataPacket[], FieldPacket[]]

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
  })

export const mysqlTestConnection = orpc
  .use(authMiddleware)
  .input(type({
    connectionString: 'string',
  }))
  .handler(async ({ input }): Promise<boolean> => {
    const config = parseConnectionString(input.connectionString)

    const connectionConfig: Parameters<typeof mysql.createConnection>[0] = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    }

    if (config.ssl) {
      if (typeof config.ssl === 'object') {
        connectionConfig.ssl = readSSLFiles(config.ssl) as Exclude<ReturnType<typeof readSSLFiles>, boolean>
      }
      else if (config.ssl === true) {
        connectionConfig.ssl = {}
      }
    }

    const connection = await mysql.createConnection(connectionConfig)

    try {
      await connection.ping()
      return true
    }
    finally {
      await connection.end()
    }
  })
