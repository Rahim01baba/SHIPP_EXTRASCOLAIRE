import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { exportEnrollmentsToCSV } from '../../lib/csvExport';
import { FileDown, Search, Filter, Users } from 'lucide-react';

interface Center {
  id: string;
  name: string;
}

interface Enrollment {
  id: string;
  enrollment_month: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  children: {
    full_name: string;
    date_of_birth: string;
  };
  profiles: {
    full_name: string;
    phone: string;
  };
  activities: {
    name: string;
  };
}

interface Activity {
  id: string;
  name: string;
}

export default function CenterEnrollmentsPage({ center }: { center: Center }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activityFilter, setActivityFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  useEffect(() => {
    loadActivities();
  }, [center.id]);

  useEffect(() => {
    loadEnrollments();
  }, [center.id, month, activityFilter, paymentFilter]);

  const loadActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('id, name')
      .eq('center_id', center.id)
      .order('name');

    if (data) setActivities(data);
  };

  const loadEnrollments = async () => {
    setLoading(true);

    const monthStart = `${month}-01`;
    const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0];

    let query = supabase
      .from('enrollments')
      .select(`
        *,
        children(full_name, date_of_birth),
        profiles(full_name, phone),
        activities(name)
      `)
      .eq('center_id', center.id)
      .in('status', ['active', 'confirmed'])
      .gte('enrollment_month', monthStart)
      .lte('enrollment_month', monthEnd)
      .order('created_at', { ascending: false });

    if (activityFilter) {
      query = query.eq('activity_id', activityFilter);
    }

    if (paymentFilter) {
      query = query.eq('payment_status', paymentFilter);
    }

    const { data } = await query;

    if (data) setEnrollments(data);
    setLoading(false);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return phone.substring(0, phone.length - 4) + '****';
  };

  const handleExportCSV = () => {
    exportEnrollmentsToCSV(enrollments, `inscriptions_${center.name}_${month}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">Active</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Annulée</span>;
      case 'pending_admin_validation':
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">En attente</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">Refusée</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">{status}</span>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-semibold">Payé</span>;
      case 'pending':
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">En attente</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">{paymentStatus}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Inscriptions</h1>
        <button
          onClick={handleExportCSV}
          disabled={enrollments.length === 0}
          className={`flex items-center space-x-2 bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition ${
            enrollments.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <FileDown className="w-5 h-5" />
          <span>Exporter CSV</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Information:</strong> Les inscriptions sont validées par SHIPP. Vous êtes notifié automatiquement lorsqu'une nouvelle inscription est confirmée pour votre centre.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <h3 className="font-semibold">Filtres</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activité</label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="">Toutes</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>{activity.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Seules les inscriptions validées par SHIPP sont affichées ici.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune inscription</h3>
          <p className="text-gray-500">Aucune inscription trouvée pour les filtres sélectionnés</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enfant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mois
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paiement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {enrollment.children?.full_name || 'N/A'}
                        </div>
                        {enrollment.children?.date_of_birth && (
                          <div className="text-sm text-gray-500">
                            {calculateAge(enrollment.children.date_of_birth)} ans
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {enrollment.profiles?.full_name || 'N/A'}
                        </div>
                        {enrollment.profiles?.phone && (
                          <div className="text-sm text-gray-500">
                            {maskPhone(enrollment.profiles.phone)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {enrollment.activities?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(enrollment.enrollment_month).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {enrollment.total_amount?.toLocaleString('fr-FR') || 0} F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(enrollment.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(enrollment.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Total: {enrollments.length} inscription{enrollments.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
