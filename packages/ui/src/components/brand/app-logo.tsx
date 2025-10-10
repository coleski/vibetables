import type { ComponentProps } from 'react'
import { AnimatedSmiley } from './animated-smiley'

export function AppLogo(props: ComponentProps<'svg'>) {
  return <AnimatedSmiley size={452} {...props} />
}
