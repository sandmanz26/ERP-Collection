import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RedirectIfSignedIn } from '@/components/layout/RequireAuth'
import { RequirePermission } from '@/components/layout/RequirePermission'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { BuildingsPage } from '@/pages/clients/BuildingsPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { DeploymentsPage } from '@/pages/projects/DeploymentsPage'
import { PositionsPage } from '@/pages/masters/PositionsPage'
import { WarehousesPage } from '@/pages/inventory/WarehousesPage'
import { ItemsPage } from '@/pages/inventory/ItemsPage'
import { StockPage } from '@/pages/inventory/StockPage'
import { DivisionsPage } from '@/pages/procurement/DivisionsPage'
import { SuppliersPage } from '@/pages/procurement/SuppliersPage'
import { MrSessionsPage } from '@/pages/procurement/MrSessionsPage'
import { MrSessionDetailPage } from '@/pages/procurement/MrSessionDetailPage'
import { MyRequestPage } from '@/pages/procurement/MyRequestPage'
import { PurchaseRequestsPage } from '@/pages/procurement/PurchaseRequestsPage'
import { PurchaseRequestDetailPage } from '@/pages/procurement/PurchaseRequestDetailPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { RolesPage } from '@/pages/admin/RolesPage'
import { PrivilegesPage } from '@/pages/admin/PrivilegesPage'
import { SettingsPage } from '@/pages/SettingsPage'

/** Every page sits behind the privilege that opens it — the guard, not the menu, is the control. */
export default function App() {
  return (
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
                <Route element={<RequirePermission permission="dashboard.view" />}>
                  <Route path="/" element={<DashboardPage />} />
                </Route>

                <Route element={<RequirePermission permission="clients.view" />}>
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Route>
                <Route element={<RequirePermission permission="buildings.view" />}>
                  <Route path="/buildings" element={<BuildingsPage />} />
                </Route>

                <Route element={<RequirePermission permission="projects.view" />}>
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                </Route>
                <Route element={<RequirePermission permission="deployments.view" />}>
                  <Route path="/deployments" element={<DeploymentsPage />} />
                </Route>
                <Route element={<RequirePermission permission="positions.view" />}>
                  <Route path="/positions" element={<PositionsPage />} />
                </Route>

                <Route element={<RequirePermission permission="warehouses.view" />}>
                  <Route path="/inventory/warehouses" element={<WarehousesPage />} />
                </Route>
                <Route element={<RequirePermission permission="items.view" />}>
                  <Route path="/inventory/items" element={<ItemsPage />} />
                </Route>
                <Route element={<RequirePermission permission="stock.view" />}>
                  <Route path="/inventory/stock" element={<StockPage />} />
                </Route>

                {/* Procurement. `/mr/my` is declared before `/mr/:id` so the
                    division head's own page is never read as a session id. */}
                <Route element={<RequirePermission permission="mr.submit" />}>
                  <Route path="/mr/my" element={<MyRequestPage />} />
                </Route>
                <Route element={<RequirePermission permission="mr.view" />}>
                  <Route path="/mr" element={<MrSessionsPage />} />
                  <Route path="/mr/:id" element={<MrSessionDetailPage />} />
                </Route>
                <Route element={<RequirePermission permission="pr.view" />}>
                  <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
                  <Route path="/purchase-requests/:id" element={<PurchaseRequestDetailPage />} />
                </Route>
                <Route element={<RequirePermission permission="suppliers.view" />}>
                  <Route path="/suppliers" element={<SuppliersPage />} />
                </Route>
                <Route element={<RequirePermission permission="divisions.view" />}>
                  <Route path="/divisions" element={<DivisionsPage />} />
                </Route>

                <Route element={<RequirePermission permission="users.view" />}>
                  <Route path="/admin/users" element={<UsersPage />} />
                </Route>
                <Route element={<RequirePermission permission="roles.view" />}>
                  <Route path="/admin/roles" element={<RolesPage />} />
                  <Route path="/admin/privileges" element={<PrivilegesPage />} />
                </Route>
                <Route element={<RequirePermission permission="settings.view" />}>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </TooltipProvider>
  )
}
