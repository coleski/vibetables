# Local API Keys Implementation Guide

## 🎯 Goal
Add support for users to store their own AI API keys locally in private mode, enabling AI features without a cloud account.

## 📋 Implementation Steps

---

## Phase 1: Dependencies & Foundation

### Step 1.1: Install Dependencies
```bash
cd apps/desktop
pnpm add keytar @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google @ai-sdk/xai ai
pnpm add -D @types/keytar
```

**✅ Checkpoint:** Dependencies installed without errors

---

### Step 1.2: Create Database Schema

**File:** `apps/desktop/src/drizzle/schema/api-keys.ts`

```typescript
import { pgEnum, pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const aiProviders = pgEnum('ai_provider', [
  'anthropic',
  'openai',
  'google',
  'xai'
])

export const apiKeys = pgTable('api_keys', {
  id: text().primaryKey(),
  provider: aiProviders().notNull(),
  nickname: text(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
```

**✅ Checkpoint:** File created, no TypeScript errors

---

### Step 1.3: Create Migration

**File:** `apps/desktop/src/drizzle/migrations/0006_add_api_keys_table.sql`

```sql
DO $$ BEGIN
 CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google', 'xai');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" "ai_provider" NOT NULL,
  "nickname" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**File:** `apps/desktop/src/drizzle/migrations/meta/0006_snapshot.json`

```json
{
  "id": "0006",
  "prevId": "0005",
  "version": "7",
  "dialect": "postgresql",
  "tables": {
    "api_keys": {
      "name": "api_keys",
      "columns": {
        "id": { "name": "id", "type": "text", "primaryKey": true, "notNull": true },
        "provider": { "name": "provider", "type": "ai_provider", "primaryKey": false, "notNull": true },
        "nickname": { "name": "nickname", "type": "text", "primaryKey": false, "notNull": false },
        "is_active": { "name": "is_active", "type": "boolean", "primaryKey": false, "notNull": true, "default": true },
        "created_at": { "name": "created_at", "type": "timestamp", "primaryKey": false, "notNull": true, "default": "now()" },
        "updated_at": { "name": "updated_at", "type": "timestamp", "primaryKey": false, "notNull": true, "default": "now()" }
      }
    }
  },
  "enums": {
    "ai_provider": {
      "name": "ai_provider",
      "values": ["anthropic", "openai", "google", "xai"]
    }
  }
}
```

Update `apps/desktop/src/drizzle/migrations/meta/_journal.json`:
```json
{
  "entries": [
    // ... existing entries
    {
      "idx": 6,
      "version": "7",
      "when": 1234567890,
      "tag": "0006_add_api_keys_table",
      "breakpoints": true
    }
  ]
}
```

**✅ Checkpoint:**
- Migration files created
- Run the app, check that migration runs without errors
- Verify `api_keys` table exists in the database

---

### Step 1.4: Export Schema

**File:** `apps/desktop/src/drizzle/index.ts`

Add export:
```typescript
export * from './schema/api-keys'
```

**✅ Checkpoint:** No import errors when running app

---

## Phase 2: Keychain Integration

### Step 2.1: Create Keychain Wrapper

**File:** `apps/desktop/src/lib/keychain.ts`

```typescript
import * as keytar from 'keytar'

const SERVICE_NAME = 'com.conar.api-keys'

export const keychain = {
  /**
   * Store an API key in the OS keychain
   */
  async set(id: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, id, apiKey)
  },

  /**
   * Retrieve an API key from the OS keychain
   */
  async get(id: string): Promise<string | null> {
    return await keytar.getPassword(SERVICE_NAME, id)
  },

  /**
   * Delete an API key from the OS keychain
   */
  async delete(id: string): Promise<boolean> {
    return await keytar.deletePassword(SERVICE_NAME, id)
  },

  /**
   * Get the active key for a provider
   */
  async getActiveKey(provider: 'anthropic' | 'openai' | 'google' | 'xai'): Promise<string | null> {
    // This will be populated from the database to find the active key ID
    return await this.get(`active-${provider}`)
  }
}
```

**✅ Checkpoint: Manual Test**

Open DevTools console in the running app and test:

```javascript
// Test storing a key
await window.require('keytar').setPassword('com.conar.api-keys', 'test-key', 'sk-test-123')

// Test retrieving a key
const key = await window.require('keytar').getPassword('com.conar.api-keys', 'test-key')
console.log('Retrieved key:', key) // Should output: sk-test-123

