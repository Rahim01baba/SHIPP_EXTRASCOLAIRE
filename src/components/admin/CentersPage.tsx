import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Check, X, Clock, AlertCircle, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV } from '../../lib/csvExport';
import EditCenterModal from './EditCenterModal';

interface Center {
  id: string;
  name: string;
  address: string;
  address_text: string | null;
  phone: string;
  email: string;
  status: string;
  google_maps_link: string | null;
  logo_url: string | null;
  is_active: boolean;
  notes_admin: string | null;
  created_at: string;
  insurance_info: string | null;
  rejected_reason: string | null;
  owner_profile_id: string;
}

export default function CentersPage() {
  const { profile } = useAuth();
  const [centers, setcenters] = useState<Center[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);

  useEffect(() => {
    loadCenters();
  }, [filterStatus]);

  const loadCenters = async () => {
    setLoading(true);

    let query = supabase
      .from('centers')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    if (data) setcenters(data);
    setLoading(false);
  };

  const handleValidate = async (centerId: string) => {
    const { error } = await supabase
      .from('centers')
      .update({
        status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: profile?.id,
      })
      .eq('id', centerId);

    if (!error) {
      alert('Centre validé avec succès');
      loadCenters();
    } else {
      console.error('Error validating center:', error);
      alert(`Erreur lors de la validation: ${error.message}`);
    }
  };

  const handleReject = async (centerId: string) => {
    const reason = prompt('Motif de refus (obligatoire) :');
    if (!reason || !reason.trim()) return;

    const { error } = await supabase
      .from('centers')
      .update({
        status: 'rejected',
        is_active: false,
        rejected_reason: reason.trim(),
      })
      .eq('id', centerId);

    if (!error) {
      alert('Centre refusé');
      loadCenters();
    } else {
      console.error('Error rejecting center:', error);
      alert(`Erreur lors du refus: ${error.message}`);
    }
  };

  const handleSuspend = async (centerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce centre ?')) return;

    const { error } = await supabase
      .from('centers')
      .update({
        status: 'suspended',
        is_active: false,
      })
      .eq('id', centerId);

    if (!error) {
      alert('Centre suspendu');
      loadCenters();
    } else {
      console.error('Error suspending center:', error);
      alert(`Erreur lors de la suspension: ${error.message}`);
    }
  };

  const handleExport = () => {
    const dataToExport = centers.map((c) => ({
      id: c.id,
      nom: c.name,
      adresse: c.address_text || c.address || '',
      statut: c.status,
      actif: c.is_active ? 'Oui' : 'Non',
      assurance: c.insurance_info || 'Non renseignée',
      motif_refus: c.rejected_reason || '',
      date_creation: new Date(c.created_at).toLocaleDateString('fr-FR'),
    }));

    exportToCSV(
      dataToExport,
      `shipp_centres_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des centres</h1>
          <p className="text-gray-600 mt-2">
            Validation et suivi des centres partenaires
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

      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'pending', label: 'En attente' },
          { value: 'approved', label: 'Validés' },
          { value: 'rejected', label: 'Refusés' },
          { value: 'suspended', label: 'Suspendus' }
        ].map((status) => (
          <button
            key={status.value}
            onClick={() => setFilterStatus(status.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === status.value
                ? 'bg-yellow-400 text-black'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {centers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun centre trouvé avec ce filtre</p>
        </div>
      ) : (
        <div className="space-y-4">
          {centers.map((center) => (
            <div key={center.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold text-lg">{center.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        center.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : center.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : center.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {center.status === 'approved' ? 'Validé' :
                       center.status === 'pending' ? 'En attente' :
                       center.status === 'rejected' ? 'Refusé' : 'Suspendu'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{center.address_text || center.address || 'Adresse non renseignée'}</p>
                  <p className="text-gray-500 text-xs">
                    Créé le {new Date(center.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {center.insurance_info && (
                    <p className="text-gray-600 text-sm mt-2">
                      <span className="font-medium">Assurance:</span> {center.insurance_info}
                    </p>
                  )}
                  {center.rejected_reason && (
                    <p className="text-red-600 text-sm mt-2">
                      <span className="font-medium">Motif refus:</span> {center.rejected_reason}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingCenter(center)}
                    className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Éditer</span>
                  </button>
                  {center.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleValidate(center.id)}
                        className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Valider</span>
                      </button>
                      <button
                        onClick={() => handleReject(center.id)}
                        className="flex items-center space-x-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        <X className="w-4 h-4" />
                        <span>Refuser</span>
                      </button>
                    </>
                  )}
                  {center.status === 'approved' && (
                    <button
                      onClick={() => handleSuspend(center.id)}
                      className="flex items-center space-x-1 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition text-sm"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Suspendre</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingCenter && (
        <EditCenterModal
          center={editingCenter}
          onClose={() => setEditingCenter(null)}
          onSuccess={() => {
            loadCenters();
            setEditingCenter(null);
          }}
        />
      )}
    </div>
  );
}
