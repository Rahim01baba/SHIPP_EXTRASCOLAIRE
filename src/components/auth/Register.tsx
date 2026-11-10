import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, ArrowLeft } from 'lucide-react';
import type { UserRole } from '../../lib/database.types';
import { normalizeCIPhone, phoneToAuthEmail } from '../../lib/phoneAuth';

interface RegisterProps {
  onToggle?: () => void;
}

export default function Register({ onToggle }: RegisterProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role] = useState<UserRole>('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedPhone = normalizeCIPhone(phone);
    if (!normalizedPhone) {
      setError('Numéro de téléphone invalide. Saisissez un numéro ivoirien à 10 chiffres (ex. 07 01 02 03 04).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(phoneToAuthEmail(normalizedPhone), password, {
        full_name: fullName,
        phone: `+${normalizedPhone}`,
        role,
      });

      if (error) {
        console.error('[Register] Signup error:', error);
        const msg = /already registered|already exists/i.test(error.message)
          ? 'Ce numéro est déjà associé à un compte. Connectez-vous avec votre numéro et votre mot de passe.'
          : `Erreur d'inscription: ${error.message}`;
        setError(msg);
        setLoading(false);
        return;
      }

      console.log('[Register] Signup successful!');
      setError('');
      alert('Compte créé avec succès ! Connectez-vous avec votre numéro de téléphone et votre mot de passe.');

      if (onToggle) {
        onToggle();
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      console.error('[Register] Signup exception:', err);
      setError(`Erreur inattendue: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Retour</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-yellow-400 p-3 rounded-full">
              <UserPlus className="w-6 h-6 text-black" />
            </div>
          </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Créer un compte parent
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Rejoignez SHIPP
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="Votre nom complet"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="07 01 02 03 04"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ce numéro vous servira d'identifiant pour vous connecter.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Déjà un compte ?{' '}
              {onToggle ? (
                <button
                  onClick={onToggle}
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Se connecter
                </button>
              ) : (
                <Link
                  to="/login"
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Se connecter
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