// Test deleting a key
await window.require('keytar').deletePassword('com.conar.api-keys', 'test-key')
```

Expected: All operations succeed without errors

---

## Phase 3: AI Helper

### Step 3.1: Create AI Helper

**File:** `apps/desktop/src/lib/ai-helper.ts`

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { xai } from '@ai-sdk/xai'
import { keychain } from './keychain'
import { isPrivateMode } from './private-mode'
import { db, apiKeys } from '~/drizzle'
import { eq } from 'drizzle-orm'

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'xai'

const modelClients = {
  anthropic: (apiKey: string) => anthropic(apiKey),
  openai: (apiKey: string) => openai(apiKey),
  google: (apiKey: string) => google(apiKey),
  xai: (apiKey: string) => xai(apiKey),
}

const defaultModels = {
  anthropic: 'claude-3-7-sonnet-20250219',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-pro',
  xai: 'grok-3',
}

/**
 * Get AI model for the given provider
 * Returns null if in cloud mode or no key configured
 */
export async function getLocalAiModel(provider: AiProvider = 'anthropic') {
  if (!isPrivateMode()) {
    return null // Use cloud API instead
  }

  // Find active key for this provider
  const activeKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.provider, provider))
    .where(eq(apiKeys.isActive, true))
    .limit(1)
    .then(rows => rows[0])

  if (!activeKey) {
    throw new Error(`No active ${provider} API key configured. Please add one in Settings.`)
  }

  // Get actual key from keychain
  const apiKey = await keychain.get(activeKey.id)

  if (!apiKey) {
    throw new Error(`API key not found in keychain. Please reconfigure in Settings.`)
  }

  // Return AI SDK client
  const client = modelClients[provider](apiKey)
  return client(defaultModels[provider])
}

/**
 * Check if local AI is available (private mode + has keys)
 */
export async function hasLocalAiKey(provider: AiProvider = 'anthropic'): Promise<boolean> {
  if (!isPrivateMode()) return false

  try {
    const activeKey = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.provider, provider))
      .where(eq(apiKeys.isActive, true))
      .limit(1)
      .then(rows => rows[0])

    if (!activeKey) return false

    const apiKey = await keychain.get(activeKey.id)
    return !!apiKey
  } catch {
    return false
  }
}
```

**✅ Checkpoint:** File created, no TypeScript errors

---

## Phase 4: Settings UI

### Step 4.1: Create Settings Page Route

**File:** `apps/desktop/src/routes/(protected)/_protected/settings/index.tsx`

