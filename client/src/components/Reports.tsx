import React, { useState } from 'react';
import { FileText, Download, Calendar, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import * as api from '../lib/api';

interface Report {
  id: string;
  name: string;
  type: 'device' | 'user' | 'activity' | 'maintenance';
  description: string;
  lastGenerated?: string;
  status: 'available' | 'generating' | 'error';
}

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const reports: Report[] = [
    {
      id: 'device-inventory',
      name: 'Device Inventory Report',
      type: 'device',
      description: 'Complete list of all devices with status and details',
      status: 'available',
      lastGenerated: '2024-01-15',
    },
    {
      id: 'user-activity',
      name: 'User Activity Report',
      type: 'user',
      description: 'User login and activity statistics',
      status: 'available',
      lastGenerated: '2024-01-14',
    },
    {
      id: 'maintenance-schedule',
      name: 'Maintenance Schedule',
      type: 'maintenance',
      description: 'Upcoming and completed maintenance activities',
      status: 'available',
      lastGenerated: '2024-01-13',
    },
    {
      id: 'system-health',
      name: 'System Health Report',
      type: 'activity',
      description: 'Overall system performance and health metrics',
      status: 'available',
    },
  ];

  const handleGenerateReport = async (reportId: string, opts?: { from?: string; to?: string; format?: 'csv' | 'json' }) => {
    setIsGenerating(true);
    try {
      await api.downloadReport(reportId, opts);
      toast.success('Report download started');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      await api.downloadReport(reportId, {});
      toast.success('Report download started');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to download report');
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'device':
        return <BarChart3 className="w-5 h-5" />;
      case 'user':
        return <PieChart className="w-5 h-5" />;
      case 'activity':
        return <TrendingUp className="w-5 h-5" />;
      case 'maintenance':
        return <Calendar className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
      generating: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    };
    return (
      <Badge className={variants[status] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-900 dark:text-white">Reports</h2>
        <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
          <FileText className="w-4 h-4" />
          Generate Custom Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Total Reports</p>
              <p className="text-blue-600 dark:text-blue-400 text-2xl font-bold">{reports.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Available</p>
              <p className="text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
                {reports.filter(r => r.status === 'available').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Generating</p>
              <p className="text-orange-600 dark:text-orange-400 text-2xl font-bold">
                {reports.filter(r => r.status === 'generating').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">This Month</p>
              <p className="text-purple-600 dark:text-purple-400 text-2xl font-bold">12</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  {getReportIcon(report.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{report.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{report.description}</p>
                </div>
              </div>
              {getStatusBadge(report.status)}
            </div>

            {report.lastGenerated && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
              </p>
            )}

            <div className="flex gap-2">
              {report.status === 'available' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadReport(report.id)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => handleGenerateReport(report.id)}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {isGenerating ? 'Working…' : 'Generate'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Custom Report Generator */}
      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Custom Report</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={selectedReport} onValueChange={(value: string) => setSelectedReport(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device-summary">Device Summary</SelectItem>
                <SelectItem value="user-stats">User Statistics</SelectItem>
                <SelectItem value="activity-log">Activity Log</SelectItem>
                <SelectItem value="maintenance-log">Maintenance Log</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from-date">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={dateRange.from || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-date">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={dateRange.to || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
        </div>

        <Button
          onClick={() => {
            const map: Record<string, string> = {
              'device-summary': 'device-inventory',
              'user-stats': 'user-activity',
              'activity-log': 'system-health',
              'maintenance-log': 'maintenance-schedule',
            };
            const id = map[selectedReport];
            if (!id) return;
            handleGenerateReport(id, { from: dateRange.from, to: dateRange.to, format: 'csv' });
          }}
          disabled={!selectedReport || isGenerating}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
        >
          {isGenerating ? 'Generating...' : 'Generate Custom Report'}
        </Button>
      </Card>
    </div>
  );
};
