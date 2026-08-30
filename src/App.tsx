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

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/containers" element={<ContainersPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/charges" element={<ChargesPage />} />
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
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
