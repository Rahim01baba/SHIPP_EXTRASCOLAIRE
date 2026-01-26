import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewEnrollmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
}

interface Center {
  id: string;
  name: string;
  address: string;
}

interface Activity {
  id: string;
  name: string;
  description: string;
  course_price: number;
  transport_price: number;
  total_price: number;
}

export default function NewEnrollmentModal({ onClose, onSuccess }: NewEnrollmentModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [children, setChildren] = useState<Child[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [selectedChild, setSelectedChild] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [activityDetails, setActivityDetails] = useState<Activity | null>(null);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (step === 2) {
      loadCenters();
    }
  }, [step]);

  useEffect(() => {
    if (selectedCenter) {
      loadActivities(selectedCenter);
    }
  }, [selectedCenter]);

  useEffect(() => {
    if (selectedActivity) {
      loadActivityDetails(selectedActivity);
    }
  }, [selectedActivity]);

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('parent_id', user.id)
      .order('first_name');

    if (fetchError) {
      console.error('Erreur chargement enfants:', fetchError);
      setError('Erreur lors du chargement des enfants');
      return;
    }

    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChild(data[0].id);
    }
  };

  const loadCenters = async () => {
    const { data, error: fetchError } = await supabase
      .from('centers')
      .select('id, name, address')
      .eq('status', 'approved')
      .eq('is_active', true)
      .order('name');

    if (fetchError) {
      console.error('Erreur chargement centres:', fetchError);
      setError('Erreur lors du chargement des centres');
      return;
    }

    setCenters(data || []);
  };

  const loadActivities = async (centerId: string) => {
    const { data: activitiesData, error: fetchError } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        description,
        course_price,
        transport_price,
        center_id,
        centers!inner(transport_fee_monthly)
      `)
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('name');

    if (fetchError) {
      console.error('Erreur chargement activités:', fetchError);
      setError('Erreur lors du chargement des activités');
      return;
    }

    if (!activitiesData || activitiesData.length === 0) {
      setActivities([]);
      return;
    }

    const formattedActivities = activitiesData.map((activity: any) => {
      const coursePrice = activity.course_price || 0;
      const transportPrice = activity.transport_price || activity.centers?.transport_fee_monthly || 0;
      const totalPrice = coursePrice + transportPrice;

      return {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        course_price: coursePrice,
        transport_price: transportPrice,
        total_price: totalPrice,
      };
    });

    setActivities(formattedActivities);
    if (formattedActivities.length > 0) {
      setSelectedActivity(formattedActivities[0].id);
    }
  };

  const loadActivityDetails = async (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setActivityDetails(activity);
    }
  };

  const handleNext = () => {
    setError('');

    if (step === 1 && !selectedChild) {
      setError('Veuillez sélectionner un enfant');
      return;
    }
    if (step === 2 && !selectedCenter) {
      setError('Veuillez sélectionner un centre');
      return;
    }
    if (step === 3 && !selectedActivity) {
      setError('Veuillez sélectionner une activité');
      return;
    }
    if (step === 4 && !selectedMonth) {
      setError('Veuillez sélectionner un mois');
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setError('');
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        return;
      }

      if (!activityDetails) {
        setError('Détails de l\'activité non chargés');
        return;
      }

      const enrollmentDate = `${selectedMonth}-01`;

      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('child_id', selectedChild)
        .eq('activity_id', selectedActivity)
        .eq('enrollment_month', enrollmentDate)
        .maybeSingle();

      if (existingEnrollment) {
        setError('Cet enfant est déjà inscrit à cette activité pour ce mois');
        return;
      }

      console.log('[NewEnrollment] Creating enrollment...');
      const { data: enrollmentData, error: insertError } = await supabase
        .from('enrollments')
        .insert({
          parent_id: user.id,
          child_id: selectedChild,
          activity_id: selectedActivity,
          enrollment_month: enrollmentDate,
          status: 'pending_admin_validation',
          payment_status: 'pending',
          course_amount: activityDetails.course_price,
          transport_amount: activityDetails.transport_price,
          total_amount: activityDetails.total_price,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[NewEnrollment] Error creating enrollment:', insertError);
        setError(`Erreur lors de l'inscription: ${insertError.message}`);
        return;
      }

      if (!enrollmentData) {
        console.error('[NewEnrollment] No enrollment data returned');
        setError('Erreur: aucune donnée retournée');
        return;
      }

      console.log('[NewEnrollment] Enrollment created successfully:', {
        id: enrollmentData.id,
        status: enrollmentData.status,
        payment_status: enrollmentData.payment_status,
        total_amount: enrollmentData.total_amount,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[NewEnrollment] Exception during enrollment:', err);
      setError(`Une erreur inattendue est survenue: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Sélectionner un enfant';
      case 2: return 'Choisir un centre';
      case 3: return 'Choisir une formation';
      case 4: return 'Sélectionner le mois';
      case 5: return 'Récapitulatif';
      default: return '';
    }
  };

  const selectedChildData = children.find(c => c.id === selectedChild);
  const selectedCenterData = centers.find(c => c.id === selectedCenter);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Nouvelle inscription</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 5 && <div className={`w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{getStepTitle()}</h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {children.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Vous n'avez pas encore d'enfant enregistré</p>
                  <button
                    onClick={onClose}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ajouter un enfant d'abord
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Sélectionnez l'enfant que vous souhaitez inscrire
                  </p>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <label
                        key={child.id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedChild === child.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="child"
                          value={child.id}
                          checked={selectedChild === child.id}
                          onChange={(e) => setSelectedChild(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 font-medium">
                          {child.first_name} {child.last_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {centers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun centre validé disponible pour le moment
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Choisissez le centre partenaire
                  </p>
                  <div className="space-y-2">
                    {centers.map((center) => (
                      <label
                        key={center.id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedCenter === center.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="center"
                          value={center.id}
                          checked={selectedCenter === center.id}
                          onChange={(e) => setSelectedCenter(e.target.value)}
                          className="w-4 h-4 text-blue-600 mt-1"
                        />
                        <div className="ml-3">
                          <p className="font-medium">{center.name}</p>
                          <p className="text-sm text-gray-600">{center.address}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune activité disponible pour ce centre
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Sélectionnez la formation ou l'activité
                  </p>
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <label
                        key={activity.id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedActivity === activity.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="activity"
                          value={activity.id}
                          checked={selectedActivity === activity.id}
                          onChange={(e) => setSelectedActivity(e.target.value)}
                          className="w-4 h-4 text-blue-600 mt-1"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-lg">{activity.name}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-2xl font-bold text-blue-700">
                              {activity.total_price.toLocaleString('fr-FR')} FCFA
                              <span className="text-sm font-normal text-blue-600">/mois</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Activité + transport aller-retour inclus
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Choisissez le mois de début de l'inscription
              </p>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {step === 5 && activityDetails && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Récapitulatif de l'inscription</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enfant:</span>
                    <span className="font-medium">
                      {selectedChildData?.first_name} {selectedChildData?.last_name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Centre:</span>
                    <span className="font-medium">{selectedCenterData?.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Formation:</span>
                    <span className="font-medium">{activityDetails.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Mois:</span>
                    <span className="font-medium">
                      {new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  <div className="border-t border-blue-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-gray-900 block">TOTAL MENSUEL</span>
                        <span className="text-xs text-gray-600">Activité + transport aller-retour</span>
                      </div>
                      <span className="font-bold text-2xl text-blue-600">
                        {activityDetails.total_price.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Votre demande d'inscription sera validée par SHIPP. Vous serez notifié dès confirmation, puis vous pourrez procéder au paiement.
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-4 mt-6 pt-4 border-t">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 1 && children.length === 0) ||
                  (step === 2 && centers.length === 0) ||
                  (step === 3 && activities.length === 0)
                }
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Inscription en cours...' : 'Confirmer l\'inscription'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
