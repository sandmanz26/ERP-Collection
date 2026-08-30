import * as React from 'react'

type Mode = 'light' | 'dark' | 'system'
const Ctx = React.createContext<{ mode: Mode; resolved: 'light' | 'dark'; setMode: (m: Mode) => void }>({
  mode: 'dark',
  resolved: 'dark',
  setMode: () => {},
})

export const useTheme = () => React.useContext(Ctx)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<Mode>(() => (localStorage.getItem('nf-theme') as Mode) ?? 'dark')
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.style.colorScheme = resolved
    localStorage.setItem('nf-theme', mode)
  }, [mode, resolved])

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>
}
