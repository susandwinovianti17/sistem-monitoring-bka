import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Pages & Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataKaryawan from './pages/DataKaryawan';
import TugasKaryawan from './pages/TugasKaryawan'; 
import DetailTugas from './pages/DetailTugas'; // --- IMPORT KOMPONEN BARU ---
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Public Route: Hanya bisa diakses sebelum login */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 2. Private Route: Dashboard bisa diakses oleh semua Role */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* 3. Restricted Route: Data Karyawan (Dapat diakses HRD dan Manager) */}
        <Route 
          path="/data-karyawan" 
          element={
            <ProtectedRoute allowedRoles={['hrd', 'HRD', 'manager', 'MANAGER']}>
              <Layout>
                <DataKaryawan />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* 4. Restricted Route: Pemantauan Tugas */}
        <Route 
          path="/tugas" 
          element={
            <ProtectedRoute allowedRoles={['hrd', 'HRD', 'manager', 'MANAGER', 'karyawan', 'KARYAWAN']}>
              <Layout>
                <TugasKaryawan />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* --- 5. ROUTE DETAIL TUGAS (BARU) --- */}
        <Route 
          path="/tugas/:id" 
          element={
            <ProtectedRoute allowedRoles={['hrd', 'HRD', 'manager', 'MANAGER', 'karyawan', 'KARYAWAN']}>
              <Layout>
                <DetailTugas />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* 6. Catch All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;