import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Building2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';

interface CenterDistribution {
  center_id: string;
  center_name: string;
  commission_pct: number;
  total_paid: number;
  center_share: number;
  shipp_share: number;
  enrollments_count: number;
}

interface MonthOption {
  value: string;
  label: string;
}

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<CenterDistribution[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateMonthOptions();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadDistributions(selectedMonth);
    }
  }, [selectedMonth]);

  const generateMonthOptions = () => {
    const options: MonthOption[] = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });

      options.push({ value: monthStr, label });
    }

    setMonthOptions(options);
    if (options.length > 0) {
      setSelectedMonth(options[0].value);
    }
  };

  const loadDistributions = async (month: string) => {
    setLoading(true);
    setError('');

    try {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = `${year}-${String(Number(monthNum) + 1).padStart(2, '0')}-01`;

      const { data: centers, error: centersError } = await supabase
        .from('centers')
        .select('id, name, shipp_commission_pct')
        .eq('status', 'approved')
        .eq('is_active', true);

      if (centersError) {
        console.error('Erreur chargement centres:', centersError);
        setError('Erreur lors du chargement des centres');
        setLoading(false);
        return;
      }

      if (!centers || centers.length === 0) {
        setDistributions([]);
        setLoading(false);
        return;
      }

      const distributionsData: CenterDistribution[] = [];

      for (const center of centers) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('id, course_price, transport_price')
          .eq('center_id', center.id)
          .eq('status', 'confirmed')
          .lte('enrollment_month', startDate);

        if (!enrollments || enrollments.length === 0) {
          continue;
        }

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid')
          .gte('paid_at', startDate)
          .lt('paid_at', endDate)
          .in('enrollment_id', enrollments.map(e => e.id));

        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        if (totalPaid === 0) {
          continue;
        }

        const commissionPct = Number(center.shipp_commission_pct) || 30;
        const shippShare = totalPaid * (commissionPct / 100);
        const centerShare = totalPaid - shippShare;

        distributionsData.push({
          center_id: center.id,
          center_name: center.name,
          commission_pct: commissionPct,
          total_paid: totalPaid,
          center_share: centerShare,
          shipp_share: shippShare,
          enrollments_count: enrollments.length,
        });
      }

      distributionsData.sort((a, b) => b.total_paid - a.total_paid);
      setDistributions(distributionsData);
    } catch (err: any) {
      console.error('Exception chargement répartitions:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (distributions.length === 0) return;

    const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    const dataToExport = distributions.map(d => ({
      centre: d.center_name,
      inscriptions: d.enrollments_count,
      total_paye: d.total_paid,
      commission_shipp_pct: d.commission_pct,
      part_centre: d.center_share,
      part_shipp: d.shipp_share,
    }));

    exportToCSV(
      dataToExport,
      `repartitions_${selectedMonthLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const totalPaid = distributions.reduce((sum, d) => sum + d.total_paid, 0);
  const totalCenterShare = distributions.reduce((sum, d) => sum + d.center_share, 0);
  const totalShippShare = distributions.reduce((sum, d) => sum + d.shipp_share, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Répartitions Financières</h1>
          <p className="text-gray-600 mt-1">Suivi des reversements aux centres partenaires</p>
        </div>
        {distributions.length > 0 && (
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner le mois
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {selectedMonth && (
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

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Part centres</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalCenterShare.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Part SHIPP</p>
                    <p className="text-xl font-bold text-gray-900">
                      {totalShippShare.toLocaleString('fr-FR')} FCFA
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
                      Centre
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscriptions
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total payé
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission SHIPP
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Centre
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part SHIPP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Chargement...
                      </td>
                    </tr>
                  ) : distributions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Aucune répartition pour ce mois
                      </td>
                    </tr>
                  ) : (
                    distributions.map((dist) => (
                      <tr key={dist.center_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{dist.center_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="text-gray-900">{dist.enrollments_count}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="font-semibold text-gray-900">
                            {dist.total_paid.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            {dist.commission_pct}%
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="font-semibold text-green-600">
                            {dist.center_share.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="font-semibold text-yellow-600">
                            {dist.shipp_share.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {distributions.length > 0 && (
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={2} className="px-4 py-4 font-bold text-gray-900">
                        TOTAL
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {totalPaid.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-4"></td>
                      <td className="px-4 py-4 text-right font-bold text-green-600">
                        {totalCenterShare.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-yellow-600">
                        {totalShippShare.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
