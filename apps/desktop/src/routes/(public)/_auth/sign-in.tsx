import { Button } from '@conar/ui/components/button'
import { Checkbox } from '@conar/ui/components/checkbox'
import { Label } from '@conar/ui/components/label'
import { Separator } from '@conar/ui/components/separator'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { enablePrivateMode } from '~/lib/private-mode'
import { AuthForm } from './-components/auth-form'

export const Route = createFileRoute('/(public)/_auth/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  const router = useRouter()
  const [dontAskAgain, setDontAskAgain] = useState(false)

  function handleUseWithoutAccount() {
    enablePrivateMode(dontAskAgain)
    router.navigate({ to: '/' })
  }

  return (
    <>
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Sign in to Conar
        </h1>
        <p className="text-sm text-muted-foreground">
          Don't have an account?
          {' '}
          <Link to="/sign-up">Sign up</Link>
        </p>
      </div>

      <div className="space-y-4">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleUseWithoutAccount}
        >
          Use without account
        </Button>

        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="dont-ask"
            checked={dontAskAgain}
            onCheckedChange={checked => setDontAskAgain(checked === true)}
          />
          <Label htmlFor="dont-ask" className="text-sm text-muted-foreground cursor-pointer">
            Don't ask me again
          </Label>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or sign in</span>
          </div>
        </div>
      </div>

      <AuthForm type="sign-in" />
    </>
  )
}
