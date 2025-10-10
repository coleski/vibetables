import type { ComponentProps } from 'react'
import { AnimatedSmiley } from './animated-smiley'

export function AppLogoSquare(props: ComponentProps<'svg'>) {
  return <AnimatedSmiley size={824} {...props} />
}
