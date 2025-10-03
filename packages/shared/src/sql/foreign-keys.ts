import type { DatabaseType } from '@conar/shared/enums/database-type'
import { prepareSql } from '@conar/shared/utils/helpers'
import { type } from 'arktype'

export const foreignKeysType = type({
  table_schema: 'string',
  table_name: 'string',
  column_name: 'string',
  foreign_table_schema: 'string',
  foreign_table_name: 'string',
  foreign_column_name: 'string',
  constraint_name: 'string',
}).pipe(item => ({
  schema: item.table_schema,
  table: item.table_name,
  column: item.column_name,
  foreignSchema: item.foreign_table_schema,
  foreignTable: item.foreign_table_name,
  foreignColumn: item.foreign_column_name,
  name: item.constraint_name,
}))

export function foreignKeysSql(): Record<DatabaseType, string> {
  return {
    postgres: prepareSql(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.constraint_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `),
    mysql: prepareSql(`
      SELECT
        kcu.TABLE_SCHEMA as table_schema,
        kcu.TABLE_NAME as table_name,
        kcu.COLUMN_NAME as column_name,
        kcu.CONSTRAINT_NAME as constraint_name,
        kcu.REFERENCED_TABLE_SCHEMA as foreign_table_schema,
        kcu.REFERENCED_TABLE_NAME as foreign_table_name,
        kcu.REFERENCED_COLUMN_NAME as foreign_column_name
      FROM information_schema.key_column_usage kcu
      WHERE kcu.TABLE_SCHEMA = DATABASE()
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL;
    `),
    mssql: prepareSql(`
      SELECT
        OBJECT_SCHEMA_NAME(f.parent_object_id) AS table_schema,
        OBJECT_NAME(f.parent_object_id) AS table_name,
        COL_NAME(fc.parent_object_id, fc.parent_column_id) AS column_name,
        f.name AS constraint_name,
        OBJECT_SCHEMA_NAME(f.referenced_object_id) AS foreign_table_schema,
        OBJECT_NAME(f.referenced_object_id) AS foreign_table_name,
        COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS foreign_column_name
      FROM sys.foreign_keys AS f
      INNER JOIN sys.foreign_key_columns AS fc
        ON f.object_id = fc.constraint_object_id;
    `),
  }
}
