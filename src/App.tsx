import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardPage } from '@/pages/DashboardPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage'
import { OfficesPage } from '@/pages/customers/OfficesPage'
import { PackagesPage } from '@/pages/packages/PackagesPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { ChargesPage, ContainersPage, DocumentsPage } from '@/pages/ops/GlobalPages'
import { LedgerPage } from '@/pages/finance/LedgerPage'
import { AccountsPage } from '@/pages/finance/AccountsPage'
import { InvoicesPage } from '@/pages/finance/InvoicesPage'
import { ReportsPage } from '@/pages/finance/ReportsPage'
import { ProfitabilityPage } from '@/pages/finance/ProfitabilityPage'
import { QuotationsPage } from '@/pages/quotations/QuotationsPage'
import { PartnersPage } from '@/pages/partners/PartnersPage'
import { TrackingPage } from '@/pages/tracking/TrackingPage'
import { WarehousePage } from '@/pages/warehouse/WarehousePage'
import { CustomsPage } from '@/pages/customs/CustomsPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ServicesPage } from '@/pages/services/ServicesPage'
import { IncidentsPage } from '@/pages/incidents/IncidentsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { RequireAuth, RedirectIfSignedIn } from '@/components/layout/RequireAuth'

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<RedirectIfSignedIn />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>
              <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/containers" element={<ContainersPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/charges" element={<ChargesPage />} />
                <Route path="/quotations" element={<QuotationsPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route path="/warehouse" element={<WarehousePage />} />
                <Route path="/customs" element={<CustomsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/offices" element={<OfficesPage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/finance/ledger" element={<LedgerPage />} />
                <Route path="/finance/accounts" element={<AccountsPage />} />
                <Route path="/finance/invoices" element={<InvoicesPage />} />
                <Route path="/finance/reports" element={<ReportsPage />} />
                <Route path="/finance/profitability" element={<ProfitabilityPage />} />
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
