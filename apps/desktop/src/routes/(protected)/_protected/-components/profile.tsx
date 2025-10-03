import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Skeleton } from '@conar/ui/components/skeleton'
import { cn } from '@conar/ui/lib/utils'
import { RiLogoutBoxLine, RiShieldCheckLine } from '@remixicon/react'
import { UserAvatar, useSignOut } from '~/entities/user'
import { disablePrivateMode, isPrivateMode } from '~/lib/private-mode'
import { useRouter } from '@tanstack/react-router'

export function Profile({ className }: { className?: string }) {
  const { data, signOut, isSigningOut } = useSignOut()
  const router = useRouter()
  const privateMode = isPrivateMode()

  function handleExitPrivateMode() {
    disablePrivateMode()
    router.navigate({ to: '/sign-in' })
  }

  if (privateMode) {
    return (
      <div className={cn('flex flex-row items-center justify-between', className)}>
        <div className="flex flex-row items-center gap-4">
          <div className="size-16 rounded-full bg-accent flex items-center justify-center">
            <RiShieldCheckLine className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Private Mode</h3>
            <p className="text-sm text-muted-foreground">Local connections only</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExitPrivateMode}
        >
          Sign in
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-row items-center justify-between', className)}>
      <div className="flex flex-row items-center gap-4">
        <UserAvatar className="size-16" fallbackClassName="text-2xl" />
        <div>
          {data?.user
            ? (
                <>
                  <h3 className="text-2xl font-semibold">{data.user.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{data.user.email}</p>
                </>
              )
            : (
                <>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-50 bg-accent/70" />
                    <Skeleton className="h-4 w-32 bg-accent/70" />
                  </div>
                </>
              )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut()}
        disabled={isSigningOut}
      >
        <LoadingContent loading={isSigningOut}>
          <RiLogoutBoxLine />
          Sign out
        </LoadingContent>
      </Button>
    </div>
  )
}
