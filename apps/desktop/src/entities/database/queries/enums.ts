import type { databases } from '~/drizzle'
import { enumsSql, enumsType } from '@conar/shared/sql/enums'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { dbQuery } from '~/lib/query'

export function databaseEnumsQuery({ database }: { database: typeof databases.$inferSelect }) {
  return queryOptions({
    queryKey: ['database', database.id, 'enums'],
    staleTime: 5 * 60 * 1000, // 5 minutes - enum types rarely change
    queryFn: async () => {
      const [result] = await dbQuery(database, {
        query: enumsSql()[database.type],
      })

      return enumsType.assert(result!.rows)
    },
  })
}

export function useDatabaseEnums(...params: Parameters<typeof databaseEnumsQuery>) {
  return useQuery(databaseEnumsQuery(...params))
}
