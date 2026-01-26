import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, AlertCircle, Calendar } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { getEnrollmentStatusLabel, getEnrollmentStatusBadgeVariant } from '../../lib/enrollmentStatus';

interface Enrollment {
  id: string;
  enrollment_month: string;
  status: string;
  payment_status: string;
  total_amount: number;
  course_amount: number;
  transport_amount: number;
  created_at: string;
  validated_at?: string;
  rejection_reason?: string;
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
    phone?: string;
  };
}

type TabType = 'pending' | 'active' | 'cancelled' | 'all';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    loadEnrollments();
  }, [activeTab]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[ADMIN ENROLLMENTS] Current user:', user?.id, user?.email);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user?.id)
      .maybeSingle();

    console.log('[ADMIN ENROLLMENTS] User profile:', profile);
  };

  const loadEnrollments = async () => {
    setLoading(true);

    console.log('[ADMIN ENROLLMENTS] Loading enrollments for tab:', activeTab);

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
        validated_at,
        rejection_reason,
        children(first_name, last_name),
        activities(name, centers(name)),
        profiles(first_name, last_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (activeTab === 'pending') {
      console.log('[ADMIN ENROLLMENTS] Filtering for pending_admin_validation status');
      query = query.eq('status', 'pending_admin_validation');
    } else if (activeTab === 'active') {
      console.log('[ADMIN ENROLLMENTS] Filtering for active statuses');
      query = query.in('status', ['active', 'confirmed']);
    } else if (activeTab === 'cancelled') {
      console.log('[ADMIN ENROLLMENTS] Filtering for cancelled/rejected statuses');
      query = query.in('status', ['cancelled', 'rejected']);
    } else {
      console.log('[ADMIN ENROLLMENTS] No filter applied (all enrollments)');
    }

    const { data, error } = await query;

    console.log('[ADMIN ENROLLMENTS] Query result:', {
      dataCount: data?.length || 0,
      error: error,
      firstItem: data?.[0],
      statuses: data?.map(e => e.status)
    });

    if (error) {
      console.error('[ADMIN ENROLLMENTS] Error loading enrollments:', error);
    }

    if (data) setEnrollments(data as any);
    setLoading(false);
  };

  const handleApprove = async (enrollmentId: string) => {
    if (!confirm('Valider cette inscription ? Le parent et le centre seront notifiés.')) return;

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
        rejection_reason: reason.trim()
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

  const getTabCount = (tab: TabType) => {
    if (tab === 'pending') {
      return enrollments.filter(e => e.status === 'pending_admin_validation').length;
    }
    if (tab === 'active') {
      return enrollments.filter(e => e.status === 'active' || e.status === 'confirmed').length;
    }
    return enrollments.length;
  };

  const tabs = [
    { id: 'pending' as TabType, label: 'À valider', icon: Clock, color: 'orange' },
    { id: 'active' as TabType, label: 'Validées', icon: Check, color: 'green' },
    { id: 'cancelled' as TabType, label: 'Annulées', icon: X, color: 'gray' },
    { id: 'all' as TabType, label: 'Toutes', icon: Calendar, color: 'blue' },
  ];

  return (
    <div>
      <PageHeader
        title="Gestion des inscriptions"
        subtitle="Validez ou refusez les demandes d'inscription"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex space-x-1 mb-6 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = activeTab === tab.id ? enrollments.length : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition font-medium ${
                  isActive
                    ? `border-${tab.color}-600 text-${tab.color}-600`
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {isActive && enrollments.length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-${tab.color}-100 text-${tab.color}-700`}>
                    {enrollments.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : enrollments.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={
                activeTab === 'pending' ? Clock :
                activeTab === 'active' ? Check :
                activeTab === 'cancelled' ? X :
                Calendar
              }
              message={
                activeTab === 'pending'
                  ? 'Aucune inscription à valider'
                  : activeTab === 'active'
                  ? 'Aucune inscription validée'
                  : activeTab === 'cancelled'
                  ? 'Aucune inscription annulée'
                  : 'Aucune inscription'
              }
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Debug Info:</strong> Ouvrez la console du navigateur (F12) pour voir les logs de diagnostic.
                Les logs commencent par [ADMIN ENROLLMENTS].
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const isPending = enrollment.status === 'pending_admin_validation';
              const isProcessing = processing === enrollment.id;

              return (
                <div
                  key={enrollment.id}
                  className={`border rounded-lg p-4 ${
                    isPending ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {enrollment.children.first_name} {enrollment.children.last_name}
                        </h3>
                        <Badge variant={getEnrollmentStatusBadgeVariant(enrollment.status)}>
                          {getEnrollmentStatusLabel(enrollment.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Parent:</span>
                          <span className="ml-2 font-medium">
                            {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="ml-2 font-medium">{enrollment.profiles.email}</span>
                        </div>

                        {enrollment.profiles.phone && (
                          <div>
                            <span className="text-gray-600">Téléphone:</span>
                            <span className="ml-2 font-medium">{enrollment.profiles.phone}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-gray-600">Activité:</span>
                          <span className="ml-2 font-medium">{enrollment.activities.name}</span>
                        </div>

                        <div>
                          <span className="text-gray-600">Centre:</span>
                          <span className="ml-2 font-medium">{enrollment.activities.centers.name}</span>
                        </div>

                        <div>
                          <span className="text-gray-600">Mois:</span>
                          <span className="ml-2 font-medium">
                            {new Date(enrollment.enrollment_month).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600">Demande créée:</span>
                          <span className="ml-2 font-medium">
                            {new Date(enrollment.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600">Montant total:</span>
                          <span className="ml-2 font-bold text-blue-600">
                            {enrollment.total_amount?.toLocaleString('fr-FR') || 0} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t">
                      <button
                        onClick={() => handleReject(enrollment.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                        <span>Refuser</span>
                      </button>

                      <button
                        onClick={() => handleApprove(enrollment.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        <span>Valider</span>
                      </button>
                    </div>
                  )}

                  {enrollment.validated_at && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600">
                        Validée le {new Date(enrollment.validated_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}

                  {enrollment.rejection_reason && (enrollment.status === 'rejected' || enrollment.status === 'cancelled') && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-red-900 mb-1">Motif de refus:</p>
                            <p className="text-sm text-red-800">{enrollment.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
