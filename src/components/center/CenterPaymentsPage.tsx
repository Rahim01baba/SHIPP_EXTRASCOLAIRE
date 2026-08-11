import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Center {
  id: string;
}

interface MonthlyPayment {
  month: string;
  theoretical_total: number;
  paid_total: number;
  pending_count: number;
  paid_percentage: number;
}

export default function CenterPaymentsPage({ center }: { center: Center }) {
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [center.id]);

  const loadPayments = async () => {
    setLoading(true);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    const { data } = await supabase
      .from('enrollments')
      .select('enrollment_month, total_amount, payment_status, status')
      .eq('center_id', center.id)
      .gte('enrollment_month', startDate.toISOString().split('T')[0])
      .lte('enrollment_month', endDate.toISOString().split('T')[0]);

    if (data) {
      const grouped = data.reduce((acc: any, item) => {
        const month = item.enrollment_month.substring(0, 7);
        if (!acc[month]) {
          acc[month] = {
            month,
            theoretical_total: 0,
            paid_total: 0,
            pending_count: 0,
          };
        }

        if (item.status === 'active') {
          acc[month].theoretical_total += item.total_amount || 0;
        }

        if (item.payment_status === 'paid') {
          acc[month].paid_total += item.total_amount || 0;
        } else if (item.payment_status === 'pending') {
          acc[month].pending_count++;
        }

        return acc;
      }, {});

      const monthlyData = Object.values(grouped).map((item: any) => ({
        ...item,
        paid_percentage: item.theoretical_total > 0
          ? Math.round((item.paid_total / item.theoretical_total) * 100)
          : 0,
      })).sort((a: any, b: any) => b.month.localeCompare(a.month));

      setPayments(monthlyData);
    }

    setLoading(false);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const getTotalStats = () => {
    const total = payments.reduce(
      (acc, item) => ({
        theoretical: acc.theoretical + item.theoretical_total,
        paid: acc.paid + item.paid_total,
        pending: acc.pending + item.pending_count,
      }),
      { theoretical: 0, paid: 0, pending: 0 }
    );

    return {
      ...total,
      percentage: total.theoretical > 0
        ? Math.round((total.paid / total.theoretical) * 100)
        : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Suivi des paiements</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">CA théorique total</h3>
            <TrendingUp className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-xl font-bold">{stats.theoretical.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total encaissé</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xl font-bold">{stats.paid.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Paiements en attente</h3>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Taux de paiement</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{stats.percentage}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Historique mensuel (12 derniers mois)</h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune donnée de paiement disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mois
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Théorique
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encaissé
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    En attente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Payé
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMonth(payment.month)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {payment.theoretical_total.toLocaleString('fr-FR')} F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {payment.paid_total.toLocaleString('fr-FR')} F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-orange-600 font-semibold">
                        {payment.pending_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              payment.paid_percentage >= 80 ? 'bg-green-500' :
                              payment.paid_percentage >= 50 ? 'bg-yellow-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${payment.paid_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {payment.paid_percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Information</h3>
        <p className="text-sm text-blue-800">
          Les paiements sont gérés par SHIPP. Cette page vous permet uniquement de suivre l'état des paiements.
          Les répartitions entre le centre et SHIPP sont disponibles dans l'onglet "Répartitions".
        </p>
      </div>
    </div>
  );
}
