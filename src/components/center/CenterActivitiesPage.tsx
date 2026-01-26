import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Plus, Edit2, Power, Trash2, AlertCircle, Clock, Users, DollarSign, Lock } from 'lucide-react';
import AddEditActivityModal from './AddEditActivityModal';
import PageHeader from '../ui/PageHeader';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import Badge from '../ui/Badge';

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
    return <LoadingSpinner size="lg" text="Chargement des activités..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Activités"
        description={
          !center.allow_center_edit_prices
            ? "Gérez vos activités. Les tarifs sont verrouillés par l'administrateur."
            : "Gérez vos activités et fixez vos tarifs."
        }
        action={
          <button
            onClick={() => {
              setEditingActivity(null);
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle activité</span>
          </button>
        }
      />

      {activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucune activité"
          description="Commencez par créer votre première activité pour accueillir des enfants."
          actionLabel="Créer une activité"
          onAction={() => {
            setEditingActivity(null);
            setShowModal(true);
          }}
        />
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
                    <h3 className="font-bold text-lg mb-2">{activity.name}</h3>
                    {activity.activity_types && (
                      <Badge variant="neutral" size="sm">
                        {activity.activity_types.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={activity.is_active ? 'success' : 'neutral'} size="sm">
                    {activity.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
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
