import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'

type SmileyState = 'normal' | 'blink' | 'yawn' | 'hover'

interface AnimatedSmileyProps extends ComponentProps<'svg'> {
  size?: number
}

export function AnimatedSmiley({ size = 452, ...props }: AnimatedSmileyProps) {
  const [state, setState] = useState<SmileyState>('normal')
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const scheduleNextAnimation = () => {
      // Random delay between 3-6 seconds for blinks (human pace)
      const delay = Math.random() * 3000 + 3000

      return setTimeout(() => {
        if (!isHovered) {
          // 95% chance of blink, 5% chance of yawn (yawn is rare)
          const nextState: SmileyState = Math.random() < 0.95 ? 'blink' : 'yawn'
          setState(nextState)

          // Return to normal after animation
          const animationDuration = nextState === 'blink' ? 150 : 800
          setTimeout(() => {
            setState('normal')
            scheduleNextAnimation()
          }, animationDuration)
        } else {
          scheduleNextAnimation()
        }
      }, delay)
    }

    const timeoutId = scheduleNextAnimation()
    return () => clearTimeout(timeoutId)
  }, [isHovered])

  useEffect(() => {
    if (isHovered) {
      setState('hover')
    } else if (state === 'hover') {
      setState('normal')
    }
  }, [isHovered, state])

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 452 452"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <g>
        {/* Eyes */}
        {state === 'blink' ? (
          <>
            {/* Left eye dash */}
            <line x1="140" y1="170" x2="190" y2="170" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            {/* Right eye dash */}
            <line x1="262" y1="170" x2="312" y2="170" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Left eye */}
            <circle cx="165" cy="170" r="25" fill="currentColor" />
            {/* Right eye */}
            <circle cx="287" cy="170" r="25" fill="currentColor" />
          </>
        )}

        {/* Mouth */}
        {state === 'yawn' || state === 'hover' ? (
          <circle cx="226" cy="290" r="35" stroke="currentColor" strokeWidth="30" fill="none" />
        ) : (
          <path
            d="M 140 270 Q 226 360 312 270"
            stroke="currentColor"
            strokeWidth="30"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </g>
    </svg>
  )
}
