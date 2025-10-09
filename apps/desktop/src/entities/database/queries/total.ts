import type { WhereFilter } from '@conar/shared/sql/where'
import type { databases } from '~/drizzle'
import { totalSql, totalType } from '@conar/shared/sql/total'
import { whereSql } from '@conar/shared/sql/where'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { dbQuery } from '~/lib/query'

export function databaseTableTotalQuery({
  database,
  table,
  schema,
  query,
}: {
  database: typeof databases.$inferSelect
  table: string
  schema: string
  query: { filters: WhereFilter[] }
}) {
  return queryOptions({
    queryKey: [
      'database',
      database.id,
      'schema',
      schema,
      'table',
      table,
      'total',
      {
        filters: query.filters,
      },
    ],
    staleTime: 60 * 1000, // 1 minute - row counts change with data
    queryFn: async () => {
      const [result] = await dbQuery(database, {
        query: totalSql(schema, table, {
          where: whereSql(query.filters)[database.type],
        })[database.type],
      })

      return totalType.assert(result!.rows[0]!).total
    },
    throwOnError: false,
  })
}

export function useDatabaseTableTotal(...params: Parameters<typeof databaseTableTotalQuery>) {
  return useQuery(databaseTableTotalQuery(...params))
}
