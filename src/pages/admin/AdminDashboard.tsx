import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DashboardPage from '../../components/admin/DashboardPage';
import CentersPage from '../../components/admin/CentersPage';
import ActivityTypesPage from '../../components/admin/ActivityTypesPage';
import ActivitiesPage from '../../components/admin/ActivitiesPage';
import ParentsPage from '../../components/admin/ParentsPage';
import ChildrenPage from '../../components/admin/ChildrenPage';
import EnrollmentsPage from '../../components/admin/EnrollmentsPage';
import PaymentsPage from '../../components/admin/PaymentsPage';
import InvoicesManagementPage from '../../components/admin/InvoicesManagementPage';
import DistributionsPage from '../../components/admin/DistributionsPage';
import SettingsPage from '../../components/admin/SettingsPage';

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'centers':
        return <CentersPage />;
      case 'activity-types':
        return <ActivityTypesPage />;
      case 'activities':
        return <ActivitiesPage />;
      case 'parents':
        return <ParentsPage />;
      case 'children':
        return <ChildrenPage />;
      case 'enrollments':
        return <EnrollmentsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'invoices':
        return <InvoicesManagementPage />;
      case 'distributions':
        return <DistributionsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </AdminLayout>
  );
}
