import * as React from 'react'

/** Re-render on an interval so countdowns and "x ago" stay honest. */
export function useNow(ms = 30_000) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}
