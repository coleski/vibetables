import type { databases } from '~/drizzle'
import { rowsSql } from '@conar/shared/sql/rows'
import { whereSql } from '@conar/shared/sql/where'
import { CardHeader, CardTitle } from '@conar/ui/components/card'
import { useStore } from '@tanstack/react-store'
import { LanguageIdEnum } from 'monaco-sql-languages'
import { useMemo } from 'react'
import { Monaco } from '~/components/monaco'
import { DEFAULT_LIMIT, useDatabaseTableTotal } from '~/entities/database'
import { formatSql } from '~/lib/formatter'
import { usePageStoreContext } from '../-store'

export function QueryPane({ table, schema, database }: { table: string, schema: string, database: typeof databases.$inferSelect }) {
  const store = usePageStoreContext()
  const [filters, orderBy] = useStore(store, state => [state.filters, state.orderBy])
  const { data: total } = useDatabaseTableTotal({ database, table, schema, query: { filters } })

  const generatedQuery = useMemo(() => {
    const query = rowsSql(schema, table, {
      limit: DEFAULT_LIMIT,
      offset: 0,
      orderBy,
      where: whereSql(filters)[database.type],
    })[database.type]

    try {
      return formatSql(query, database.type)
    }
    catch (error) {
      console.error('Failed to format SQL:', error)
      return query
    }
  }, [schema, table, orderBy, filters, database.type])

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="bg-card py-3 h-14 border-b">
        <CardTitle className="flex items-center gap-2 justify-between text-sm">
          <span>Table Query</span>
          {total !== undefined && (
            <span className="text-xs font-normal text-muted-foreground">
              Showing first {DEFAULT_LIMIT} of {total} record{total !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <div className="flex-1 relative">
        <Monaco
          data-mask
          language={LanguageIdEnum.PG}
          value={generatedQuery}
          className="size-full"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  )
}
