import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Lock, AlertCircle } from 'lucide-react';

interface Center {
  id: string;
  allow_center_edit_prices: boolean;
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  activity_type_id: string | null;
  schedule_day: string | null; schedule_time: string | null; course_price: number; transport_price: number | null; total_price: number; use_global_transport: boolean; is_active: boolean;
}

interface ActivityType {
  id: string;
  name: string;
}

export default function AddEditActivityModal({
  center,
  activity,
  onClose,
  onSave,
}: {
  center: Center & { transport_fee_monthly?: number };
  activity: Activity | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerTransportFee, setCenterTransportFee] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: activity?.name || '',
    description: activity?.description || '',
    activity_type_id: activity?.activity_type_id || '',
    schedule_day: activity?.schedule_day || '', schedule_time: activity?.schedule_time || '', course_price: activity?.course_price || 0, is_active: activity?.is_active ?? true,
  });

  useEffect(() => {
    loadActivityTypes();
    loadCenterTransportFee();
  }, []);

  const loadActivityTypes = async () => {
    const { data } = await supabase
      .from('activity_types')
      .select('*')
      .order('name');

    if (data) setActivityTypes(data);
  };

  const loadCenterTransportFee = async () => {
    const { data } = await supabase
      .from('centers')
      .select('transport_fee_monthly')
      .eq('id', center.id)
      .maybeSingle();

    if (data) {
      setCenterTransportFee(data.transport_fee_monthly || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSaving(true);

    const dataToSave: any = {
      center_id: center.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      activity_type_id: formData.activity_type_id || null,
      schedule_day: formData.schedule_day.trim() || null, schedule_time: formData.schedule_time.trim() || null, use_global_transport: true, is_active: formData.is_active,
    };

    if (center.allow_center_edit_prices || !activity) {
      dataToSave.course_price = formData.course_price; dataToSave.total_price = formData.course_price + centerTransportFee; }

    let result;
    if (activity) {
      result = await supabase
        .from('activities')
        .update(dataToSave)
        .eq('id', activity.id);
    } else {
      result = await supabase
        .from('activities')
        .insert([dataToSave]);
    }

    if (result.error) {
      console.error('Error saving activity:', result.error);
      setError(result.error.message);
      setSaving(false);
    } else {
      onSave();
    }
  };

  const total = formData.course_price + centerTransportFee;
  const canEditPrices = center.allow_center_edit_prices || !activity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {activity ? 'Éditer l\'activité' : 'Nouvelle activité'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {!canEditPrices && activity && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start space-x-2">
              <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Les tarifs sont verrouillés et ne peuvent pas être modifiés. Contactez l'administrateur SHIPP pour toute modification de tarif.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'activité *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Ex: Cours de piano débutant"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'activité
            </label>
            <select
              value={formData.activity_type_id}
              onChange={(e) => setFormData({ ...formData, activity_type_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="">-- Sélectionner un type --</option>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
              placeholder="Décrivez l'activité, le niveau requis, ce que les enfants apprendront..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Jour(s)</label><input type="text" value={formData.schedule_day} onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent" placeholder="Ex: Samedi" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Horaire</label><input type="text" value={formData.schedule_time} onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent" placeholder="Ex: 09h00-11h00" /></div></div><div className="flex items-center space-x-2"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-yellow-500 rounded" /><label className="text-sm font-medium text-gray-700">Activité active (visible pour les parents)</label></div><div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <span>Tarification</span>
              {!canEditPrices && <Lock className="w-4 h-4 text-gray-400" />}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif du cours (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.course_price}
                onChange={(e) => setFormData({ ...formData, course_price: parseFloat(e.target.value) })}
                disabled={!canEditPrices}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                  !canEditPrices ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Transport mensuel (défini par Admin):</span>
                <span className="text-lg font-semibold text-blue-600">{centerTransportFee.toLocaleString('fr-FR')} F</span>
              </div>
              <p className="text-xs text-gray-500">
                Le tarif transport est appliqué automatiquement par le système et ne peut pas être modifié. Contactez l'administrateur SHIPP pour tout changement.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total par mois:</span>
                <span className="text-yellow-600">{total.toLocaleString('fr-FR')} F</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cours: {formData.course_price.toLocaleString('fr-FR')} F + Transport: {centerTransportFee.toLocaleString('fr-FR')} F
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-6 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Enregistrement...' : (activity ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
