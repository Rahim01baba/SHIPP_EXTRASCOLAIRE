import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Users, Clock, ChevronRight, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface ActivityType {
  id: string;
  category: string;
  name: string;
  display_order: number | null;
}

interface PublicCenter {
  id: string;
  name: string;
  logo_url: string | null;
  address_text: string | null;
  google_maps_url: string | null;
  age_min: number | null;
  age_max: number | null;
  activity_type_ids: string[] | null;
  transport_fee_monthly: number | null;
}

interface PublicActivity {
  id: string;
  center_id: string;
  name: string;
  activity_type_id: string | null;
  days_of_week: number[] | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  course_price: number | null;
  transport_price: number | null;
  age_min: number | null;
  age_max: number | null;
}

interface Category {
  key: string;
  label: string;
  icon: string;
  subtitle: string;
  typeIds: Set<string>;
}

// Catégories affichées tant que la base ne renvoie pas les types d'activités
const FALLBACK_CATEGORIES = [
  { label: 'Musique', subtitle: 'Piano, Guitare, Chant' },
  { label: 'Sport', subtitle: 'Football, Basketball, Natation' },
  { label: 'Robotique', subtitle: 'Programmation, Électronique' },
  { label: 'Arts', subtitle: 'Peinture, Dessin, Sculpture' },
  { label: 'Langues', subtitle: 'Anglais, Français, Chinois' },
  { label: 'Sciences', subtitle: 'Chimie, Physique, Biologie' },
];

function iconFor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('musique') || c.includes('scène')) return '🎵';
  if (c.includes('sport')) return '⚽';
  if (c.includes('robot') || c.includes('techno') || c.includes('science')) return '🤖';
  if (c.includes('art')) return '🎨';
  if (c.includes('langue') || c.includes('culture')) return '🌍';
  if (c.includes('aviation')) return '✈️';
  if (c.includes('développement') || c.includes('personnel')) return '♟️';
  return '⭐';
}

function formatDays(a: PublicActivity): string {
  const days = a.days_of_week && a.days_of_week.length > 0
    ? a.days_of_week
    : a.day_of_week != null ? [a.day_of_week] : [];
  return days.map((d) => DAY_LABELS[d]).filter(Boolean).join(', ');
}

function formatHours(a: PublicActivity): string {
  if (!a.start_time) return '';
  const start = a.start_time.slice(0, 5);
  const end = a.end_time ? a.end_time.slice(0, 5) : '';
  return end ? `${start} – ${end}` : start;
}

function ageRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return '';
  if (min != null && max != null) return `${min} – ${max} ans`;
  return min != null ? `dès ${min} ans` : `jusqu'à ${max} ans`;
}

