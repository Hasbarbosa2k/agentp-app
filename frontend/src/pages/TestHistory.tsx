import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { uiTestsService } from '../services';
import { useToast } from '../contexts/ToastContext';
import * as XLSX from 'xlsx';

interface TestResult {
  id: string;
  name: string;
  testId?: string;
  system: string;
  status: 'passed' | 'failed' | 'warning';
  duration: string;
  timestamp: string;
  details: string;
  type?: string;
}

export const TestHistory: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [isMobile, setIsMobile] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemFilter, setSystemFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { showToast } = useToast();

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load test history from backend
  const loadTestHistory = async () => {
    try {
      setIsLoading(true);
      const data = await uiTestsService.getRunning();
      const items: any[] = Array.isArray(data?.data?.items) ? data.data.items : [];
      
      // Mapear para o formato TestResult
      const mapped: TestResult[] = items
        .filter(item => item.status === 'completed' || item.status === 'failed')
        .map((item: any) => {
          const startedAt = item.startedAt ? new Date(item.startedAt) : new Date();
          const completedAt = item.completedAt ? new Date(item.completedAt) : new Date();
          const durationMs = completedAt.getTime() - startedAt.getTime();
          const minutes = Math.floor(durationMs / 60000);
          const seconds = Math.floor((durationMs % 60000) / 1000);
          const duration = `${minutes}m ${seconds}s`;
          
          const displayName = item.displayName || item.title || item.objective;
          const testType = item.testType || 'ui';
          
          return {
            id: String(item._id || item.testId),
            testId: item.testId || undefined,
            name: displayName || `${testType.toUpperCase()} Test`,
            system: String(item.systemSlug || 'Unknown System'),
            status: item.status === 'completed' ? 'passed' : 'failed',
            duration,
            timestamp: completedAt.toLocaleString(),
            details: item.description || (Array.isArray(item.steps) ? `${item.steps.length} steps executed` : 'No details'),
            type: testType,
          };
        });
      
      setTestResults(mapped);
      console.log('✅ [TEST-HISTORY] Loaded', mapped.length, 'test results');
    } catch (error: any) {
      console.error('❌ [TEST-HISTORY] Failed to load test history:', error);
      showToast('Failed to load test history', 'error');
      setTestResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTestHistory();
  }, []);

  // Extract unique systems and types for filters
  const { allSystems, allTypes } = useMemo(() => {
    const systems = Array.from(new Set(testResults.map(t => t.system))).sort();
    const types = Array.from(new Set(testResults.map(t => t.type).filter(Boolean))).sort();
    return { allSystems: systems, allTypes: types };
  }, [testResults]);

  const filteredResults = useMemo(() => {
    let filtered = testResults;
    
    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(r => r.status === selectedFilter);
    }
    
    // Filter by system
    if (systemFilter !== 'all') {
      filtered = filtered.filter(r => r.system === systemFilter);
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.system.toLowerCase().includes(query) ||
        r.details.toLowerCase().includes(query) ||
        (r.type && r.type.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [testResults, selectedFilter, systemFilter, typeFilter, searchQuery]);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'warning':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
    }
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return testResults.length;
    return testResults.filter(r => r.status === status).length;
  };

  const handleExportToExcel = () => {
    try {
      // Preparar dados para exportação
      const exportData = filteredResults.map((result, index) => ({
        '#': index + 1,
        'Test Name': result.name,
        'Test ID': result.testId || 'N/A',
        'Type': result.type ? result.type.toUpperCase() : 'N/A',
        'System': result.system,
        'Status': result.status.toUpperCase(),
        'Duration': result.duration,
        'Timestamp': result.timestamp,
        'Details': result.details,
      }));

      // Criar worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Ajustar largura das colunas
      const columnWidths = [
        { wch: 5 },  // #
        { wch: 30 }, // Test Name
        { wch: 25 }, // Test ID
        { wch: 10 }, // Type
        { wch: 25 }, // System
        { wch: 10 }, // Status
        { wch: 12 }, // Duration
        { wch: 20 }, // Timestamp
        { wch: 40 }, // Details
      ];
      worksheet['!cols'] = columnWidths;

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test History');

      // Gerar nome do arquivo com data
      const date = new Date().toISOString().split('T')[0];
      const filename = `test-history-${date}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);

      showToast(`Exported ${filteredResults.length} test results to ${filename}`, 'success');
      console.log('✅ [EXPORT] Test history exported successfully:', filename);
    } catch (error: any) {
      console.error('❌ [EXPORT] Failed to export test history:', error);
      showToast('Failed to export test history', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Test History</h1>
          <p className="text-gray-400 mt-1">Review past test executions and results</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadTestHistory}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleExportToExcel}
            disabled={filteredResults.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Export ${filteredResults.length} results to Excel`}
          >
            <Download size={16} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tests..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'passed', 'failed', 'warning'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedFilter === filter
                    ? 'bg-green-400 text-black'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getStatusCount(filter)})
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
            >
              <option value="all">All Types</option>
              {allTypes.map(type => (
                <option key={type} value={type}>
                  {type ? type.toUpperCase() : 'Unknown'}
                </option>
              ))}
            </select>

            {/* System filter */}
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
            >
              <option value="all">All Systems</option>
              {allSystems.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>

            {/* Date range */}
            <Calendar className="text-gray-400" size={16} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Active filters indicator */}
        {(selectedFilter !== 'all' || systemFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 text-xs pt-2 border-t border-gray-700 flex-wrap">
            <span className="text-gray-400">Active filters:</span>
            {selectedFilter !== 'all' && (
              <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded">
                Status: {selectedFilter}
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded">
                Type: {typeFilter.toUpperCase()}
              </span>
            )}
            {systemFilter !== 'all' && (
              <span className="px-2 py-1 bg-purple-400/20 text-purple-400 rounded">
                System: {systemFilter}
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded">
                Search: "{searchQuery}"
              </span>
            )}
            <button
              onClick={() => {
                setSelectedFilter('all');
                setSystemFilter('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-gray-400">Loading test history...</span>
        </div>
      ) : testResults.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
          <Calendar className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No test history</h3>
          <p className="text-gray-500">Run some tests to see their history here</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
          <Search className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No results found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters</p>
          <button
            onClick={() => {
              setSelectedFilter('all');
              setSystemFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
      {/* Test Results Table */}
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <div key={result.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{result.name}</h3>
                  {result.testId && (
                    <span className="text-xs font-mono text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded inline-block mt-1">
                      {result.testId}
                    </span>
                  )}
                  <p className="text-gray-400 text-sm mt-1">{result.details}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(result.status)}`}>
                  {result.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">System:</span>
                  <span className="text-gray-300">{result.system}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-gray-300">{result.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-gray-300">{result.timestamp}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <button className="text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Test Name</th>
                  <th className="text-left p-4 text-gray-300 font-medium">System</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Duration</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Timestamp</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4">
                      <div>
                        <div className="text-white font-medium">{result.name}</div>
                        {result.testId && (
                          <span className="text-xs font-mono text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {result.testId}
                          </span>
                        )}
                        <div className="text-gray-400 text-sm mt-1">{result.details}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">{result.system}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{result.duration}</td>
                    <td className="p-4 text-gray-300">{result.timestamp}</td>
                    <td className="p-4">
                      <button className="text-blue-400 hover:text-blue-300 transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};