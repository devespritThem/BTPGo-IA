import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider.jsx'
import './index.css'
import App from './App.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Landing from './pages/Landing.jsx'
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
import Projects from './pages/Projects.jsx'
import ProjectNew from './pages/ProjectNew.jsx'
import ProjectOverview from './pages/ProjectOverview.jsx'
import Documents from './pages/Documents.jsx'
import Photos from './pages/Photos.jsx'
import Alerts from './pages/Alerts.jsx'
import Notifications from './pages/Notifications.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="org/members" element={<OrgMembers />} />
          <Route path="marches" element={<Marches />} />
          <Route path="devis" element={<Devis />} />
          <Route path="chantiers" element={<Chantiers />} />
          <Route path="documents" element={<Documents />} />
          <Route path="site/photos" element={<Photos />} />
          <Route path="demo" element={<Demo />} />
          <Route path="status" element={<Status />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<ProjectNew />} />
          <Route path="projects/:id/overview" element={<ProjectOverview />} />
        </Route>

        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
