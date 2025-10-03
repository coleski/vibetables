import type { DatabaseType } from '@conar/shared/enums/database-type'
import { prepareSql } from '@conar/shared/utils/helpers'
import { type } from 'arktype'

export const columnType = type({
  table: 'string',
  id: 'string',
  type: 'string',
  editable: 'boolean',
  default: 'string | null',
  nullable: 'boolean',
}).pipe(({ editable, nullable, ...rest }) => ({
  ...rest,
  isEditable: editable,
  isNullable: nullable,
}))

export function columnsSql(schema: string, table: string): Record<DatabaseType, string> {
  return {
    postgres: prepareSql(`
      SELECT
        c.table_name AS table,
        c.column_name AS id,
        c.column_default AS default,
        CASE
          WHEN "data_type" = 'ARRAY' THEN
            REPLACE("udt_name", '_', '') || '[]'
          WHEN "data_type" = 'USER-DEFINED' THEN
            "udt_name"
          WHEN "data_type" = 'character varying' THEN
            'varchar'
          WHEN "data_type" = 'character' THEN
            'char'
          WHEN "data_type" = 'bit varying' THEN
            'varbit'
          WHEN "data_type" LIKE 'time%' THEN
            "udt_name"
          ELSE
            COALESCE("data_type", "udt_name")
        END AS type,
        CASE
          WHEN c.is_nullable = 'YES' THEN true
          ELSE false
        END AS nullable,
        CASE
          WHEN c.is_updatable = 'YES' THEN true
          ELSE false
        END AS editable
      FROM information_schema.columns c
      WHERE c.table_schema = '${schema}'
        AND c.table_name = '${table}'
      ORDER BY c.ordinal_position;
    `),
    mysql: prepareSql(`
      SELECT
        TABLE_NAME as \`table\`,
        COLUMN_NAME as id,
        COLUMN_DEFAULT as \`default\`,
        COLUMN_TYPE as type,
        IF(IS_NULLABLE = 'YES', TRUE, FALSE) as nullable,
        TRUE as editable
      FROM information_schema.columns
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION;
    `),
    mssql: prepareSql(`
      SELECT
        s.name AS [schema],
        t.name AS [table],
        c.name AS id,
        CASE
          WHEN dc.definition IS NOT NULL THEN dc.definition
          ELSE NULL
        END AS [default],
        ty.name AS type,
        c.is_nullable AS nullable,
        CASE
          WHEN c.is_identity = 1 OR c.is_computed = 1 THEN CAST(0 AS BIT)
          ELSE CAST(1 AS BIT)
        END AS editable
      FROM sys.columns c
      INNER JOIN sys.tables t ON c.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      WHERE s.name = '${schema}'
        AND t.name = '${table}'
      ORDER BY c.column_id;
    `),
  }
}