```typescript
import { title } from '@conar/shared/utils/title'
import { Button } from '@conar/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@conar/ui/components/card'
import { Input } from '@conar/ui/components/input'
import { Label } from '@conar/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@conar/ui/components/select'
import { RiAddLine, RiArrowLeftSLine, RiDeleteBinLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { v7 } from 'uuid'
import { db, apiKeys, type aiProviders } from '~/drizzle'
import { keychain } from '~/lib/keychain'
import { isPrivateMode } from '~/lib/private-mode'
import { eq } from 'drizzle-orm'

export const Route = createFileRoute('/(protected)/_protected/settings/')({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: title('Settings') }],
  }),
})

function SettingsPage() {
  const router = useRouter()
  const privateMode = isPrivateMode()

  // Fetch API keys from database
  const { data: keys = [], refetch } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      return await db.select().from(apiKeys)
    },
  })

  const [showForm, setShowForm] = useState(false)
  const [provider, setProvider] = useState<typeof aiProviders.$inferSelect>('anthropic')
  const [nickname, setNickname] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  // Add API key
  const { mutate: addKey, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      const id = v7()

      // Store key in keychain
      await keychain.set(id, apiKey)

      // Store metadata in database
      await db.insert(apiKeys).values({
        id,
        provider,
        nickname: nickname || `${provider} key`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    },
    onSuccess: () => {
      toast.success('API key added successfully')
      setShowForm(false)
      setNickname('')
      setApiKey('')
      refetch()
    },
    onError: (error) => {
      toast.error('Failed to add API key', {
        description: error.message,
      })
    },
  })

  // Delete API key
  const { mutate: deleteKey } = useMutation({
    mutationFn: async (id: string) => {
      await keychain.delete(id)
      await db.delete(apiKeys).where(eq(apiKeys.id, id))
    },
    onSuccess: () => {
      toast.success('API key deleted')
      refetch()
    },
  })

  if (!privateMode) {
    return (
      <div className="min-h-screen flex flex-col px-6 mx-auto max-w-2xl py-10">
        <h1 className="text-4xl font-bold mb-6">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              API key management is only available in Private Mode.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 mx-auto max-w-2xl py-10">
      <Button
        type="button"
        variant="link"
        className="px-0! text-muted-foreground mb-6 w-fit"
        onClick={() => router.history.back()}
      >
        <RiArrowLeftSLine className="size-3" />
        Back
      </Button>

      <h1 className="text-4xl font-bold mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI API Keys</CardTitle>
          <CardDescription>
            Manage your AI provider API keys for local use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Keys */}
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium capitalize">{key.provider}</div>
                <div className="text-sm text-muted-foreground">{key.nickname}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteKey(key.id)}
              >
                <RiDeleteBinLine className="size-4" />
              </Button>
            </div>
          ))}

          {/* Add Key Form */}
          {showForm ? (
            <div className="space-y-4 p-4 border rounded-lg">
              <div>
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                    <SelectItem value="xai">xAI (Grok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nickname (optional)</Label>
                <Input
                  placeholder="My API Key"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <div>
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <RiEyeOffLine /> : <RiEyeLine />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => addKey()} disabled={!apiKey || isAdding}>
                  Save Key
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              <RiAddLine />
              Add API Key
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**✅ Checkpoint: Test Settings UI**

1. Navigate to `/settings` in the app
2. Add a test API key (use a fake key like `sk-test-123456`)
3. Verify it appears in the list
4. Delete the key
5. Verify it's removed from the list

---

### Step 4.2: Add Settings Link to Navigation

**File:** `apps/desktop/src/entities/user/components/user-button.tsx`

Add settings menu item:

```typescript
import { RiSettings3Line } from '@remixicon/react'
import { Link } from '@tanstack/react-router'

// Inside the DropdownMenuContent:
<DropdownMenuItem asChild>
  <Link to="/settings">
    <RiSettings3Line />
    Settings
  </Link>
</DropdownMenuItem>
```

**✅ Checkpoint:** Settings link appears in user dropdown menu

---

## Phase 5: Integrate Local AI

### Step 5.1: Update Chat to Use Local AI

**File:** `apps/desktop/src/routes/(protected)/_protected/database/$id/sql/-chat.ts`

```typescript
import { streamText } from 'ai'
import { getLocalAiModel, hasLocalAiKey } from '~/lib/ai-helper'

// In the createChat function, modify sendMessages:
async sendMessages(options) {
  const lastMessage = options.messages.at(-1)
  if (!lastMessage) throw new Error('Last message not found')

  // ... existing code for message handling ...

  // Check if we should use local AI
  const hasLocalKey = await hasLocalAiKey('anthropic')

  if (hasLocalKey) {
    // Use local AI with user's key
    const model = await getLocalAiModel('anthropic')

    const result = await streamText({
      model,
      messages: [
        {
          role: 'system',
          content: [
            `You are an SQL tool that generates valid SQL code for ${database.type} database.`,
            // ... existing system prompt ...
            'Database schemas and tables:',
            JSON.stringify(await queryClient.ensureQueryData(tablesAndSchemasQuery({ database })), null, 2),
          ].join('\n'),
        },
        ...options.messages.map(m => ({
          role: m.role,
          content: m.content,
          experimental_attachments: m.experimental_attachments,
        })),
      ],
      abortSignal: options.abortSignal,
    })

    return result.toDataStreamResponse()
  }

  // Fallback to cloud API
  return eventIteratorToStream(await orpc.ai.ask({
    ...options.body,
    id: options.chatId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    type: database.type,
    databaseId: database.id,
    prompt: lastMessage,
    trigger: options.trigger,
    messageId: options.messageId,
    context: [
      `Current query in the SQL runner: ${pageStore.state.query.trim() || 'Empty'}`,
      'Database schemas and tables:',
      JSON.stringify(await queryClient.ensureQueryData(tablesAndSchemasQuery({ database })), null, 2),
    ].join('\n'),
  }, { signal: options.abortSignal }))
}
```

**✅ Checkpoint: Test Local AI Chat**

1. In Private Mode, add an Anthropic API key in Settings (use a real key for testing)
2. Go to SQL chat
3. Send a message like "Generate a SELECT query for users table"
4. Verify response comes from Anthropic using your local key
5. Check DevTools Network tab - should NOT see requests to your cloud API

---

### Step 5.2: Update Chat Header Title Generation

**File:** `apps/desktop/src/routes/(protected)/_protected/database/$id/sql/-components/chat-header.tsx`

```typescript
import { generateText } from 'ai'
import { getLocalAiModel, hasLocalAiKey } from '~/lib/ai-helper'

