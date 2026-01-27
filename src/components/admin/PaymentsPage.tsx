import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, XCircle, User } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Enrollment {
  id: string;
  enrollment_month: string;
  total_amount: number;
  status: string;
  payment_status: string;
  paid_at: string | null;
  payment_note: string | null;
  child: {
    id: string;
    full_name: string;
  };
  activity: {
    id: string;
    name: string;
    center: {
      id: string;
      name: string;
    };
  };
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function PaymentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    if (selectedParent) {
      loadEnrollments(selectedParent);
    } else {
      setEnrollments([]);
    }
  }, [selectedParent]);

  const loadParents = async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'parent')
      .order('full_name');

    if (fetchError) {
      console.error('Erreur chargement parents:', fetchError);
      setError('Erreur lors du chargement des parents');
      setLoading(false);
      return;
    }

    setParents(data || []);
    setLoading(false);
  };

  const loadEnrollments = async (parentId: string) => {
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrollment_month,
        total_amount,
        status,
        payment_status,
        paid_at,
        payment_note,
        child:children!enrollments_child_id_fkey(id, full_name),
        activity:activities!enrollments_activity_id_fkey(
          id,
          name,
          center:centers!activities_center_id_fkey(id, name)
        )
      `)
      .eq('parent_id', parentId)
      .eq('is_deleted', false)
      .order('enrollment_month', { ascending: false });

    if (fetchError) {
      console.error('[ADMIN] Erreur chargement inscriptions:', fetchError);
      setError(`Erreur: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    setEnrollments(data || []);
    setLoading(false);
  };

  const updatePaymentStatus = async (
    enrollmentId: string,
    newStatus: string,
    shouldSetPaidAt: boolean
  ) => {
    setProcessing(enrollmentId);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setError('Profil non trouvé');
        return;
      }

      const updateData: any = {
        payment_status: newStatus,
        payment_marked_by: profile.id,
        paid_at: shouldSetPaidAt ? new Date().toISOString() : null
      };

      const { data, error: updateError } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', enrollmentId)
        .select('id, payment_status');

      if (updateError) {
        console.error('[ADMIN] Erreur mise à jour paiement:', updateError);
        setError(`Erreur: ${updateError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setError('Aucune inscription mise à jour. Vérifiez les permissions RLS.');
        return;
      }

      const statusLabels: { [key: string]: string } = {
        paid: 'payée',
        late: 'en retard',
        pending: 'en attente',
        cancelled: 'annulée'
      };

      setSuccess(`Inscription marquée comme ${statusLabels[newStatus] || newStatus}`);
      setTimeout(() => setSuccess(''), 3000);

      await loadEnrollments(selectedParent);
    } catch (err: any) {
      console.error('[ADMIN] Exception mise à jour paiement:', err);
      setError(`Erreur inattendue: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkPaid = (enrollmentId: string) => {
    if (!confirm('Marquer ce paiement comme payé ?')) return;
    updatePaymentStatus(enrollmentId, 'paid', true);
  };

  const handleMarkLate = (enrollmentId: string) => {
    if (!confirm('Marquer ce paiement comme en retard ?')) return;
    updatePaymentStatus(enrollmentId, 'late', false);
  };

  const handleMarkPending = (enrollmentId: string) => {
    updatePaymentStatus(enrollmentId, 'pending', false);
  };

  const handleMarkCancelled = (enrollmentId: string) => {
    if (!confirm('Annuler ce paiement ?')) return;
    updatePaymentStatus(enrollmentId, 'cancelled', false);
  };

  const handleExport = () => {
    if (!selectedParent || enrollments.length === 0) return;

    const parent = parents.find(p => p.id === selectedParent);
    const dataToExport = enrollments.map(e => ({
      mois: formatMonth(e.enrollment_month),
      enfant: e.child?.full_name || 'N/A',
      centre: e.activity?.center?.name || 'N/A',
      activite: e.activity?.name || 'N/A',
      montant: e.total_amount,
      statut_inscription: e.status,
      statut_paiement: e.payment_status,
      date_paiement: e.paid_at ? new Date(e.paid_at).toLocaleDateString('fr-FR') : '',
      note: e.payment_note || ''
    }));

    exportToCSV(
      dataToExport,
      `paiements_${parent?.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return 'N/A';
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    return `${MONTHS_FR[monthIndex]} ${year}`;
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Payé</span>
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>En retard</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>En attente</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>Annulé</span>
          </span>
        );
      default:
        return <span className="text-gray-400 text-xs">{status}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; label: string } } = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      pending_admin_validation: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Annulée' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Refusée' }
    };

    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const totalPaid = enrollments
    .filter(e => e.payment_status === 'paid')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const totalPending = enrollments
    .filter(e => ['pending', 'late'].includes(e.payment_status))
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const paidMonthsCount = new Set(
    enrollments
      .filter(e => e.payment_status === 'paid')
      .map(e => e.enrollment_month)
  ).size;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600 mt-1">Gestion par inscription et enfant</p>
        </div>
        {selectedParent && enrollments.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un parent
          </label>
          <select
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          >
            <option value="">-- Choisir un parent --</option>
            {parents.map(parent => (
              <option key={parent.id} value={parent.id}>
                {parent.full_name} ({parent.email})
              </option>
            ))}
          </select>
        </div>

        {selectedParent && (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total payé</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalPaid.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">En attente / Retard</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalPending.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Mois distincts payés</p>
                    <p className="text-xl font-bold text-gray-900">
                      {paidMonthsCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mois
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enfant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Centre / Activité
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut inscription
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut paiement
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Chargement...
                      </td>
                    </tr>
                  ) : enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Aucune inscription trouvée pour ce parent
                      </td>
                    </tr>
                  ) : (
                    enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatMonth(enrollment.enrollment_month)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {enrollment.child?.full_name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {enrollment.activity?.center?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {enrollment.activity?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {(enrollment.total_amount || 0).toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(enrollment.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getPaymentBadge(enrollment.payment_status)}
                          {enrollment.paid_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(enrollment.paid_at).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {enrollment.payment_status !== 'paid' && (
                              <button
                                onClick={() => handleMarkPaid(enrollment.id)}
                                disabled={processing === enrollment.id}
                                className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition disabled:opacity-50"
                                title="Marquer payé"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Payer
                              </button>
                            )}
                            {enrollment.payment_status !== 'late' && enrollment.payment_status !== 'cancelled' && (
                              <button
                                onClick={() => handleMarkLate(enrollment.id)}
                                disabled={processing === enrollment.id}
                                className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition disabled:opacity-50"
                                title="Marquer en retard"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Retard
                              </button>
                            )}
                            {enrollment.payment_status !== 'pending' && (
                              <button
                                onClick={() => handleMarkPending(enrollment.id)}
                                disabled={processing === enrollment.id}
                                className="inline-flex items-center px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition disabled:opacity-50"
                                title="Remettre en attente"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Attente
                              </button>
                            )}
                            {enrollment.payment_status !== 'cancelled' && (
                              <button
                                onClick={() => handleMarkCancelled(enrollment.id)}
                                disabled={processing === enrollment.id}
                                className="inline-flex items-center px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition disabled:opacity-50"
                                title="Annuler"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
