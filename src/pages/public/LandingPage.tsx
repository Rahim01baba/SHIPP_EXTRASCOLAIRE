import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Clock, Shield, Phone, Mail, HelpCircle, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CategoryCentersSection from '../../components/public/CategoryCentersSection';

interface Center {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [validatedCenters, setValidatedCenters] = useState<Center[]>([]);

  const whatsappNumber = '2250101723687';
  const whatsappMessage = encodeURIComponent('Bonjour SHIPP, je souhaite des informations sur le transport et les activités extrascolaires.');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  useEffect(() => {
    loadValidatedCenters();
  }, []);

  const loadValidatedCenters = async () => {
    const { data } = await supabase
      .from('centers')
      .select('id, name, logo_url')
      .eq('status', 'approved')
      .eq('is_active', true);

    if (data) setValidatedCenters(data);
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Bus className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-black">SHIPP</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-black transition font-medium">Accueil</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-black transition font-medium">Comment ça marche</a>
              <a href="#centers" className="text-gray-700 hover:text-black transition font-medium">Centres</a>
              <a href="#faq" className="text-gray-700 hover:text-black transition font-medium">FAQ</a>
              <a href="#contact" className="text-gray-700 hover:text-black transition font-medium">Contact</a>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/signup/center')}
                className="hidden sm:inline-flex items-center space-x-2 border-2 border-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition font-semibold text-sm"
              >
                <Building2 className="w-4 h-4" />
                <span>Devenir centre partenaire</span>
              </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-500 transition font-semibold"
            >
              Connexion
            </button> 
            </div>         </div>
        </div>
      </nav>

      <section id="home" className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">
                Transport et activités extrascolaires simplifiés
              </h1>
              <p className="text-xl mb-8 text-gray-300">
                SHIPP organise le transport et facilite l'accès aux activités extrascolaires et ludiques proposées par des centres partenaires indépendants.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition"
                >
                  Commencer maintenant
                </button>
                <a
                  href="#how-it-works"
                  className="border-2 border-yellow-400 text-yellow-400 px-8 py-4 rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition text-center"
                >
                  En savoir plus
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 space-y-4 border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="bg-yellow-400 p-3 rounded-lg">
                    <Bus className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Transport organisé</h3>
                    <p className="text-gray-300">Vers les centres d'activités</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-yellow-400 p-3 rounded-lg">
                    <Building2 className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Centres partenaires</h3>
                    <p className="text-gray-300">Activités variées et de qualité</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-yellow-400 p-3 rounded-lg">
                    <Shield className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Sécurité garantie</h3>
                    <p className="text-gray-300">Transport sécurisé pour vos enfants</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Comment ça marche ?</h2>
          <p className="text-xl text-center text-gray-600 mb-16">
            Simple, transparent et efficace
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Créez votre compte',
                description: 'Inscrivez-vous en quelques minutes',
                icon: '👤',
              },
              {
                step: '2',
                title: 'Choisissez une activité',
                description: 'Parcourez les centres partenaires et leurs activités',
                icon: '🎯',
              },
              {
                step: '3',
                title: 'Payez en ligne',
                description: 'Un seul paiement, facture détaillée : cours + transport',
                icon: '💳',
              },
              {
                step: '4',
                title: 'Nous gérons tout',
                description: 'SHIPP coordonne le transport et le lien avec les centres',
                icon: '✅',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-yellow-500 font-bold text-sm mb-2">ÉTAPE {item.step}</div>
                <h3 className="text-xl font-bold mb-2 text-black">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="centers" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Nos centres partenaires</h2>
          <p className="text-xl text-center text-gray-600 mb-16">
            Des activités de qualité pour tous les âges
          </p>
          <CategoryCentersSection />

          <div className="text-center">
            <button
              onClick={() => navigate('/signup/center')}
              className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              <Building2 className="w-5 h-5" />
              <span>Devenir centre partenaire</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {validatedCenters.length > 0 && (
        <section className="py-12 bg-gray-900 border-y border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-center text-gray-400 text-sm font-semibold mb-8">NOS PARTENAIRES</h3>
            <div className="flex items-center justify-center flex-wrap gap-8">
              {validatedCenters.map((center) => (
                <div key={center.id} className="flex items-center justify-center">
                  {center.logo_url ? (
                    <img
                      src={center.logo_url}
                      alt={center.name}
                      className="h-12 w-auto opacity-70 hover:opacity-100 transition grayscale hover:grayscale-0"
                    />
                  ) : (
                    <div className="text-white text-sm font-medium px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                      {center.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
          <h3 className="text-2xl font-bold mb-4 text-black">Transport sécurisé sur mesure</h3>
          <p className="text-lg text-gray-600">
            Prise en charge porte-à-porte lorsque possible, sinon au point le plus proche afin de garantir la sécurité des enfants.
          </p>
        </div>
      </section>

      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Questions fréquentes</h2>
          <p className="text-xl text-center text-gray-600 mb-16">
            Tout ce que vous devez savoir
          </p>
          <div className="space-y-6">
            {[
              {
                q: 'Qui dispense les cours ?',
                a: 'Les cours sont dispensés par des centres partenaires indépendants. SHIPP assure la coordination et le transport.',
              },
              {
                q: 'Comment fonctionne le paiement ?',
                a: 'Un seul paiement mensuel couvre à la fois le cours et le transport. Vous recevez une facture détaillée avec le tarif du cours et le tarif du transport.',
              },
              {
                q: 'Quels jours ont lieu les activités ?',
                a: 'Les jours et horaires dépendent de chaque activité et sont indiqués dans la fiche du centre. Le transport est organisé en fonction de ces créneaux.',
              },
              {
                q: 'Comment est assuré le transport ?',
                a: 'SHIPP organise le transport sécurisé avec prise en charge porte-à-porte lorsque possible, garantissant la sécurité des enfants.',
              },
              {
                q: 'Comment devenir centre partenaire ?',
                a: 'Contactez-nous via WhatsApp pour discuter de votre candidature. Tous les centres partenaires doivent être validés par SHIPP.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition">
                <div className="flex items-start space-x-4">
                  <HelpCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-black">{faq.q}</h3>
                    <p className="text-gray-600">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">Contactez-nous</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center group hover:transform hover:scale-105 transition"
            >
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-500 transition">
                <Phone className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-semibold text-lg mb-2">WhatsApp</h3>
              <p className="text-gray-300">+225 01 01 72 36 87</p>
            </a>
            <a
              href="mailto:infos@shipp-group.com"
              className="text-center group hover:transform hover:scale-105 transition"
            >
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-500 transition">
                <Mail className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Email</h3>
              <p className="text-gray-300">infos@shipp-group.com</p>
            </a>
            <div className="text-center">
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Bureau</h3>
              <p className="text-gray-300">Abidjan, Cocody Vallon</p>
              <p className="text-gray-300">Rue J79</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-yellow-400 text-black px-12 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition text-lg"
            >
              Besoin d'aide ? Contactez-nous sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-black border-t border-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bus className="w-6 h-6 text-yellow-400" />
            <span className="font-bold text-lg">SHIPP</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2026 SHIPP. Tous droits réservés.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Les cours sont dispensés par des centres partenaires indépendants. SHIPP assure la coordination et le transport.
          </p>
          <div className="mt-6 pt-4 border-t border-gray-800">
            <a
              href="/?token=63aee7c559743f1605eac8f5f103c0291c54123d4aab5bbf444504263730b478"
              className="text-xs text-gray-600 hover:text-yellow-400 transition"
            >
              Accès administrateur
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
