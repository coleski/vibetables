import type { databases } from '~/drizzle'
import { Button } from '@conar/ui/components/button'
import { ContentSwitch } from '@conar/ui/components/custom/content-switch'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@conar/ui/components/tooltip'
import { RiCheckLine, RiCodeLine, RiLoopLeftLine } from '@remixicon/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { databaseRowsQuery, databaseTableColumnsQuery, databaseTableConstraintsQuery } from '~/entities/database'
import { queryClient } from '~/main'
import { setQueryPaneOpen, usePageStoreContext, useQueryPaneOpen } from '../-store'
import { HeaderActionsColumns } from './header-actions-columns'
import { HeaderActionsDelete } from './header-actions-delete'
import { HeaderActionsFilters } from './header-actions-filters'

export function HeaderActions({ table, schema, database }: { table: string, schema: string, database: typeof databases.$inferSelect }) {
  const store = usePageStoreContext()
  const [filters, orderBy] = useStore(store, state => [state.filters, state.orderBy])
  const queryPaneOpen = useQueryPaneOpen()
  const { isFetching, dataUpdatedAt, refetch } = useInfiniteQuery(
    databaseRowsQuery({ database, table, schema, query: { filters, orderBy } }),
  )

  async function handleRefresh() {
    store.setState(state => ({
      ...state,
      page: 1,
    }))
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries(databaseTableColumnsQuery({ database, table, schema })),
      queryClient.invalidateQueries(databaseTableConstraintsQuery({ database, table, schema })),
    ])
  }

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setQueryPaneOpen(!queryPaneOpen)
              }}
            >
              <RiCodeLine />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="end">
            {queryPaneOpen ? 'Hide' : 'Show'}
            {' '}
            table query
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <HeaderActionsDelete
        table={table}
        schema={schema}
        database={database}
      />
      <HeaderActionsColumns
        database={database}
        table={table}
        schema={schema}
      />
      <HeaderActionsFilters />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <LoadingContent loading={isFetching}>
                <ContentSwitch
                  activeContent={<RiCheckLine className="text-success" />}
                  active={isFetching}
                >
                  <RiLoopLeftLine />
                </ContentSwitch>
              </LoadingContent>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="end">
            Refresh rows
            <p className="text-xs text-muted-foreground">
              Last updated:
              {' '}
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'never'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
