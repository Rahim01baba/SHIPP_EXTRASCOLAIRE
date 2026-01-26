import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit, AlertCircle } from 'lucide-react';
import EditActivityModal from './EditActivityModal';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  activity_type_id: string;
  activity_type_name: string;
  center_id: string;
  center_name: string;
  course_price: number;
  transport_price: number;
  total_price: number;
  use_global_transport: boolean;
  is_active: boolean;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [globalTransportPrice, setGlobalTransportPrice] = useState(0);

  useEffect(() => {
    loadActivities();
    loadGlobalTransportPrice();
  }, []);

  const loadGlobalTransportPrice = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'transport_price_default')
      .maybeSingle();

    if (error) {
      console.error('Erreur chargement tarif transport global:', error);
      return;
    }

    if (data) {
      setGlobalTransportPrice(Number(data.value));
    }
  };

  const loadActivities = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        description,
        activity_type_id,
        center_id,
        course_price,
        transport_price,
        total_price,
        use_global_transport,
        is_active,
        activity_types!inner(name),
        centers!inner(name)
      `)
      .order('name');

    if (error) {
      console.error('Erreur chargement activités:', error);
      setLoading(false);
      return;
    }

    if (data) {
      const formatted = data.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        activity_type_id: a.activity_type_id,
        activity_type_name: a.activity_types.name,
        center_id: a.center_id,
        center_name: a.centers.name,
        course_price: a.course_price,
        transport_price: a.transport_price,
        total_price: a.total_price,
        use_global_transport: a.use_global_transport,
        is_active: a.is_active,
      }));
      setActivities(formatted);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des activités</h1>
        <p className="text-gray-600 mt-2">
          Gérez les tarifs de formation et de transport pour chaque activité
        </p>
      </div>

      {globalTransportPrice > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Tarif transport global:</span> {globalTransportPrice.toLocaleString('fr-FR')} FCFA/mois
          </p>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune activité trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix Formation</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix Transport</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {activity.center_name}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                        {activity.description && (
                          <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {activity.activity_type_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {activity.course_price.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {activity.use_global_transport ? (
                        <span className="text-blue-600">
                          {globalTransportPrice.toLocaleString('fr-FR')} FCFA
                          <span className="block text-xs text-gray-500">Global</span>
                        </span>
                      ) : (
                        <span>
                          {activity.transport_price.toLocaleString('fr-FR')} FCFA
                          <span className="block text-xs text-gray-500">Spécifique</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                      {activity.total_price.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        activity.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.is_active ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setEditingActivity(activity)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Éditer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSuccess={() => {
            loadActivities();
            setEditingActivity(null);
          }}
        />
      )}
    </div>
  );
}
