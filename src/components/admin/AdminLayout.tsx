import { ReactNode } from 'react';
import { LogOut, LayoutDashboard, Building2, Tag, Calendar, Users, CreditCard, FileText, DollarSign, UserCheck, Baby, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function AdminLayout({ children, currentPage, onPageChange }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'centers', label: 'Centres', icon: Building2 },
    { id: 'activity-types', label: 'Types d\'activités', icon: Tag },
    { id: 'activities', label: 'Activités', icon: Calendar },
    { id: 'parents', label: 'Parents', icon: UserCheck },
    { id: 'children', label: 'Enfants', icon: Baby },
    { id: 'enrollments', label: 'Inscriptions', icon: Users },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'invoices', label: 'Factures', icon: FileText },
    { id: 'distributions', label: 'Répartitions', icon: DollarSign },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-lg fixed h-full">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-yellow-500">SHIPP</h1>
          <p className="text-sm text-gray-600">Console Admin</p>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                currentPage === item.id
                  ? 'bg-yellow-50 text-yellow-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
