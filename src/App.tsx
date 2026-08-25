import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ResetPassword from './components/auth/ResetPassword';
import { supabase } from './lib/supabase';
import LandingPage from './pages/public/LandingPage';
import CenterSignup from './pages/public/CenterSignup';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ParentDashboard from './pages/parent/ParentDashboard';
import CenterDashboard from './pages/center/CenterDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

const isDev = import.meta.env.DEV;

function AuthRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    if (isDev) console.error('[AuthRedirect] User authenticated but no profile found');
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profil introuvable</h1>
          <p className="text-gray-600 mb-6">
            Votre compte utilisateur existe mais aucun profil n'a été trouvé dans la base de données.
            Veuillez contacter l'administrateur.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-2 rounded-lg"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'parent':
      return <Navigate to="/parent/dashboard" replace />;
    case 'center':
      return <Navigate to="/center/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      if (isDev) console.error('[AuthRedirect] Unknown role:', profile.role);
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rôle inconnu</h1>
            <p className="text-gray-600 mb-6">
              Votre profil a un rôle non reconnu: <strong>{profile.role}</strong>
              <br />
              Veuillez contacter l'administrateur.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-2 rounded-lg"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      );
  }
}

              function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signup/center" element={<CenterSignup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth-redirect" element={<AuthRedirect />} />

          <Route
            path="/parent/*"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/center/*"
            element={
              <ProtectedRoute allowedRoles={['center']}>
                <CenterDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
