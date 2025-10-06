import { title } from '@conar/shared/utils/title'
import { Button } from '@conar/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@conar/ui/components/card'
import { Input } from '@conar/ui/components/input'
import { Label } from '@conar/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@conar/ui/components/select'
import { RiAddLine, RiArrowLeftSLine, RiDeleteBinLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import { v7 } from 'uuid'
import { AiProvider, apiKeys, db } from '~/drizzle'
import { keychain } from '~/lib/keychain'
import { isPrivateMode } from '~/lib/private-mode'

export const Route = createFileRoute('/(protected)/_protected/settings/')({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: title('Settings') }],
  }),
})

const providerLabels = {
  [AiProvider.Anthropic]: 'Anthropic (Claude)',
}

// Only Anthropic is currently supported for private mode
const SUPPORTED_PROVIDERS = [AiProvider.Anthropic]

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
  const [provider, setProvider] = useState<AiProvider>(AiProvider.Anthropic)
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
        nickname: nickname || `${providerLabels[provider]}`,
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
    onError: (error) => {
      toast.error('Failed to delete API key', {
        description: error.message,
      })
    },
  })

  if (!privateMode) {
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
            Manage your AI provider API keys for local use in Private Mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Keys */}
          {keys.map(key => (
            <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{providerLabels[key.provider as AiProvider]}</div>
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
          {showForm
            ? (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label>Provider</Label>
                    <Select value={provider} onValueChange={v => setProvider(v as AiProvider)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_PROVIDERS.map(p => (
                          <SelectItem key={p} value={p}>{providerLabels[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Nickname (optional)</Label>
                    <Input
                      placeholder="My API Key"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
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
              )
            : (
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
