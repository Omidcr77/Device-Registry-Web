export interface Device {
  id: string;
  code: string;
  type: string;
  name: string;
  customer: string;
  location: string;
  installDate: string;
  ip: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'viewer';
  locations: string[];
  status: 'active' | 'inactive';
}

export const mockDevices: Device[] = [
  { id: 'D001', code: 'D001', type: 'Router', name: 'RT-Main-01', customer: 'Tech Corp', location: 'Building A, Floor 3', installDate: '2024-01-15', ip: '192.168.1.1', status: 'active' },
  { id: 'D002', code: 'D002', type: 'SXT', name: 'SXT-Link-02', customer: 'Digital Inc', location: 'Building B, Roof', installDate: '2024-02-20', ip: '192.168.1.5', status: 'active' },
  { id: 'D003', code: 'D003', type: 'Switch', name: 'SW-Core-01', customer: 'Tech Corp', location: 'Building A, Floor 1', installDate: '2024-01-10', ip: '192.168.1.10', status: 'active' },
  { id: 'D004', code: 'D004', type: 'LHG', name: 'LHG-AP-03', customer: 'Connect Ltd', location: 'Building C, Floor 2', installDate: '2024-03-05', ip: '192.168.1.15', status: 'maintenance' },
  { id: 'D005', code: 'D005', type: 'Router', name: 'RT-Backup-02', customer: 'Tech Corp', location: 'Building A, Floor 3', installDate: '2024-01-15', ip: '192.168.1.2', status: 'active' },
  { id: 'D006', code: 'D006', type: 'Switch', name: 'SW-Access-05', customer: 'Digital Inc', location: 'Building B, Floor 4', installDate: '2024-02-28', ip: '192.168.1.20', status: 'inactive' },
  // Cable removed
  { id: 'D008', code: 'D008', type: 'Router', name: 'RT-Edge-04', customer: 'Smart Systems', location: 'Building D, Rack 2', installDate: '2024-04-12', ip: '192.168.1.50', status: 'active' },
  { id: 'D009', code: 'D009', type: 'SXT', name: 'SXT-Remote-05', customer: 'Tech Corp', location: 'Remote Site 1', installDate: '2024-03-22', ip: '192.168.2.10', status: 'active' },
  { id: 'D010', code: 'D010', type: 'LHG', name: 'LHG-Client-02', customer: 'Digital Inc', location: 'Building B, Floor 2', installDate: '2024-04-01', ip: '192.168.1.30', status: 'active' },
];

export const mockUsers: User[] = [
  { id: 'U001', username: 'admin', role: 'admin', locations: ['All Locations'], status: 'active' },
  { id: 'U002', username: 'john.manager', role: 'manager', locations: ['Building A', 'Building B'], status: 'active' },
  { id: 'U003', username: 'sarah.viewer', role: 'viewer', locations: ['Building C'], status: 'active' },
  { id: 'U004', username: 'mike.admin', role: 'admin', locations: ['All Locations'], status: 'active' },
  { id: 'U005', username: 'lisa.manager', role: 'manager', locations: ['Building D'], status: 'inactive' },
];
