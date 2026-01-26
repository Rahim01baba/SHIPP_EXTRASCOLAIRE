import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search, Eye } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';
import ParentDetailsModal from './ParentDetailsModal';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  children_count?: number;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredParents(
        parents.filter(
          (p) =>
            p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone.includes(searchTerm)
        )
      );
    } else {
      setFilteredParents(parents);
    }
  }, [searchTerm, parents]);

  const loadParents = async () => {
    setLoading(true);

    const { data: parentsData } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, created_at')
      .eq('role', 'parent')
      .order('created_at', { ascending: false });

    if (parentsData) {
      const parentsWithCount = await Promise.all(
        parentsData.map(async (parent) => {
          const { count } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', parent.id);

          return { ...parent, children_count: count || 0 };
        })
      );

      setParents(parentsWithCount);
      setFilteredParents(parentsWithCount);
    }

    setLoading(false);
  };

  const handleExport = () => {
    const dataToExport = filteredParents.map((p) => ({
      id: p.id,
      nom_complet: p.full_name,
      email: p.email,
      telephone: p.phone,
      nombre_enfants: p.children_count || 0,
      date_inscription: new Date(p.created_at).toLocaleDateString('fr-FR'),
    }));

    exportToCSV(
      dataToExport,
      `shipp_parents_${new Date().toISOString().split('T')[0]}.csv`
    );
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parents</h1>
          <p className="text-gray-600 mt-2">
            Liste des parents inscrits sur la plateforme
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
        >
          <Download className="w-4 h-4" />
          <span>Exporter CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Parent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Enfants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date inscription
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParents.map((parent) => (
              <tr key={parent.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-medium">{parent.full_name}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{parent.email}</p>
                  <p className="text-xs text-gray-500">{parent.phone}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {parent.children_count}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(parent.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setSelectedParentId(parent.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir détails</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredParents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun parent trouvé
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          Total : <span className="font-semibold">{filteredParents.length}</span>{' '}
          parent(s)
          {searchTerm && ` (sur ${parents.length})`}
        </p>
      </div>

      {selectedParentId && (
        <ParentDetailsModal
          parentId={selectedParentId}
          onClose={() => setSelectedParentId(null)}
        />
      )}
    </div>
  );
}
