import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Check, Send, AlertCircle, FileText } from 'lucide-react';
import { generateInvoicePDF, downloadInvoice } from '../../lib/invoiceGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { displayEmail } from '../../lib/phoneAuth';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
}

interface Enrollment {
  id: string;
  enrollment_month: string;
  status: string;
  payment_status: string;
  course_amount: number;
  transport_amount: number;
  total_amount: number;
  center_name: string;
  activity_name: string;
  child_name: string;
}

const MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setMonth(i);
  return {
    value: `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
  };
});

export default function InvoicesManagementPage() {
  const { profile } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState('');

  const [parentDetails, setParentDetails] = useState<Parent | null>(null);
  const [enrollmentDetails, setEnrollmentDetails] = useState<Enrollment | null>(null);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    if (selectedParent) {
      loadParentDetails(selectedParent);
      loadChildren(selectedParent);
      setSelectedChild('');
      setSelectedMonth('');
      setSelectedEnrollment('');
      setEnrollmentDetails(null);
    }
  }, [selectedParent]);

  useEffect(() => {
    if (selectedParent && selectedChild && selectedMonth) {
      loadEnrollments(selectedParent, selectedChild, selectedMonth);
      setSelectedEnrollment('');
      setEnrollmentDetails(null);
    }
  }, [selectedChild, selectedMonth]);

  useEffect(() => {
    if (selectedEnrollment) {
      const enrollment = enrollments.find(e => e.id === selectedEnrollment);
      setEnrollmentDetails(enrollment || null);
    }
  }, [selectedEnrollment, enrollments]);

  const loadParents = async () => {
    console.log('[INVOICES] Loading parents...');
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'parent')
      .order('full_name');

    if (fetchError) {
      console.error('[INVOICES] Error loading parents:', fetchError);
      setError('Erreur lors du chargement des parents');
      return;
    }

    console.log('[INVOICES] Parents loaded:', data?.length);
    setParents(data || []);
  };

  const loadParentDetails = async (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    console.log('[INVOICES] Parent selected:', parent?.full_name);
    setParentDetails(parent || null);
  };

  const loadChildren = async (parentId: string) => {
    console.log('[INVOICES] Loading children for parent:', parentId);
    const { data, error: fetchError } = await supabase
      .from('children')
      .select('id, first_name, last_name, birth_date')
      .eq('parent_id', parentId)
      .order('first_name');

    if (fetchError) {
      console.error('[INVOICES] Error loading children:', fetchError);
      setError('Erreur lors du chargement des enfants');
      return;
    }

    console.log('[INVOICES] Children loaded:', data?.length);
    setChildren(data || []);
    if (data && data.length > 0) {
      setSelectedChild(data[0].id);
    }
  };

  const loadEnrollments = async (parentId: string, childId: string, month: string) => {
    const monthDate = `${month}-01`;
    console.log('[INVOICES] Loading enrollments for:', { parentId, childId, monthDate });

    setError('');
    setEnrollments([]);

    try {
      const { data, error: fetchError } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrollment_month,
          status,
          payment_status,
          course_amount,
          transport_amount,
          total_amount,
          activities (
            name,
            centers ( name )
          ),
          children ( first_name, last_name )
        `)
        .eq('parent_id', parentId)
        .eq('child_id', childId)
        .eq('enrollment_month', monthDate);

      if (fetchError) {
        console.error('[INVOICES] Error loading enrollments (with joins):', fetchError);
        console.log('[INVOICES] Attempting fallback without joins...');

        const { data: baseData, error: baseError } = await supabase
          .from('enrollments')
          .select('id, enrollment_month, status, payment_status, course_amount, transport_amount, total_amount, activity_id, child_id')
          .eq('parent_id', parentId)
          .eq('child_id', childId)
          .eq('enrollment_month', monthDate);

        if (baseError) {
          console.error('[INVOICES] Error loading enrollments (fallback):', baseError);
          setError(`Erreur lors du chargement des inscriptions: ${baseError.message}`);
          return;
        }

        if (!baseData || baseData.length === 0) {
          console.log('[INVOICES] No enrollments found');
          setError('Aucune inscription trouvée pour ce mois');
          return;
        }

        console.log('[INVOICES] Base enrollments loaded:', baseData.length);

        const activityIds = [...new Set(baseData.map((e: any) => e.activity_id))];
        const childIds = [...new Set(baseData.map((e: any) => e.child_id))];

        const [activitiesResult, childrenResult] = await Promise.all([
          supabase.from('activities').select('id, name, center_id').in('id', activityIds),
          supabase.from('children').select('id, first_name, last_name').in('id', childIds),
        ]);

        console.log('[INVOICES] Activities loaded:', activitiesResult.data?.length);
        console.log('[INVOICES] Children loaded:', childrenResult.data?.length);

        const centerIds = [...new Set((activitiesResult.data || []).map((a: any) => a.center_id))];
        const { data: centersData } = await supabase
          .from('centers')
          .select('id, name')
          .in('id', centerIds);

        console.log('[INVOICES] Centers loaded:', centersData?.length);

        const activitiesMap = new Map((activitiesResult.data || []).map((a: any) => [a.id, a]));
        const centersMap = new Map((centersData || []).map((c: any) => [c.id, c]));
        const childrenMap = new Map((childrenResult.data || []).map((c: any) => [c.id, c]));

        const formatted = baseData.map((e: any) => {
          const activity = activitiesMap.get(e.activity_id);
          const center = activity ? centersMap.get(activity.center_id) : null;
          const child = childrenMap.get(e.child_id);

          return {
            id: e.id,
            enrollment_month: e.enrollment_month,
            status: e.status,
            payment_status: e.payment_status,
            course_amount: e.course_amount ?? 0,
            transport_amount: e.transport_amount ?? 0,
            total_amount: e.total_amount ?? ((e.course_amount ?? 0) + (e.transport_amount ?? 0)),
            center_name: center?.name ?? '—',
            activity_name: activity?.name ?? '—',
            child_name: child ? `${child.first_name} ${child.last_name}` : '—',
          };
        });

        console.log('[INVOICES] Enrollments formatted (fallback):', formatted.length);
        setEnrollments(formatted);

        if (formatted.length > 0) {
          setSelectedEnrollment(formatted[0].id);
        }
        return;
      }

      if (!data || data.length === 0) {
        console.log('[INVOICES] No enrollments found');
        setError('Aucune inscription trouvée pour ce mois');
        return;
      }

      console.log('[INVOICES] Enrollments loaded (with joins):', data.length);

      const formatted = (data ?? []).map((e: any) => ({
        id: e.id,
        enrollment_month: e.enrollment_month,
        status: e.status,
        payment_status: e.payment_status,
        course_amount: e.course_amount ?? 0,
        transport_amount: e.transport_amount ?? 0,
        total_amount: e.total_amount ?? ((e.course_amount ?? 0) + (e.transport_amount ?? 0)),
        center_name: e.activities?.centers?.name ?? '—',
        activity_name: e.activities?.name ?? '—',
        child_name: `${e.children?.first_name ?? ''} ${e.children?.last_name ?? ''}`.trim(),
      }));

      console.log('[INVOICES] Enrollments formatted:', formatted.length);
      setEnrollments(formatted);

      if (formatted.length > 0) {
        setSelectedEnrollment(formatted[0].id);
      }
    } catch (err) {
      console.error('[INVOICES] Exception loading enrollments:', err);
      setError(`Erreur inattendue: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const validatePayment = async () => {
    if (!selectedEnrollment || !enrollmentDetails) {
      setError('Veuillez sélectionner une inscription');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('[INVOICES] Validating payment for enrollment:', selectedEnrollment);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        return;
      }

      const { data, error: updateError } = await supabase
        .from('enrollments')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_marked_by: profile?.id
        })
        .eq('id', selectedEnrollment)
        .select('id, payment_status');

      if (updateError) {
        console.error('[INVOICES] Error validating payment:', updateError);
        setError(`Erreur lors de la validation: ${updateError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setError('Aucune inscription mise à jour. Vérifiez les permissions RLS.');
        return;
      }

      console.log('[INVOICES] Payment validated successfully');
      setEnrollmentDetails({ ...enrollmentDetails, payment_status: 'paid' });
      setSuccess('Paiement validé avec succès');

      await loadEnrollments(selectedParent, selectedChild, selectedMonth);
    } catch (err) {
      console.error('[INVOICES] Exception validating payment:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDF = async () => {
    if (!enrollmentDetails || !parentDetails) {
      setError('Données incomplètes pour générer la facture');
      return;
    }

    if (enrollmentDetails.status !== 'active' && enrollmentDetails.status !== 'confirmed') {
      setError('Inscription non validée — facture indisponible');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const monthDate = new Date(enrollmentDetails.enrollment_month);

      console.log('[INVOICES] Looking for existing payment for enrollment:', selectedEnrollment);
      let paymentId: string | null = null;

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('enrollment_id', selectedEnrollment)
        .maybeSingle();

      if (existingPayment) {
        console.log('[INVOICES] Found existing payment:', existingPayment.id);
        paymentId = existingPayment.id;
      } else {
        console.log('[INVOICES] No payment found, creating one...');
        const paymentReference = `PAY-${Date.now()}-${selectedEnrollment.substring(0, 8)}`;
        const { data: newPayment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            parent_id: selectedParent,
            enrollment_id: selectedEnrollment,
            amount: enrollmentDetails.total_amount,
            status: 'pending',
            payment_method: 'mobile_money',
            payment_reference: paymentReference,
          })
          .select('id')
          .single();

        if (paymentError) {
          console.error('[INVOICES] Error creating payment:', paymentError);
          setError(`Erreur lors de la création du paiement: ${paymentError.message}`);
          return;
        }

        if (newPayment) {
          console.log('[INVOICES] Payment created:', newPayment.id);
          paymentId = newPayment.id;
        }
      }

      if (!paymentId) {
        setError('Impossible de créer ou trouver le paiement associé');
        return;
      }

      console.log('[INVOICES] Creating invoice record with payment_id:', paymentId);
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          parent_id: selectedParent,
          child_id: selectedChild,
          enrollment_id: selectedEnrollment,
          payment_id: paymentId,
          invoice_number: invoiceNumber,
          invoice_date: enrollmentDetails.enrollment_month,
          child_name: enrollmentDetails.child_name,
          activity_name: enrollmentDetails.activity_name,
          center_name: enrollmentDetails.center_name,
          course_price: enrollmentDetails.course_amount,
          transport_price: enrollmentDetails.transport_amount,
          total_amount: enrollmentDetails.total_amount,
          invoice_sent: false,
        })
        .select()
        .single();

      if (invoiceError) {
        if (invoiceError.code === '23505') {
          console.log('[INVOICES] Invoice already exists, continuing...');
        } else {
          console.error('[INVOICES] Error creating invoice:', invoiceError);
          setError(`Erreur lors de la création de la facture: ${invoiceError.message}`);
          return;
        }
      }

      if (invoiceData) {
        console.log('[INVOICES] Invoice created:', invoiceData.id);
      }

      console.log('[INVOICES] Generating PDF...');
      const pdf = generateInvoicePDF({
        invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('fr-FR'),
        month: monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        parentName: parentDetails.full_name,
        parentEmail: parentDetails.email,
        childName: enrollmentDetails.child_name,
        centerName: enrollmentDetails.center_name,
        activityName: enrollmentDetails.activity_name,
        coursePrice: enrollmentDetails.course_amount,
        transportPrice: enrollmentDetails.transport_amount,
        totalAmount: enrollmentDetails.total_amount,
      });

      downloadInvoice(pdf, `facture_${invoiceNumber}.pdf`);
      console.log('[INVOICES] Invoice downloaded successfully');
      setSuccess('Facture téléchargée avec succès');
    } catch (err) {
      console.error('[INVOICES] Exception generating invoice:', err);
      setError('Erreur lors de la génération de la facture');
    } finally {
      setProcessing(false);
    }
  };

  const markInvoiceSent = async () => {
    if (!selectedEnrollment || !enrollmentDetails || !parentDetails) {
      setError('Veuillez sélectionner une inscription complète');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log('[INVOICES] Marking invoice as sent for enrollment:', selectedEnrollment);

      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceDate = enrollmentDetails.enrollment_month;

      const invoiceData = {
        parent_id: selectedParent,
        child_id: selectedChild,
        enrollment_id: selectedEnrollment,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        child_name: enrollmentDetails.child_name,
        activity_name: enrollmentDetails.activity_name,
        center_name: enrollmentDetails.center_name,
        course_price: enrollmentDetails.course_amount,
        transport_price: enrollmentDetails.transport_amount,
        total_amount: enrollmentDetails.total_amount,
        invoice_sent: true,
        sent_at: new Date().toISOString(),
        sent_by: profile?.id,
      };

      const { data, error: upsertError, count } = await supabase
        .from('invoices')
        .upsert(invoiceData, {
          onConflict: 'enrollment_id, invoice_date',
          count: 'exact'
        })
        .select();

      if (upsertError) {
        console.error('[INVOICES] Error upserting invoice:', upsertError);
        setError(`Erreur: ${upsertError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('[INVOICES] UPSERT returned no data');
        setError('Aucune facture créée ou mise à jour (vérifier les permissions RLS)');
        return;
      }

      console.log('[INVOICES] Invoice marked as sent (upserted):', data[0].id);
      setSuccess('Facture marquée comme envoyée avec succès');

      await loadEnrollments(selectedParent, selectedChild, selectedMonth);
    } catch (err) {
      console.error('[INVOICES] Exception:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setProcessing(false);
    }
  };

  const canGenerateInvoice = enrollmentDetails &&
    (enrollmentDetails.status === 'active' || enrollmentDetails.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des factures</h1>
        <p className="text-gray-600 mt-2">
          Générez et gérez les factures mensuelles des inscriptions
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start space-x-2">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Sélection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent
                </label>
                <select
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value="">Sélectionner un parent</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedParent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enfant
                    </label>
                    <select
                      value={selectedChild}
                      onChange={(e) => setSelectedChild(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">Sélectionner un enfant</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.first_name} {child.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mois
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">Sélectionner un mois</option>
                      {MONTHS_OPTIONS.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {enrollments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inscription
                      </label>
                      <select
                        value={selectedEnrollment}
                        onChange={(e) => setSelectedEnrollment(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      >
                        {enrollments.map((enrollment) => (
                          <option key={enrollment.id} value={enrollment.id}>
                            {enrollment.activity_name} - {enrollment.center_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {parentDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Informations parent</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Nom:</span> <span className="font-medium">{parentDetails.full_name}</span></p>
                <p><span className="text-gray-600">Email:</span> <span className="font-medium">{displayEmail(parentDetails.email)}</span></p>
                <p><span className="text-gray-600">Téléphone:</span> <span className="font-medium">{parentDetails.phone}</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {enrollmentDetails ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-yellow-400">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-yellow-600" />
                    <span>Aperçu facture</span>
                  </h2>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enfant:</span>
                    <span className="font-medium">{enrollmentDetails.child_name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Centre:</span>
                    <span className="font-medium">{enrollmentDetails.center_name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Formation:</span>
                    <span className="font-medium">{enrollmentDetails.activity_name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Mois:</span>
                    <span className="font-medium">
                      {new Date(enrollmentDetails.enrollment_month).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarif formation:</span>
                      <span className="font-medium">{enrollmentDetails.course_amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">Tarif transport:</span>
                      <span className="font-medium">{enrollmentDetails.transport_amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between mt-3 pt-3 border-t border-gray-300">
                      <span className="font-semibold text-lg">TOTAL:</span>
                      <span className="font-bold text-lg text-yellow-600">
                        {enrollmentDetails.total_amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-gray-300">
                    <span className="text-gray-600">Statut inscription:</span>
                    <span className={`font-medium ${
                      enrollmentDetails.status === 'active' || enrollmentDetails.status === 'confirmed'
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      {enrollmentDetails.status === 'active' || enrollmentDetails.status === 'confirmed'
                        ? 'Validée'
                        : 'En attente'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut paiement:</span>
                    <span className={`font-medium ${
                      enrollmentDetails.payment_status === 'paid'
                        ? 'text-green-600'
                        : enrollmentDetails.payment_status === 'late'
                        ? 'text-red-600'
                        : enrollmentDetails.payment_status === 'cancelled'
                        ? 'text-gray-600'
                        : 'text-yellow-600'
                    }`}>
                      {enrollmentDetails.payment_status === 'paid'
                        ? 'Payé'
                        : enrollmentDetails.payment_status === 'late'
                        ? 'En retard'
                        : enrollmentDetails.payment_status === 'cancelled'
                        ? 'Annulé'
                        : 'En attente'}
                    </span>
                  </div>
                </div>
              </div>

              {!canGenerateInvoice && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Inscription non validée</p>
                    <p>La facture ne peut être générée que pour les inscriptions validées.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
                <h3 className="font-semibold mb-4">Actions</h3>

                {enrollmentDetails.payment_status !== 'paid' && (
                  <button
                    onClick={validatePayment}
                    disabled={processing}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                  >
                    <Check className="w-5 h-5" />
                    <span>Valider le paiement du mois</span>
                  </button>
                )}

                <button
                  onClick={downloadPDF}
                  disabled={processing || !canGenerateInvoice}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Download className="w-5 h-5" />
                  <span>Télécharger en PDF</span>
                </button>

                <button
                  onClick={markInvoiceSent}
                  disabled={processing || !canGenerateInvoice}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Send className="w-5 h-5" />
                  <span>Marquer facture envoyée</span>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Sélectionnez un parent, un enfant et un mois pour afficher l'aperçu de la facture
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
