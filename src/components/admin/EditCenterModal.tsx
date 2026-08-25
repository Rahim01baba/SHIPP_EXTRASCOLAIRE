import { useState, useEffect } from 'react';
import { X, Upload, Check, AlertCircle, Save, CheckCircle, XCircle, Plus, Edit, Power, PowerOff, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AddEditActivityModal from './AddEditActivityModal';

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface EditCenterModalProps {
  center: {
    id: string;
    name: string;
    status: string;
    phone: string;
    email: string;
    address_text: string | null;
    google_maps_link: string | null;
    logo_url: string | null;
    is_active: boolean;
    notes_admin: string | null;
    transport_fee_monthly?: number;
    shipp_commission_pct?: number;
    allow_center_edit_prices?: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCenterModal({ center, onClose, onSuccess }: EditCenterModalProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: center.name,
    phone: center.phone,
    email: center.email,
    address_text: center.address_text || center.address || '',
    google_maps_link: center.google_maps_link || '',
    status: center.status,
    is_active: center.is_active,
    notes_admin: center.notes_admin || '',
    transport_fee_monthly: center.transport_fee_monthly || 0,
    shipp_commission_pct: center.shipp_commission_pct || 30,
    allow_center_edit_prices: center.allow_center_edit_prices || false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(center.logo_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [globalTransportPrice, setGlobalTransportPrice] = useState(0);

  useEffect(() => {
    loadActivities();
    loadGlobalTransportPrice();
  }, []);

  const loadGlobalTransportPrice = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'transport_price_default')
      .maybeSingle();

    if (data) {
      setGlobalTransportPrice(Number(data.value));
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);

    const { data, error: fetchError } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        description,
        activity_type_id,
        course_price,
        transport_price,
        total_price,
        use_global_transport,
        is_active,
        days_of_week,
        start_time,
        end_time,
        activity_types!inner(name)
      `)
      .eq('center_id', center.id)
      .order('name');

    if (fetchError) {
      console.error('Erreur chargement activités:', fetchError);
      setLoadingActivities(false);
      return;
    }

    if (data) {
      const formatted = data.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        activity_type_id: a.activity_type_id,
        activity_type_name: a.activity_types.name,
        course_price: a.course_price,
        transport_price: a.transport_price,
        total_price: a.total_price,
        use_global_transport: a.use_global_transport,
        is_active: a.is_active,
        days_of_week: a.days_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }));
      setActivities(formatted);
    }

    setLoadingActivities(false);
  };

  const handleToggleActivityStatus = async (activityId: string, currentStatus: boolean) => {
    const { error: toggleError } = await supabase
      .from('activities')
      .update({ is_active: !currentStatus })
      .eq('id', activityId);

    if (toggleError) {
      console.error('Erreur toggle activité:', toggleError);
      setError(`Erreur: ${toggleError.message}`);
      return;
    }

    setSuccess(`Activité ${!currentStatus ? 'activée' : 'désactivée'} avec succès`);
    setTimeout(() => setSuccess(''), 3000);
    loadActivities();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Le fichier ne doit pas dépasser 2 MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoPreview;

    setUploading(true);
    setError('');

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${center.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('center-logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Erreur upload logo:', uploadError);
        setError(`Erreur upload: ${uploadError.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('center-logos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Exception upload logo:', err);
      setError('Une erreur est survenue lors de l\'upload');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let logoUrl = logoPreview;

      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        logoUrl = uploadedUrl;
      }

      const { error: updateError } = await supabase
        .from('centers')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address_text: formData.address_text,
          google_maps_link: formData.google_maps_link || null,
          status: formData.status,
          is_active: formData.is_active,
          notes_admin: formData.notes_admin || null,
          logo_url: logoUrl || null,
          transport_fee_monthly: formData.transport_fee_monthly,
          shipp_commission_pct: formData.shipp_commission_pct,
          allow_center_edit_prices: formData.allow_center_edit_prices,
        })
        .eq('id', center.id);

      if (updateError) {
        console.error('Erreur mise à jour centre:', updateError);
        setError(`Erreur: ${updateError.message}`);
        return;
      }

      setSuccess('Centre mis à jour avec succès');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Exception mise à jour centre:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setFormData(prev => ({ ...prev, status: 'approved', is_active: true }));
    setTimeout(handleSave, 100);
  };

  const handleReject = async () => {
    setFormData(prev => ({ ...prev, status: 'rejected', is_active: false }));
    setTimeout(handleSave, 100);
  };

  const handleDeactivate = async () => {
    setFormData(prev => ({ ...prev, is_active: false }));
    setTimeout(handleSave, 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Éditer le centre</h2>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du centre *
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
                  Téléphone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse *
                </label>
                <textarea
                  name="address_text" value={formData.address_text}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lien Google Maps
                </label>
                <input
                  type="url"
                  name="google_maps_link"
                  value={formData.google_maps_link}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo du centre
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {logoPreview ? (
                    <div className="space-y-2">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-contain mx-auto rounded"
                      />
                      <label className="cursor-pointer inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm">
                        <Upload className="w-4 h-4" />
                        <span>Changer le logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">Cliquer pour uploader un logo</span>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu'à 2 MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut de validation
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Validé</option>
                  <option value="rejected">Rejeté</option>
                  <option value="suspended">Suspendu</option>
                </select>
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
                  Centre actif
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes admin (internes)
                </label>
                <textarea
                  name="notes_admin"
                  value={formData.notes_admin}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Notes visibles uniquement par les admins..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Paramètres financiers</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport mensuel (FCFA)
                </label>
                <input
                  type="number"
                  name="transport_fee_monthly"
                  value={formData.transport_fee_monthly}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Appliqué automatiquement à toutes les activités de ce centre
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission SHIPP (%)
                </label>
                <input
                  type="number"
                  name="shipp_commission_pct"
                  value={formData.shipp_commission_pct}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Part de SHIPP sur les paiements
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2 mt-7">
                  <input
                    type="checkbox"
                    name="allow_center_edit_prices"
                    checked={formData.allow_center_edit_prices}
                    onChange={handleChange}
                    className="w-4 h-4 text-yellow-500 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Autoriser le centre à modifier les tarifs
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Si décoché, seul l'admin peut modifier les prix
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-yellow-500" />
                  <span>Activités / Formations du centre</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Gérez les activités proposées par ce centre
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingActivity(null);
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une activité</span>
              </button>
            </div>

            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune activité configurée pour ce centre</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez sur "Ajouter une activité" pour commencer</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activité</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horaire</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Formation</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transport</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {activities.map((activity) => {
                        const transportValue = activity.use_global_transport ? globalTransportPrice : activity.transport_price;
                        return (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                              {activity.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{activity.activity_type_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {activity.days_of_week && activity.days_of_week.length > 0 ? (
                                <div>{activity.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}</div>
                              ) : null}
                              {(activity.start_time || activity.end_time) && (
                                <div className="text-xs text-gray-500">
                                  {(activity.start_time || '').slice(0, 5)}{activity.start_time && activity.end_time ? ' - ' : ''}{(activity.end_time || '').slice(0, 5)}
                                </div>
                              )}
                              {(!activity.days_of_week || activity.days_of_week.length === 0) && !activity.start_time && !activity.end_time && (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {activity.course_price.toLocaleString('fr-FR')} FCFA
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {activity.use_global_transport ? (
                                <div>
                                  <span className="text-blue-600 font-medium">{transportValue.toLocaleString('fr-FR')} FCFA</span>
                                  <span className="block text-xs text-gray-500">Global</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-gray-900 font-medium">{transportValue.toLocaleString('fr-FR')} FCFA</span>
                                  <span className="block text-xs text-gray-500">Spécifique</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              {(activity.course_price + transportValue).toLocaleString('fr-FR')} FCFA
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                activity.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {activity.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingActivity(activity);
                                    setShowActivityModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Éditer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActivityStatus(activity.id, activity.is_active)}
                                  className={`p-1 rounded transition ${
                                    activity.is_active
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  }`}
                                  title={activity.is_active ? 'Désactiver' : 'Activer'}
                                >
                                  {activity.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t mt-6">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>

            {formData.status !== 'approved' && (
              <button
                onClick={handleValidate}
                disabled={saving || uploading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Valider</span>
              </button>
            )}

            {formData.status !== 'rejected' && (
              <button
                onClick={handleReject}
                disabled={saving || uploading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeter</span>
              </button>
            )}

            {formData.is_active && (
              <button
                onClick={handleDeactivate}
                disabled={saving || uploading}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Désactiver</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showActivityModal && (
        <AddEditActivityModal
          centerId={center.id}
          activity={editingActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
          onSuccess={() => {
            loadActivities();
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
        />
      )}
    </div>
  );
}
