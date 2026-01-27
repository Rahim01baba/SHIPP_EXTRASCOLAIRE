import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, AlertCircle, Calendar, AlertTriangle } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { getEnrollmentStatusLabel, getEnrollmentStatusBadgeVariant } from '../../lib/enrollmentStatus';

interface DiagnosticInfo {
  userEmail: string | null;
  userRole: string | null;
  isAdmin: boolean;
  totalCount: number;
  pendingCount: number;
  activeCount: number;
  confirmedCount: number;
  cancelledCount: number;
  rejectedCount: number;
  lastError: string | null;
}

interface RawEnrollment {
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
  child_id: string;
  activity_id: string;
  parent_id: string;
}

interface Enrollment extends RawEnrollment {
  child_first_name: string;
  child_last_name: string;
  activity_name: string;
  center_name: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone?: string;
}

type TabType = 'pending' | 'active' | 'cancelled' | 'all';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo>({
    userEmail: null,
    userRole: null,
    isAdmin: false,
    totalCount: 0,
    pendingCount: 0,
    activeCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    rejectedCount: 0,
    lastError: null,
  });
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadEnrollments();
  }, []);

  useEffect(() => {
    filterEnrollments();
  }, [activeTab, enrollments]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[ADMIN ENROLLMENTS] Current user:', user?.id, user?.email);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user?.id)
      .maybeSingle();

    console.log('[ADMIN ENROLLMENTS] User profile:', profile);

    setDiagnostic(prev => ({
      ...prev,
      userEmail: user?.email || null,
      userRole: profile?.role || null,
      isAdmin: profile?.role === 'admin',
    }));
  };

  const normalizeStatus = (status: string): string => {
    if (status === 'pending') return 'pending_admin_validation';
    if (status === 'confirmed') return 'active';
    return status;
  };

  const loadEnrollments = async () => {
    setLoading(true);
    setDiagnostic(prev => ({ ...prev, lastError: null }));

    try {
      console.log('[ADMIN ENROLLMENTS] Step 1: Loading RAW enrollments without joins...');

      const { data: rawData, error: rawError, count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('[ADMIN ENROLLMENTS] RAW count=', count);
      console.log('[ADMIN ENROLLMENTS] RAW data=', rawData);
      console.log('[ADMIN ENROLLMENTS] RAW error=', rawError);

      if (rawError) {
        console.error('[ADMIN ENROLLMENTS] Error loading RAW enrollments:', rawError);
        setDiagnostic(prev => ({ ...prev, lastError: rawError.message }));
        setLoading(false);
        return;
      }

      if (!rawData || rawData.length === 0) {
        console.log('[ADMIN ENROLLMENTS] No enrollments found in database');
        setEnrollments([]);
        setDiagnostic(prev => ({
          ...prev,
          totalCount: 0,
          pendingCount: 0,
          activeCount: 0,
          confirmedCount: 0,
          cancelledCount: 0,
          rejectedCount: 0,
        }));
        setLoading(false);
        return;
      }

      const rawEnrollments = rawData as RawEnrollment[];

      const normalizedEnrollments = rawEnrollments.map(e => ({
        ...e,
        status: normalizeStatus(e.status),
      }));

      const statusCounts = {
        totalCount: normalizedEnrollments.length,
        pendingCount: normalizedEnrollments.filter(e => e.status === 'pending_admin_validation').length,
        activeCount: normalizedEnrollments.filter(e => e.status === 'active').length,
        confirmedCount: normalizedEnrollments.filter(e => e.status === 'confirmed').length,
        cancelledCount: normalizedEnrollments.filter(e => e.status === 'cancelled').length,
        rejectedCount: normalizedEnrollments.filter(e => e.status === 'rejected').length,
      };

      console.log('[ADMIN ENROLLMENTS] Status counts:', statusCounts);
      setDiagnostic(prev => ({ ...prev, ...statusCounts }));

      console.log('[ADMIN ENROLLMENTS] Step 2: Loading related data...');

      const childIds = [...new Set(normalizedEnrollments.map(e => e.child_id))];
      const activityIds = [...new Set(normalizedEnrollments.map(e => e.activity_id))];
      const parentIds = [...new Set(normalizedEnrollments.map(e => e.parent_id))];

      const [childrenResult, activitiesResult, parentsResult] = await Promise.all([
        supabase.from('children').select('id, first_name, last_name').in('id', childIds),
        supabase.from('activities').select('id, name, center_id').in('id', activityIds),
        supabase.from('profiles').select('id, first_name, last_name, email, phone').in('id', parentIds),
      ]);

      console.log('[ADMIN ENROLLMENTS] Children loaded:', childrenResult.data?.length);
      console.log('[ADMIN ENROLLMENTS] Activities loaded:', activitiesResult.data?.length);
      console.log('[ADMIN ENROLLMENTS] Parents loaded:', parentsResult.data?.length);

      if (childrenResult.error) {
        console.error('[ADMIN ENROLLMENTS] Error loading children:', childrenResult.error);
      }
      if (activitiesResult.error) {
        console.error('[ADMIN ENROLLMENTS] Error loading activities:', activitiesResult.error);
      }
      if (parentsResult.error) {
        console.error('[ADMIN ENROLLMENTS] Error loading parents:', parentsResult.error);
      }

      const centerIds = [...new Set((activitiesResult.data || []).map((a: any) => a.center_id))];
      const { data: centersData, error: centersError } = await supabase
        .from('centers')
        .select('id, name')
        .in('id', centerIds);

      console.log('[ADMIN ENROLLMENTS] Centers loaded:', centersData?.length);
      if (centersError) {
        console.error('[ADMIN ENROLLMENTS] Error loading centers:', centersError);
      }

      const childrenMap = new Map((childrenResult.data || []).map((c: any) => [c.id, c]));
      const activitiesMap = new Map((activitiesResult.data || []).map((a: any) => [a.id, a]));
      const centersMap = new Map((centersData || []).map((c: any) => [c.id, c]));
      const parentsMap = new Map((parentsResult.data || []).map((p: any) => [p.id, p]));

      const enrichedEnrollments: Enrollment[] = normalizedEnrollments.map(e => {
        const child = childrenMap.get(e.child_id);
        const activity = activitiesMap.get(e.activity_id);
        const center = activity ? centersMap.get(activity.center_id) : null;
        const parent = parentsMap.get(e.parent_id);

        return {
          ...e,
          child_first_name: child?.first_name || 'Unknown',
          child_last_name: child?.last_name || 'Unknown',
          activity_name: activity?.name || 'Unknown',
          center_name: center?.name || 'Unknown',
          parent_first_name: parent?.first_name || 'Unknown',
          parent_last_name: parent?.last_name || 'Unknown',
          parent_email: parent?.email || 'Unknown',
          parent_phone: parent?.phone,
        };
      });

      console.log('[ADMIN ENROLLMENTS] Enriched enrollments:', enrichedEnrollments.length);
      setEnrollments(enrichedEnrollments);

    } catch (err) {
      console.error('[ADMIN ENROLLMENTS] Unexpected error:', err);
      setDiagnostic(prev => ({
        ...prev,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      }));
    }

    setLoading(false);
  };

  const filterEnrollments = () => {
    console.log('[ADMIN ENROLLMENTS] Filtering for tab:', activeTab);

    let filtered = enrollments;

    if (activeTab === 'pending') {
      filtered = enrollments.filter(e => e.status === 'pending_admin_validation');
    } else if (activeTab === 'active') {
      filtered = enrollments.filter(e => e.status === 'active' || e.status === 'confirmed');
    } else if (activeTab === 'cancelled') {
      filtered = enrollments.filter(e => e.status === 'cancelled' || e.status === 'rejected');
    }

    console.log('[ADMIN ENROLLMENTS] Filtered count:', filtered.length);
    setFilteredEnrollments(filtered);
  };

  const handleApprove = async (enrollmentId: string) => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);

    if (!enrollment?.activity_id) {
      alert('Erreur: Inscription invalide - activité manquante. Impossible de valider.');
      return;
    }

    if (!confirm('Valider cette inscription ? Le parent et le centre seront notifiés.')) return;

    setProcessing(enrollmentId);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error, count } = await supabase
      .from('enrollments')
      .update({
        status: 'active',
        validated_at: new Date().toISOString(),
        validated_by: user?.id
      })
      .eq('id', enrollmentId)
      .select();

    if (error) {
      alert(`Erreur lors de la validation: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert('Aucune inscription mise à jour. Vérifiez les permissions RLS ou le filtre.');
    } else {
      alert('Inscription validée avec succès');
      await loadEnrollments();
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
    if (tab === 'cancelled') {
      return enrollments.filter(e => e.status === 'cancelled' || e.status === 'rejected').length;
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

      {showDiagnostic && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-bold text-yellow-900">Mode Diagnostic</h3>
            </div>
            <button
              onClick={() => setShowDiagnostic(false)}
              className="text-yellow-600 hover:text-yellow-800 font-semibold"
            >
              Masquer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-yellow-900">Email utilisateur:</span>
              <span className="ml-2 text-yellow-800">{diagnostic.userEmail || 'Non connecté'}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Rôle:</span>
              <span className="ml-2 text-yellow-800">{diagnostic.userRole || 'Inconnu'}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Est admin:</span>
              <span className={`ml-2 font-bold ${diagnostic.isAdmin ? 'text-green-700' : 'text-red-700'}`}>
                {diagnostic.isAdmin ? 'OUI' : 'NON'}
              </span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Total inscriptions:</span>
              <span className="ml-2 font-bold text-yellow-800">{diagnostic.totalCount}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">En attente validation:</span>
              <span className="ml-2 font-bold text-orange-600">{diagnostic.pendingCount}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Actives:</span>
              <span className="ml-2 font-bold text-green-600">{diagnostic.activeCount}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Confirmées (legacy):</span>
              <span className="ml-2 font-bold text-green-600">{diagnostic.confirmedCount}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Annulées:</span>
              <span className="ml-2 font-bold text-gray-600">{diagnostic.cancelledCount}</span>
            </div>

            <div>
              <span className="font-semibold text-yellow-900">Rejetées:</span>
              <span className="ml-2 font-bold text-red-600">{diagnostic.rejectedCount}</span>
            </div>

            {diagnostic.lastError && (
              <div className="col-span-2">
                <span className="font-semibold text-red-900">Dernière erreur:</span>
                <div className="mt-1 p-2 bg-red-100 rounded text-red-800 font-mono text-xs">
                  {diagnostic.lastError}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-yellow-300">
            <p className="text-xs text-yellow-800">
              <strong>Console F12:</strong> Ouvrez la console du navigateur pour voir les logs détaillés [ADMIN ENROLLMENTS]
            </p>
          </div>
        </div>
      )}

      {!showDiagnostic && (
        <div className="mb-4">
          <button
            onClick={() => setShowDiagnostic(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            Afficher le diagnostic
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex space-x-1 mb-6 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = getTabCount(tab.id);

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
                {count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-${tab.color}-100 text-${tab.color}-700`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredEnrollments.length === 0 ? (
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

            {activeTab === 'pending' && diagnostic.totalCount === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Aucune inscription dans la base de données.</strong>
                </p>
                <p className="text-sm text-blue-800">
                  Pour tester, créez une nouvelle inscription en vous connectant en tant que parent.
                </p>
              </div>
            )}

            {activeTab === 'pending' && diagnostic.totalCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  Il existe {diagnostic.totalCount} inscription(s) dans la base, mais aucune en attente de validation.
                </p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  Voir toutes les inscriptions
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEnrollments.map((enrollment) => {
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
                          {enrollment.child_first_name} {enrollment.child_last_name}
                        </h3>
                        <Badge variant={getEnrollmentStatusBadgeVariant(enrollment.status)}>
                          {getEnrollmentStatusLabel(enrollment.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Parent:</span>
                          <span className="ml-2 font-medium">
                            {enrollment.parent_first_name} {enrollment.parent_last_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="ml-2 font-medium">{enrollment.parent_email}</span>
                        </div>

                        {enrollment.parent_phone && (
                          <div>
                            <span className="text-gray-600">Téléphone:</span>
                            <span className="ml-2 font-medium">{enrollment.parent_phone}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-gray-600">Activité:</span>
                          <span className="ml-2 font-medium">{enrollment.activity_name}</span>
                        </div>

                        <div>
                          <span className="text-gray-600">Centre:</span>
                          <span className="ml-2 font-medium">{enrollment.center_name}</span>
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
