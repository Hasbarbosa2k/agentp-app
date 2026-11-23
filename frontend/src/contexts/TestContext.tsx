import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NewTest } from '../components/AddTestModal';
import { uiTestsService } from '../services';

export interface RunningTest {
  id: string;
  uiTestId?: string; // ID externo usado para assets (ex: ui-1754939858595-zy7tb6)
  name: string;
  displayName?: string; // Nome amigável do teste
  type: 'ui' | 'api' | 'database' | 'performance' | 'os' | 'network';
  system: string;
  prompt: string;
  url?: string;
  progress: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: string;
  estimatedTime: string;
  description?: string;
  aiPlan?: string[];
}

interface TestContextType {
  runningTests: RunningTest[];
  addTest: (test: NewTest) => void;
  pauseTest: (id: string) => void;
  stopTest: (id: string) => void;
  restartTest: (id: string) => void;
  deleteTest: (id: string) => void;
  reloadTests: () => Promise<void>;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) {
    console.error('useTest called outside of TestProvider. Returning safe fallbacks.');
    return {
      runningTests: [],
      addTest: () => {},
      pauseTest: () => {},
      stopTest: () => {},
      restartTest: () => {},
      deleteTest: () => {},
    } as TestContextType;
  }
  return context;
};

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runningTests, setRunningTests] = useState<RunningTest[]>([]);

  // Load running UI tests from backend
  const reloadTests = useCallback(async () => {
    try {
      const data = await uiTestsService.getRunning();
      const items: any[] = Array.isArray(data?.data?.items) ? data.data.items : [];
      const mapped: RunningTest[] = items.map((it: any, idx: number) => {
        const startedAt: string | undefined = it.startedAt;
        const completedAt: string | undefined = it.completedAt;
        const statusRaw: string = String(it.status || 'running').toLowerCase();
        const status: RunningTest['status'] = (statusRaw === 'completed' || statusRaw === 'failed' || statusRaw === 'paused') ? (statusRaw as any) : 'running';
        const progress = status === 'completed' || status === 'failed' ? 100 : 0;
        const startTimeFmt = startedAt
          ? new Date(startedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        let estimated = '—';
        if (startedAt && completedAt) {
          const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
          const minutes = Math.max(0, Math.round(ms / 60000));
          estimated = `${minutes} min`;
        }
        const prompt = Array.isArray(it.steps) ? it.steps.join(' | ') : '';
        const displayName = it.displayName || it.title || it.objective || null;
        const testType = it.testType || 'ui';
        
        return {
          id: String(it._id || it.testId || idx + 1),
          uiTestId: it.testId ? String(it.testId) : undefined,
          name: displayName || `${testType.toUpperCase()} Test`,
          displayName: displayName || undefined,
          type: testType as any,
          system: String(it.systemSlug || 'Unknown System'),
          prompt,
          url: undefined,
          progress,
          status,
          startTime: startTimeFmt,
          estimatedTime: estimated,
          description: it.description || undefined,
          aiPlan: Array.isArray(it.steps) ? it.steps : [],
        };
      });
      setRunningTests(mapped);
      console.log('✅ [UI-TESTS] Running tests loaded:', mapped.length);
    } catch (error: any) {
      // Não logar erro se é apenas lista vazia ou problema de conexão temporário
      if (error?.message?.includes('401') || error?.message?.includes('Token')) {
        console.warn('⚠️ [UI-TESTS] Auth issue, skipping reload');
      } else {
        console.error('❌ [UI-TESTS] Failed to load running tests:', error?.message || error);
      }
      // Manter os testes actuais em vez de limpar
    }
  }, []);

  useEffect(() => {
    reloadTests();
  }, [reloadTests]);

  const addTest = useCallback((test: NewTest) => {
    const newTest: RunningTest = {
      id: Date.now().toString(),
      ...test,
      progress: 0,
      status: 'running',
      startTime: new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      estimatedTime: 'Calculating...',
    };

    setRunningTests(prev => [newTest, ...prev]);
  }, []);

  const pauseTest = useCallback((id: string) => {
    setRunningTests(prev => prev.map(test => 
      test.id === id ? { ...test, status: 'paused' as const } : test
    ));
  }, []);

  const stopTest = useCallback((id: string) => {
    setRunningTests(prev => prev.filter(test => test.id !== id));
  }, []);

  const restartTest = useCallback((id: string) => {
    setRunningTests(prev => prev.map(test => 
      test.id === id ? { 
        ...test, 
        status: 'running' as const, 
        progress: 0,
        startTime: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      } : test
    ));
  }, []);

  const deleteTest = useCallback((id: string) => {
    setRunningTests(prev => prev.filter(test => test.id !== id));
  }, []);

  return (
    <TestContext.Provider value={{
      runningTests,
      addTest,
      pauseTest,
      stopTest,
      restartTest,
      deleteTest,
      reloadTests,
    }}>
      {children}
    </TestContext.Provider>
  );
};