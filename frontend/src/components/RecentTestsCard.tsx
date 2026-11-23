import React from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface Test {
  id: string;
  name: string;
  system: string;
  status: 'success' | 'failed' | 'running';
  duration: string;
  timestamp: string;
}

interface TestRun {
  _id: string;
  testId: string;
  displayName?: string;
  status: 'completed' | 'failed' | 'running' | 'queued';
  startedAt?: string;
  completedAt?: string;
  systemSlug?: string;
  testType?: string;
}

interface RecentTestsCardProps {
  tests?: TestRun[];
  loading?: boolean;
}

const formatDuration = (startedAt?: string, completedAt?: string): string => {
  if (!startedAt) return '—';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatTimestamp = (date?: string): string => {
  if (!date) return '—';
  const testDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - testDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export const RecentTestsCard: React.FC<RecentTestsCardProps> = ({ tests = [], loading = false }) => {
  const mappedTests: Test[] = tests.slice(0, 5).map((test) => {
    const status: Test['status'] = 
      test.status === 'completed' ? 'success' :
      test.status === 'failed' ? 'failed' :
      'running';
    
    return {
      id: test._id || test.testId,
      name: test.displayName || test.testId || 'Unnamed Test',
      system: test.systemSlug || 'Unknown System',
      status,
      duration: formatDuration(test.startedAt, test.completedAt),
      timestamp: formatTimestamp(test.completedAt || test.startedAt),
    };
  });

  const getStatusIcon = (status: Test['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'failed':
        return <XCircle className="text-red-400" size={16} />;
      case 'running':
        return <Clock className="text-yellow-400 animate-spin" size={16} />;
    }
  };

  const getStatusColor = (status: Test['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'running':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Tests</h3>
        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading tests...</div>
        ) : mappedTests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No recent tests</div>
        ) : (
          mappedTests.map((test) => (
          <div
            key={test.id}
            className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-center space-x-4">
              {getStatusIcon(test.status)}
              <div>
                <h4 className="text-white font-medium">{test.name}</h4>
                <p className="text-sm text-gray-400">{test.system}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-white">{test.duration}</p>
                <p className="text-xs text-gray-400">{test.timestamp}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(test.status)}`}>
                {test.status}
              </span>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white">
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};