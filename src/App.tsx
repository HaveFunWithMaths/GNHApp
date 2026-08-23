import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { TabBar } from './components/layout/TabBar';
import { ReportsPage } from './pages/ReportsPage';
import { PrasadamPage } from './pages/PrasadamPage';
import { JanmashtamiPage } from './pages/JanmashtamiPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { LoginModal } from './components/auth/LoginModal';
import { AdminPinModal } from './components/auth/AdminPinModal';
import { ToastContainer } from './components/common/Toast';

export const App: React.FC = () => {
  const { activeTab, activeDevotee, guestName, isAdmin } = useApp();

  // If not logged in and not authenticated as admin, show dedicated Login Page
  const isAuthenticated = Boolean(activeDevotee || guestName || (activeTab === 'admin' && isAdmin));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <LoginPage />
        <AdminPinModal />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sticky Header */}
      <Navbar />

      {/* Navigation Tab Bar */}
      <TabBar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'prasadam' && <PrasadamPage />}
        {activeTab === 'janmashtami' && <JanmashtamiPage />}
        {activeTab === 'admin' && <AdminPage />}
      </main>

      {/* Modals & Portals */}
      <LoginModal />
      <AdminPinModal />
      <ToastContainer />
    </div>
  );
};
export default App;
