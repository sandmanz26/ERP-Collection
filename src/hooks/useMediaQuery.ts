import * as React from 'react'

/**
 * Reads a media query and re-renders when it flips.
 *
 * Tailwind's `hidden md:block` is the right tool when two layouts differ only
 * in how the same markup is arranged. It is the wrong tool when they are
 * genuinely different components: rendering both would put two live inputs
 * behind every field, and a phone would still pay to build the desktop table.
 * Where that is the case, a page asks this instead and renders one of them.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches)

  React.useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind's `md` breakpoint, read from the other side: narrower than 768px. */
export function useIsPhone() {
  return useMediaQuery('(max-width: 767px)')
}
