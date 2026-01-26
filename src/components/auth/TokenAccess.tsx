import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import { Shield, AlertCircle } from 'lucide-react';

interface TokenAccessProps {
  token: string;
}

export default function TokenAccess({ token }: TokenAccessProps) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('admin_access_tokens')
        .select('*, profiles!admin_access_tokens_user_id_fkey(*)')
        .eq('token', token)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (tokenError) throw tokenError;

      if (!tokenData) {
        setError('Token invalide ou expiré');
        setValid(false);
        setLoading(false);
        return;
      }

      await supabase
        .from('admin_access_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', token);

      setAdminProfile(tokenData.profiles);
      setValid(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification du token');
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  if (!valid || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white py-3 px-6 shadow-md">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="w-5 h-5" />
          <span className="font-medium">Accès Admin via Token - {adminProfile?.full_name}</span>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
}
