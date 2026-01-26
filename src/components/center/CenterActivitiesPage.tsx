import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Plus, Edit2, Power, Trash2, AlertCircle, Clock, Users, DollarSign, Lock } from 'lucide-react';
import AddEditActivityModal from './AddEditActivityModal';

interface Center {
  id: string;
  name: string;
  allow_center_edit_prices: boolean;
}

interface ActivityData {
  id: string;
  name: string;
  description: string | null;
  activity_type_id: string | null;
  activity_types: { name: string } | null;
  age_min: number;
  age_max: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_price: number;
  transport_price: number | null;
  use_global_transport: boolean;
  max_participants: number;
  is_active: boolean;
}

export default function CenterActivitiesPage({ center }: { center: Center }) {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    loadActivities();
  }, [center.id]);

  const loadActivities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activities')
      .select(`
        *,
        activity_types(name)
      `)
      .eq('center_id', center.id)
      .order('name');

    if (data) setActivities(data);
    setLoading(false);
  };

  const toggleActive = async (activityId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('activities')
      .update({ is_active: !currentStatus })
      .eq('id', activityId);

    if (!error) {
      loadActivities();
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) return;

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (!error) {
      loadActivities();
    } else {
      alert('Erreur lors de la suppression');
    }
  };

  const getDayLabel = (day: number) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[day] || 'Samedi';
  };

  const calculateTotal = (activity: ActivityData) => {
    return activity.course_price + (activity.transport_price || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes activités</h1>
          {!center.allow_center_edit_prices && (
            <p className="text-sm text-gray-500 mt-1 flex items-center space-x-1">
              <Lock className="w-4 h-4" />
              <span>Les tarifs sont verrouillés par l'administrateur</span>
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setEditingActivity(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle activité</span>
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune activité</h3>
          <p className="text-gray-500 mb-6">Commencez par créer votre première activité</p>
          <button
            onClick={() => {
              setEditingActivity(null);
              setShowModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Créer une activité</span>
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => {
            const total = calculateTotal(activity);

            return (
              <div
                key={activity.id}
                className={`bg-white rounded-xl p-6 shadow-sm border-2 transition ${
                  activity.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{activity.name}</h3>
                    {activity.activity_types && (
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        {activity.activity_types.name}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    activity.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.is_active ? 'Actif' : 'Inactif'}
                  </div>
                </div>

                {activity.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {activity.description}
                  </p>
                )}

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>Âge</span>
                    </span>
                    <span className="font-medium">{activity.age_min}-{activity.age_max} ans</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Horaire</span>
                    </span>
                    <span className="font-medium">
                      {getDayLabel(activity.day_of_week)} {activity.start_time}-{activity.end_time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>Capacité</span>
                    </span>
                    <span className="font-medium">{activity.max_participants} places</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cours</span>
                    <span className="font-medium">{activity.course_price.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Transport</span>
                    <span className="font-medium">{(activity.transport_price || 0).toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-yellow-600">{total.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingActivity(activity);
                      setShowModal(true);
                    }}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Éditer</span>
                  </button>
                  <button
                    onClick={() => toggleActive(activity.id, activity.is_active)}
                    className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition text-sm ${
                      activity.is_active
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{activity.is_active ? 'Désactiver' : 'Activer'}</span>
                  </button>
                  <button
                    onClick={() => deleteActivity(activity.id)}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddEditActivityModal
          center={center}
          activity={editingActivity}
          onClose={() => {
            setShowModal(false);
            setEditingActivity(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingActivity(null);
            loadActivities();
          }}
        />
      )}
    </div>
  );
}
