import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Check, Trash2, Mail, AlertCircle } from 'lucide-react';

interface Center {
  id: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

export default function CenterNotificationsPage({ center, onReadUpdate }: { center: Center; onReadUpdate: () => void }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadNotifications();
    }
  }, [center.id, filter, profile]);

  const loadNotifications = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${profile.id},center_id.eq.${center.id}`)
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data } = await query;

    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      loadNotifications();
      onReadUpdate();
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${profile.id},center_id.eq.${center.id}`)
      .eq('is_read', false);

    if (!error) {
      loadNotifications();
      onReadUpdate();
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Supprimer cette notification ?')) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      loadNotifications();
      onReadUpdate();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <Mail className="w-5 h-5 text-green-500" />;
      case 'general':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'Inscription';
      case 'payment':
        return 'Paiement';
      case 'route':
        return 'Transport';
      case 'general':
        return 'Général';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'unread'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Non lues
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center space-x-2 bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition text-sm"
            >
              <Check className="w-4 h-4" />
              <span>Tout marquer comme lu</span>
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          </h3>
          <p className="text-gray-500">
            {filter === 'unread'
              ? 'Toutes vos notifications ont été lues'
              : 'Vous n\'avez pas encore de notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl p-6 shadow-sm transition hover:shadow-md ${
                !notification.is_read ? 'border-l-4 border-yellow-400' : 'border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-semibold">
                            Nouveau
                          </span>
                        )}
                      </div>
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        {getTypeLabel(notification.type)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-green-600 transition"
                          title="Marquer comme lu"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <p className={`text-sm mb-3 ${!notification.is_read ? 'text-gray-700' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>

                  <p className="text-xs text-gray-500">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
