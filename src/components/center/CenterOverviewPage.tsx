import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Activity, DollarSign, Clock, TrendingUp, AlertCircle, Building2, Percent } from 'lucide-react';
import StatCard from '../ui/StatCard';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Center {
  id: string;
  name: string;
  shipp_commission_pct: number;
}

interface KPIs {
  enrolledChildren: number;
  activeEnrollments: number;
  theoreticalRevenue: number;
  paidRevenue: number;
  pendingPayments: number;
}

interface ActivityStat {
  activity_name: string;
  enrollment_count: number;
}

interface AgeDistribution {
  range: string;
  count: number;
}

export default function CenterOverviewPage({ center }: { center: Center }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kpis, setKpis] = useState<KPIs>({
    enrolledChildren: 0,
    activeEnrollments: 0,
    theoreticalRevenue: 0,
    paidRevenue: 0,
    pendingPayments: 0,
  });
  const [topActivities, setTopActivities] = useState<ActivityStat[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [center.id, month]);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      loadKPIs(),
      loadTopActivities(),
      loadAgeDistribution(),
    ]);
    setLoading(false);
  };

  const loadKPIs = async () => {
    const monthStart = `${month}-01`;
    const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0];

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('child_id, status, amount_total, payment_status')
      .eq('center_id', center.id)
      .gte('enrollment_month', monthStart)
      .lte('enrollment_month', monthEnd);

    if (enrollments) {
      const activeEnrollmentsData = enrollments.filter(e => e.status === 'active' || e.status === 'confirmed');
      const uniqueChildren = new Set(activeEnrollmentsData.map(e => e.child_id)).size;
      const activeEnrollmentsCount = activeEnrollmentsData.length;
      const theoreticalRevenue = activeEnrollmentsData
        .reduce((sum, e) => sum + (e.amount_total || 0), 0);
      const paidRevenue = activeEnrollmentsData
        .filter(e => e.payment_status === 'paid')
        .reduce((sum, e) => sum + (e.amount_total || 0), 0);
      const pendingPayments = activeEnrollmentsData.filter(e => e.payment_status === 'pending').length;

      setKpis({
        enrolledChildren: uniqueChildren,
        activeEnrollments: activeEnrollmentsCount,
        theoreticalRevenue,
        paidRevenue,
        pendingPayments,
      });
    }
  };

  const loadTopActivities = async () => {
    const monthStart = `${month}-01`;
    const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0];

    const { data } = await supabase
      .from('enrollments')
      .select('activity_id, activities(name)')
      .eq('center_id', center.id)
      .eq('status', 'confirmed')
      .gte('enrollment_month', monthStart)
      .lte('enrollment_month', monthEnd);

    if (data) {
      const activityCounts = data.reduce((acc: any, item: any) => {
        const name = item.activities?.name || 'Inconnu';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const sorted = Object.entries(activityCounts)
        .map(([activity_name, enrollment_count]) => ({
          activity_name,
          enrollment_count: enrollment_count as number,
        }))
        .sort((a, b) => b.enrollment_count - a.enrollment_count)
        .slice(0, 5);

      setTopActivities(sorted);
    }
  };

  const loadAgeDistribution = async () => {
    const monthStart = `${month}-01`;
    const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0];

    const { data } = await supabase
      .from('enrollments')
      .select('children(birth_date)')
      .eq('center_id', center.id)
      .eq('status', 'confirmed')
      .gte('enrollment_month', monthStart)
      .lte('enrollment_month', monthEnd);

    if (data) {
      const ranges = [
        { range: '0-3 ans', min: 0, max: 3, count: 0 },
        { range: '4-6 ans', min: 4, max: 6, count: 0 },
        { range: '7-9 ans', min: 7, max: 9, count: 0 },
        { range: '10-12 ans', min: 10, max: 12, count: 0 },
        { range: '13-15 ans', min: 13, max: 15, count: 0 },
        { range: '16+ ans', min: 16, max: 999, count: 0 },
      ];

      data.forEach((item: any) => {
        if (item.children?.birth_date) {
          const age = new Date().getFullYear() - new Date(item.children.birth_date).getFullYear();
          const rangeIndex = ranges.findIndex(r => age >= r.min && age <= r.max);
          if (rangeIndex !== -1) {
            ranges[rangeIndex].count++;
          }
        }
      });

      setAgeDistribution(ranges.filter(r => r.count > 0));
    }
  };

  const centerShare = 100 - center.shipp_commission_pct;

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement de votre tableau de bord..." />;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bienvenue, {center.name}</h1>
            <p className="text-blue-100 mt-1">Voici un aperçu de votre performance ce mois-ci</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-6">
          <label className="text-sm font-medium">Période:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-200 focus:ring-2 focus:ring-white focus:ring-opacity-50"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Enfants Inscrits"
          value={kpis.enrolledChildren}
          icon={Users}
          iconColor="text-blue-600"
          description="Ce mois-ci"
        />
        <StatCard
          title="Inscriptions Actives"
          value={kpis.activeEnrollments}
          icon={Activity}
          iconColor="text-green-600"
          description="Confirmées"
        />
        <StatCard
          title="CA Théorique"
          value={`${kpis.theoreticalRevenue.toLocaleString('fr-FR')} FCFA`}
          icon={TrendingUp}
          iconColor="text-purple-600"
          description="Chiffre d'affaires prévu"
        />
        <StatCard
          title="Total Encaissé"
          value={`${kpis.paidRevenue.toLocaleString('fr-FR')} FCFA`}
          icon={DollarSign}
          iconColor="text-green-600"
          description="Paiements reçus"
        />
        <StatCard
          title="En Attente"
          value={kpis.pendingPayments}
          icon={Clock}
          iconColor="text-orange-600"
          description="Paiements à valider"
        />
        <StatCard
          title="Part Centre"
          value={`${centerShare}%`}
          icon={Percent}
          iconColor="text-gray-600"
          description={`Commission SHIPP: ${center.shipp_commission_pct}%`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Top 5 activités</h2>
          {topActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune inscription ce mois-ci</p>
          ) : (
            <div className="space-y-3">
              {topActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{activity.activity_name}</span>
                  <span className="text-sm bg-yellow-400 text-black px-3 py-1 rounded-full font-semibold">
                    {activity.enrollment_count} inscription{activity.enrollment_count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Répartition par âge</h2>
          {ageDistribution.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {ageDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.range}</span>
                  <span className="text-sm bg-gray-700 text-white px-3 py-1 rounded-full font-semibold">
                    {item.count} enfant{item.count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
