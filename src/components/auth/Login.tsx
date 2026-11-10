import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onToggle?: () => void;
}

export default function Login({ onToggle }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              placeholder="votre@email.com"
            />
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
