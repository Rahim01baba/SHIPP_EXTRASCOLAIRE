import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EditActivityModalProps {
  activity: {
    id: string;
    name: string;
    description: string | null;
    activity_type_id: string;
    center_id: string;
    course_price: number;
    transport_price: number;
    use_global_transport: boolean;
    is_active: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface ActivityType {
  id: string;
  name: string;
}

interface Center {
  id: string;
  name: string;
}

export default function EditActivityModal({ activity, onClose, onSuccess }: EditActivityModalProps) {
  const [formData, setFormData] = useState({
    name: activity.name,
    description: activity.description || '',
    activity_type_id: activity.activity_type_id,
    center_id: activity.center_id,
    course_price: activity.course_price,
    transport_price: activity.transport_price,
    use_global_transport: activity.use_global_transport,
    is_active: activity.is_active,
  });

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [globalTransportPrice, setGlobalTransportPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadActivityTypes();
    loadCenters();
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
  };

  const loadCenters = async () => {
    const { data, error: fetchError } = await supabase
      .from('centers')
      .select('id, name')
      .order('name');

    if (fetchError) {
      console.error('Erreur chargement centres:', fetchError);
      return;
    }

    setCenters(data || []);
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

    if (formData.course_price < 0) {
      setError('Le tarif cours ne peut pas être négatif');
      return;
    }

    if (!formData.use_global_transport && formData.transport_price < 0) {
      setError('Le tarif transport ne peut pas être négatif');
      return;
    }

    setSaving(true);

    try {
      const totalPrice = calculateTotal();

      const { error: updateError } = await supabase
        .from('activities')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          activity_type_id: formData.activity_type_id,
          center_id: formData.center_id,
          course_price: formData.course_price,
          transport_price: formData.transport_price,
          total_price: totalPrice,
          use_global_transport: formData.use_global_transport,
          is_active: formData.is_active,
        })
        .eq('id', activity.id);

      if (updateError) {
        console.error('Erreur mise à jour activité:', updateError);
        setError(`Erreur: ${updateError.message}`);
        return;
      }

      setSuccess('Activité mise à jour avec succès');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Exception mise à jour activité:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Éditer l'activité</h2>
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
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                  {activityTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Centre *
                </label>
                <select
                  name="center_id"
                  value={formData.center_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                >
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
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
                    Tarif transport spécifique (FCFA)
                  </label>
                  <input
                    type="number"
                    name="transport_price"
                    value={formData.transport_price}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-yellow-300">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">TOTAL MENSUEL:</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {calculateTotal().toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Formation: {formData.course_price.toLocaleString('fr-FR')} FCFA +
                  Transport: {(formData.use_global_transport ? globalTransportPrice : formData.transport_price).toLocaleString('fr-FR')} FCFA
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
                Activité active
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
