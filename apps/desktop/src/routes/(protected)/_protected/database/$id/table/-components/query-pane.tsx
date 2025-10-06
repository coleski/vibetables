import type { editor } from 'monaco-editor'
import type { databases } from '~/drizzle'
import { rowsSql } from '@conar/shared/sql/rows'
import { whereSql } from '@conar/shared/sql/where'
import { Button } from '@conar/ui/components/button'
import { CardHeader, CardTitle } from '@conar/ui/components/card'
import { CtrlEnter } from '@conar/ui/components/custom/ctrl-enter'
import { useStore } from '@tanstack/react-store'
import { RiCheckLine, RiCloseLine, RiLoader4Line } from '@remixicon/react'
import { LanguageIdEnum } from 'monaco-sql-languages'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Monaco } from '~/components/monaco'
import { DEFAULT_LIMIT, useDatabaseTableTotal } from '~/entities/database'
import { formatSql } from '~/lib/formatter'
import { setQueryPaneOpen, usePageStoreContext } from '../-store'

export function QueryPane({ table, schema, database }: { table: string, schema: string, database: typeof databases.$inferSelect }) {
  const store = usePageStoreContext()
  const { query, filters, orderBy, customQueryActive } = useStore(store, state => ({
    query: state.query,
    filters: state.filters,
    orderBy: state.orderBy,
    customQueryActive: state.customQueryActive,
  }))
  const { data: total } = useDatabaseTableTotal({ database, table, schema, query: { filters } })
  const monacoRef = useRef<editor.IStandaloneCodeEditor>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [justRan, setJustRan] = useState(false)

  // Generate the SQL query based on current filters and orderBy
  const generatedQuery = useMemo(() => {
    const q = rowsSql(schema, table, {
      limit: DEFAULT_LIMIT,
      offset: 0,
      orderBy,
      where: whereSql(filters)[database.type],
    })[database.type]

    try {
      return formatSql(q, database.type)
    }
    catch (error) {
      console.error('Failed to format SQL:', error)
      return q
    }
  }, [schema, table, orderBy, filters, database.type])

  const isEdited = useMemo(() => query.trim() !== generatedQuery.trim(), [query, generatedQuery])

  // Reset custom query mode when table/schema changes to ensure fresh start
  useEffect(() => {
    store.setState(state => ({ ...state, customQueryActive: false }))
  }, [table, schema, store])

  // Keep query synced with generatedQuery when not in custom mode
  // This handles: initial load, table navigation, and filter/orderBy changes
  // We intentionally don't include `query` in deps to allow user typing
  useEffect(() => {
    if (!customQueryActive) {
      store.setState(state => {
        // Only update if different to avoid unnecessary re-renders
        if (state.query.trim() !== generatedQuery.trim()) {
          return { ...state, query: generatedQuery }
        }
        return state
      })
    }
  }, [generatedQuery, customQueryActive, store])

  const handleQueryChange = useCallback((q: string) => {
    store.setState(state => ({
      ...state,
      query: q,
    }))
  }, [store])

  const handleRunQuery = useCallback(async () => {
    setIsRunning(true)
    setJustRan(false)

    try {
      // Activate custom query mode
      store.setState(state => ({ ...state, customQueryActive: true }))

      setIsRunning(false)
      setJustRan(true)

      // Reset success state after 2 seconds
      setTimeout(() => setJustRan(false), 2000)
    }
    catch (error) {
      console.error('Query execution failed:', error)
      setIsRunning(false)
    }
  }, [store])

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="bg-card min-h-[3rem] border-b flex items-center px-4 py-2">
        <CardTitle className="flex items-center gap-2 justify-between text-sm w-full my-0">
          <span className="leading-none">Table Query</span>
          <div className="flex items-center gap-2">
            {isEdited && (
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={isRunning}
                className={`h-7 ${justRan ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              >
                <span className="flex items-center gap-1">
                  {isRunning && <RiLoader4Line className="size-3 animate-spin" />}
                  {justRan && <RiCheckLine className="size-3" />}
                  {isRunning ? 'Running...' : justRan ? 'Ran' : 'Run query'}
                  {!isRunning && !justRan && (
                    <>
                      {' '}
                      <CtrlEnter userAgent={navigator.userAgent} />
                    </>
                  )}
                </span>
              </Button>
            )}
            {!isEdited && total !== undefined && (
              <span className="text-xs font-normal text-muted-foreground">
                Showing first {DEFAULT_LIMIT} of {total} record{total !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setQueryPaneOpen(false)}
            >
              <RiCloseLine className="size-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <div className="flex-1 relative overflow-hidden">
        <Monaco
          data-mask
          ref={monacoRef}
          language={LanguageIdEnum.PG}
          value={query}
          onChange={handleQueryChange}
          onEnter={handleRunQuery}
          className="size-full"
          options={{
            minimap: { enabled: false },
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  )
}
