import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, ArrowLeft } from 'lucide-react';
import { loginIdentifierToEmail } from '../../lib/phoneAuth';

const FORGOT_PASSWORD_WHATSAPP = `https://wa.me/2250101723687?text=${encodeURIComponent(
  "Bonjour SHIPP, j'ai oublié le mot de passe de mon compte parent. Mon numéro : "
)}`;

interface LoginProps {
  onToggle?: () => void;
}

export default function Login({ onToggle }: LoginProps) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const email = loginIdentifierToEmail(identifier);
    if (!email) {
      setError('Saisissez votre numéro de téléphone (10 chiffres) ou votre adresse e-mail.');
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(
        /invalid login credentials/i.test(error.message)
          ? 'Identifiant ou mot de passe incorrect.'
          : error.message
      );
      setLoading(false);
    } else {
      navigate('/auth-redirect');
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
              <LogIn className="w-6 h-6 text-black" />
            </div>
          </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Connexion
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Accédez à votre espace SHIPP
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone ou email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="07 01 02 03 04"
            />
            <p className="mt-1 text-xs text-gray-500">
              Parents : votre numéro de téléphone. Centres partenaires : votre email.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

          <div className="mt-4 text-center">
            <a
              href={FORGOT_PASSWORD_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Mot de passe oublié ? Contactez SHIPP sur WhatsApp
            </a>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Pas encore de compte ?{' '}
              {onToggle ? (
                <button
                  onClick={onToggle}
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  S'inscrire
                </button>
              ) : (
                <Link
                  to="/register"
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  S'inscrire
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