// In the useAsyncEffect:
useAsyncEffect(async () => {
  if (!shouldGenerateTitle) return

  const hasLocalKey = await hasLocalAiKey('anthropic')

  let title: string

  if (hasLocalKey) {
    // Use local AI
    const model = await getLocalAiModel('anthropic')
    const result = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'Generate a short title (3-5 words) for this chat based on the user message.',
        },
        {
          role: 'user',
          content: messages[0].content,
        },
      ],
    })
    title = result.text
  } else {
    // Use cloud API
    title = await orpc.ai.generateTitle({
      chatId: chat.id,
      messages: messages as AppUIMessage[],
    })
  }

  chatsCollection.update(chat.id, (draft) => {
    draft.title = title
  })
}, [shouldGenerateTitle])
```

**✅ Checkpoint: Test Title Generation**

1. In Private Mode with API key configured
2. Start a new chat
3. Send first message
4. Verify chat title is generated using local AI
5. Title should appear without cloud API request

---

## Phase 6: Optional Enhancements

### Step 6.1: Add Key Validation

Test if API key works before saving:

```typescript
// In settings page, add validation mutation:
const { mutate: validateKey, isPending: isValidating } = useMutation({
  mutationFn: async () => {
    const client = modelClients[provider](apiKey)
    const model = client(defaultModels[provider])

    await generateText({
      model,
      messages: [{ role: 'user', content: 'Say "OK" if you can read this.' }],
      maxTokens: 10,
    })
  },
  onSuccess: () => {
    toast.success('API key is valid!')
  },
  onError: () => {
    toast.error('Invalid API key')
  },
})
```

**✅ Checkpoint:** Test button validates key before saving

---

### Step 6.2: Add Empty State in Chat

When no API key is configured in private mode, show helpful message:

```typescript
// In chat UI, check if key exists:
const hasKey = await hasLocalAiKey('anthropic')

if (!hasKey && isPrivateMode()) {
  return (
    <div className="text-center p-8">
      <p className="text-muted-foreground mb-4">
        AI features require an API key in Private Mode
      </p>
      <Button asChild>
        <Link to="/settings">Configure API Keys</Link>
      </Button>
    </div>
  )
}
```

**✅ Checkpoint:** Empty state shows when no keys configured

---

## 🎉 Final Testing Checklist

### Cloud Mode (With Account):
- [ ] AI chat works using cloud API
- [ ] Settings page shows "API keys only in private mode"
- [ ] No keychain operations happen

### Private Mode (No Account):
- [ ] Can add API keys in Settings
- [ ] Keys are stored in OS keychain (check Keychain Access on macOS)
- [ ] Keys are retrieved and used for AI chat
- [ ] Chat title generation works with local AI
- [ ] Can delete API keys
- [ ] Error shown if no key configured and trying to use AI

### Security:
- [ ] API keys never visible in DevTools Network tab
- [ ] Keys stored in OS keychain (not in database)
- [ ] Only metadata in database (provider, nickname, etc.)
- [ ] Keys masked in UI (show/hide toggle works)

---

## 🐛 Troubleshooting

### Issue: "Module not found: keytar"
**Solution:** Rebuild native modules:
```bash
cd apps/desktop
pnpm rebuild keytar
```

### Issue: "Cannot read password from keychain"
**Solution:** Check OS permissions:
- **macOS:** Grant Keychain Access permission
- **Windows:** Check Credential Manager access
- **Linux:** Install `libsecret-1-dev`

### Issue: "AI request fails with 401"
**Solution:** Check that you're in private mode and key is valid:
```javascript
// In DevTools console:
const key = await window.require('keytar').getPassword('com.conar.api-keys', 'your-key-id')
console.log('Key exists:', !!key)
```

---

## 📚 Additional Resources

- [Keytar Documentation](https://github.com/atom/node-keytar)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
