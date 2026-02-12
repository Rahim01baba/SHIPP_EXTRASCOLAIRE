import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Users, Calendar, CreditCard, FileText, Bell, Plus, Edit, Trash2, Phone, Shield, CheckCircle, XCircle, Ban, AlertCircle, Clock } from 'lucide-react';
import AddChildModal from '../../components/parent/AddChildModal';
import EditChildModal from '../../components/parent/EditChildModal';
import NewEnrollmentModal from '../../components/parent/NewEnrollmentModal';
import { getEnrollmentStatusLabel, getEnrollmentStatusBadgeVariant, isPendingValidation } from '../../lib/enrollmentStatus';
import Badge from '../../components/ui/Badge';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  transport_authorization: boolean;
  photo_url: string | null;
  medical_notes: string | null;
}

interface Enrollment {
  id: string;
  child_id: string;
  child_name: string;
  activity_name: string;
  center_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  enrollment_month: string;
}

interface MonthlyInvoice {
  month: string;
  paid: boolean;
  invoiceSent: boolean;
  amount: number;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function InvoicesView() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadMonthlyInvoices(selectedChild);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('parent_id', user.id);

    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChild(data[0].id);
    }
    setLoading(false);
  };

  const loadMonthlyInvoices = async (childId: string) => {
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('id, total_amount')
      .eq('child_id', childId)
      .eq('status', 'active');

    if (!enrollmentsData || enrollmentsData.length === 0) {
      setMonthlyInvoices([]);
      return;
    }

    const enrollment = enrollmentsData[0];
    const currentYear = new Date().getFullYear();

    const monthlyData = await Promise.all(
      MONTHS.map(async (month, index) => {
        const monthDate = new Date(currentYear, index, 1).toISOString().split('T')[0];

        const { data: payment } = await supabase
          .from('payments')
          .select('id, status')
          .eq('enrollment_id', enrollment.id)
          .eq('payment_month', monthDate)
          .maybeSingle();

        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, invoice_sent')
          .eq('enrollment_id', enrollment.id)
          .eq('invoice_date', monthDate)
          .maybeSingle();

        return {
          month,
          paid: payment?.status === 'paid',
          invoiceSent: invoice?.invoice_sent || false,
          amount: enrollment.total_amount,
        };
      })
    );

    setMonthlyInvoices(monthlyData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Aucun enfant inscrit</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Factures mensuelles</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner un enfant
        </label>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {children.map((child: any) => (
            <option key={child.id} value={child.id}>
              {child.first_name} {child.last_name}
            </option>
          ))}
        </select>
      </div>

      {monthlyInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune inscription active pour cet enfant</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mois
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Payé
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Facture envoyée
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthlyInvoices.map((invoice) => (
                <tr key={invoice.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {invoice.month}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {invoice.amount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-center">
                    {invoice.paid ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {invoice.paid && invoice.invoiceSent ? (
                      <div className="text-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xs text-green-600">
                          La facture du mois de {invoice.month} a été envoyée par email
                        </p>
                      </div>
                    ) : invoice.paid ? (
                      <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [children, setChildren] = useState<Child[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [showNewEnrollment, setShowNewEnrollment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadChildren(), loadEnrollments()]);
    setLoading(false);
  };

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
      .order('last_name');

    if (error) {
      console.error('Erreur chargement enfants:', error);
      return;
    }

    if (data) setChildren(data);
  };

  const deleteChild = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le profil de ${name} ?`)) {
      return;
    }

    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression');
      return;
    }

    loadChildren();
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

  const maskPhone = (phone: string): string => {
    if (phone.length < 4) return phone;
    return phone.substring(0, 6) + '***' + phone.substring(phone.length - 2);
  };

  const loadEnrollments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        child_id,
        status,
        payment_status,
        total_amount,
        enrollment_month,
        children!inner(first_name, last_name),
        activities!inner(
          name,
          centers!inner(name)
        )
      `)
      .eq('parent_id', user.id)
      .eq('is_deleted', false)
      .order('enrollment_month', { ascending: false });

    if (error) {
      console.error('Erreur chargement inscriptions:', error);
      return;
    }

    if (data) {
      const formatted = data.map((e: any) => ({
        id: e.id,
        child_id: e.child_id,
        child_name: `${e.children.first_name} ${e.children.last_name}`,
        activity_name: e.activities.name,
        center_name: e.activities.centers.name,
        status: e.status,
        payment_status: e.payment_status || 'pending',
        total_amount: e.total_amount,
        enrollment_month: e.enrollment_month,
      }));
      setEnrollments(formatted);
    }
  };

  const cancelEnrollment = async (enrollmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette inscription ?')) {
      return;
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update({ status: 'cancelled' })
      .eq('id', enrollmentId)
      .select('id');

    if (error) {
      console.error('[PARENT] Erreur annulation inscription:', error);
      alert(`Erreur lors de l'annulation : ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.warn('[PARENT] Cancellation failed: no rows affected');
      alert('Impossible d\'annuler : inscription non trouvée ou déjà annulée.');
      return;
    }

    console.log('[PARENT] Cancellation successful:', data[0].id);
    await loadEnrollments();
  };

  const deleteEnrollment = async (enrollmentId: string) => {
    if (!confirm('Supprimer définitivement cette inscription annulée ? Cette action est irréversible.')) {
      return;
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update({ is_deleted: true })
      .eq('id', enrollmentId)
      .eq('status', 'cancelled')
      .select('id');

    if (error) {
      console.error('[PARENT] Erreur suppression inscription:', error);
      alert(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.warn('[PARENT] Soft delete failed: no rows affected');
      alert('Impossible de supprimer : seules les inscriptions annulées peuvent être supprimées.');
      return;
    }

    console.log('[PARENT] Soft delete successful:', data[0].id);
    alert('Inscription supprimée avec succès');
    await loadEnrollments();
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Calendar },
    { id: 'children', label: 'Mes enfants', icon: Users },
    { id: 'enrollments', label: 'Inscriptions', icon: Calendar },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'invoices', label: 'Factures', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-lg">Espace Parent</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Bonjour, {profile?.full_name}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Mes enfants</h3>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold">{children.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Inscriptions actives</h3>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold">
                  {enrollments.filter(e => e.status === 'active' || e.status === 'confirmed').length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Total ce mois</h3>
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-bold">
                  {enrollments
                    .filter(e => e.status === 'active' || e.status === 'confirmed')
                    .reduce((sum, e) => sum + parseFloat(e.total_amount.toString()), 0)
                    .toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-gray-600 mt-2">Activité + transport aller-retour</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">Actions rapides</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('children')}
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Ajouter un enfant</p>
                    <p className="text-sm text-gray-500">Gérer les profils</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('enrollments')}
                  className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition"
                >
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Nouvelle inscription</p>
                    <p className="text-sm text-gray-500">Choisir une activité</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'children' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mes enfants</h2>
              <button
                onClick={() => setShowAddChild(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un enfant</span>
              </button>
            </div>

            {children.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun enfant enregistré</p>
                <button
                  onClick={() => setShowAddChild(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ajouter votre premier enfant
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enfant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Âge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact urgence</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transport</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {children.map((child) => (
                      <tr key={child.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                              {child.first_name[0]}{child.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium">{child.first_name} {child.last_name}</p>
                              <p className="text-xs text-gray-500">{child.gender === 'M' ? 'Garçon' : 'Fille'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm">{calculateAge(child.birth_date)} ans</p>
                          <p className="text-xs text-gray-500">{new Date(child.birth_date).toLocaleDateString('fr-FR')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-2">
                            <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{child.emergency_contact_name}</p>
                              <p className="text-xs text-gray-500">{maskPhone(child.emergency_contact_phone)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {child.transport_authorization ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Shield className="w-3 h-3" />
                              <span>Autorisé</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              Non autorisé
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingChild(child)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteChild(child.id, `${child.first_name} ${child.last_name}`)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showAddChild && (
          <AddChildModal
            onClose={() => setShowAddChild(false)}
            onSuccess={() => {
              loadChildren();
              setShowAddChild(false);
            }}
          />
        )}

        {editingChild && (
          <EditChildModal
            child={editingChild}
            onClose={() => setEditingChild(null)}
            onSuccess={() => {
              loadChildren();
              setEditingChild(null);
            }}
          />
        )}

        {activeTab === 'enrollments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mes inscriptions</h2>
              <button
                onClick={() => setShowNewEnrollment(true)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle inscription</span>
              </button>
            </div>

            {enrollments.some(e => e.payment_status === 'pending') && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span>Informations de paiement</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-white rounded-lg p-4 border-2 border-yellow-200">
                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Numéro de paiement Wave/Orange Money:</strong>
                    </p>
                    <p className="font-bold text-blue-700 text-2xl mb-3">0788360314</p>
                    <p className="text-xs text-gray-600">
                      <strong>Libellé suggéré:</strong> SHIPP + Nom enfant + Mois
                    </p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                    <p className="text-xs text-yellow-900 font-semibold mb-2">
                      Important:
                    </p>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                      <li>Votre inscription sera d'abord validée par SHIPP</li>
                      <li>Vous recevrez une notification de validation</li>
                      <li>Vous pourrez ensuite procéder au paiement</li>
                      <li>Après votre dépôt, l'admin SHIPP validera votre paiement</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {enrollments.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucune inscription pour le moment</p>
                <button
                  onClick={() => setShowNewEnrollment(true)}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Créer votre première inscription
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enfant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Paiement</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {enrollment.child_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {enrollment.center_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {enrollment.activity_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(enrollment.enrollment_month).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {enrollment.total_amount.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={getEnrollmentStatusBadgeVariant(enrollment.status)}>
                            {getEnrollmentStatusLabel(enrollment.status)}
                          </Badge>
                          {isPendingValidation(enrollment.status) && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center justify-center space-x-2 text-xs text-yellow-800">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>Votre demande est en cours de validation par SHIPP</span>
                              </div>
                            </div>
                          )}
                          {enrollment.status === 'rejected' && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs text-red-800">
                                Contactez SHIPP pour plus d'informations
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {enrollment.payment_status === 'paid' ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              <span>Payé</span>
                            </span>
                          ) : enrollment.payment_status === 'late' ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              <span>En retard</span>
                            </span>
                          ) : enrollment.payment_status === 'cancelled' ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" />
                              <span>Annulé</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              <span>En attente</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {enrollment.status === 'cancelled' ? (
                            <button
                              onClick={() => deleteEnrollment(enrollment.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-gray-600 hover:bg-gray-50 rounded transition text-sm"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Supprimer</span>
                            </button>
                          ) : enrollment.status !== 'rejected' && (
                            <button
                              onClick={() => cancelEnrollment(enrollment.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                              title="Annuler l'inscription"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Annuler</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showNewEnrollment && (
          <NewEnrollmentModal
            onClose={() => setShowNewEnrollment(false)}
            onSuccess={() => {
              loadEnrollments();
              setShowNewEnrollment(false);
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView />
        )}

        {(activeTab === 'payments' || activeTab === 'notifications') && (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">Cette section sera bientôt disponible</p>
          </div>
        )}
      </div>
    </div>
  );
}
