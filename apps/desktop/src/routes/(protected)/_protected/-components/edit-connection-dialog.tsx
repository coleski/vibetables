import type { databases } from '~/drizzle'
import { parseConnectionString } from '@conar/connection'
import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@conar/ui/components/dialog'
import { useMutation } from '@tanstack/react-query'
import posthog from 'posthog-js'
import { useEffect, useImperativeHandle, useState } from 'react'
import { toast } from 'sonner'
import { ConnectionFields } from '~/components/connection-fields'
import { databasesCollection } from '~/entities/database'
import { dbTestConnection } from '~/lib/query'

interface EditConnectionDialogProps {
  ref?: React.RefObject<{
    edit: (database: typeof databases.$inferSelect) => void
  } | null>
}

const defaultPorts: Record<string, string> = {
  postgres: '5432',
  mysql: '3306',
  mssql: '1433',
}

export function EditConnectionDialog({ ref }: EditConnectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [database, setDatabase] = useState<typeof databases.$inferSelect | null>(null)
  const [connectionString, setConnectionString] = useState('')
  const [individualFields, setIndividualFields] = useState({
    host: '',
    port: '5432',
    user: '',
    password: '',
    database: '',
  })

  useImperativeHandle(ref, () => ({
    edit: (db: typeof databases.$inferSelect) => {
      setDatabase(db)
      setConnectionString(db.connectionString)

      // Parse the connection string to populate individual fields
      try {
        const parsed = parseConnectionString(db.connectionString)
        setIndividualFields({
          host: parsed.host || '',
          port: parsed.port?.toString() || defaultPorts[db.type] || '5432',
          user: parsed.user || '',
          password: parsed.password || '',
          database: parsed.database || '',
        })
      }
      catch (error) {
        console.error('Failed to parse connection string:', error)
      }

      setOpen(true)
      reset()
    },
  }), [])

  const { mutate: testConnection, reset, status } = useMutation({
    mutationFn: dbTestConnection,
    onSuccess: () => {
      toast.success('Connection successful')
    },
    onError: (error) => {
      posthog.capture('connection_test_failed', {
        error: error.message,
      })
      toast.error('We couldn\'t connect to the database', {
        description: error.message,
      })
    },
  })

  function saveConnection() {
    if (!database)
      return

    const password = parseConnectionString(connectionString.trim()).password

    databasesCollection.update(database.id, (draft) => {
      draft.connectionString = connectionString.trim()
      draft.isPasswordExists = !!password
      draft.isPasswordPopulated = !!password
      draft.updatedAt = new Date()
    })

    toast.success('Connection updated successfully')
    setOpen(false)
  }

  const canSave = status === 'success' && connectionString.trim() !== '' && connectionString !== database?.connectionString

  // Reset test status when connection changes
  useEffect(() => {
    reset()
  }, [connectionString, reset])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <div className="space-y-4 pt-4">
            {database && (
              <ConnectionFields
                type={database.type}
                connectionString={connectionString}
                setConnectionString={setConnectionString}
                individualFields={individualFields}
                setIndividualFields={setIndividualFields}
                onConnectionChange={reset}
              />
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {status === 'success'
            ? (
                <Button
                  disabled={!canSave}
                  onClick={saveConnection}
                >
                  Save Connection
                </Button>
              )
            : (
                <Button
                  disabled={status === 'pending' || !connectionString.trim()}
                  onClick={() => database && testConnection({ type: database.type, connectionString: connectionString.trim() })}
                >
                  <LoadingContent loading={status === 'pending'}>
                    {status === 'error' ? 'Try again' : 'Test connection'}
                  </LoadingContent>
                </Button>
              )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
