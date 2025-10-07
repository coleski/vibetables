import type { TableHeaderCellProps } from '~/components/table'
import type { Column } from '~/entities/database/table'
import { Button } from '@conar/ui/components/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@conar/ui/components/tooltip'
import { cn } from '@conar/ui/lib/utils'
import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine, RiBookOpenLine, RiEraserLine, RiFingerprintLine, RiKey2Line, RiLinksLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import { usePageStoreContext } from '../-store'

const CANNOT_SORT_TYPES = ['json']

function SortButton({ order, onClick }: { order: 'ASC' | 'DESC' | null, onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClick}
            className={cn(order !== null && 'text-primary')}
          >
            {order === 'ASC'
              ? (
                  <RiArrowUpLine className="size-3" />
                )
              : order === 'DESC'
                ? (
                    <RiArrowDownLine className="size-3" />
                  )
                : (
                    <RiArrowUpDownLine className="size-3 opacity-30" />
                  )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {order === null ? 'Sort' : order === 'ASC' ? 'Sort ascending' : 'Sort descending'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function TableHeaderCell({
  onSort,
  column,
  position,
  columnIndex,
  className,
  style,
}: { column: Column, onSort?: () => void } & TableHeaderCellProps) {
  const store = usePageStoreContext()
  const order = useStore(store, state => state.orderBy?.[column.id] ?? null)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = cellRef.current
    if (!element)
      return

    const observer = new MutationObserver(() => {
      const scrollContainer = element.closest('[data-highlighted-column]')
      const highlightedColumn = scrollContainer?.getAttribute('data-highlighted-column')

      if (highlightedColumn === column.id) {
        setIsHighlighted(true)
        // Remove highlight after animation
        setTimeout(() => {
          setIsHighlighted(false)
        }, 2000)
      }
    })

    // Observe changes on the scroll container
    const scrollContainer = element.closest('.overflow-auto')
    if (scrollContainer) {
      observer.observe(scrollContainer, {
        attributes: true,
        attributeFilter: ['data-highlighted-column'],
      })
    }

    // Check initial state
    const initialScrollContainer = element.closest('[data-highlighted-column]')
    const initialHighlightedColumn = initialScrollContainer?.getAttribute('data-highlighted-column')
    if (initialHighlightedColumn === column.id) {
      setIsHighlighted(true)
      setTimeout(() => {
        setIsHighlighted(false)
      }, 2000)
    }

    return () => observer.disconnect()
  }, [column.id])

  return (
    <div
      ref={cellRef}
      className={cn(
        'flex w-full items-center justify-between shrink-0 p-2',
        position === 'first' && 'pl-4',
        position === 'last' && 'pr-4',
        className,
      )}
      style={{
        ...style,
        ...(isHighlighted && {
          animation: 'highlight-fade 2s ease-in-out',
        }),
      }}
      data-position={position}
      data-index={columnIndex}
      data-column-id={column.id}
    >
      <div className="text-xs overflow-hidden">
        <div
          data-mask
          className="truncate font-medium flex items-center gap-1"
          title={column.id}
        >
          {column.id}
        </div>
        {column?.type && (
          <div data-footer={!!column.type} className="flex items-center gap-1">
            {column.primaryKey && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiKey2Line className="size-3 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1 mb-1">
                      <RiKey2Line className="size-3 text-primary" />
                      <span>Primary key</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {column.primaryKey}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {column.isNullable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiEraserLine className="size-3 text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      <RiEraserLine className="size-3 text-muted-foreground/70" />
                      <span>Nullable</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {column.unique && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiFingerprintLine className="size-3 text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1 mb-1">
                      <RiFingerprintLine className="size-3 text-muted-foreground/70" />
                      <span>Unique</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {column.unique}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {column.isEditable === false && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiBookOpenLine className="size-3 text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      <RiBookOpenLine className="size-3 text-muted-foreground/70" />
                      <span>Read only</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {column.foreign && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiLinksLine className="size-3 text-muted-foreground/70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      <RiLinksLine className="size-3 text-muted-foreground/70" />
                      <span>Foreign key</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {column.foreign.name}
                      {' '}
                      (
                      {column.foreign.table}
                      .
                      {column.foreign.column}
                      )
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-muted-foreground truncate font-mono">
              {column.type}
            </span>
          </div>
        )}
      </div>
      {onSort && column.type && !CANNOT_SORT_TYPES.includes(column.type) && (
        <SortButton order={order} onClick={onSort} />
      )}
    </div>
  )
}
