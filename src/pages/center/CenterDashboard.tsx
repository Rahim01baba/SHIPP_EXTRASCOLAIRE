import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Building2, Users, DollarSign, BarChart3, Activity, Bell, FileDown, Home, MessageCircle } from 'lucide-react';
import CenterOverviewPage from '../../components/center/CenterOverviewPage';
import CenterProfilePage from '../../components/center/CenterProfilePage';
import CenterActivitiesPage from '../../components/center/CenterActivitiesPage';
import CenterEnrollmentsPage from '../../components/center/CenterEnrollmentsPage';
import CenterPaymentsPage from '../../components/center/CenterPaymentsPage';
import CenterDistributionsPage from '../../components/center/CenterDistributionsPage';
import CenterNotificationsPage from '../../components/center/CenterNotificationsPage';

interface Center {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_text: string | null;
  google_maps_link: string | null;
  description: string | null;
  logo_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  is_active: boolean;
  shipp_commission_pct: number | null;
  allow_center_edit_prices: boolean | null;
  owner_profile_id: string;
}

const whatsappNumber = '2250101723687';
const whatsappMessage = encodeURIComponent('Bonjour SHIPP, je souhaite des informations sur mon compte centre.');
const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

export default function CenterDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    loadUnreadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role, center?.id]);

  const loadCenter = async () => {
    if (!profile) {
      setCenter(null);
      setLoading(false);
      return;
    }

    if (profile.role !== 'center') {
      setCenter(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('owner_profile_id', profile.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading center:', error);
      setCenter(null);
      setLoading(false);
      return;
    }

    setCenter(data ?? null);
    setLoading(false);
  };

  const loadUnreadNotifications = async () => {
    if (!profile || profile.role !== 'center') {
      setUnreadCount(0);
      return;
    }

    const centerId = center?.id;

    let resolvedCenterId = centerId;

    if (!resolvedCenterId) {
      const { data: centerData, error: centerErr } = await supabase
        .from('centers')
        .select('id')
        .eq('owner_profile_id', profile.id)
        .maybeSingle();

      if (centerErr) {
        console.error('Error loading center id for notifications:', centerErr);
        return;
      }
      if (!centerData) return;

      resolvedCenterId = centerData.id;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${profile.id},center_id.eq.${resolvedCenterId}`)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread notifications:', error);
      return;
    }

    if (count !== null) setUnreadCount(count);
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'profile', label: 'Mon centre', icon: Building2 },
    { id: 'activities', label: 'Mes activités', icon: Activity },
    { id: 'enrollments', label: 'Inscriptions', icon: Users },
    { id: 'payments', label: 'Paiements', icon: DollarSign },
    { id: 'distributions', label: 'Répartitions', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-black text-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-yellow-400" />
                <span className="font-bold text-lg">Espace Centre</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Centre introuvable</h2>
            <p className="text-gray-600 mb-6">
              Votre profil "centre" existe, mais aucune fiche n'a été trouvée dans la table <b>centers</b>
              (ou l'accès est bloqué par les permissions).
            </p>

            <p className="text-sm text-gray-500 mb-8">
              Actions possibles : (1) créer automatiquement la fiche centre (si autorisé), (2) contacter SHIPP.
            </p>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Contacter SHIPP</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-black text-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-yellow-400" />
              <span className="font-bold text-lg">Espace Centre</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300 hidden md:block">
                {center.name}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-black shadow-sm font-semibold'
                  : 'text-gray-700 hover:text-black'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <CenterOverviewPage center={center} />
        )}

        {activeTab === 'profile' && (
          <CenterProfilePage center={center} onUpdate={loadCenter} />
        )}

        {activeTab === 'activities' && (
          <CenterActivitiesPage center={center} />
        )}

        {activeTab === 'enrollments' && (
          <CenterEnrollmentsPage center={center} />
        )}

        {activeTab === 'payments' && (
          <CenterPaymentsPage center={center} />
        )}

        {activeTab === 'distributions' && (
          <CenterDistributionsPage center={center} />
        )}

        {activeTab === 'notifications' && (
          <CenterNotificationsPage center={center} onReadUpdate={loadUnreadNotifications} />
        )}
      </div>
    </div>
  );
}
