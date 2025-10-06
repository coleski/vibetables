import type { WhereFilter } from '@conar/shared/sql/where'
import { Store } from '@tanstack/react-store'
import { type } from 'arktype'
import { createContext, use, useEffect, useState } from 'react'

export const storeState = type({
  selected: 'Record<string, string>[]',
  filters: type({
    column: 'string',
    operator: 'string',
    values: 'string[]',
  }).array() as type.cast<WhereFilter[]>,
  hiddenColumns: 'string[]',
  orderBy: {
    '[string]': '"ASC" | "DESC"',
  },
  prompt: 'string',
})

export function getPageStoreState(id: string, schema: string, table: string) {
  const parsed = storeState(JSON.parse(sessionStorage.getItem(`${id}.${schema}.${table}-store`) ?? '{}'))

  if (parsed instanceof type.errors)
    return null

  return parsed
}

const storesMap = new Map<string, Store<typeof storeState.infer>>()

export function createPageStore({ id, schema, table }: { id: string, schema: string, table: string }) {
  const key = `${id}.${schema}.${table}`

  if (storesMap.has(key)) {
    return storesMap.get(key)!
  }

  const store = new Store<typeof storeState.infer>(getPageStoreState(id, schema, table)
    ?? {
      selected: [],
      filters: [],
      prompt: '',
      hiddenColumns: [],
      orderBy: {},
    })

  store.subscribe((state) => {
    sessionStorage.setItem(`${key}-store`, JSON.stringify(state.currentVal))
  })

  storesMap.set(key, store)

  return store
}

export const PageStoreContext = createContext<Store<typeof storeState.infer>>(null!)

export function usePageStoreContext() {
  return use(PageStoreContext)
}

// Global query pane state
const QUERY_PANE_STORAGE_KEY = 'table-query-pane-open'
const QUERY_PANE_EVENT = 'query-pane-change'

export function getQueryPaneOpen(): boolean {
  const stored = localStorage.getItem(QUERY_PANE_STORAGE_KEY)
  return stored === 'true'
}

export function setQueryPaneOpen(open: boolean): void {
  localStorage.setItem(QUERY_PANE_STORAGE_KEY, String(open))
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent(QUERY_PANE_EVENT, { detail: open }))
}

// Custom hook to sync query pane state across components
export function useQueryPaneOpen() {
  const [isOpen, setIsOpen] = useState(getQueryPaneOpen())

  useEffect(() => {
    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setIsOpen(customEvent.detail)
    }

    window.addEventListener(QUERY_PANE_EVENT, handleChange)
    return () => window.removeEventListener(QUERY_PANE_EVENT, handleChange)
  }, [])

  return isOpen
}
