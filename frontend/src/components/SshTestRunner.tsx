import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Play, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Eye, EyeOff, Key, ChevronRight, SkipForward, StopCircle, Edit3, RotateCcw, Check } from 'lucide-react';
import { uiTestsService } from '../services/ui-tests.service';

interface StepResult {
  stepIndex: number;
  command: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
}

interface SshTestRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
  testType: string;
  steps: string[];
  systemName?: string;
}

type Phase = 'credentials' | 'ready' | 'executing' | 'completed';

export const SshTestRunner: React.FC<SshTestRunnerProps> = ({
  isOpen,
  onClose,
  testId,
  testTitle,
  testType,
  steps,
  systemName
}) => {
  const [phase, setPhase] = useState<Phase>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePrivateKey, setUsePrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [runId, setRunId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isExecutingStep, setIsExecutingStep] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  
  // Estado para edição de comandos
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editedCommand, setEditedCommand] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('credentials');
      setError(null);
      setRunId(null);
      setCurrentStep(-1);
      setStepResults([]);
      setIsExecutingStep(false);
      setIsCancelling(false);
      setWasCancelled(false);
      setExpandedSteps(new Set());
      setEditingStep(null);
      setEditedCommand('');
    }
  }, [isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingStep !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingStep]);

  // Initialize step results when steps change
  useEffect(() => {
    if (steps.length > 0 && stepResults.length === 0) {
      setStepResults(steps.map((cmd, idx) => ({
        stepIndex: idx,
        command: cmd,
        status: 'pending',
        stdout: '',
        stderr: '',
        exitCode: null,
        durationMs: null
      })));
    }
  }, [steps, stepResults.length]);

  const handleConnect = async () => {
    if (!username) {
      setError('Username é obrigatório');
      return;
    }
    if (!usePrivateKey && !password) {
      setError('Password é obrigatória');
      return;
    }
    if (usePrivateKey && !privateKey) {
      setError('Private key é obrigatória');
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      const credentials = {
        username,
        password: usePrivateKey ? undefined : password,
        privateKey: usePrivateKey ? privateKey : undefined
      };

      const response = await uiTestsService.startSshSession(testId, credentials);
      
      if (response.success) {
        setRunId(response.data.runId);
        setPhase('ready');
        
        // Initialize step results from response
        if (response.data.steps) {
          setStepResults(response.data.steps.map((s: any) => ({
            stepIndex: s.index,
            command: s.command,
            status: s.status || 'pending',
            stdout: '',
            stderr: '',
            exitCode: null,
            durationMs: null
          })));
        }
      } else {
        setError(response.message || 'Failed to connect');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExecuteStep = async (stepIndex: number) => {
    if (!runId || isExecutingStep) return;

    setIsExecutingStep(true);
    setError(null);

    // Update step to running
    setStepResults(prev => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], status: 'running' };
      return updated;
    });

    try {
      const response = await uiTestsService.executeStep(runId, stepIndex);
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Update step result
        setStepResults(prev => {
          const updated = [...prev];
          updated[stepIndex] = {
            stepIndex: data.stepIndex,
            command: data.command,
            status: data.status,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            exitCode: data.exitCode,
            durationMs: data.durationMs
          };
          return updated;
        });

        setCurrentStep(stepIndex);

        // Auto expand step with output
        if (data.stdout || data.stderr) {
          setExpandedSteps(prev => new Set([...prev, stepIndex]));
        }

        // Check if all completed
        if (data.allCompleted) {
          setPhase('completed');
        }
      } else {
        setError(response.message || 'Failed to execute command');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing command');
      
      // Mark step as failed
      setStepResults(prev => {
        const updated = [...prev];
        updated[stepIndex] = { ...updated[stepIndex], status: 'failed', stderr: err.message };
        return updated;
      });
    } finally {
      setIsExecutingStep(false);
    }
  };

  const handleExecuteAll = async () => {
    if (!runId) return;

    for (let i = 0; i < steps.length; i++) {
      // Check if cancelled
      if (wasCancelled) break;
      
      if (stepResults[i]?.status === 'pending') {
        await handleExecuteStep(i);
        // Small delay between commands
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const handleCancel = async () => {
    if (!runId || isCancelling) return;

    setIsCancelling(true);
    setWasCancelled(true);

    try {
      const response = await uiTestsService.cancelRun(runId);
      
      if (response.success) {
        // Atualizar steps locais
        setStepResults(prev => prev.map(s => 
          s.status === 'pending' || s.status === 'running' 
            ? { ...s, status: 'skipped' as const, stderr: 'Execution cancelled by user' }
            : s
        ));
        setPhase('completed');
      }
    } catch (err: any) {
      setError(err.message || 'Error cancelling execution');
    } finally {
      setIsCancelling(false);
    }
  };

  // Iniciar edição de um comando
  const startEditing = (index: number) => {
    setEditingStep(index);
    setEditedCommand(stepResults[index]?.command || '');
  };

  // Cancelar edição
  const cancelEditing = () => {
    setEditingStep(null);
    setEditedCommand('');
  };

  // Salvar edição do comando
  const saveEdit = (index: number) => {
    if (!editedCommand.trim()) {
      cancelEditing();
      return;
    }

    setStepResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        command: editedCommand.trim(),
        // Reset status para permitir re-execução
        status: 'pending',
        stdout: '',
        stderr: '',
        exitCode: null,
        durationMs: null
      };
      return updated;
    });

    setEditingStep(null);
    setEditedCommand('');
  };

  // Re-executar um comando (mesmo já executado)
  const handleRerunStep = async (index: number) => {
    if (!runId || isExecutingStep) return;

    // Resetar o step para pending antes de executar
    setStepResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: 'pending',
        stdout: '',
        stderr: '',
        exitCode: null,
        durationMs: null
      };
      return updated;
    });

    // Executar
    await handleExecuteStep(index);
  };

  // Executar comando editado (usa o comando do stepResults, não o original)
  const executeEditedCommand = async (index: number) => {
    if (!runId || isExecutingStep) return;

    setIsExecutingStep(true);
    setError(null);

    const command = stepResults[index].command;

    // Update step to running
    setStepResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'running' };
      return updated;
    });

    try {
      // Usar endpoint que permite comando customizado
      const response = await uiTestsService.executeCustomCommand(runId, command);
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Update step result
        setStepResults(prev => {
          const updated = [...prev];
          updated[index] = {
            stepIndex: index,
            command: command,
            status: data.status,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            exitCode: data.exitCode,
            durationMs: data.durationMs
          };
          return updated;
        });

        setCurrentStep(index);

        // Auto expand step with output
        if (data.stdout || data.stderr) {
          setExpandedSteps(prev => new Set([...prev, index]));
        }
      } else {
        setError(response.message || 'Failed to execute command');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing command');
      
      // Mark step as failed
      setStepResults(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'failed', stderr: err.message };
        return updated;
      });
    } finally {
      setIsExecutingStep(false);
    }
  };

  const handleClose = async () => {
    // End SSH session if active
    if (runId && phase !== 'credentials') {
      try {
        await uiTestsService.endSshSession(runId);
      } catch (err) {
        console.warn('Failed to end SSH session:', err);
      }
    }
    onClose();
  };

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getStepIcon = (status: StepResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getNextPendingStep = () => {
    return stepResults.findIndex(s => s.status === 'pending');
  };

  const allCompleted = stepResults.every(s => s.status !== 'pending');
  const hasFailures = stepResults.some(s => s.status === 'failed');
  const successCount = stepResults.filter(s => s.status === 'success').length;
  const failedCount = stepResults.filter(s => s.status === 'failed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Terminal className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{testTitle}</h2>
              <p className="text-sm text-gray-400">
                {testType.toUpperCase()} Test {systemName && `• ${systemName}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {phase === 'credentials' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/20 mb-3">
                  <Key className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Credenciais SSH</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Introduza as credenciais para conectar ao servidor
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="root"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePrivateKey}
                      onChange={(e) => setUsePrivateKey(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Usar Private Key</span>
                  </label>
                </div>

                {usePrivateKey ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Private Key
                    </label>
                    <textarea
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs h-32"
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-700 rounded transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Comandos a executar ({steps.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-gray-500 font-mono w-5">{idx + 1}.</span>
                      <code className="text-gray-400 font-mono break-all">{step}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(phase === 'ready' || phase === 'executing' || phase === 'completed') && (
            <div className="space-y-3">
              {/* Status bar */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-3">
                  {phase === 'completed' ? (
                    wasCancelled ? (
                      <StopCircle className="w-5 h-5 text-yellow-400" />
                    ) : hasFailures ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )
                  ) : (
                    <Terminal className="w-5 h-5 text-blue-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    {phase === 'completed'
                      ? wasCancelled 
                        ? `Execution cancelled: ${successCount} success, ${stepResults.filter(s => s.status === 'skipped').length} skipped`
                        : `Execution completed: ${successCount} success, ${failedCount} failed`
                      : `Ready to execute • ${steps.length} commands`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {phase !== 'completed' && !allCompleted && (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {isCancelling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <StopCircle className="w-3.5 h-3.5" />
                        )}
                        {isCancelling ? 'Cancelling...' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleExecuteAll}
                        disabled={isExecutingStep || isCancelling}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Executar Todos
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Instruction */}
              {phase === 'ready' && !allCompleted && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm">
                  💡 Clique no botão <Play className="w-4 h-4 inline mx-1" /> de cada comando para executá-lo, ou use "Executar Todos" para correr todos sequencialmente.
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Steps list */}
              <div className="space-y-2">
                {stepResults.map((result, idx) => {
                  const canExecute = result.status === 'pending' && !isExecutingStep && editingStep === null;
                  const canRerun = (result.status === 'success' || result.status === 'failed') && !isExecutingStep && editingStep === null;
                  const isEditing = editingStep === idx;
                  const isExpanded = expandedSteps.has(idx);
                  
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border transition-all ${
                        isEditing
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : result.status === 'running'
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : result.status === 'success'
                          ? 'border-green-500/30 bg-green-500/5'
                          : result.status === 'failed'
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-gray-700 bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                          {isEditing ? (
                            <Edit3 className="w-4 h-4 text-yellow-400" />
                          ) : (
                            getStepIcon(result.status)
                          )}
                        </div>

                        {/* Command - Editable or Display */}
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editedCommand}
                              onChange={(e) => setEditedCommand(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(idx);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 px-2 py-1 bg-gray-900 border border-yellow-500/50 rounded text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500"
                              placeholder="Enter command..."
                            />
                            <button
                              onClick={() => saveEdit(idx)}
                              className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => result.status !== 'pending' && result.status !== 'running' && toggleStepExpanded(idx)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                              <code className="text-sm text-gray-300 font-mono truncate">
                                {result.command}
                              </code>
                            </div>
                          </div>
                        )}

                        {/* Duration & Exit code */}
                        {!isEditing && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {result.durationMs !== null && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(result.durationMs)}
                              </span>
                            )}
                            {result.exitCode !== null && result.exitCode !== 0 && (
                              <span className="text-xs text-red-400 px-1.5 py-0.5 bg-red-500/20 rounded">
                                exit: {result.exitCode}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {!isEditing && result.status !== 'running' && (
                          <div className="flex items-center gap-1">
                            {/* Edit button - always visible for non-running steps */}
                            {result.status !== 'running' && (
                              <button
                                onClick={() => startEditing(idx)}
                                disabled={isExecutingStep}
                                className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors disabled:opacity-50"
                                title="Edit command"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Execute/Rerun button */}
                            {canExecute && (
                              <button
                                onClick={() => executeEditedCommand(idx)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Run
                              </button>
                            )}

                            {canRerun && (
                              <button
                                onClick={() => handleRerunStep(idx)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                title="Run again"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Rerun
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expand button for completed steps */}
                        {!isEditing && result.status !== 'pending' && result.status !== 'running' && (
                          <button
                            onClick={() => toggleStepExpanded(idx)}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                          >
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}

                        {/* Loading indicator */}
                        {result.status === 'running' && (
                          <div className="px-2 py-1 text-xs text-blue-400 bg-blue-500/20 rounded">
                            A executar...
                          </div>
                        )}
                      </div>

                      {/* Expanded output */}
                      {isExpanded && (result.stdout || result.stderr) && (
                        <div className="border-t border-gray-700 p-3 space-y-2">
                          {result.stdout && (
                            <div>
                              <span className="text-xs text-gray-500 mb-1 block">Output:</span>
                              <pre className="text-xs text-green-300 font-mono bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48">
                                {result.stdout}
                              </pre>
                            </div>
                          )}
                          {result.stderr && (
                            <div>
                              <span className="text-xs text-gray-500 mb-1 block">Stderr:</span>
                              <pre className="text-xs text-red-300 font-mono bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48">
                                {result.stderr}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
          {phase === 'credentials' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </> 
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    Connect
                  </>
                )}
              </button>
            </>
          )}

          {(phase === 'ready' || phase === 'executing') && (
            <>
              <button
                onClick={handleClose}
                disabled={isExecutingStep}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                {allCompleted ? 'Close' : 'Cancel'}
              </button>
            </>
          )}

          {phase === 'completed' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SshTestRunner;
