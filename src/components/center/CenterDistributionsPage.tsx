import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, DollarSign, Percent, TrendingUp } from 'lucide-react';

interface Center {
  id: string;
  shipp_commission_pct: number;
}

interface MonthlyDistribution {
  month: string;
  total_paid: number;
  shipp_share: number;
  center_share: number;
  shipp_percentage: number;
}

export default function CenterDistributionsPage({ center }: { center: Center }) {
  const [distributions, setDistributions] = useState<MonthlyDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistributions();
  }, [center.id, center.shipp_commission_pct]);

  const loadDistributions = async () => {
    setLoading(true);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    const { data } = await supabase
      .from('enrollments')
      .select('enrollment_month, amount_total, payment_status')
      .eq('center_id', center.id)
      .eq('payment_status', 'paid')
      .gte('enrollment_month', startDate.toISOString().split('T')[0])
      .lte('enrollment_month', endDate.toISOString().split('T')[0]);

    if (data) {
      const grouped = data.reduce((acc: any, item) => {
        const month = item.enrollment_month.substring(0, 7);
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += item.amount_total || 0;
        return acc;
      }, {});

      const monthlyData = Object.entries(grouped).map(([month, total]: [string, any]) => {
        const shipp_share = total * (center.shipp_commission_pct / 100);
        const center_share = total - shipp_share;

        return {
          month,
          total_paid: total,
          shipp_share,
          center_share,
          shipp_percentage: center.shipp_commission_pct,
        };
      }).sort((a, b) => b.month.localeCompare(a.month));

      setDistributions(monthlyData);
    }

    setLoading(false);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const getTotalStats = () => {
    return distributions.reduce(
      (acc, item) => ({
        total: acc.total + item.total_paid,
        shipp: acc.shipp + item.shipp_share,
        center: acc.center + item.center_share,
      }),
      { total: 0, shipp: 0, center: 0 }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const stats = getTotalStats();
  const centerPercentage = 100 - center.shipp_commission_pct;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Répartitions</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total encaissé</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold">{stats.total.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-gray-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Part SHIPP</h3>
            <Percent className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xl font-bold">{center.shipp_commission_pct}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.shipp.toLocaleString('fr-FR')} F
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Part Centre</h3>
            <TrendingUp className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-xl font-bold">{centerPercentage}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.center.toLocaleString('fr-FR')} F
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Votre revenu</h3>
            <PieChart className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.center.toLocaleString('fr-FR')} F
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Percent className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">
              Pourcentage de commission: {center.shipp_commission_pct}%
            </h3>
            <p className="text-sm text-yellow-800">
              SHIPP prélève {center.shipp_commission_pct}% sur chaque paiement encaissé pour couvrir les frais de
              transport, d'administration et de plateforme. Le centre reçoit {centerPercentage}% du montant total.
              Ce pourcentage est défini par l'administrateur SHIPP.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Répartitions mensuelles</h2>
        </div>

        {distributions.length === 0 ? (
          <div className="p-12 text-center">
            <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune répartition disponible</p>
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
                    Total encaissé
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % SHIPP
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant SHIPP
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant Centre
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {distributions.map((dist) => (
                  <tr key={dist.month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMonth(dist.month)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {dist.total_paid.toLocaleString('fr-FR')} F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {dist.shipp_percentage}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {dist.shipp_share.toLocaleString('fr-FR')} F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {dist.center_share.toLocaleString('fr-FR')} F
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">TOTAL</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {stats.total.toLocaleString('fr-FR')} F
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">-</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {stats.shipp.toLocaleString('fr-FR')} F
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-green-600">
                      {stats.center.toLocaleString('fr-FR')} F
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Mode de calcul</h3>
        <p className="text-sm text-blue-800 mb-3">
          Pour chaque mois, SHIPP calcule la répartition sur les paiements effectivement encaissés:
        </p>
        <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total encaissé:</span>
            <span className="font-mono font-semibold">Montant</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Part SHIPP ({center.shipp_commission_pct}%):</span>
            <span className="font-mono font-semibold">Montant × {center.shipp_commission_pct / 100}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-900 font-semibold">Part Centre ({centerPercentage}%):</span>
            <span className="font-mono font-bold text-green-600">Montant × {centerPercentage / 100}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
