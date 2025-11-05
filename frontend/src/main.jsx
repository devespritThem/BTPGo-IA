import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider.jsx'
import './index.css'
import App from './App.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Billing from './pages/Billing.jsx'
import OrgMembers from './pages/OrgMembers.jsx'
import Marches from './pages/Marches.jsx'
import Devis from './pages/Devis.jsx'
import Chantiers from './pages/Chantiers.jsx'
import Demo from './pages/Demo.jsx'
import BillingSuccess from './pages/BillingSuccess.jsx'
import BillingCancel from './pages/BillingCancel.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Status from './pages/Status.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="org/members" element={<OrgMembers />} />
          <Route path="marches" element={<Marches />} />
          <Route path="devis" element={<Devis />} />
          <Route path="chantiers" element={<Chantiers />} />
          <Route path="demo" element={<Demo />} />
          <Route path="status" element={<Status />} />
        </Route>

        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
