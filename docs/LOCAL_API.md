# Local HTTP API for Claude Code Access

## Overview

This document outlines the plan to add a local HTTP API server to the Conar desktop app, allowing Claude Code (and other tools) to programmatically manage database connections.

## Architecture

```
Terminal (Claude Code)
    ↓ HTTP Request (curl/fetch)
Local HTTP Server (localhost:3999)
    ↓ IPC Event
Electron Main Process
    ↓ IPC Forward
Electron Renderer Process
    ↓ Direct Call
PGlite Database (IndexedDB)
```

## Why This Approach?

- ✅ **Same pattern as remote API**: Uses similar architecture to existing oRPC API
- ✅ **Terminal accessible**: Claude Code can use Bash tool to make HTTP requests
- ✅ **Self-documenting**: REST endpoints with JSON responses
- ✅ **Secure**: Localhost-only, optional auth token, dev-mode toggle
- ✅ **Extensible**: Can add more endpoints for queries, schemas, etc.
- ✅ **Type-safe**: Can reuse existing TypeScript types

## Security Considerations

1. **Dev Mode Only (Default)**: Only enabled in development builds
2. **Localhost Binding**: Server only listens on `127.0.0.1`
3. **Optional Auth Token**: Simple bearer token for additional security
4. **User Opt-in**: Requires explicit enabling in settings/menu
5. **Audit Logging**: All API calls logged to console

## API Endpoints

### Base URL
```
http://localhost:3999/api
```

### Authentication (Optional)
```
Authorization: Bearer <token>
```

---

### 1. Add Connection

**Endpoint:** `POST /api/connections`

**Request Body:**
```json
{
  "host": "us-east-4.pg.psdb.cloud",
  "user": "myuser",
  "password": "mypassword",
  "database": "postgres",
  "port": 5432,
  "name": "My Connection",
  "ssl": true,
  "type": "postgres"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "My Connection",
    "connectionString": "postgresql://...",
    "createdAt": "2025-10-02T15:00:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3999/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "user": "postgres",
    "password": "postgres",
    "database": "mydb",
    "port": 5432,
    "name": "Local Dev DB"
  }'
```

---

### 2. List Connections

**Endpoint:** `GET /api/connections`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Production DB",
      "type": "postgres",
      "host": "example.com",
      "database": "prod",
      "createdAt": "2025-10-02T15:00:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl http://localhost:3999/api/connections
```

---

### 3. Delete Connection

**Endpoint:** `DELETE /api/connections/:id`

**Response:**
```json
{
  "success": true,
  "message": "Connection deleted"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3999/api/connections/uuid-here
```

---

### 4. Test Connection

**Endpoint:** `POST /api/connections/test`

**Request Body:**
```json
{
  "connectionString": "postgresql://user:pass@host:5432/db"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connection successful",
  "serverVersion": "PostgreSQL 16.3"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Connection timeout"
}
```

---

## Implementation Plan

### Files to Create

1. **`apps/desktop/electron/main/api-server.ts`**
   - HTTP server using Node.js `http` module or `express`
   - Route handlers for each endpoint
   - Request validation
   - Error handling

2. **`apps/desktop/electron/main/connection-api.ts`**
   - IPC handler registration
   - Business logic for connection operations
   - Forwards requests to renderer via IPC

3. **`apps/desktop/src/lib/api-listener.ts`**
   - Renderer-side IPC listener
   - Calls `databasesCollection` methods
   - Returns results to main process

### Files to Modify

1. **`apps/desktop/electron/main/index.ts`**
   - Start API server on app ready
   - Add menu item to enable/disable API
   - Store API enabled state

2. **`apps/desktop/electron/main/events.ts`**
   - Register new IPC handlers for connection CRUD

3. **`apps/desktop/src/main.tsx`**
   - Initialize API listener on app start
   - Log API availability to console

## Implementation Steps

1. ✅ Document the API (this file)
2. ⬜ Create HTTP server in main process
3. ⬜ Add IPC handlers for connection operations
4. ⬜ Create renderer-side IPC listener
5. ⬜ Add menu toggle for API enable/disable
6. ⬜ Test all endpoints with curl
7. ⬜ Document usage examples for Claude Code

## Usage for Claude Code

Once implemented, Claude Code can:

```typescript
// Add a connection
const response = await fetch('http://localhost:3999/api/connections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'mydb',
    port: 5432,
    name: 'Dev Database'
  })
});
```

Or via Bash tool:
```bash
curl -X POST http://localhost:3999/api/connections \
  -H "Content-Type: application/json" \
  -d '{"host":"localhost","user":"postgres",...}'
```

## Future Enhancements

- Add query execution endpoint
- Add schema introspection endpoint
- Add export/import connections endpoint
- Add WebSocket support for real-time updates
- Add API key management UI

## Notes

- Server only runs when app is running
- Data persists in PGlite (IndexedDB)
- No external dependencies needed
- Compatible with offline mode
