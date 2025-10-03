import type { DatabaseType } from '@conar/shared/enums/database-type'
import { parseConnectionString } from '@conar/connection'
import { cn } from '@conar/ui/lib/utils'
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react'
import { useState } from 'react'

export function ConnectionDetails({ className, connectionString, type }: { className?: string, connectionString: string, type: DatabaseType }) {
  const config = parseConnectionString(connectionString)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <table className={cn('text-xs font-mono w-full border-collapse', className)}>
      <tbody>
        <tr>
          <td className="py-1 pr-4 text-muted-foreground">Type</td>
          <td data-mask>{type}</td>
        </tr>
        <tr>
          <td className="py-1 pr-4 text-muted-foreground">User</td>
          <td data-mask>{config.user}</td>
        </tr>
        {config.password && (
          <tr>
            <td className="py-1 pr-4 text-muted-foreground">Password</td>
            <td data-mask>
              <button
                type="button"
                className="p-1 rounded-md hover:bg-accent translate-y-0.4 cursor-pointer mr-2 inline-block [&_svg]:size-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
              {showPassword ? config.password : Array.from({ length: config.password.length }).map(() => '*').join('')}
            </td>
          </tr>
        )}
        <tr>
          <td className="py-1 pr-4 text-muted-foreground">Host</td>
          <td data-mask>{config.host}</td>
        </tr>
        <tr>
          <td className="py-1 pr-4 text-muted-foreground">Port</td>
          <td data-mask>{config.port}</td>
        </tr>
        <tr>
          <td className="py-1 pr-4 text-muted-foreground">Database</td>
          <td data-mask>{config.database}</td>
        </tr>
      </tbody>
    </table>
  )
}
