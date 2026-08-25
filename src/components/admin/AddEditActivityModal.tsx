import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

interface AddEditActivityModalProps {
  centerId: string;
  activity?: {
    id: string;
    name: string;
    description: string | null;
    activity_type_id: string;
    course_price: number;
    transport_price: number;
    use_global_transport: boolean;
    is_active: boolean;
    days_of_week: number[] | null;
    start_time: string | null;
    end_time: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface ActivityType {
  id: string;
  name: string;
}

export default function AddEditActivityModal({ centerId, activity, onClose, onSuccess }: AddEditActivityModalProps) {
  const [formData, setFormData] = useState({
    name: activity?.name || '',
    description: activity?.description || '',
    activity_type_id: activity?.activity_type_id || '',
    course_price: activity?.course_price || 0,
    transport_price: activity?.transport_price || 0,
    use_global_transport: activity?.use_global_transport ?? true,
    is_active: activity?.is_active ?? true,
    days_of_week: activity?.days_of_week ?? [6],
    start_time: activity?.start_time ? activity.start_time.slice(0, 5) : '09:00',
    end_time: activity?.end_time ? activity.end_time.slice(0, 5) : '11:00',
  });

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [globalTransportPrice, setGlobalTransportPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadActivityTypes();
    loadGlobalTransportPrice();
  }, []);

  const loadActivityTypes = async () => {
    const { data, error: fetchError } = await supabase
      .from('activity_types')
      .select('id, name')
      .order('name');

    if (fetchError) {
      console.error('Erreur chargement types:', fetchError);
      return;
    }

    setActivityTypes(data || []);
    if (data && data.length > 0 && !formData.activity_type_id) {
      setFormData(prev => ({ ...prev, activity_type_id: data[0].id }));
    }
  };

  const loadGlobalTransportPrice = async () => {
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'transport_price_default')
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur chargement tarif transport:', fetchError);
      return;
    }

    if (data) {
      setGlobalTransportPrice(Number(data.value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        type === 'number' ? Number(value) : value,
    }));
  };

  const toggleDay = (value: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(value)
        ? prev.days_of_week.filter((d: number) => d !== value)
        : [...prev.days_of_week, value].sort((a: number, b: number) => a - b),
    }));
  };

  const calculateTotal = (): number => {
    const transportCost = formData.use_global_transport ? globalTransportPrice : formData.transport_price;
    return formData.course_price + transportCost;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Le nom de l\'activité est requis');
      return;
    }

    if (!formData.activity_type_id) {
      setError('Le type d\'activité est requis');
      return;
    }

    if (formData.course_price <= 0) {
      setError('Le tarif cours doit être supérieur à 0');
      return;
    }

    if (!formData.use_global_transport && formData.transport_price < 0) {
      setError('Le tarif transport ne peut pas être négatif');
      return;
    }

    setSaving(true);

    try {
      const totalPrice = calculateTotal();
      const activityData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        activity_type_id: formData.activity_type_id,
        center_id: centerId,
        course_price: formData.course_price,
        transport_price: formData.transport_price,
        total_price: totalPrice,
        use_global_transport: formData.use_global_transport,
        is_active: formData.is_active,
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
      };

      if (activity) {
        const { error: updateError } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', activity.id);

        if (updateError) {
          console.error('Erreur mise à jour activité:', updateError);
          setError(`Erreur: ${updateError.message}`);
          return;
        }
      } else {
        console.log('[AddEditActivity] Creating activity...');
        const { data: createdData, error: insertError } = await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single();

        if (insertError) {
          console.error('[AddEditActivity] Error creating activity:', insertError);
          setError(`Erreur: ${insertError.message}`);
          return;
        }

        if (!createdData) {
          console.error('[AddEditActivity] No data returned after insert');
          setError('Erreur: aucune donnée retournée');
          return;
        }

        console.log('[AddEditActivity] Activity created successfully:', createdData.id);
      }

      setSuccess(activity ? 'Activité mise à jour avec succès' : 'Activité créée avec succès');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('[AddEditActivity] Exception during save:', err);
      setError(`Une erreur inattendue est survenue: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const transportApplied = formData.use_global_transport ? globalTransportPrice : formData.transport_price;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {activity ? 'Éditer l\'activité' : 'Ajouter une activité'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'activité *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Ex: Football initiation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Description de l'activité..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'activité *
              </label>
              <select
                name="activity_type_id"
                value={formData.activity_type_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              >
                <option value="">Sélectionnez un type</option>
                {activityTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jour(s)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label
                      key={day.value}
                      className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                        formData.days_of_week.includes(day.value)
                          ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.days_of_week.includes(day.value)}
                        onChange={() => toggleDay(day.value)}
                      />
                      {day.label.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de début
                </label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de fin
                </label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-yellow-900">Tarification</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarif formation (FCFA) *
                </label>
                <input
                  type="number"
                  name="course_price"
                  value={formData.course_price}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="use_global_transport"
                  checked={formData.use_global_transport}
                  onChange={handleChange}
                  className="w-4 h-4 text-yellow-500 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Utiliser le tarif transport global ({globalTransportPrice.toLocaleString('fr-FR')} FCFA)
                </label>
              </div>

              {!formData.use_global_transport && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarif transport spécifique (FCFA) *
                  </label>
                  <input
                    type="number"
                    name="transport_price"
                    value={formData.transport_price}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div className="pt-3 border-t border-yellow-300 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Transport appliqué:</span>
                  <span className="font-semibold text-gray-900">
                    {transportApplied.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">TOTAL MENSUEL:</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {calculateTotal().toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Formation: {formData.course_price.toLocaleString('fr-FR')} FCFA +
                  Transport: {transportApplied.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-yellow-500 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Activité active (visible pour les parents)
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
