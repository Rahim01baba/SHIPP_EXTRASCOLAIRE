import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Phone, Mail, MapPin, Link as LinkIcon, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface Center {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_text: string | null;
  google_maps_link: string | null;
  description: string | null;
  logo_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  is_active: boolean;
  shipp_commission_pct: number | null;
  allow_center_edit_prices: boolean | null;
}

export default function CenterProfilePage({ center, onUpdate }: { center: Center; onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    name: center.name || '',
    phone: center.phone || '',
    email: center.email || '',
    address_text: center.address_text || '',
    google_maps_link: center.google_maps_link || '',
    description: center.description || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('centers')
      .update({
        phone: formData.phone,
        email: formData.email,
        address_text: formData.address_text,
        google_maps_link: formData.google_maps_link,
        description: formData.description,
      })
      .eq('id', center.id);

    if (error) {
      console.error('Error updating center:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    } else {
      setMessage({ type: 'success', text: 'Centre mis à jour avec succès' });
      onUpdate();
    }

    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Le fichier doit être une image' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'L\'image ne doit pas dépasser 2 MB' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${center.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('center-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('center-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('centers')
        .update({ logo_url: publicUrl })
        .eq('id', center.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Logo mis à jour avec succès' });
      onUpdate();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de l\'upload' });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (center.status) {
      case 'approved':
        return <span className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>Validé</span>
        </span>;
      case 'pending':
        return <span className="inline-flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>En attente</span>
        </span>;
      case 'rejected':
        return <span className="inline-flex items-center space-x-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>Rejeté</span>
        </span>;
      case 'suspended':
        return <span className="inline-flex items-center space-x-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>Suspendu</span>
        </span>;
      default:
        return <span className="inline-flex items-center space-x-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>{center.status}</span>
        </span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mon centre</h1>
        {getStatusBadge()}
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Logo du centre</h3>
          <div className="space-y-4">
            {center.logo_url ? (
              <div className="relative">
                <img
                  src={center.logo_url}
                  alt="Logo"
                  className="w-full h-48 object-contain bg-gray-50 rounded-lg"
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-300" />
              </div>
            )}
            <label className={`block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
              <Upload className="w-4 h-4 inline mr-2" />
              {uploading ? 'Upload en cours...' : 'Changer le logo'}
            </label>
            <p className="text-xs text-gray-500 text-center">
              Image PNG, JPG ou WEBP (max 2 MB)
            </p>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Informations du centre</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du centre
              </label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                <Building2 className="w-4 h-4" />
                <span>{center.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Le nom ne peut pas être modifié</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-400">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1 outline-none"
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-400">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="flex-1 outline-none"
                    placeholder="centre@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <div className="flex items-start space-x-2 px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-400">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <textarea
                  value={formData.address_text}
                  onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                  rows={3}
                  className="flex-1 outline-none resize-none"
                  placeholder="Adresse complète du centre"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lien Google Maps
              </label>
              <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-400">
                <LinkIcon className="w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.google_maps_link}
                  onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                  className="flex-1 outline-none"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                placeholder="Présentez votre centre, vos valeurs, vos installations..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold mb-2 text-gray-700">Statut</h3>
          <p className="text-sm text-gray-600">
            {center.is_active ? 'Actif' : 'Inactif'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Géré par l'administrateur</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold mb-2 text-gray-700">Commission SHIPP</h3>
          <p className="text-2xl font-bold text-gray-900">
            {center.shipp_commission_pct}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Part centre: {100 - center.shipp_commission_pct}%</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold mb-2 text-gray-700">Édition des tarifs</h3>
          <p className="text-sm text-gray-600">
            {center.allow_center_edit_prices ? 'Autorisée' : 'Verrouillée'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Géré par l'administrateur</p>
        </div>
      </div>
    </div>
  );
}
