import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import LandingPage from './pages/public/LandingPage';
import ParentDashboard from './pages/parent/ParentDashboard';
import CenterDashboard from './pages/center/CenterDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

const isDev = import.meta.env.DEV;

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (isDev) {
    console.log('[App] Render:', { loading, hasUser: !!user, hasProfile: !!profile, role: profile?.role });
  }

  if (loading) {
    if (isDev) console.log('[App] Showing loading screen');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (isDev) console.log('[App] No user, showing landing page');
    return <LandingPage />;
  }

  if (!profile) {
    if (isDev) console.error('[App] User authenticated but no profile found');
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

  if (isDev) console.log('[App] Routing to dashboard:', profile.role);

  switch (profile.role) {
    case 'parent':
      return <ParentDashboard />;
    case 'center':
      return <CenterDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      if (isDev) console.error('[App] Unknown role:', profile.role);
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
