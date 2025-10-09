import type { databases } from '~/drizzle'
import { allColumnsSql, allColumnsType, columnsSql, columnType } from '@conar/shared/sql/columns'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { dbQuery } from '~/lib/query'

export function databaseTableColumnsQuery({ database, table, schema }: { database: typeof databases.$inferSelect, table: string, schema: string }) {
  return queryOptions({
    queryKey: ['database', database.id, 'columns', schema, table],
    staleTime: 5 * 60 * 1000, // 5 minutes - column structure rarely changes
    queryFn: async () => {
      const [result] = await dbQuery(database, {
        query: columnsSql(schema, table)[database.type],
      })

      return result!.rows.map(col => columnType.assert(col))
    },
  })
}

export function useDatabaseTableColumns(...params: Parameters<typeof databaseTableColumnsQuery>) {
  return useQuery(databaseTableColumnsQuery(...params))
}

export function databaseAllColumnsQuery({ database }: { database: typeof databases.$inferSelect }) {
  return queryOptions({
    queryKey: ['database', database.id, 'all-columns'],
    staleTime: 5 * 60 * 1000, // 5 minutes - column structure rarely changes
    queryFn: async () => {
      const [result] = await dbQuery(database, {
        query: allColumnsSql()[database.type],
      })

      return result!.rows.map(col => allColumnsType.assert(col))
    },
  })
}

export function useDatabaseAllColumns(...params: Parameters<typeof databaseAllColumnsQuery>) {
  return useQuery(databaseAllColumnsQuery(...params))
}
