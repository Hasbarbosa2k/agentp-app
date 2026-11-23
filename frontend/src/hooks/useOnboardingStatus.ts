import { useState, useEffect, useCallback } from 'react';
import { onboardingService, type OnboardingStatusResponse, type TemplateInfo } from '../services';

export interface UseOnboardingStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface OnboardingStatusState {
  data: OnboardingStatusResponse | null;
  loading: boolean;
  error: string | null;
  hasOnboarding: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  isFailed: boolean;
  progress: number;
  hasTemplate: boolean;
  totalValidations: number;
}

export const useOnboardingStatus = (
  systemId: string, 
  options: UseOnboardingStatusOptions = {}
) => {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const [state, setState] = useState<OnboardingStatusState>({
    data: null,
    loading: true,
    error: null,
    hasOnboarding: false,
    isCompleted: false,
    isInProgress: false,
    isFailed: false,
    progress: 0,
    hasTemplate: false,
    totalValidations: 0
  });

  const fetchStatus = useCallback(async () => {
    if (!systemId) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🔄 [useOnboardingStatus] Fetching status for system:', systemId);
      const response = await onboardingService.getOnboardingStatus(systemId);
      

      
      const hasOnboarding = response.data.hasOnboarding;
      const onboarding = response.data.onboarding;
      const hasTemplate = Boolean(onboarding?.template || onboarding?.templateId);
      const totalValidations = onboarding?.template?.totalValidations || 0;
      
      setState({
        data: response,
        loading: false,
        error: null,
        hasOnboarding,
        isCompleted: hasOnboarding && onboarding?.status === 'completed',
        isInProgress: hasOnboarding && onboarding?.status === 'in_progress',
        isFailed: hasOnboarding && onboarding?.status === 'failed',
        progress: onboarding?.progress || 0,
        hasTemplate,
        totalValidations
      });

      console.log('✅ [useOnboardingStatus] Status loaded:', {
        hasOnboarding,
        status: onboarding?.status,
        progress: onboarding?.progress
      });

    } catch (err: any) {
      console.error('❌ [useOnboardingStatus] Failed to fetch status:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Erro ao carregar status do onboarding'
      }));
    }
  }, [systemId]);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !systemId) return;

    const interval = setInterval(() => {
      console.log('🔄 [useOnboardingStatus] Auto-refreshing status...');
      fetchStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStatus, systemId]);

  const refresh = useCallback(() => {
    console.log('🔄 [useOnboardingStatus] Manual refresh triggered');
    fetchStatus();
  }, [fetchStatus]);

  // Helper functions for easy access to common data
  const getStatusColor = useCallback(() => {
    if (!state.hasOnboarding) return 'gray';
    switch (state.data?.data.onboarding?.status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  }, [state.hasOnboarding, state.data?.data.onboarding?.status]);

  const getStatusText = useCallback(() => {
    if (!state.hasOnboarding) return 'Não iniciado';
    switch (state.data?.data.onboarding?.status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'In Progress';
      case 'failed': return 'Falhado';
      case 'pending': return 'Pendente';
      default: return 'Desconhecido';
    }
  }, [state.hasOnboarding, state.data?.data.onboarding?.status]);

  const getCompletedSteps = useCallback(() => {
    return state.data?.data.onboarding?.completedSteps || 0;
  }, [state.data?.data.onboarding?.completedSteps]);

  const getTotalSteps = useCallback(() => {
    return state.data?.data.onboarding?.totalSteps || 0;
  }, [state.data?.data.onboarding?.totalSteps]);

  const getFailedSteps = useCallback(() => {
    return state.data?.data.onboarding?.failedSteps || 0;
  }, [state.data?.data.onboarding?.failedSteps]);

  const getDuration = useCallback(() => {
    return state.data?.data.onboarding?.totalDuration || 0;
  }, [state.data?.data.onboarding?.totalDuration]);

  const getOSInfo = useCallback(() => {
    return state.data?.data.onboarding?.osInfo || null;
  }, [state.data?.data.onboarding?.osInfo]);

  const getNetworkInfo = useCallback(() => {
    return state.data?.data.onboarding?.networkInfo || null;
  }, [state.data?.data.onboarding?.networkInfo]);

  const getSteps = useCallback(() => {
    return state.data?.data.onboarding?.steps || [];
  }, [state.data?.data.onboarding?.steps]);

  const getLogs = useCallback(() => {
    return state.data?.data.onboarding?.logs || [];
  }, [state.data?.data.onboarding?.logs]);

  const getTemplate = useCallback((): TemplateInfo | null => {
    return state.data?.data.onboarding?.template || null;
  }, [state.data?.data.onboarding?.template]);
  
  const getTemplateInfo = useCallback((): TemplateInfo | null => {
    return state.data?.data.onboarding?.template || null;
  }, [state.data?.data.onboarding?.template]);

  const getTemplateId = useCallback((): string | null => {
    return state.data?.data.onboarding?.templateId || null;
  }, [state.data?.data.onboarding?.templateId]);

  const getTemplateName = useCallback((): string | null => {
    return state.data?.data.onboarding?.templateName || null;
  }, [state.data?.data.onboarding?.templateName]);

  const getTemplateVersion = useCallback((): string | null => {
    return state.data?.data.onboarding?.templateVersion || null;
  }, [state.data?.data.onboarding?.templateVersion]);

  const getTotalValidations = useCallback((): number => {
    return state.totalValidations;
  }, [state.totalValidations]);

  const hasValidations = useCallback((): boolean => {
    return state.hasTemplate && state.totalValidations > 0;
  }, [state.hasTemplate, state.totalValidations]);

  const getStepsWithValidations = useCallback(() => {
    return state.data?.data.onboarding?.steps?.filter(step => step.hasValidations) || [];
  }, [state.data?.data.onboarding?.steps]);

  return {
    ...state,
    refresh,
    // Helper functions
    getStatusColor,
    getStatusText,
    getCompletedSteps,
    getTotalSteps,
    getFailedSteps,
    getDuration,
    getOSInfo,
    getNetworkInfo,
    getSteps,
    getLogs,
    // Template-related functions
    getTemplate,
    getTemplateInfo,
    getTemplateId,
    getTemplateName,
    getTemplateVersion,
    getTotalValidations,
    hasValidations,
    getStepsWithValidations,
    // Raw onboarding data for direct access
    onboarding: state.data?.data.onboarding || null,
    system: state.data?.data.system || null,
    status: state.data?.data.onboarding?.status || null
  };
}; 