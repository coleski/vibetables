import type { databases } from '~/drizzle'
import { foreignKeysSql, foreignKeysType } from '@conar/shared/sql/foreign-keys'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { dbQuery } from '~/lib/query'

export function databaseForeignKeysQuery({ database }: { database: typeof databases.$inferSelect }) {
  return queryOptions({
    queryKey: ['database', database.id, 'foreign-keys'],
    staleTime: 5 * 60 * 1000, // 5 minutes - foreign keys rarely change
    queryFn: async () => {
      const [result] = await dbQuery(database, {
        query: foreignKeysSql()[database.type],
      })

      return result!.rows.map(row => foreignKeysType.assert(row))
    },
  })
}

export function useDatabaseForeignKeys(...params: Parameters<typeof databaseForeignKeysQuery>) {
  return useQuery(databaseForeignKeysQuery(...params))
}
