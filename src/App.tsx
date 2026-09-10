import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'

import { DashboardPage } from '@/pages/DashboardPage'
import { OrdersPage } from '@/pages/sales/OrdersPage'
import { OrderDetailPage } from '@/pages/sales/OrderDetailPage'
import { CustomersPage } from '@/pages/sales/CustomersPage'
import { ProductsPage } from '@/pages/engineering/ProductsPage'
import { BomPage } from '@/pages/engineering/BomPage'
import { RoutingsPage } from '@/pages/engineering/RoutingsPage'
import { PlanningPage } from '@/pages/planning/PlanningPage'
import { MrpPage } from '@/pages/planning/MrpPage'
import { CapacityPage } from '@/pages/planning/CapacityPage'
import { WorkOrdersPage } from '@/pages/production/WorkOrdersPage'
import { WorkOrderDetailPage } from '@/pages/production/WorkOrderDetailPage'
import { ShopFloorPage } from '@/pages/production/ShopFloorPage'
import { KilnPage } from '@/pages/production/KilnPage'
import { QualityPage } from '@/pages/production/QualityPage'
import { ItemsPage } from '@/pages/materials/ItemsPage'
import { InventoryPage } from '@/pages/materials/InventoryPage'
import { SuppliersPage } from '@/pages/materials/SuppliersPage'
import { PurchasingPage } from '@/pages/materials/PurchasingPage'
import { ImportsPage } from '@/pages/imports/ImportsPage'
import { ImportDetailPage } from '@/pages/imports/ImportDetailPage'
import { CustomsPage } from '@/pages/imports/CustomsPage'
import { LandedCostPage } from '@/pages/imports/LandedCostPage'
import { AccountsPage, CostingPage, InvoicesPage, LedgerPage, ReportsPage } from '@/pages/finance/FinancePages'
import { QuotationsPage } from '@/pages/commerce/QuotationsPage'
import { DeliveriesPage } from '@/pages/commerce/DeliveriesPage'
import { ClaimsPage } from '@/pages/commerce/ClaimsPage'
import { PaymentsPage } from '@/pages/commerce/PaymentsPage'
import { RequisitionsPage } from '@/pages/operations/RequisitionsPage'
import { MaintenancePage } from '@/pages/operations/MaintenancePage'
import { SubcontractPage } from '@/pages/operations/SubcontractPage'
import { ConversionPage } from '@/pages/materials/ConversionPage'
import { RemnantsPage } from '@/pages/materials/RemnantsPage'
import { FlowPage } from '@/pages/flow/FlowPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
                  <Route path="/flow" element={<FlowPage />} />

                  {/* sales */}
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/quotations" element={<QuotationsPage />} />
                  <Route path="/deliveries" element={<DeliveriesPage />} />
                  <Route path="/claims" element={<ClaimsPage />} />
                  <Route path="/customers" element={<CustomersPage />} />

                  {/* engineering */}
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/bom" element={<BomPage />} />
                  <Route path="/routings" element={<RoutingsPage />} />

                  {/* planning */}
                  <Route path="/planning" element={<PlanningPage />} />
                  <Route path="/mrp" element={<MrpPage />} />
                  <Route path="/capacity" element={<CapacityPage />} />

                  {/* production */}
                  <Route path="/work-orders" element={<WorkOrdersPage />} />
                  <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
                  <Route path="/shopfloor" element={<ShopFloorPage />} />
                  <Route path="/kiln" element={<KilnPage />} />
                  <Route path="/quality" element={<QualityPage />} />
                  <Route path="/subcontract" element={<SubcontractPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />

                  {/* materials & import */}
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/conversion" element={<ConversionPage />} />
                  <Route path="/remnants" element={<RemnantsPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/requisitions" element={<RequisitionsPage />} />
                  <Route path="/purchasing" element={<PurchasingPage />} />
                  <Route path="/imports" element={<ImportsPage />} />
                  <Route path="/imports/:id" element={<ImportDetailPage />} />
                  <Route path="/customs" element={<CustomsPage />} />
                  <Route path="/landed-cost" element={<LandedCostPage />} />

                  {/* finance */}
                  <Route path="/finance/costing" element={<CostingPage />} />
                  <Route path="/finance/invoices" element={<InvoicesPage />} />
                  <Route path="/finance/payments" element={<PaymentsPage />} />
                  <Route path="/finance/ledger" element={<LedgerPage />} />
                  <Route path="/finance/accounts" element={<AccountsPage />} />
                  <Route path="/finance/reports" element={<ReportsPage />} />

                  {/* insight */}
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

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
