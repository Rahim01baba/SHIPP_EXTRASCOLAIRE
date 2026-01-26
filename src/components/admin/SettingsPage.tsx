import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, Check, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [transportPrice, setTransportPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'transport_price_default')
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur chargement paramètres:', fetchError);
      setError(`Erreur: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    if (data) {
      setTransportPrice(Number(data.value));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (transportPrice < 0) {
      setError('Le tarif ne peut pas être négatif');
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('settings')
        .update({
          value: transportPrice,
          updated_by: profile?.id,
        })
        .eq('key', 'transport_price_default');

      if (updateError) {
        console.error('Erreur mise à jour paramètres:', updateError);
        setError(`Erreur: ${updateError.message}`);
        return;
      }

      setSuccess('Paramètres enregistrés avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Exception mise à jour paramètres:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Paramètres système</h1>
        <p className="text-gray-600 mt-2">
          Configurez les paramètres globaux de l'application
        </p>
      </div>

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

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-yellow-500" />
            <span>Tarification</span>
          </h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif transport global (FCFA)
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Ce tarif sera appliqué par défaut à toutes les activités qui utilisent le tarif transport global.
                Les activités peuvent avoir un tarif transport spécifique si nécessaire.
              </p>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={transportPrice}
                  onChange={(e) => setTransportPrice(Number(e.target.value))}
                  min="0"
                  step="1000"
                  className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-lg font-semibold"
                />
                <span className="text-gray-600 font-medium">FCFA / mois</span>
              </div>
            </div>

            <div className="pt-4 border-t border-yellow-300">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">i</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    Impact de la modification
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Ce tarif sera utilisé pour toutes les nouvelles inscriptions</li>
                    <li>• Les activités configurées avec le tarif global seront mises à jour</li>
                    <li>• Les inscriptions existantes conservent leur tarif actuel</li>
                    <li>• Modifiez une activité pour appliquer le nouveau tarif global</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-yellow-300">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Statistiques d'utilisation</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Tarif actuel:</p>
              <p className="font-bold text-blue-900 text-lg">
                {transportPrice.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div>
              <p className="text-gray-600">Dernière modification:</p>
              <p className="font-medium text-blue-900">-</p>
            </div>
            <div>
              <p className="text-gray-600">Modifié par:</p>
              <p className="font-medium text-blue-900">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
