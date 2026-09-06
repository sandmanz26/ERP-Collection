import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RequireAuth, RedirectIfSignedIn } from '@/components/layout/RequireAuth'

import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { PipelinePage } from '@/pages/projects/PipelinePage'
import { BuyersPage } from '@/pages/buyers/BuyersPage'
import { BuyerDetailPage } from '@/pages/buyers/BuyerDetailPage'
import { BudgetsPage } from '@/pages/budgets/BudgetsPage'
import { RequestsPage } from '@/pages/procurement/RequestsPage'
import { PurchaseOrdersPage } from '@/pages/procurement/PurchaseOrdersPage'
import { PurchaseOrderDetailPage } from '@/pages/procurement/PurchaseOrderDetailPage'
import { ReceiptsPage } from '@/pages/procurement/ReceiptsPage'
import { ReceiptDetailPage } from '@/pages/procurement/ReceiptDetailPage'
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { ItemsPage } from '@/pages/inventory/ItemsPage'
import { WarehousesPage } from '@/pages/inventory/WarehousesPage'
import { MovementsPage } from '@/pages/inventory/MovementsPage'
import { TransfersPage } from '@/pages/inventory/TransfersPage'
import { ProductionPage } from '@/pages/production/ProductionPage'
import { ShipmentsPage } from '@/pages/shipments/ShipmentsPage'
import { PayablesPage } from '@/pages/finance/PayablesPage'
import { ReceivablesPage } from '@/pages/finance/ReceivablesPage'
import { PaymentsPage } from '@/pages/finance/PaymentsPage'
import { LedgerPage } from '@/pages/finance/LedgerPage'
import { ProfitabilityPage } from '@/pages/finance/ProfitabilityPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

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

                  {/* commercial */}
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/buyers" element={<BuyersPage />} />
                  <Route path="/buyers/:id" element={<BuyerDetailPage />} />

                  {/* costing */}
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/profitability" element={<ProfitabilityPage />} />

                  {/* procurement */}
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                  <Route path="/receipts" element={<ReceiptsPage />} />
                  <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />

                  {/* inventory */}
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/warehouses" element={<WarehousesPage />} />
                  <Route path="/movements" element={<MovementsPage />} />
                  <Route path="/transfers" element={<TransfersPage />} />
                  <Route path="/counts" element={<TransfersPage />} />

                  {/* make & ship */}
                  <Route path="/production" element={<ProductionPage />} />
                  <Route path="/shipments" element={<ShipmentsPage />} />

                  {/* finance */}
                  <Route path="/payables" element={<PayablesPage />} />
                  <Route path="/receivables" element={<ReceivablesPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/ledger" element={<LedgerPage />} />

                  {/* insight */}
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
