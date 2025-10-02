# MySQL Support Implementation Plan

## Phase 1: Foundation & Setup

### □ 1.1 Add MySQL to type system
- **File**: `packages/shared/src/enums/database-type.ts`
- **Change**: Add `MySQL = 'mysql'` to enum and `'MySQL'` to labels

### □ 1.2 Add MySQL connection protocols
- **File**: `packages/shared/src/utils/connections.ts`
- **Change**: Add `[DatabaseType.MySQL]: ['mysql']` to protocolMap

### □ 1.3 Install MySQL client library
- **Files**: `apps/desktop/package.json`, `apps/api/package.json`
- **Change**: Run `pnpm add mysql2` in both workspaces

### □ 1.4 Update database schema migration
- **File**: `apps/desktop/src/drizzle/schema/databases.ts`
- **Change**: Database already uses enum - migration will be needed to add 'mysql' to pg_enum

---

## Phase 2: MySQL Client Implementation

### □ 2.1 Create MySQL client for desktop app
- **File**: `apps/desktop/electron/main/mysql.ts` (NEW)
- **Change**: Create `mysqlQuery()` and `mysqlTestConnection()` functions similar to pg.ts

### □ 2.2 Create MySQL proxy for API
- **File**: `apps/api/src/orpc/routers/proxy/mysql.ts` (NEW)
- **Change**: Create `mysqlProxy` and `mysqlTestConnection` handlers similar to pg.ts

### □ 2.3 Wire up MySQL in desktop events
- **File**: `apps/desktop/electron/main/events.ts`
- **Change**: Import mysql handlers and add to queryMap (lines 24, 50)

### □ 2.4 Wire up MySQL in API proxy router
- **File**: `apps/api/src/orpc/routers/proxy/index.ts`
- **Change**: Import mysql handlers and add to databases object

---

## 🧪 CHECKPOINT 1: Test Connection
**Goal**: Verify MySQL connection works end-to-end
- Enable MySQL option in UI (temporarily remove `disabled` from create.tsx:68)
- Try creating a MySQL connection with a test database
- Verify connection test passes
- **Expected**: Connection succeeds, but queries will fail (SQL not implemented yet)

---

## Phase 3: SQL Query Builders - Metadata Queries

### □ 3.1 Tables and schemas query
- **File**: `packages/shared/src/sql/tables-and-schemas.ts`
- **Change**: Add `mysql` key with query using `information_schema.tables` and DATABASE() instead of schemas

### □ 3.2 Columns query
- **File**: `packages/shared/src/sql/columns.ts`
- **Change**: Add `mysql` key with backtick identifiers, handle MySQL-specific type names

### □ 3.3 Constraints query
- **File**: `packages/shared/src/sql/constraints.ts`
- **Change**: Add `mysql` key using `information_schema.table_constraints`

### □ 3.4 Foreign keys query
- **File**: `packages/shared/src/sql/foreign-keys.ts`
- **Change**: Add `mysql` key using `information_schema.key_column_usage`

### □ 3.5 Enums query
- **File**: `packages/shared/src/sql/enums.ts`
- **Change**: Add `mysql` key - query `information_schema.columns` where `COLUMN_TYPE LIKE 'enum%'`

---

## 🧪 CHECKPOINT 2: Test Schema Discovery
**Goal**: Verify we can browse MySQL database structure
- Connect to MySQL database with tables
- Navigate to database view
- **Expected**: See list of tables, can click into table details, see columns/constraints

---

## Phase 4: SQL Query Builders - Data Queries

### □ 4.1 Rows query (SELECT)
- **File**: `packages/shared/src/sql/rows.ts`
- **Change**: Add `mysql` key with backtick identifiers

### □ 4.2 Total/count query
- **File**: `packages/shared/src/sql/total.ts`
- **Change**: Add `mysql` key with backtick identifiers

### □ 4.3 Where clause builder
- **File**: `packages/shared/src/sql/where.ts`
- **Change**: Add `mysql` key - replace `ILIKE` with `LIKE` (MySQL is case-insensitive by default)

---

## 🧪 CHECKPOINT 3: Test Data Browsing
**Goal**: Verify we can view table data
- Open a MySQL table with data
- Apply filters and sorting
- Paginate through results
- **Expected**: Data displays correctly, filters work, pagination works

---

## Phase 5: SQL Query Builders - Data Modification

### □ 5.1 Update/set query
- **File**: `packages/shared/src/sql/set.ts`
- **Change**: Add `mysql` key - use `?` placeholders instead of `$1`, backtick identifiers

### □ 5.2 Delete query
- **File**: `packages/shared/src/sql/delete.ts`
- **Change**: Add `mysql` key with backtick identifiers

### □ 5.3 Drop table query
- **File**: `packages/shared/src/sql/drop-table.ts`
- **Change**: Add `mysql` key with backtick identifiers (no CASCADE in MySQL)

### □ 5.4 Rename table query
- **File**: `packages/shared/src/sql/rename-table.ts`
- **Change**: Add `mysql` key - use `RENAME TABLE` syntax instead of `ALTER TABLE...RENAME TO`

---

## 🧪 CHECKPOINT 4: Test Data Modification
**Goal**: Verify we can edit MySQL data
- Edit a cell value in a MySQL table
- Delete a row
- Try renaming a table
- Try dropping a table
- **Expected**: All mutations work correctly

---

## Phase 6: UI/UX Polish

### □ 6.1 Enable MySQL in create connection UI
- **File**: `apps/desktop/src/routes/(protected)/_protected/create.tsx`
- **Change**: Line 68 - change to `<ToggleGroupItem value={DatabaseType.MySQL}` and remove "disabled" and "(soon)"

### □ 6.2 Verify MySQL icon displays correctly
- **File**: `apps/desktop/src/entities/database/components/database-icon.tsx`
- **Change**: Verify MySQL case is handled (check if MySQLIcon is imported/used)

### □ 6.3 Test connection string parsing
- **File**: `packages/connection/src/parse-connection-string.ts`
- **Change**: Verify MySQL connection strings parse correctly (may need adjustments for MySQL-specific params)

---

## 🧪 CHECKPOINT 5: End-to-End Testing
**Goal**: Complete workflow test
- Create new MySQL connection from scratch
- Browse database structure
- Run custom SQL queries in SQL tab
- Edit table data
- Test all CRUD operations
- **Expected**: Full feature parity with Postgres

---

## Phase 7: Edge Cases & Error Handling

### □ 7.1 Handle MySQL-specific errors
- Test connection failures with better error messages
- Handle MySQL-specific syntax errors

### □ 7.2 Test MySQL-specific features
- Test ENUM columns
- Test AUTO_INCREMENT columns
- Test different MySQL data types (TINYINT, MEDIUMTEXT, etc.)

### □ 7.3 Test schema-less structure
- Verify behavior with MySQL's database-centric (vs schema-centric) structure

---

## 🧪 FINAL CHECKPOINT: Production Readiness
**Goal**: Verify production quality
- Test with real MySQL databases (local, cloud RDS, etc.)
- Test SSL connections
- Test with different MySQL versions (5.7, 8.0+)
- Performance test with large tables
- **Expected**: Stable, performant, ready to ship

---

## Notes:
- Each checkbox represents a discrete, completable task
- Checkpoints are integration tests - don't skip them!
- If a checkpoint fails, fix before moving to next phase
- Estimated total: ~15-20 tasks + 6 checkpoints
