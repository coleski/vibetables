import type { TableHeaderCellProps } from '~/components/table'
import type { Column } from '~/entities/database/table'
import { Button } from '@conar/ui/components/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@conar/ui/components/context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@conar/ui/components/tooltip'
import { copy } from '@conar/ui/lib/copy'
import { cn } from '@conar/ui/lib/utils'
import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine, RiBookOpenLine, RiEraserLine, RiFingerprintLine, RiKey2Line, RiLinksLine } from '@remixicon/react'
import { useStore } from '@tanstack/react-store'
import { useRef, useState } from 'react'
import { formatColumnSchema } from '../-lib'
import { usePageStoreContext } from '../-store'

const CANNOT_SORT_TYPES = ['json']
const MIN_COLUMN_WIDTH = 50

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

/**
 * Draggable handle for resizing table columns.
 *
 * Performance optimization: Uses inline styles during drag for smooth 60fps resizing
 * without triggering React re-renders. Final size is committed to state on mouse up.
 */
function ResizeHandle({ onResize, initialSize, columnId }: { onResize: (size: number) => void, initialSize: number, columnId: string }) {
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = initialSize

    const columnElements = document.querySelectorAll(`[data-column-id="${columnId}"]`)

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + delta)

      // Directly manipulate DOM for instant feedback without re-renders
      columnElements.forEach((el) => {
        (el as HTMLElement).style.width = `${newWidth}px`
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false)
      const delta = e.clientX - startXRef.current
      const finalWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + delta)

      // Clear inline styles before state update
      columnElements.forEach((el) => {
        (el as HTMLElement).style.width = ''
      })

      // Persist the final size
      onResize(finalWidth)

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={cn(
        'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group-hover:bg-primary/30',
        isResizing && 'bg-primary',
      )}
      onMouseDown={handleMouseDown}
      style={{ zIndex: 10 }}
    />
  )
}

export function TableHeaderCell({
  onSort,
  onResize,
  column,
  position,
  columnIndex,
  className,
  style,
  size,
}: { column: Column, onSort?: () => void, onResize?: (size: number) => void } & TableHeaderCellProps) {
  const store = usePageStoreContext()
  const order = useStore(store, state => state.orderBy?.[column.id] ?? null)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'flex w-full items-center justify-between shrink-0 p-2 relative group',
            position === 'first' && 'pl-4',
            position === 'last' && 'pr-4',
            className,
          )}
          style={style}
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
          {onResize && size && (
            <ResizeHandle onResize={onResize} initialSize={size} columnId={column.id} />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => copy(formatColumnSchema(column), 'Column schema copied to clipboard')}>
          Copy Schema
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
