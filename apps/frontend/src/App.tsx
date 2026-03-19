import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import VerifyDevicePage from './pages/VerifyDevice';
import DashboardPage from './pages/Dashboard';
import SecurityPage from './pages/Dashboard/SecurityPage';
import LMSPage from './pages/LMS';
import ERPPage from './pages/ERP';
import { LibraryPage } from './pages/Library';
import EmailPage from './pages/Email';
import AdminPage from './pages/Admin';
import { AuditLogFeed } from './components/ui/AuditLogFeed';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ToastStack } from './components/ui/ToastStack';
import PortalsPage from './pages/Dashboard/PortalsPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';
import AdminDashboardLayout from './components/layout/AdminDashboardLayout';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard';
import StudentsModule from './pages/Admin/Students/StudentsModule';
import FeesModule from './pages/Admin/Fees/FeesModule';
import UsersModule from './pages/Admin/Users/UsersModule';
import SecurityModule from './pages/Admin/Security/SecurityModule';
import MessagesModule from './pages/Admin/Messages/MessagesModule';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-device" element={<VerifyDevicePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/portals" element={<PortalsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/portal/lms" element={<LMSPage />} />
            <Route path="/portal/erp" element={<ERPPage />} />
            <Route path="/portal/library" element={<LibraryPage />} />
            <Route path="/portal/email" element={<EmailPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/stats" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminDashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/fees" element={<FeesModule />} />
            <Route path="/admin/students" element={<StudentsModule />} />
            <Route path="/admin/users" element={<UsersModule />} />
            <Route path="/admin/security" element={<SecurityModule />} />
            <Route path="/admin/messages" element={<MessagesModule />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastStack />
    </>
  );
}

function AuditPage() {
  return (
    <div className="fade-in">
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📋 Audit Log</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
        // Real-time NIST 800-63B compliant event feed
      </div>
      <AuditLogFeed limit={30} />
    </div>
  );
}
