import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Power, Tag } from 'lucide-react';

interface ActivityType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function ActivityTypesPage() {
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_types')
      .select('*')
      .order('name');

    if (data) setTypes(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;

    const { data, error } = await supabase
      .from('activity_types')
      .insert([{ name: newLabel.trim(), is_active: true }])
      .select()
      .single();

    if (error) {
      console.error('[ActivityTypes] Error creating type:', error);
      alert(`Erreur: ${error.message}`);
      return;
    }

    console.log('[ActivityTypes] Type created successfully:', data);
    setNewLabel('');
    setShowAdd(false);
    loadTypes();
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('activity_types')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    loadTypes();
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Types d'activités</h1>
          <p className="text-gray-600 mt-2">Gérez les catégories d'activités proposées par les centres</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un type</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-yellow-400">
          <h3 className="font-semibold mb-4">Nouveau type d'activité</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Football, Natation, Danse..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-500 transition font-medium"
            >
              Enregistrer
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewLabel('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type d'activité</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date de création</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{type.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(type.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    type.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {type.is_active ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => toggleActive(type.id, type.is_active)}
                      className={`p-2 rounded-lg transition ${
                        type.is_active
                          ? 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={type.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
