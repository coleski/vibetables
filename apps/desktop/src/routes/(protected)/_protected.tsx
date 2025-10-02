import { getOS } from '@conar/shared/utils/os'
import { useNetwork } from '@conar/ui/hookas/use-network'
import { useKeyboardEvent } from '@react-hookz/web'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useChatsMessagesSync, useChatsSync } from '~/entities/chat/sync'
import { useDatabasesSync } from '~/entities/database'
import { useQueriesSync } from '~/entities/query/sync'
import { authClient } from '~/lib/auth'
import { isPrivateMode } from '~/lib/private-mode'
import { ActionsCenter } from './-components/actions-center'

const os = getOS(navigator.userAgent)

export const Route = createFileRoute('/(protected)/_protected')({
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { data } = authClient.useSession()
  const router = useRouter()
  const { online } = useNetwork()
  const offlineMode = isPrivateMode()

  const { sync: syncDatabases } = useDatabasesSync()
  const { sync: syncQueries } = useQueriesSync()
  const { sync: syncChats } = useChatsSync()
  const { sync: syncChatsMessages } = useChatsMessagesSync()

  useEffect(() => {
    // Skip sync if offline mode is enabled
    if (offlineMode || !data?.user || !online)
      return

    syncDatabases()
    syncChats()
    syncChatsMessages()
    syncQueries()
  }, [offlineMode, data?.user, online, syncDatabases, syncQueries, syncChats, syncChatsMessages])

  useKeyboardEvent(e => e.key === 'n' && (os.type === 'macos' ? e.metaKey : e.ctrlKey), () => {
    router.navigate({ to: '/create' })
  })

  return (
    <>
      <ActionsCenter />
      <Outlet />
    </>
  )
}
