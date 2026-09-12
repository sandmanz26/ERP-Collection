import * as React from 'react'

/**
 * Subscribes to a CSS media query from React.
 *
 * Tailwind handles most responsive work in CSS, but a few decisions are about
 * what to *render* rather than how to style it — a sidebar collapsed to icons
 * makes sense as a desktop rail and no sense inside a mobile drawer — and those
 * have to be answered in JavaScript.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => window.matchMedia?.(query).matches ?? false)

  React.useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind's `lg` breakpoint — where the sidebar rejoins the layout. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
