import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search, Shield, XCircle } from 'lucide-react';
import { exportToCSV } from '../../lib/csvExport';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  transport_authorization: boolean;
  created_at: string;
  parent: {
    full_name: string;
    phone: string;
  };
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredChildren(
        children.filter(
          (c) =>
            c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredChildren(children);
    }
  }, [searchTerm, children]);

  const loadChildren = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('children')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        gender,
        transport_authorization,
        created_at,
        parent:profiles!parent_id(full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setChildren(data as any);
      setFilteredChildren(data as any);
    }

    setLoading(false);
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const handleExport = () => {
    const dataToExport = filteredChildren.map((c) => ({
      id: c.id,
      prenom: c.first_name,
      nom: c.last_name,
      age: calculateAge(c.birth_date),
      date_naissance: new Date(c.birth_date).toLocaleDateString('fr-FR'),
      sexe: c.gender === 'M' ? 'Garçon' : 'Fille',
      parent: c.parent.full_name,
      telephone_parent: c.parent.phone,
      autorisation_transport: c.transport_authorization ? 'Oui' : 'Non',
      date_creation: new Date(c.created_at).toLocaleDateString('fr-FR'),
    }));

    exportToCSV(
      dataToExport,
      `shipp_enfants_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900">Enfants</h1>
          <p className="text-gray-600 mt-2">
            Liste de tous les enfants enregistrés sur la plateforme
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
            placeholder="Rechercher par nom d'enfant ou parent..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Enfant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Âge
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Parent
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Transport
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date création
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredChildren.map((child) => (
              <tr key={child.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {child.first_name[0]}
                      {child.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {child.gender === 'M' ? 'Garçon' : 'Fille'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {calculateAge(child.birth_date)} ans
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium">{child.parent.full_name}</p>
                  <p className="text-xs text-gray-500">{child.parent.phone}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  {child.transport_authorization ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      <span>Autorisé</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <XCircle className="w-3 h-3" />
                      <span>Non autorisé</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(child.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredChildren.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun enfant trouvé
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          Total : <span className="font-semibold">{filteredChildren.length}</span>{' '}
          enfant(s)
          {searchTerm && ` (sur ${children.length})`}
        </p>
      </div>
    </div>
  );
}
