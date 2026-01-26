import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, Users, Calendar, Filter } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

interface Enrollment {
  id: string;
  enrollment_month: string;
  status: string;
  payment_status: string;
  total_amount: number;
  course_amount: number;
  transport_amount: number;
  created_at: string;
  children: {
    first_name: string;
    last_name: string;
  };
  activities: {
    name: string;
    centers: {
      name: string;
    };
  };
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending_admin_validation');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadEnrollments();
  }, [filterStatus]);

  const loadEnrollments = async () => {
    setLoading(true);
    let query = supabase
      .from('enrollments')
      .select(`
        id,
        enrollment_month,
        status,
        payment_status,
        total_amount,
        course_amount,
        transport_amount,
        created_at,
        children(first_name, last_name),
        activities(name, centers(name)),
        profiles(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    if (data) setEnrollments(data as any);
    setLoading(false);
  };

  const handleApprove = async (enrollmentId: string) => {
    if (!confirm('Approuver cette inscription ?')) return;

    setProcessing(enrollmentId);
    const { error } = await supabase
      .from('enrollments')
      .update({
        status: 'active',
        validated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId);

    if (error) {
      alert(`Erreur: ${error.message}`);
    } else {
      alert('Inscription validée avec succès');
      loadEnrollments();
    }
    setProcessing(null);
  };

  const handleReject = async (enrollmentId: string) => {
    const reason = prompt('Motif de refus (obligatoire):');
    if (!reason || !reason.trim()) return;

    setProcessing(enrollmentId);
    const { error } = await supabase
      .from('enrollments')
      .update({
        status: 'rejected',
        rejected_reason: reason.trim(),
        rejected_at: new Date().toISOString()
      })
      .eq('id', enrollmentId);

    if (error) {
      alert(`Erreur: ${error.message}`);
    } else {
      alert('Inscription refusée');
      loadEnrollments();
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin_validation':
        return <Badge variant="warning">En attente validation</Badge>;
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'rejected':
        return <Badge variant="danger">Refusée</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Annulée</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des inscriptions..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Inscriptions"
        description="Validez ou refusez les demandes d'inscription des parents"
      />

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Filtrer par statut:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending_admin_validation">En attente validation</option>
            <option value="active">Actives</option>
            <option value="rejected">Refusées</option>
            <option value="cancelled">Annulées</option>
            <option value="all">Toutes</option>
          </select>
          <div className="flex-1"></div>
          <div className="text-sm text-gray-600">
            {enrollments.length} inscription{enrollments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucune inscription"
          description={
            filterStatus === 'pending_admin_validation'
              ? "Il n'y a actuellement aucune inscription en attente de validation."
              : "Aucune inscription ne correspond aux critères sélectionnés."
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enfant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centre / Activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mois
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{enrollment.profiles.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {enrollment.children.first_name} {enrollment.children.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {enrollment.activities.centers.name}
                      </div>
                      <div className="text-xs text-gray-500">{enrollment.activities.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(enrollment.enrollment_month).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {enrollment.total_amount.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-xs text-gray-500">
                        Cours: {enrollment.course_amount.toLocaleString('fr-FR')} |
                        Transport: {enrollment.transport_amount.toLocaleString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(enrollment.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {enrollment.status === 'pending_admin_validation' && (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleApprove(enrollment.id)}
                            disabled={processing === enrollment.id}
                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(enrollment.id)}
                            disabled={processing === enrollment.id}
                            className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Refuser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
