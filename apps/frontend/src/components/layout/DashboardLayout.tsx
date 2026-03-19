import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/" replace />;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <TopNavbar />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar />
        <main style={{ flex:1, overflowY:'auto', padding:32 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