export default function CategoryCentersSection() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [centers, setCenters] = useState<PublicCenter[]>([]);
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  useEffect(() => {
    (async () => {
      const [typesRes, centersRes, activitiesRes] = await Promise.all([
        supabase
          .from('activity_types')
          .select('id, category, name, display_order')
          .eq('is_active', true)
          .order('display_order'),
        // Colonnes publiques uniquement (pas d'email, téléphone, notes admin…)
        supabase
          .from('centers')
          .select('id, name, logo_url, address_text, google_maps_url, age_min, age_max, activity_type_ids, transport_fee_monthly')
          .eq('status', 'approved')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('activities')
          .select('id, center_id, name, activity_type_id, days_of_week, day_of_week, start_time, end_time, course_price, transport_price, age_min, age_max')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (typesRes.error) console.error('[Landing] activity_types:', typesRes.error);
      if (centersRes.error) console.error('[Landing] centers:', centersRes.error);
      if (activitiesRes.error) console.error('[Landing] activities:', activitiesRes.error);

      setTypes((typesRes.data as unknown as ActivityType[]) || []);
      setCenters((centersRes.data as unknown as PublicCenter[]) || []);
      setActivities((activitiesRes.data as unknown as PublicActivity[]) || []);
      setLoaded(true);
    })();
  }, []);

  const categories: Category[] = useMemo(() => {
    if (types.length === 0) {
      return FALLBACK_CATEGORIES.map((c) => ({
        key: c.label,
        label: c.label,
        icon: iconFor(c.label),
        subtitle: c.subtitle,
        typeIds: new Set<string>(),
      }));
    }

    const byCategory = new Map<string, ActivityType[]>();
    for (const t of types) {
      if (!byCategory.has(t.category)) byCategory.set(t.category, []);
      byCategory.get(t.category)!.push(t);
    }

    return Array.from(byCategory.entries())
      .sort(([, a], [, b]) => (a[0].display_order ?? 0) - (b[0].display_order ?? 0))
      .map(([category, list]) => ({
        key: category,
        label: category,
        icon: iconFor(category),
        subtitle: list.slice(0, 3).map((t) => t.name).join(', ') + (list.length > 3 ? '…' : ''),
        typeIds: new Set(list.map((t) => t.id)),
      }));
  }, [types]);

  // Centres (avec leurs activités) correspondant à une catégorie
  const centersFor = (category: Category) => {
    return centers
      .map((center) => {
        const centerActivities = activities.filter(
          (a) => a.center_id === center.id && a.activity_type_id && category.typeIds.has(a.activity_type_id)
        );
        const declaresType = (center.activity_type_ids || []).some((id) => category.typeIds.has(id));
        return { center, centerActivities, matches: centerActivities.length > 0 || declaresType };
      })
      .filter((x) => x.matches);
  };

  const countFor = (category: Category) => (category.typeIds.size ? centersFor(category).length : 0);

  const selectedCenters = selected ? centersFor(selected) : [];

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {categories.map((category) => {
          const count = countFor(category);
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelected(category)}
              className="text-left bg-gray-50 rounded-xl p-6 border-2 border-gray-100 hover:border-yellow-400 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <div className="text-5xl mb-4">{category.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-black">{category.label}</h3>
              <p className="text-gray-600">{category.subtitle}</p>
              <p className="mt-4 inline-flex items-center text-sm font-semibold text-yellow-600">
                {loaded && count > 0
                  ? `Voir ${count} centre${count > 1 ? 's' : ''}`
                  : 'Voir les centres'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <div className="flex items-start justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{selected.icon}</span>
                <div>
                  <h3 id="category-dialog-title" className="text-2xl font-bold text-black">{selected.label}</h3>
                  <p className="text-sm text-gray-600">Centres partenaires validés par SHIPP</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              {selectedCenters.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-800">Bientôt disponible</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Aucun centre partenaire n'est encore référencé dans cette catégorie.
                  </p>
                </div>
              ) : (
                selectedCenters.map(({ center, centerActivities }) => (
                  <div key={center.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      {center.logo_url ? (
                        <img src={center.logo_url} alt={center.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-yellow-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-lg text-black truncate">{center.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          {center.address_text && (
                            center.google_maps_url ? (
                              <a href={center.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:text-black underline">
                                <MapPin className="w-4 h-4 mr-1" />{center.address_text}
                              </a>
                            ) : (
                              <span className="inline-flex items-center"><MapPin className="w-4 h-4 mr-1" />{center.address_text}</span>
                            )
                          )}
                          {ageRange(center.age_min, center.age_max) && (
                            <span className="inline-flex items-center"><Users className="w-4 h-4 mr-1" />{ageRange(center.age_min, center.age_max)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {centerActivities.length > 0 ? (
                      <ul className="divide-y divide-gray-100">
                        {centerActivities.map((a) => {
                          const course = a.course_price || 0;
                          const transport = a.transport_price || center.transport_fee_monthly || 0;
                          const schedule = [formatDays(a), formatHours(a)].filter(Boolean).join(' · ');
                          return (
                            <li key={a.id} className="py-2 flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{a.name}</p>
                                {schedule && (
                                  <p className="text-xs text-gray-500 inline-flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />{schedule}
                                  </p>
                                )}
                              </div>
                              {course > 0 && (
                                <div className="text-right text-sm whitespace-nowrap">
                                  <p className="font-semibold text-black">{(course + transport).toLocaleString('fr-FR')} FCFA<span className="font-normal text-gray-500">/mois</span></p>
                                  <p className="text-xs text-gray-500">dont transport {transport.toLocaleString('fr-FR')} FCFA</p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Activités détaillées bientôt disponibles.</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500 transition"
              >
                Inscrire mon enfant
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
