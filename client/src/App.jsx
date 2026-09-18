import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

import PublicLayout from './components/PublicLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';

// Halaman admin di-lazy-load: pengunjung publik (mayoritas trafik) tidak
// perlu mengunduh kode panel admin (form, uploader, tabel) sama sekali.
// Bundle JS untuk halaman publik jadi lebih kecil -> lebih cepat dimuat.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm.jsx'));

function AdminFallback() {
  return <div className="page-loading">Memuat…</div>;
}

function RequireAuth({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="page-loading">Memuat…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/produk/:id" element={<ProductDetailPage />} />
        </Route>

        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <Suspense fallback={<AdminFallback />}>
                <AdminDashboard />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/produk/baru"
          element={
            <RequireAuth>
              <Suspense fallback={<AdminFallback />}>
                <AdminProductForm mode="create" />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/produk/:id/edit"
          element={
            <RequireAuth>
              <Suspense fallback={<AdminFallback />}>
                <AdminProductForm mode="edit" />
              </Suspense>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
