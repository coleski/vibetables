import type { Column } from '~/entities/database/table'

export const selectSymbol = Symbol('table-selection')

export const columnsSizeMap = new Map<string, number>([
  ['boolean', 160],
  ['number', 170],
  ['integer', 150],
  ['bigint', 170],
  ['timestamp', 240],
  ['timestamptz', 240],
  ['float', 170],
  ['uuid', 290],
])

export function formatColumnSchema(column: Column): string {
  const parts: string[] = []

  // Column name and type
  parts.push(`${column.id} ${column.type ?? 'unknown'}`)

  // Primary key
  if (column.primaryKey) {
    parts.push('PRIMARY KEY')
  }

  // Nullable
  if (column.isNullable === false) {
    parts.push('NOT NULL')
  }

  // Unique
  if (column.unique) {
    parts.push('UNIQUE')
  }

  // Foreign key
  if (column.foreign) {
    parts.push(`REFERENCES ${column.foreign.schema}.${column.foreign.table}(${column.foreign.column})`)
  }

  return parts.join(' ')
}

export function formatTableSchema(tableName: string, schemaName: string, columns: Column[]): string {
  const lines: string[] = []

  lines.push(`Table: ${schemaName}.${tableName}`)
  lines.push('')

  columns.forEach((column) => {
    lines.push(formatColumnSchema(column))
  })

  return lines.join('\n')
}
