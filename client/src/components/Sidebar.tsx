import React, { useEffect, useState } from 'react';
import { LayoutDashboard, HardDrive, FileText, Settings, ShieldCheck, User, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isAdmin, isMobileOpen, onMobileClose }) => {
  const [collapsed] = useState<boolean>(false); // desktop sidebar no longer collapsible
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'devices', label: 'Devices', icon: HardDrive },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    onMobileClose(); // Close mobile menu when navigating
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        role="navigation"
        aria-label="Primary"
        className={`hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 sticky top-16 h-[calc(100vh-4rem)]`}
      >
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <React.Fragment key={item.id}>
                  {item.id === 'admin' && (
                    <li aria-hidden="true">
                      <div className="px-2 pt-2">
                        <div className="h-px bg-gray-200 dark:bg-gray-800" />
                      </div>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      title={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/40'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </nav>
        
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />

          {/* Sidebar */}
          <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">Menu</div>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close menu"
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      {item.id === 'admin' && (
                        <li aria-hidden="true">
                          <div className="px-2 pt-2">
                            <div className="h-px bg-gray-200 dark:bg-gray-800" />
                          </div>
                        </li>
                      )}
                      <li>
                        <button
                          type="button"
                          title={item.label}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => handleTabChange(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};
