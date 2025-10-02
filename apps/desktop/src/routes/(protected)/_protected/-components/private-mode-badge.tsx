import { Badge } from '@conar/ui/components/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@conar/ui/components/tooltip'
import { RiShieldCheckLine } from '@remixicon/react'

export function PrivateModeBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="gap-1.5 px-2 py-1">
          <RiShieldCheckLine className="size-3.5" />
          Private Mode
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="bg-foreground text-background border-foreground">
        <p>Your connections are stored locally. Sign in to sync across devices.</p>
      </TooltipContent>
    </Tooltip>
  )
}
