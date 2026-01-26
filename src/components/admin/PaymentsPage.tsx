import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Check, X, DollarSign, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface MonthlyPayment {
  month: string;
  monthDate: Date;
  isPaid: boolean;
  amount: number;
  paymentId: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function PaymentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    if (selectedParent) {
      loadMonthlyPayments(selectedParent);
    } else {
      setMonthlyPayments([]);
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

  const loadMonthlyPayments = async (parentId: string) => {
    setLoading(true);
    setError('');

    const currentYear = new Date().getFullYear();
    const monthsData: MonthlyPayment[] = [];

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const monthStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-01`;

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_price, transport_price')
        .eq('parent_id', parentId)
        .eq('status', 'confirmed')
        .lte('enrollment_month', monthStr);

      let totalAmount = 0;
      if (enrollments && enrollments.length > 0) {
        totalAmount = enrollments.reduce((sum, e) =>
          sum + (Number(e.course_price) || 0) + (Number(e.transport_price) || 0), 0
        );
      }

      const { data: payment } = await supabase
        .from('payments')
        .select('id, status, paid_at, enrollment_id')
        .eq('parent_id', parentId)
        .gte('paid_at', `${currentYear}-${String(month + 1).padStart(2, '0')}-01`)
        .lt('paid_at', `${currentYear}-${String(month + 2).padStart(2, '0')}-01`)
        .eq('status', 'completed')
        .maybeSingle();

      monthsData.push({
        month: MONTHS_FR[month],
        monthDate,
        isPaid: !!payment,
        amount: totalAmount,
        paymentId: payment?.id || null,
        validatedAt: payment?.paid_at || null,
        validatedBy: null,
      });
    }

    setMonthlyPayments(monthsData);
    setLoading(false);
  };

  const handleValidatePayment = async (monthIndex: number) => {
    if (!selectedParent) return;

    const monthPayment = monthlyPayments[monthIndex];
    if (monthPayment.isPaid) {
      setError('Ce paiement a déjà été validé');
      return;
    }

    if (monthPayment.amount === 0) {
      setError('Aucune inscription active pour ce mois');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        return;
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id')
        .eq('parent_id', selectedParent)
        .eq('status', 'confirmed')
        .limit(1);

      if (!enrollments || enrollments.length === 0) {
        setError('Aucune inscription trouvée');
        return;
      }

      const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          enrollment_id: enrollments[0].id,
          parent_id: selectedParent,
          amount: monthPayment.amount,
          payment_method: 'cash',
          payment_reference: paymentRef,
          status: 'completed',
          paid_at: monthPayment.monthDate.toISOString(),
        });

      if (insertError) {
        console.error('Erreur validation paiement:', insertError);
        setError(`Erreur: ${insertError.message}`);
        return;
      }

      setSuccess(`Paiement de ${monthPayment.month} validé avec succès`);
      setTimeout(() => setSuccess(''), 3000);

      await loadMonthlyPayments(selectedParent);
    } catch (err: any) {
      console.error('Exception validation paiement:', err);
      setError(`Erreur inattendue: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    if (!selectedParent || monthlyPayments.length === 0) return;

    const parent = parents.find(p => p.id === selectedParent);
    const dataToExport = monthlyPayments.map(mp => ({
      mois: mp.month,
      montant: mp.amount,
      statut: mp.isPaid ? 'Payé' : 'Non payé',
      date_validation: mp.validatedAt ? new Date(mp.validatedAt).toLocaleDateString('fr-FR') : '',
    }));

    exportToCSV(
      dataToExport,
      `paiements_${parent?.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const totalPaid = monthlyPayments.filter(m => m.isPaid).reduce((sum, m) => sum + m.amount, 0);
  const totalPending = monthlyPayments.filter(m => !m.isPaid && m.amount > 0).reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600 mt-1">Validation manuelle des paiements mensuels</p>
        </div>
        {selectedParent && (
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-8 h-8 text-blue-600" />
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
                  <Calendar className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalPending.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Mois payés</p>
                    <p className="text-xl font-bold text-gray-900">
                      {monthlyPayments.filter(m => m.isPaid).length} / 12
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Chargement...
                      </td>
                    </tr>
                  ) : monthlyPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Aucune donnée disponible
                      </td>
                    </tr>
                  ) : (
                    monthlyPayments.map((mp, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{mp.month}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className={`font-semibold ${mp.amount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {mp.amount.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {mp.isPaid ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              <Check className="w-4 h-4" />
                              <span>Payé</span>
                            </span>
                          ) : mp.amount > 0 ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                              <X className="w-4 h-4" />
                              <span>Non payé</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Aucune inscription</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {!mp.isPaid && mp.amount > 0 && (
                            <button
                              onClick={() => handleValidatePayment(index)}
                              disabled={processing}
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <Check className="w-4 h-4" />
                              <span>Valider</span>
                            </button>
                          )}
                          {mp.isPaid && (
                            <span className="text-xs text-gray-500">
                              {mp.validatedAt && new Date(mp.validatedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
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
