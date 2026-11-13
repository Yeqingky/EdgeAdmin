import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './auth/LoginPage'
import { OtpPage } from './auth/OtpPage'
import { AppLayout } from './layout/AppLayout'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ConfirmProvider } from './components/Confirm'
import { ToastProvider } from './components/Toast'
import type { AppRoute } from './pages/types'
import { InitPasswordPage } from './pages/init/InitPasswordPage'

const modules = import.meta.glob<{ routes: AppRoute[] }>('./pages/**/routes.tsx', { eager: true })
const appRoutes = Object.values(modules).flatMap((module) => module.routes)

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/otp" element={<OtpPage />} />
          <Route path="/index/otp" element={<OtpPage />} />
          <Route path="/index/initPassword" element={<InitPasswordPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  )
}
