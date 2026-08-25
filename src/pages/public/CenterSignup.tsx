import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2, User, Mail, Phone, Lock, Upload, Plus, Trash2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Edit2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: '0', label: 'Dimanche' },
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
];

interface ActivityForm {
  id: string;
  name: string;
  activity_type_id: string;
  description: string;
  age_min: string;
  age_max: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_participants: string;
  course_price: string;
  use_global_transport: boolean;
  transport_price: string;
}

export default function CenterSignup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [step1Data, setStep1Data] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    center_name: '',
  });

  const [step2Data, setStep2Data] = useState({
    address_text: '',
    google_maps_link: '',
    description: '',
    website: '',
    rccm: '',
    commercial_name: '',
    contact_person_name: '',
    contact_person_phone: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [activities, setActivities] = useState<ActivityForm[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [globalTransportPrice, setGlobalTransportPrice] = useState(0);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  const [currentActivity, setCurrentActivity] = useState<ActivityForm>({
    id: '',
    name: '',
    activity_type_id: '',
    description: '',
    age_min: '',
    age_max: '',
    day_of_week: '6',
    start_time: '09:00',
    end_time: '11:00',
    max_participants: '',
    course_price: '',
    use_global_transport: true,
    transport_price: '0',
  });

  useEffect(() => {
    loadActivityTypes();
    loadGlobalTransportPrice();
  }, []);

  const loadActivityTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('[CenterSignup] Error loading activity types:', error);
        return;
      }

      if (data && data.length > 0) {
        setActivityTypes(data);
        if (!currentActivity.activity_type_id) {
          setCurrentActivity(prev => ({ ...prev, activity_type_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error('[CenterSignup] Exception loading activity types:', err);
    }
  };

  const loadGlobalTransportPrice = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'transport_price_default')
        .maybeSingle();

      if (error) {
        console.error('[CenterSignup] Error loading transport price:', error);
        return;
      }

      if (data) {
        setGlobalTransportPrice(Number(data.value) || 0);
      }
    } catch (err) {
      console.error('[CenterSignup] Exception loading transport price:', err);
    }
  };

  const handleStep1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStep1Data({ ...step1Data, [e.target.name]: e.target.value });
  };

  const handleStep2Change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setStep2Data({ ...step2Data, [e.target.name]: e.target.value });
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

  const handleActivityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentActivity({
      ...currentActivity,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleAddActivity = () => {
    if (!currentActivity.name || !currentActivity.activity_type_id || !currentActivity.course_price) {
      setError('Veuillez remplir les champs obligatoires de la formation');
      return;
    }

    if (!currentActivity.use_global_transport && !currentActivity.transport_price) {
      setError('Veuillez indiquer le tarif transport');
      return;
    }

    const newActivity = {
      ...currentActivity,
      id: editingActivityId || `temp_${Date.now()}`,
    };

    if (editingActivityId) {
      setActivities(activities.map(a => a.id === editingActivityId ? newActivity : a));
    } else {
      setActivities([...activities, newActivity]);
    }

    setCurrentActivity({
      id: '',
      name: '',
      activity_type_id: activityTypes[0]?.id || '',
      description: '',
      age_min: '',
      age_max: '',
      day_of_week: '6',
      start_time: '09:00',
      end_time: '11:00',
      max_participants: '',
      course_price: '',
      use_global_transport: true,
      transport_price: '0',
    });
    setEditingActivityId(null);
    setShowActivityForm(false);
    setSuccess('Formation ajoutée');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditActivity = (activity: ActivityForm) => {
    setCurrentActivity(activity);
    setEditingActivityId(activity.id);
    setShowActivityForm(true);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const validateStep1 = (): boolean => {
    if (!step1Data.full_name || !step1Data.email || !step1Data.phone || !step1Data.center_name) {
      setError('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (!step1Data.password || step1Data.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (step1Data.password !== step1Data.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(step1Data.email)) {
      setError('Adresse email invalide');
      return false;
    }

    return true;
  };

  const handleStep1Submit = async () => {
    setError('');
    if (!validateStep1()) return;

    setLoading(true);
    try {
      console.log('[CenterSignup] Starting signup process');
      console.log('[CenterSignup] Signup data:', {
        email: step1Data.email,
        full_name: step1Data.full_name,
        phone: step1Data.phone,
        role: 'center'
      });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1Data.email,
        password: step1Data.password,
        options: {
          data: {
            full_name: step1Data.full_name,
            phone: step1Data.phone,
            role: 'center',
          },
        },
      });

      if (authError) {
        console.error('[CenterSignup] Auth error:', authError);
        console.error('[CenterSignup] Error details:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        });
        setError(`Erreur d'inscription: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('[CenterSignup] No user returned from signup');
        setError('Erreur lors de la création du compte - aucun utilisateur retourné');
        setLoading(false);
        return;
      }

      console.log('[CenterSignup] User created successfully:', authData.user.id);
      console.log('[CenterSignup] Profile will be auto-created by trigger');
      console.log('[CenterSignup] Moving to step 2 - center details');

      setStep(2);
    } catch (err: any) {
      console.error('[CenterSignup] Exception étape 1:', err);
      setError(`Une erreur est survenue: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (centerId: string): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${centerId}/${Date.now()}.${fileExt}`;

      console.log('[CenterSignup] Uploading logo:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('center-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('[CenterSignup] Error uploading logo:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('center-logos')
        .getPublicUrl(fileName);

      console.log('[CenterSignup] Logo uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[CenterSignup] Exception uploading logo:', err);
      return null;
    }
  };

  const handleFinalSubmit = async () => {
    setError('');

    if (!step2Data.address_text || !step2Data.description) {
      setError('Veuillez remplir l\'adresse et la description');
      return;
    }

    if (activities.length === 0) {
      setError('Veuillez ajouter au moins une formation');
      return;
    }

    setLoading(true);
    try {
      console.log('[CenterSignup] Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('[CenterSignup] Error getting user:', userError);
        setError(`Erreur d'authentification: ${userError.message}`);
        setLoading(false);
        return;
      }

      if (!user) {
        console.error('[CenterSignup] No user found');
        setError('Session expirée, veuillez recommencer');
        setLoading(false);
        return;
      }

      console.log('[CenterSignup] User found:', user.id);

      const centerData: any = {
        name: step1Data.center_name,
        email: step1Data.email,
        phone: step1Data.phone,
        address_text: step2Data.address_text,
        google_maps_link: step2Data.google_maps_link || null,
        description: step2Data.description,
        owner_profile_id: user.id,
        status: 'pending',
        is_active: false,
      };

      console.log('[CenterSignup] Creating center with data:', centerData);

      const { data: centerResult, error: centerError } = await supabase
        .from('centers')
        .insert(centerData)
        .select()
        .single();

      if (centerError) {
        console.error('[CenterSignup] Error creating center:', centerError);
        setError(`Erreur création centre: ${centerError.message}`);
        setLoading(false);
        return;
      }

      if (!centerResult) {
        console.error('[CenterSignup] No center data returned');
        setError('Erreur: aucune donnée retournée après création du centre');
        setLoading(false);
        return;
      }

      console.log('[CenterSignup] Center created successfully:', centerResult.id);

      if (logoFile) {
        console.log('[CenterSignup] Uploading logo...');
        const logoUrl = await uploadLogo(centerResult.id);
        if (logoUrl) {
          const { error: logoUpdateError } = await supabase
            .from('centers')
            .update({ logo_url: logoUrl })
            .eq('id', centerResult.id)
            .select()
            .single();

          if (logoUpdateError) {
            console.error('[CenterSignup] Error updating logo URL:', logoUpdateError);
          } else {
            console.log('[CenterSignup] Logo URL updated successfully');
          }
        }
      }

      console.log('[CenterSignup] Creating activities...');
      for (const activity of activities) {
        const transportPrice = activity.use_global_transport ? globalTransportPrice : Number(activity.transport_price);
        const coursePrice = Number(activity.course_price);
        const totalPrice = coursePrice + transportPrice;

        const activityData = {
          center_id: centerResult.id,
          name: activity.name,
          activity_type_id: activity.activity_type_id || null,
          description: activity.description || null,
          age_min: activity.age_min ? Number(activity.age_min) : null,
          age_max: activity.age_max ? Number(activity.age_max) : null,
          day_of_week: activity.day_of_week ? Number(activity.day_of_week) : 6,
          start_time: activity.start_time || '09:00',
          end_time: activity.end_time || '11:00',
          max_participants: activity.max_participants ? Number(activity.max_participants) : null,
          course_price: coursePrice,
          transport_price: transportPrice,
          total_price: totalPrice,
          use_global_transport: activity.use_global_transport,
          is_active: true,
        };

        console.log('[CenterSignup] Creating activity:', activityData.name);

        const { error: activityError } = await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single();

        if (activityError) {
          console.error('[CenterSignup] Error creating activity:', activityError);
        } else {
          console.log('[CenterSignup] Activity created successfully');
        }
      }

      console.log('[CenterSignup] Signup completed successfully');
      setSuccess('Votre demande a été envoyée avec succès! SHIPP vous contactera après validation.');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      console.error('[CenterSignup] Exception during submission:', err);
      setError(`Une erreur est survenue: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeName = (id: string) => {
    return activityTypes.find(t => t.id === id)?.name || 'N/A';
  };

  const calculateActivityTotal = (activity: ActivityForm) => {
    const coursePrice = Number(activity.course_price) || 0;
    const transportPrice = activity.use_global_transport ? globalTransportPrice : (Number(activity.transport_price) || 0);
    return coursePrice + transportPrice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 py-12 px-4">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition bg-white px-4 py-2 rounded-lg shadow-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour</span>
      </Link>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Building2 className="w-12 h-12 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900">Devenir Centre Partenaire</h1>
            </div>
            <p className="text-gray-600">Rejoignez le réseau SHIPP et développez votre activité</p>
          </div>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                2
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Étape 1: Créer votre compte</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du responsable *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="full_name"
                      value={step1Data.full_name}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      name="email"
                      value={step1Data.email}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={step1Data.phone}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du centre *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="center_name"
                      value={step1Data.center_name}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      name="password"
                      value={step1Data.password}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={step1Data.confirmPassword}
                      onChange={handleStep1Change}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleStep1Submit}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Création...' : 'Créer mon compte'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h2 className="text-xl font-semibold text-gray-900">Étape 2: Informations détaillées</h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-6">
                <h3 className="font-semibold text-gray-900">Informations du centre</h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse complète *
                    </label>
                    <textarea
                      name="address_text"
                      value={step2Data.address_text}
                      onChange={handleStep2Change}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description du centre *
                    </label>
                    <textarea
                      name="description"
                      value={step2Data.description}
                      onChange={handleStep2Change}
                      rows={4}
                      placeholder="Présentez votre centre, vos valeurs, vos installations..."
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
                      value={step2Data.google_maps_link}
                      onChange={handleStep2Change}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site web
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={step2Data.website}
                      onChange={handleStep2Change}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo du centre
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain mx-auto" />
                          <label className="cursor-pointer block text-center text-sm text-blue-600 hover:text-blue-700">
                            Changer
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                          </label>
                        </div>
                      ) : (
                        <label className="cursor-pointer block text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-600">Upload logo (max 2 MB)</span>
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Informations administratives (optionnel)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="rccm"
                    value={step2Data.rccm}
                    onChange={handleStep2Change}
                    placeholder="Numéro RCCM"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="commercial_name"
                    value={step2Data.commercial_name}
                    onChange={handleStep2Change}
                    placeholder="Nom commercial"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="contact_person_name"
                    value={step2Data.contact_person_name}
                    onChange={handleStep2Change}
                    placeholder="Personne de contact"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    name="contact_person_phone"
                    value={step2Data.contact_person_phone}
                    onChange={handleStep2Change}
                    placeholder="Téléphone de contact"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Formations / Activités proposées *</h3>
                    <p className="text-sm text-gray-600 mt-1">Au moins une formation requise</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowActivityForm(!showActivityForm);
                      if (!showActivityForm) {
                        setCurrentActivity({
                          id: '',
                          name: '',
                          activity_type_id: activityTypes[0]?.id || '',
                          description: '',
                          age_min: '',
                          age_max: '',
                          day_of_week: '6',
                          start_time: '09:00',
                          end_time: '11:00',
                          max_participants: '',
                          course_price: '',
                          use_global_transport: true,
                          transport_price: '0',
                        });
                        setEditingActivityId(null);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une formation</span>
                  </button>
                </div>

                {showActivityForm && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom formation *</label>
                        <input
                          type="text"
                          name="name"
                          value={currentActivity.name}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type d'activité *</label>
                        <select
                          name="activity_type_id"
                          value={currentActivity.activity_type_id}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          required
                        >
                          {activityTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          name="description"
                          value={currentActivity.description}
                          onChange={handleActivityChange}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Âge min</label>
                        <input
                          type="number"
                          name="age_min"
                          value={currentActivity.age_min}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Âge max</label>
                        <input
                          type="number"
                          name="age_max"
                          value={currentActivity.age_max}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                        <select
                          name="day_of_week"
                          value={currentActivity.day_of_week}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day.value} value={day.value}>{day.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                        <input
                          type="time"
                          name="start_time"
                          value={currentActivity.start_time}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                        <input
                          type="time"
                          name="end_time"
                          value={currentActivity.end_time}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacité</label>
                        <input
                          type="number"
                          name="max_participants"
                          value={currentActivity.max_participants}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif formation (FCFA) *</label>
                        <input
                          type="number"
                          name="course_price"
                          value={currentActivity.course_price}
                          onChange={handleActivityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          checked={currentActivity.use_global_transport}
                          onChange={(e) => setCurrentActivity({ ...currentActivity, use_global_transport: e.target.checked })}
                          className="w-4 h-4 text-yellow-500 rounded"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Utiliser tarif transport global SHIPP ({globalTransportPrice.toLocaleString('fr-FR')} FCFA)
                        </label>
                      </div>

                      {!currentActivity.use_global_transport && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tarif transport spécifique (FCFA) *</label>
                          <input
                            type="number"
                            name="transport_price"
                            value={currentActivity.transport_price}
                            onChange={handleActivityChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            required
                          />
                        </div>
                      )}

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-sm font-medium text-gray-900">
                          Total mensuel: {calculateActivityTotal(currentActivity).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowActivityForm(false);
                          setEditingActivityId(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleAddActivity}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        {editingActivityId ? 'Modifier' : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                )}

                {activities.length === 0 && !showActivityForm && (
                  <p className="text-gray-500 text-center py-4">Aucune formation ajoutée</p>
                )}

                {activities.length > 0 && (
                  <div className="space-y-2">
                    {activities.map(activity => (
                      <div key={activity.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                            <p className="text-sm text-gray-600">{getActivityTypeName(activity.activity_type_id)}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              <span>Formation: {Number(activity.course_price).toLocaleString('fr-FR')} FCFA</span>
                              <span>Transport: {(activity.use_global_transport ? globalTransportPrice : Number(activity.transport_price)).toLocaleString('fr-FR')} FCFA</span>
                              <span className="font-semibold text-gray-900">Total: {calculateActivityTotal(activity).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Retour</span>
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading || activities.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{loading ? 'Soumission...' : 'Soumettre ma demande'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
