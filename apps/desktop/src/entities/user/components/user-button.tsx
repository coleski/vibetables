import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@conar/ui/components/dropdown-menu'
import { RiLoginBoxLine, RiLogoutCircleRLine, RiSettings3Line, RiShieldCheckLine } from '@remixicon/react'
import { Link, useRouter } from '@tanstack/react-router'
import { disablePrivateMode, isPrivateMode } from '~/lib/private-mode'
import { useSignOut } from '../hooks/use-sign-out'
import { UserAvatar } from './user-avatar'

export function UserButton() {
  const { data, signOut, isSigningOut } = useSignOut()
  const router = useRouter()
  const privateMode = isPrivateMode()

  function handleSignIn() {
    disablePrivateMode()
    router.navigate({ to: '/sign-in' })
  }

  if (privateMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-md size-8 flex items-center justify-center bg-accent">
          <RiShieldCheckLine className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" side="right" align="end">
          <div className="flex items-center gap-2 h-10 px-2 mt-1 mb-2">
            <div className="size-8 rounded-full bg-accent flex items-center justify-center">
              <RiShieldCheckLine className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col leading-0">
              <span className="text-sm font-medium">
                Private Mode
              </span>
              <span className="text-xs text-muted-foreground">
                Local connections only
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <RiSettings3Line />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignIn}>
            <RiLoginBoxLine />
            Sign in
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-md size-8">
        <UserAvatar className="size-full" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" side="right" align="end">
        <div className="flex items-center gap-2 h-10 px-2 mt-1 mb-2">
          <UserAvatar className="size-8" />
          <div className="flex flex-col leading-0">
            <span className="text-sm font-medium">
              {data?.user.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.user.email}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={() => signOut()}
        >
          <RiLogoutCircleRLine />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
