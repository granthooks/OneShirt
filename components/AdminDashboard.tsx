import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AdminPage, Shirt, User } from '../types';
import { OneShirtLogo } from './icons';
import DashboardPage from './admin/DashboardPage';
import InventoryPage from './admin/InventoryPage';
import GeneratePage from './admin/GeneratePage';
import UsersPage from './admin/UsersPage';
import OrdersPage from './admin/OrdersPage';
import ScraperPage from './admin/ScraperPage';

interface AdminDashboardProps {
  user: User | null;
  onAddShirt: (shirt: Shirt) => void;
  onLogout?: () => void;
  onBackToSwipe: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onAddShirt,
  onLogout,
  onBackToSwipe
}) => {
  const [activePage, setActivePage] = useState<AdminPage>(AdminPage.DASHBOARD);

  const navItems = [
    {
      page: AdminPage.DASHBOARD,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      page: AdminPage.INVENTORY,
      label: 'Shirt Inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      page: AdminPage.GENERATE,
      label: 'Generate Designs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      page: AdminPage.USERS,
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      page: AdminPage.ORDERS,
      label: 'Winners & Orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      page: AdminPage.SCRAPER,
      label: 'Import Shirts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      )
    },
  ];

  const getPageTitle = () => {
    const item = navItems.find(item => item.page === activePage);
    return item?.label || 'Dashboard';
  };

  const renderActivePage = () => {
    switch (activePage) {
      case AdminPage.DASHBOARD:
        return <DashboardPage />;
      case AdminPage.INVENTORY:
        return <InventoryPage />;
      case AdminPage.GENERATE:
        return <GeneratePage onAddShirt={onAddShirt} />;
      case AdminPage.USERS:
        return <UsersPage />;
      case AdminPage.ORDERS:
        return <OrdersPage />;
      case AdminPage.SCRAPER:
        return <ScraperPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col"
        initial={{ x: -240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <OneShirtLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-white">OneShirt</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => (
            <motion.button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activePage === item.page
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <motion.button
            onClick={onBackToSwipe}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-sm">Back to Swipe</span>
          </motion.button>

          {onLogout && (
            <motion.button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium text-sm">Logout</span>
            </motion.button>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <motion.header
          className="bg-gray-800 border-b border-gray-700 px-8 py-4 flex justify-between items-center"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white">{getPageTitle()}</h2>
            <p className="text-sm text-gray-400">Manage your OneShirt platform</p>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-gray-400">{user.creditBalance} credits</div>
              </div>
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-blue-600"
              />
            </div>
          )}
        </motion.header>

        {/* Content Area */}
        <motion.main
          className="flex-1 overflow-y-auto bg-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {renderActivePage()}
        </motion.main>
      </div>
    </div>
  );
};

export default AdminDashboard;
