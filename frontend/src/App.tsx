import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthProvider'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import AdmissionsPage from './pages/AdmissionsPage'
import CmsPage from './pages/CmsPage'
import Dashboard from './pages/Dashboard'
import FinancePage from './pages/FinancePage'
import GalleryPage from './pages/GalleryPage'
import Login from './pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors closeButton position="top-center" duration={4000} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cms" element={<CmsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="admissions" element={<AdmissionsPage />} />
            <Route path="finance" element={<FinancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
