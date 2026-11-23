import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader, Plus, Eye, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

interface System {
  _id: string;
  name: string;
  slug: string;
  host: string;
  status: string;
}

interface TestRun {
  id: string;
  testName: string;
  testType: string;
  status: string;
  startedAt: string;
  completedAt: string;
  summary: string;
}

interface DocumentReport {
  id: string;
  title: string;
  systemName: string;
  systemId: string;
  testRunCount: number;
  pdfSize: number;
  status: 'generating' | 'completed' | 'failed';
  generatedAt: string;
  createdAt: string;
}

interface GenerateReportForm {
  systemId: string;
  testRunIds: string[];
  testDescription: string;
  additionalContext: string;
}

export const Documentation: React.FC = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [reports, setReports] = useState<DocumentReport[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [viewingReportUrl, setViewingReportUrl] = useState<string | null>(null);

  const [form, setForm] = useState<GenerateReportForm>({
    systemId: '',
    testRunIds: [],
    testDescription: '',
    additionalContext: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    if (view === 'list') {
      loadReports();
    } else {
      loadSystems();
    }
  }, [view]);

  // Carregar test runs quando sistema selecionado
  useEffect(() => {
    if (form.systemId) {
      loadTestRuns(form.systemId);
      const system = systems.find(s => s._id === form.systemId);
      setSelectedSystem(system || null);
    } else {
      setTestRuns([]);
      setSelectedSystem(null);
    }
  }, [form.systemId, systems]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documentation/reports');
      if (response.data.success) {
        setReports(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const loadSystems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/systems');
      // API retorna data.systems (não data diretamente)
      if (response.data.success && Array.isArray(response.data.data?.systems)) {
        setSystems(response.data.data.systems);
      } else if (response.data.success && Array.isArray(response.data.data)) {
        // Fallback para formato antigo
        setSystems(response.data.data);
      }
    } catch (err: any) {
      console.error('Error loading systems:', err);
      setError('Error loading systems');
    } finally {
      setLoading(false);
    }
  };

  const loadTestRuns = async (systemId: string) => {
    try {
      const response = await api.get(`/documentation/systems/${systemId}/test-runs`);
      if (response.data.success) {
        setTestRuns(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setTestRuns([]);
    }
  };

  const handleGenerateReport = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!form.systemId) {
      setError('Please select a system');
      return;
    }

    if (form.testRunIds.length === 0) {
      setError('Please select at least one executed test');
      return;
    }

    if (!form.testDescription.trim()) {
      setError('Please describe the tests performed');
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post('/documentation/generate', {
        systemId: form.systemId,
        testRunIds: form.testRunIds,
        testDescription: form.testDescription,
        additionalContext: form.additionalContext || undefined,
        includeSystemInfo: true
      }, {
        responseType: 'blob'
      });

      // Create PDF download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const systemName = selectedSystem?.name || 'system';
      link.download = `${systemName}_report_${timestamp}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('PDF report generated successfully!');
      
      // Clear form and return to list
      setForm({
        systemId: '',
        testRunIds: [],
        testDescription: '',
        additionalContext: ''
      });
      setSelectedSystem(null);
      setTestRuns([]);
      
      // Reload list after 2 seconds
      setTimeout(() => {
        setView('list');
        loadReports();
        setSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setError(err.response?.data?.message || 'Error generating PDF report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, systemName: string) => {
    try {
      const response = await api.get(`/documentation/reports/${reportId}/download`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${systemName}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError('Error downloading report');
    }
  };

  const handleViewReport = async (reportId: string) => {
    try {
      setViewingReportId(reportId);
      // Carregar PDF e criar blob URL para visualização
      const response = await api.get(`/documentation/reports/${reportId}/download`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setViewingReportUrl(url);
    } catch (err: any) {
      console.error('Error loading report for viewing:', err);
      setError('Error loading report for viewing');
      setViewingReportId(null);
    }
  };

  const handleCloseViewer = () => {
    if (viewingReportUrl) {
      window.URL.revokeObjectURL(viewingReportUrl);
      setViewingReportUrl(null);
    }
    setViewingReportId(null);
  };

  const toggleReportExpanded = (reportId: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'generating':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  if (view === 'create') {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Create New Report</h1>
            <p className="text-gray-400 mt-1">Select a system and executed tests to generate documentation</p>
          </div>
          <button
            onClick={() => {
              setView('list');
              setForm({ systemId: '', testRunIds: [], testDescription: '', additionalContext: '' });
              setSelectedSystem(null);
              setTestRuns([]);
              setError(null);
              setSuccess(null);
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Back to List
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
            <div>
              <p className="text-green-400 font-medium">Success</p>
              <p className="text-green-300 text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
          {/* Sistema */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              System <span className="text-red-400">*</span>
            </label>
            <select
              value={form.systemId}
              onChange={(e) => {
                setForm({ ...form, systemId: e.target.value, testRunIds: [] });
              }}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400"
              disabled={generating || loading}
            >
              <option value="">Select a system</option>
              {systems.map((system) => (
                <option key={system._id} value={system._id}>
                  {system.name} ({system.host})
                </option>
              ))}
            </select>
          </div>

          {/* Testes Executados */}
          {form.systemId && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Executed Tests <span className="text-red-400">*</span>
              </label>
              {loading ? (
                <div className="text-gray-400 text-sm">Loading tests...</div>
              ) : testRuns.length === 0 ? (
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 text-yellow-300 text-sm">
                  No executed tests found for this system. Execute tests first before generating a report.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testRuns.map((testRun) => (
                    <label
                      key={testRun.id}
                      className="flex items-start space-x-3 p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.testRunIds.includes(testRun.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, testRunIds: [...form.testRunIds, testRun.id] });
                          } else {
                            setForm({ ...form, testRunIds: form.testRunIds.filter(id => id !== testRun.id) });
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-400 focus:ring-blue-400"
                        disabled={generating}
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">{testRun.testName}</div>
                        <div className="text-gray-400 text-sm mt-1">
                          Type: {testRun.testType} | Status: {testRun.status}
                        </div>
                        {testRun.completedAt && (
                          <div className="text-gray-500 text-xs mt-1">
                            Completed: {formatDate(testRun.completedAt)}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {form.testRunIds.length > 0 && (
                <p className="text-gray-400 text-xs mt-2">
                  {form.testRunIds.length} test(s) selected
                </p>
              )}
            </div>
          )}

          {/* Descrição dos Testes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description of Tests Performed <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.testDescription}
              onChange={(e) => setForm({ ...form, testDescription: e.target.value })}
              placeholder="Describe in detail the tests that were performed. The AI will use this description and the results of the selected tests to generate the complete report."
              rows={6}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 resize-none"
              disabled={generating}
            />
          </div>

          {/* Contexto Adicional */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Context (optional)
            </label>
            <textarea
              value={form.additionalContext}
              onChange={(e) => setForm({ ...form, additionalContext: e.target.value })}
              placeholder="Additional information: objectives, environment, tools, etc."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 resize-none"
              disabled={generating}
            />
          </div>

          {/* Botão Gerar */}
          <div className="pt-4">
            <button
              onClick={handleGenerateReport}
              disabled={generating || !form.systemId || form.testRunIds.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Generating report...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Generate PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Lista de Relatórios
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentation</h1>
          <p className="text-gray-400 mt-1">Generated reports and history</p>
        </div>
        <button
          onClick={() => {
            setView('create');
            loadSystems();
            setError(null);
            setSuccess(null);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          <span>Create New Report</span>
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Erro</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Lista de Relatórios */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-400" size={32} />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <FileText className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-white text-lg font-medium mb-2">No reports generated</h3>
          <p className="text-gray-400 mb-6">Create your first documentation report</p>
          <button
            onClick={() => {
              setView('create');
              loadSystems();
            }}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors font-medium"
          >
            <Plus size={20} />
            <span>Create First Report</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="text-blue-400 flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{report.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{report.systemName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{formatDate(report.generatedAt)}</span>
                      <span>•</span>
                      <span>{report.testRunCount} test(s)</span>
                      <span>•</span>
                      <span>{formatFileSize(report.pdfSize)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(report.status)}`}>
                    {report.status === 'generating' ? 'Generating...' : report.status === 'completed' ? 'Completed' : 'Error'}
                  </span>
                  {report.status === 'completed' && (
                    <>
                      <button
                        onClick={() => handleViewReport(report.id)}
                        className="p-2 bg-green-400/10 border border-green-400/20 rounded-lg hover:bg-green-400/20 transition-colors"
                        title="View PDF"
                      >
                        <Eye className="text-green-400" size={18} />
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report.id, report.systemName)}
                        className="p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg hover:bg-blue-400/20 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="text-blue-400" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {viewingReportId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-medium">View PDF Report</h3>
              <button
                onClick={handleCloseViewer}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-900">
              {viewingReportUrl ? (
                <iframe
                  src={viewingReportUrl}
                  className="w-full h-full border-0"
                  title="PDF Report Viewer"
                  style={{ minHeight: '600px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader className="animate-spin text-blue-400" size={32} />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={() => {
                  const report = reports.find(r => r.id === viewingReportId);
                  if (report) {
                    handleDownloadReport(report.id, report.systemName);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors"
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handleCloseViewer}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
