import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole } from '@/components/layout/RequireAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { PublicReportPage, ReportPage } from '@/pages/tickets/ReportPage'
import { MyReportsPage } from '@/pages/tickets/MyReportsPage'
import { TicketsPage } from '@/pages/tickets/TicketsPage'
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage'
import { AssetsPage } from '@/pages/assets/AssetsPage'
import { AssetDetailPage } from '@/pages/assets/AssetDetailPage'
import { SchedulePage } from '@/pages/assets/SchedulePage'
import { TaskDetailPage } from '@/pages/assets/TaskDetailPage'
import { ReservasiPage } from '@/pages/rental/ReservasiPage'
import { ReportsPage } from '@/pages/manage/ReportsPage'
import { SettingsPage } from '@/pages/manage/SettingsPage'

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/lapor-cepat" element={<PublicReportPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/lapor" element={<ReportPage />} />
                  <Route path="/laporan-saya" element={<MyReportsPage />} />
                  <Route path="/tiket/:id" element={<TicketDetailPage />} />
                  <Route path="/reservasi" element={<ReservasiPage />} />
                  <Route path="/aset/:id" element={<AssetDetailPage />} />
                  <Route element={<RequireRole roles={['agent', 'manager']} />}>
                    <Route path="/tiket" element={<TicketsPage />} />
                    <Route path="/jadwal" element={<SchedulePage />} />
                    <Route path="/tugas/:id" element={<TaskDetailPage />} />
                    <Route path="/aset" element={<AssetsPage />} />
                  </Route>
                  <Route element={<RequireRole roles={['manager']} />}>
                    <Route path="/laporan" element={<ReportsPage />} />
                    <Route path="/pengaturan" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
