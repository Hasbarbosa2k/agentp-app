export * from './api';
export * from './auth.service';
export * from './profile.service';
export * from './settings.service';
export * from './admin.service';
export * from './group.service';

// Export systems service
export { 
  systemsService,
  type SystemHealth, 
  type SystemStats,
  type CreateSystemData,
  type SystemListResponse,
  type SystemListParams
} from './systems.service';
export { type SystemInfo as SystemServiceInfo } from './systems.service';

// Export tests service
export { 
  testsService,
  type TestDetails,
  type TestExecution,
  type TestStatistics,
  type TestExecutionResults,
  type UserInfo,
  type TestListItem
} from './tests.service';
export { 
  type TestCase as TestServiceCase,
  type TestStep as TestServiceStep,
  type TestSuite as TestServiceSuite
} from './tests.service';

// Export AI service
export { 
  aiService,
  type TestPlan,
  type GenerateTestPlanRequest,
  type GenerateTestCasesRequest,
  type AnalyzeRisksRequest,
  type AIScenario,
  type AIInfo,
  type RiskAnalysis,
  type HistoryEntry,
  type AIEngine
} from './ai.service';
export { 
  type TestCase as AITestCase,
  type TestStep as AITestStep,
  type TestSuite as AITestSuite
} from './ai.service';

// Export onboarding service with complete status types
export {
  OnboardingService,
  type OnboardingCredentials,
  type OnboardingOptions,
  type RunOnboardingExecutionRequest,
  type OnboardingStatusResponse,
  type OnboardingData,
  type NetworkInfo,
  type OSInfo,
  type InitiatedBy,
  type OnboardingLog,
  type TemplateInfo,
  type OnboardingCustomStep,
  type OnboardingConfig,
  type StartOnboardingRequest,
  type ExecuteStepRequest,
  type ExecuteStepResponse
} from './onboarding.service';
export { type OnboardingStep as OnboardingStatusStep, type SystemInfo as OnboardingSystemInfo } from './onboarding.service';

// Create and export onboarding service instance
import { OnboardingService } from './onboarding.service';
export const onboardingService = new OnboardingService();

// Export onboarding steps service
export { 
  onboardingStepsService,
  type StepResult,
  type ConnectivityTestRequest,
  type ConnectivityTestResponse,
  type OSDetectionRequest,
  type OSDetectionResponse,
  type SystemInfoRequest,
  type SystemInfoResponse,
  type ResourceCheckRequest,
  type ResourceCheckResponse,
  type CustomCommandRequest,
  type MultiPortTestRequest,
  type PingOnlyRequest,
  type PortOnlyRequest,
  type UpdateProcessRequest,
  type AvailableStepsResponse,
  type HealthResponse
} from './onboarding-steps.service';
export { type OnboardingStep as OnboardingStepsStep } from './onboarding-steps.service';

// Export templates service
export { 
  templatesService,
  TemplatesService
} from './templates.service';
export type { Template, TemplateCategory } from '../types/template.types';

// Export upload service
export {
  uploadService,
  type FileInfo,
  type FileStats,
  type UploadResponse,
  type FileListResponse
} from './upload.service';

// Diagnostics service
export {
  diagnosticsService,
  type DiagnosticsCredentials,
  type RunDiagnosticsResponse
} from './diagnostics.service';

// Export issue-helper service
export {
  issueHelperService,
  type CreateIssueMessageRequest,
  type IssueMessage,
  type IssueStatus,
  type ListMyIssuesParams,
  type SaveAIResponseRequest
} from './issue-helper.service';

// UI Tests service
export {
  uiTestsService,
  type CreateUiTestRequest,
  type CreateUiTestRawResponse,
  type FinalizeAndRunUiTestRequest,
  type FinalizeAndRunUiTestResponse,
  type UiTestItem,
  type ListUiTestsResponse,
  type GetUiTestResponse,
} from './ui-tests.service';

// Agent service
export {
  agentService,
  type TestAssets,
} from './agent.service';

// NOTA: Serviços agora incluem gestão completa de sistemas usando endpoints reais (/systems) 
// NOTA: IA integrada com endpoints reais - sem dados mock conforme regras da aplicação
// NOTA: Testes integrados com endpoints reais para detalhes completos com test suites e histórico
// NOTA: Templates integrados com endpoints reais para criação e gestão de validações automáticas
// NOTA: Files service integrado com endpoints reais para gestão de Knowledge Base por sistema 