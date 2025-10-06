import type { RefObject } from 'react'
import { buildConnectionString, parseConnectionString } from '@conar/connection'
import { DatabaseType } from '@conar/shared/enums/database-type'
import { getProtocols } from '@conar/shared/utils/connections'
import { Input } from '@conar/ui/components/input'
import { Label } from '@conar/ui/components/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@conar/ui/components/tabs'
import { useId } from 'react'

const defaultPorts: Record<DatabaseType, string> = {
  [DatabaseType.Postgres]: '5432',
  [DatabaseType.MySQL]: '3306',
  [DatabaseType.MSSQL]: '1433',
}

export function ConnectionFields({
  ref,
  type,
  connectionString,
  setConnectionString,
  individualFields,
  setIndividualFields,
  onConnectionChange,
}: {
  ref?: RefObject<HTMLInputElement | null>
  type: DatabaseType
  connectionString: string
  setConnectionString: (connectionString: string) => void
  individualFields: { host: string, port: string, user: string, password: string, database: string }
  setIndividualFields: (fields: { host: string, port: string, user: string, password: string, database: string }) => void
  onConnectionChange?: () => void
}) {
  const connectionStringId = useId()
  const hostId = useId()
  const portId = useId()
  const userId = useId()
  const passwordId = useId()
  const databaseId = useId()

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value)
    onConnectionChange?.()

    // Parse and update individual fields
    try {
      const parsed = parseConnectionString(value)
      setIndividualFields({
        host: parsed.host || '',
        port: parsed.port?.toString() || defaultPorts[type],
        user: parsed.user || '',
        password: parsed.password || '',
        database: parsed.database || '',
      })
    }
    catch {
      // Ignore parsing errors during typing
    }
  }

  const handleFieldChange = (field: keyof typeof individualFields, value: string) => {
    const newFields = { ...individualFields, [field]: value }
    setIndividualFields(newFields)
    onConnectionChange?.()

    // Build and update connection string
    const protocol = getProtocols(type)[0]
    const config = {
      host: newFields.host || undefined,
      port: newFields.port ? Number.parseInt(newFields.port, 10) : undefined,
      user: newFields.user || undefined,
      password: newFields.password || undefined,
      database: newFields.database || undefined,
    }
    setConnectionString(buildConnectionString(config, protocol))
  }

  return (
    <Tabs defaultValue="string" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="string">Connection string</TabsTrigger>
        <TabsTrigger value="fields">Individual fields</TabsTrigger>
      </TabsList>
      <TabsContent value="string" className="space-y-4">
        <div>
          <Label htmlFor={connectionStringId} className="mb-2">
            Connection string
          </Label>
          <Input
            id={connectionStringId}
            placeholder={`${getProtocols(type)[0]}://user:password@host:port/database?options`}
            ref={ref}
            value={connectionString}
            onChange={e => handleConnectionStringChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
              }
            }}
          />
        </div>
      </TabsContent>
      <TabsContent value="fields" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={hostId} className="mb-2">
              Host
            </Label>
            <Input
              id={hostId}
              placeholder="localhost"
              value={individualFields.host}
              onChange={e => handleFieldChange('host', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={portId} className="mb-2">
              Port
            </Label>
            <Input
              id={portId}
              placeholder={defaultPorts[type]}
              value={individualFields.port}
              onChange={e => handleFieldChange('port', e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={userId} className="mb-2">
            User
          </Label>
          <Input
            id={userId}
            placeholder="username"
            value={individualFields.user}
            onChange={e => handleFieldChange('user', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={passwordId} className="mb-2">
            Password
          </Label>
          <Input
            id={passwordId}
            type="password"
            placeholder="password"
            value={individualFields.password}
            onChange={e => handleFieldChange('password', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={databaseId} className="mb-2">
            Database
          </Label>
          <Input
            id={databaseId}
            placeholder="database"
            value={individualFields.database}
            onChange={e => handleFieldChange('database', e.target.value)}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
