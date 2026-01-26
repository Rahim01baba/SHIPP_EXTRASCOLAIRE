import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddChildModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddChildModal({ onClose, onSuccess }: AddChildModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'M',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    transport_authorization: true,
    photo_url: '',
    medical_notes: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (jpg, png, webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo');
      return;
    }

    setPhotoFile(file);
    setError('');
  };

  const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error(`[AddChild] Error listing buckets:`, listError);
        return false;
      }

      const bucketExists = buckets?.some(b => b.name === bucketName);

      if (!bucketExists) {
        console.log(`[AddChild] Bucket ${bucketName} not found, creating...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
        });

        if (createError) {
          console.error(`[AddChild] Error creating bucket:`, createError);
          return false;
        }

        console.log(`[AddChild] Bucket ${bucketName} created successfully`);
      }

      return true;
    } catch (err) {
      console.error(`[AddChild] Exception checking bucket:`, err);
      return false;
    }
  };

  const uploadPhoto = async (childId: string, userId: string): Promise<string | null> => {
    if (!photoFile) return null;

    try {
      setUploadingPhoto(true);

      console.log('[AddChild] Checking bucket existence...');
      const bucketReady = await ensureBucketExists('children-photos');

      if (!bucketReady) {
        console.error('[AddChild] Bucket not ready');
        setError('Erreur: bucket de stockage non disponible');
        return null;
      }

      const fileExt = photoFile.name.split('.').pop();
      const filePath = `${childId}/${childId}.${fileExt}`;

      console.log('[AddChild] Uploading photo:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('children-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) {
        console.error('[AddChild] Error uploading photo:', uploadError);
        setError(`Erreur lors de l'upload de la photo: ${uploadError.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('children-photos')
        .getPublicUrl(filePath);

      console.log('[AddChild] Photo uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err: any) {
      console.error('[AddChild] Exception uploading photo:', err);
      setError(`Erreur inattendue lors de l'upload de la photo: ${err.message || 'Erreur inconnue'}`);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError('Utilisateur non connecté');
        return;
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('children')
        .insert([{
          parent_id: userData.user.id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          birth_date: formData.birth_date,
          gender: formData.gender,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          transport_authorization: formData.transport_authorization,
          photo_url: null,
          medical_notes: formData.medical_notes.trim() || null,
        }])
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (photoFile && insertedData) {
        const photoUrl = await uploadPhoto(insertedData.id, userData.user.id);
        if (photoUrl) {
          const { error: updateError } = await supabase
            .from('children')
            .update({ photo_url: photoUrl })
            .eq('id', insertedData.id);

          if (updateError) {
            console.error('Erreur mise à jour photo URL:', updateError);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError('Une erreur est survenue lors de la création de l\'enfant');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Ajouter un enfant</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Prénom de l'enfant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom de l'enfant"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sexe <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="M">Garçon</option>
                <option value="F">Fille</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-4">Contact d'urgence</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom complet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone du contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="transport_auth"
                checked={formData.transport_authorization}
                onChange={(e) => handleChange('transport_authorization', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="transport_auth" className="text-sm font-medium text-gray-700">
                J'autorise le transport de mon enfant <span className="text-red-500">*</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Cette autorisation est obligatoire pour utiliser les services de transport SHIPP.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo (optionnel)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                id="photo-upload"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {photoFile ? photoFile.name : 'Choisir une photo (max 5 Mo)'}
                </span>
              </label>
              {uploadingPhoto && (
                <p className="text-xs text-blue-600">Upload de la photo en cours...</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes médicales (optionnel)
            </label>
            <textarea
              value={formData.medical_notes}
              onChange={(e) => handleChange('medical_notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Allergies, médicaments, conditions particulières..."
            />
          </div>

          <div className="flex space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !formData.transport_authorization}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
