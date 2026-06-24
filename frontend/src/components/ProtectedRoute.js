import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // 1. Jika belum login (tidak ada token), lempar ke halaman login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Jika sudah login tapi role tidak sesuai (misal: Karyawan mau buka Data Karyawan)
    // Lempar balik ke dashboard
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    // 3. Jika semua aman, tampilkan halaman yang diminta
    return children;
};

export default ProtectedRoute;