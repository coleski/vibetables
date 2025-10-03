import type { ComponentProps, JSX } from 'react'
import { DatabaseType } from '@conar/shared/enums/database-type'
import { createElement } from 'react'
import { PostgresIcon } from '~/icons/postgres'
import { MySQLIcon } from '~/icons/mysql'

const iconMap: Record<DatabaseType, (props: ComponentProps<'svg'>) => JSX.Element> = {
  [DatabaseType.Postgres]: PostgresIcon,
  [DatabaseType.MySQL]: MySQLIcon,
}

export function DatabaseIcon({ type, ...props }: { type: DatabaseType } & ComponentProps<'svg'>) {
  return createElement(iconMap[type], props)
}
