import React from 'react';
import { HardDrive, Wifi, WifiOff, Users } from 'lucide-react';
import { Card } from './ui/card';
import { Device } from '../lib/mockData';

interface StatsCardsProps {
  devices: Device[];
  loading?: boolean;
  onlineCount?: number;
  offlineCount?: number;
  usersOnlineCount?: number;
  isAdmin?: boolean;
}

const fmt = (n: number) => new Intl.NumberFormat().format(n);

export const StatsCards: React.FC<StatsCardsProps> = ({ devices, loading = false, onlineCount, offlineCount, usersOnlineCount, isAdmin }) => {
  const total = devices.length;
  const cards: Array<{ label: string; value: number; icon: any; cardClass: string; valueClass: string; iconClass: string }>= [];

  cards.push({
    label: 'Total Devices',
    value: total,
    icon: HardDrive,
    cardClass: 'p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800',
    valueClass: 'text-blue-600 dark:text-blue-400',
    iconClass: 'text-blue-600 dark:text-blue-400',
  });

  if (typeof onlineCount === 'number') {
    cards.push({
      label: 'Online Devices',
      value: onlineCount,
      icon: Wifi,
      cardClass: 'p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800',
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
    });
  }
  if (typeof offlineCount === 'number') {
    cards.push({
      label: 'Offline Devices',
      value: offlineCount,
      icon: WifiOff,
      cardClass: 'p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800',
      valueClass: 'text-red-600 dark:text-red-400',
      iconClass: 'text-red-600 dark:text-red-400',
    });
  }

  if (isAdmin && typeof usersOnlineCount === 'number') {
    cards.push({
      label: 'Online Users',
      value: usersOnlineCount,
      icon: Users,
      cardClass: 'p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800',
      valueClass: 'text-purple-600 dark:text-purple-400',
      iconClass: 'text-purple-600 dark:text-purple-400',
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map(({ label, value, icon: Icon, cardClass, valueClass, iconClass }) => (
        <Card key={label} className={`${cardClass} rounded-2xl border hover:shadow-lg transition-shadow`}> 
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">{label}</p>
              <p className={`${valueClass} text-2xl font-bold`}>{loading ? '...' : fmt(value)}</p>
            </div>
            <Icon className={`w-8 h-8 ${iconClass}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};
