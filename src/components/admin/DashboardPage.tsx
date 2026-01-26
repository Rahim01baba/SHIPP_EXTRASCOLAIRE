import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Users, CreditCard, TrendingUp, AlertCircle, CheckCircle, Download, Baby, MapPin, Calendar, FileText, Activity, Clock } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';
import StatCard from '../ui/StatCard';
import PageHeader from '../ui/PageHeader';
import LoadingSpinner from '../ui/LoadingSpinner';

interface DashboardStats {
  totalParents: number;
  totalChildren: number;
  enrolledThisMonth: number;
  paidThisMonth: number;
  pendingThisMonth: number;
  theoreticalRevenue: number;
  pendingValidation: number;
}

interface CenterPerformance {
  center_id: string;
  center_name: string;
  enrolled_count: number;
  total_revenue: number;
  paid_count: number;
  top_activity: string;
}

interface ActivityPerformance {
  activity_id: string;
  activity_name: string;
  center_name: string;
  enrolled_count: number;
  total_revenue: number;
  paid_count: number;
}

interface ZoneDistribution {
  zone_id: string;
  zone_name: string;
  children_count: number;
  enrollments_count: number;
}

interface AgeDistribution {
  age_range: string;
  children_count: number;
  enrollments_count: number;
}

export default function DashboardPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterCenter, setFilterCenter] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterAge, setFilterAge] = useState('all');

  const [stats, setStats] = useState<DashboardStats>({
    totalParents: 0,
    totalChildren: 0,
    enrolledThisMonth: 0,
    paidThisMonth: 0,
    pendingThisMonth: 0,
    theoreticalRevenue: 0,
    pendingValidation: 0,
  });

  const [centers, setCenters] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [centerPerformance, setCenterPerformance] = useState<CenterPerformance[]>([]);
  const [activityPerformance, setActivityPerformance] = useState<ActivityPerformance[]>([]);
  const [zoneDistribution, setZoneDistribution] = useState<ZoneDistribution[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadStats();
  }, [filterMonth, filterCenter, filterActivity, filterZone, filterAge]);

  const loadInitialData = async () => {
    const { data: centersData } = await supabase
      .from('centers')
      .select('id, name')
      .eq('status', 'approved')
      .eq('is_active', true)
      .order('name');

    const { data: activitiesData } = await supabase
      .from('activities')
      .select('id, name, center_id')
      .eq('is_active', true)
      .order('name');

    const { data: zonesData } = await supabase
      .from('zones')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    setCenters(centersData || []);
    setActivities(activitiesData || []);
    setZones(zonesData || []);
  };

  const loadStats = async () => {
    setLoading(true);

    try {
      const { data: parentsData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'parent');

      const { data: childrenData } = await supabase
        .from('children')
        .select('id, birth_date, parent_id, profiles!inner(zone_id)');

      let enrollmentsQuery = supabase
        .from('enrollments')
        .select(`
          id,
          enrollment_month,
          status,
          payment_status,
          total_amount,
          child_id,
          activity_id,
          activities!inner(name, center_id, centers!inner(name)),
          children!inner(parent_id, birth_date, profiles!inner(zone_id))
        `)
        .gte('enrollment_month', `${filterMonth}-01`)
        .lt('enrollment_month', `${filterMonth}-32`);

      if (filterCenter !== 'all') {
        enrollmentsQuery = enrollmentsQuery.eq('activities.center_id', filterCenter);
      }
      if (filterActivity !== 'all') {
        enrollmentsQuery = enrollmentsQuery.eq('activity_id', filterActivity);
      }

      const { data: enrollmentsData } = await enrollmentsQuery;

      let filteredEnrollments = enrollmentsData || [];

      if (filterZone !== 'all') {
        filteredEnrollments = filteredEnrollments.filter((e: any) =>
          e.children?.profiles?.zone_id === filterZone
        );
      }

      if (filterAge !== 'all') {
        filteredEnrollments = filteredEnrollments.filter((e: any) => {
          if (!e.children?.birth_date) return false;
          const age = calculateAge(e.children.birth_date);
          return isInAgeRange(age, filterAge);
        });
      }

      const activeEnrollments = filteredEnrollments.filter(e => e.status === 'active' || e.status === 'confirmed');
      const paidCount = activeEnrollments.filter(e => e.payment_status === 'paid').length;
      const pendingCount = activeEnrollments.filter(e => e.payment_status === 'pending').length;
      const totalRevenue = activeEnrollments.reduce((sum, e) => sum + (e.total_amount || 0), 0);
      const pendingValidationCount = filteredEnrollments.filter(e => e.status === 'pending_admin_validation' || e.status === 'pending').length;

      setStats({
        totalParents: parentsData?.length || 0,
        totalChildren: childrenData?.length || 0,
        enrolledThisMonth: activeEnrollments.length,
        paidThisMonth: paidCount,
        pendingThisMonth: pendingCount,
        theoreticalRevenue: totalRevenue,
        pendingValidation: pendingValidationCount,
      });

      loadCenterPerformance(activeEnrollments);
      loadActivityPerformance(activeEnrollments);
      loadZoneDistribution(childrenData || [], activeEnrollments);
      loadAgeDistribution(childrenData || [], filteredEnrollments);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenterPerformance = (enrollments: any[]) => {
    const centerMap = new Map<string, any>();

    enrollments.forEach((e: any) => {
      const centerId = e.activities?.center_id;
      const centerName = e.activities?.centers?.name;
      if (!centerId || !centerName) return;

      if (!centerMap.has(centerId)) {
        centerMap.set(centerId, {
          center_id: centerId,
          center_name: centerName,
          enrolled_count: 0,
          total_revenue: 0,
          paid_count: 0,
          activities: new Map(),
        });
      }

      const center = centerMap.get(centerId);
      center.enrolled_count++;
      center.total_revenue += e.total_amount || 0;
      if (e.payment_status === 'paid') center.paid_count++;

      const activityName = e.activities?.name || 'Inconnu';
      center.activities.set(activityName, (center.activities.get(activityName) || 0) + 1);
    });

    const performance = Array.from(centerMap.values()).map(c => {
      const topActivity = Array.from(c.activities.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        center_id: c.center_id,
        center_name: c.center_name,
        enrolled_count: c.enrolled_count,
        total_revenue: c.total_revenue,
        paid_count: c.paid_count,
        top_activity: topActivity,
      };
    }).sort((a, b) => b.enrolled_count - a.enrolled_count);

    setCenterPerformance(performance);
  };

  const loadActivityPerformance = (enrollments: any[]) => {
    const activityMap = new Map<string, any>();

    enrollments.forEach((e: any) => {
      const activityId = e.activity_id;
      const activityName = e.activities?.name;
      const centerName = e.activities?.centers?.name;
      if (!activityId || !activityName) return;

      if (!activityMap.has(activityId)) {
        activityMap.set(activityId, {
          activity_id: activityId,
          activity_name: activityName,
          center_name: centerName || 'Inconnu',
          enrolled_count: 0,
          total_revenue: 0,
          paid_count: 0,
        });
      }

      const activity = activityMap.get(activityId);
      activity.enrolled_count++;
      activity.total_revenue += e.total_amount || 0;
      if (e.payment_status === 'paid') activity.paid_count++;
    });

    const performance = Array.from(activityMap.values())
      .sort((a, b) => b.enrolled_count - a.enrolled_count);

    setActivityPerformance(performance);
  };

  const loadZoneDistribution = (children: any[], enrollments: any[]) => {
    const zoneMap = new Map<string, any>();

    children.forEach((child: any) => {
      const zoneId = child.profiles?.zone_id;
      if (!zoneId) return;

      const zone = zones.find(z => z.id === zoneId);
      if (!zone) return;

      if (!zoneMap.has(zoneId)) {
        zoneMap.set(zoneId, {
          zone_id: zoneId,
          zone_name: zone.name,
          children_count: 0,
          enrollments_count: 0,
        });
      }

      zoneMap.get(zoneId).children_count++;
    });

    enrollments.forEach((e: any) => {
      const zoneId = e.children?.profiles?.zone_id;
      if (!zoneId) return;

      if (zoneMap.has(zoneId)) {
        zoneMap.get(zoneId).enrollments_count++;
      }
    });

    const distribution = Array.from(zoneMap.values())
      .sort((a, b) => b.children_count - a.children_count);

    setZoneDistribution(distribution);
  };

  const loadAgeDistribution = (children: any[], enrollments: any[]) => {
    const ageRanges = ['0-3', '4-6', '7-9', '10-12', '13-15', '16+'];
    const ageMap = new Map<string, any>();

    ageRanges.forEach(range => {
      ageMap.set(range, {
        age_range: range,
        children_count: 0,
        enrollments_count: 0,
      });
    });

    children.forEach((child: any) => {
      if (!child.birth_date) return;
      const age = calculateAge(child.birth_date);
      const range = getAgeRange(age);
      if (ageMap.has(range)) {
        ageMap.get(range).children_count++;
      }
    });

    enrollments.forEach((e: any) => {
      if (!e.children?.birth_date) return;
      const age = calculateAge(e.children.birth_date);
      const range = getAgeRange(age);
      if (ageMap.has(range)) {
        ageMap.get(range).enrollments_count++;
      }
    });

    setAgeDistribution(Array.from(ageMap.values()));
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeRange = (age: number): string => {
    if (age <= 3) return '0-3';
    if (age <= 6) return '4-6';
    if (age <= 9) return '7-9';
    if (age <= 12) return '10-12';
    if (age <= 15) return '13-15';
    return '16+';
  };

  const isInAgeRange = (age: number, range: string): boolean => {
    const ageRange = getAgeRange(age);
    return ageRange === range;
  };

  const handleExportCenters = () => {
    const data = centerPerformance.map(c => ({
      Centre: c.center_name,
      'Enfants inscrits': c.enrolled_count,
      'CA théorique (FCFA)': c.total_revenue,
      'Paiements reçus': c.paid_count,
      '% Payés': c.enrolled_count > 0 ? Math.round((c.paid_count / c.enrolled_count) * 100) : 0,
      'Activité populaire': c.top_activity,
    }));
    exportToCSV(data, `stats_centres_${filterMonth}.csv`);
  };

  const handleExportActivities = () => {
    const data = activityPerformance.map(a => ({
      Activité: a.activity_name,
      Centre: a.center_name,
      'Enfants inscrits': a.enrolled_count,
      'CA théorique (FCFA)': a.total_revenue,
      'Paiements reçus': a.paid_count,
      '% Payés': a.enrolled_count > 0 ? Math.round((a.paid_count / a.enrolled_count) * 100) : 0,
    }));
    exportToCSV(data, `stats_activites_${filterMonth}.csv`);
  };

  const filteredActivities = filterCenter === 'all'
    ? activities
    : activities.filter(a => a.center_id === filterCenter);

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des statistiques..." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Administrateur"
        description="Vue d'ensemble et statistiques de la plateforme SHIPP Education"
      />

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Filtres</h3>
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Centre</label>
            <select
              value={filterCenter}
              onChange={(e) => {
                setFilterCenter(e.target.value);
                setFilterActivity('all');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="all">Tous</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activité</label>
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="all">Toutes</option>
              {filteredActivities.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="all">Toutes</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tranche d'âge</label>
            <select
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="all">Toutes</option>
              <option value="0-3">0-3 ans</option>
              <option value="4-6">4-6 ans</option>
              <option value="7-9">7-9 ans</option>
              <option value="10-12">10-12 ans</option>
              <option value="13-15">13-15 ans</option>
              <option value="16+">16+ ans</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Parents"
          value={stats.totalParents.toLocaleString('fr-FR')}
          icon={Users}
          iconColor="text-blue-600"
          description="Utilisateurs enregistrés"
        />
        <StatCard
          title="Total Enfants"
          value={stats.totalChildren.toLocaleString('fr-FR')}
          icon={Baby}
          iconColor="text-green-600"
          description="Enfants dans le système"
        />
        <StatCard
          title="À Valider"
          value={stats.pendingValidation.toLocaleString('fr-FR')}
          icon={Clock}
          iconColor="text-orange-600"
          description="Inscriptions en attente"
        />
        <StatCard
          title="Inscriptions Actives"
          value={stats.enrolledThisMonth.toLocaleString('fr-FR')}
          icon={CheckCircle}
          iconColor="text-blue-600"
          description="Ce mois"
        />
        <StatCard
          title="Paiements Reçus"
          value={stats.paidThisMonth.toLocaleString('fr-FR')}
          icon={CheckCircle}
          iconColor="text-green-600"
          description="Paiements confirmés"
        />
        <StatCard
          title="Chiffre d'Affaires"
          value={`${stats.theoreticalRevenue.toLocaleString('fr-FR')} FCFA`}
          icon={TrendingUp}
          iconColor="text-purple-600"
          description="CA théorique du mois"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Performance par centre</h3>
            <button
              onClick={handleExportCenters}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Centre</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Inscrits</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CA</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">% Payés</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {centerPerformance.slice(0, 10).map((c) => (
                  <tr key={c.center_id}>
                    <td className="px-3 py-2 text-gray-900">{c.center_name}</td>
                    <td className="px-3 py-2 text-right font-medium">{c.enrolled_count}</td>
                    <td className="px-3 py-2 text-right">{c.total_revenue.toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2 text-right">{c.enrolled_count > 0 ? Math.round((c.paid_count / c.enrolled_count) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Performance par activité</h3>
            <button
              onClick={handleExportActivities}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Activité</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Inscrits</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">% Payés</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activityPerformance.slice(0, 10).map((a) => (
                  <tr key={a.activity_id}>
                    <td className="px-3 py-2 text-gray-900">{a.activity_name}</td>
                    <td className="px-3 py-2 text-right font-medium">{a.enrolled_count}</td>
                    <td className="px-3 py-2 text-right">{a.enrolled_count > 0 ? Math.round((a.paid_count / a.enrolled_count) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-yellow-500" />
            <span>Répartition par zone</span>
          </h3>
          {zoneDistribution.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune donnée de zone disponible</p>
          ) : (
            <div className="space-y-2">
              {zoneDistribution.map((z) => (
                <div key={z.zone_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{z.zone_name}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{z.children_count} enfants</span>
                    <span className="block text-xs text-gray-500">{z.enrollments_count} inscriptions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-yellow-500" />
            <span>Répartition par âge</span>
          </h3>
          <div className="space-y-2">
            {ageDistribution.map((a) => (
              <div key={a.age_range} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{a.age_range} ans</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{a.children_count} enfants</span>
                  <span className="block text-xs text-gray-500">{a.enrollments_count} inscriptions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
