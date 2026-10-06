import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole } from '@/components/layout/RequireAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { NewTicketPage } from '@/pages/tickets/NewTicketPage'
import { TicketsPage } from '@/pages/tickets/TicketsPage'
import { RequestsPage } from '@/pages/tickets/RequestsPage'
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage'
import { WorkOrdersPage } from '@/pages/work/WorkOrdersPage'
import { WorkOrderDetailPage } from '@/pages/work/WorkOrderDetailPage'
import { AssetsPage } from '@/pages/assets/AssetsPage'
import { AssetDetailPage } from '@/pages/assets/AssetDetailPage'
import { MaintenancePage } from '@/pages/assets/MaintenancePage'
import { SpacesPage } from '@/pages/assets/SpacesPage'
import { RoomsPage } from '@/pages/workplace/RoomsPage'
import { VisitorsPage } from '@/pages/workplace/VisitorsPage'
import { ArticlePage, HelpPage } from '@/pages/help/HelpPage'
import { VendorsPage } from '@/pages/manage/VendorsPage'
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
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/new" element={<NewTicketPage />} />
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/tickets/:id" element={<TicketDetailPage />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/visitors" element={<VisitorsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/help/:id" element={<ArticlePage />} />
                  <Route path="/assets/:id" element={<AssetDetailPage />} />
                  <Route element={<RequireRole roles={['agent', 'manager']} />}>
                    <Route path="/tickets" element={<TicketsPage />} />
                    <Route path="/work-orders" element={<WorkOrdersPage />} />
                    <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />
                    <Route path="/spaces" element={<SpacesPage />} />
                  </Route>
                  <Route element={<RequireRole roles={['manager']} />}>
                    <Route path="/vendors" element={<VendorsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
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
