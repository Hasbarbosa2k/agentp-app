// Template Types for AgentP Frontend

export interface TemplateValidation {
  type: 'string_contains' | 'string_not_contains' | 'regex_match' | 'numeric_range' | 'exists' | 'not_exists' | 'output_contains';
  value: string;
  description?: string;
  required?: boolean;
  // For regex_match
  flags?: string;
  // For numeric_range
  minValue?: number;
  maxValue?: number;
}

export interface TemplateStep {
  name: string;
  description?: string;
  command: string;
  validations?: TemplateValidation[];
  timeout?: number;
  retryable?: boolean;
  required?: boolean;
  order: number;
  category?: string;
}

export interface TemplateConfig {
  stopOnFirstError: boolean;
  allowParallelExecution: boolean;
  globalTimeout: number;
  maxRetries: number;
}

export interface TemplateUsage {
  timesUsed: number;
  lastUsed?: string;
  successRate: number;
  averageDuration: number;
}

export interface Template {
  _id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  status: 'active' | 'draft' | 'archived';
  supportedOS: string[];
  tags: string[];
  steps: TemplateStep[];
  config: TemplateConfig;
  usage: TemplateUsage;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateValidationResult {
  type: string;
  value: string;
  success: boolean;
  details: string;
  required: boolean;
}

export interface StepValidationResult {
  stepName: string;
  overallSuccess: boolean;
  passedValidations: number;
  totalValidations: number;
  validationResults: TemplateValidationResult[];
}

export interface ValidationTestOutput {
  stepIndex: number;
  output: string;
}

export interface ValidationTestResult {
  testResults: StepValidationResult[];
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
  };
}

// Enums for better type safety
export type TemplateCategory = 'system_discovery' | 'security_audit' | 'network_check' | 'custom';
export type TemplateStatus = 'active' | 'draft' | 'archived';
export type ValidationType = 'string_contains' | 'string_not_contains' | 'regex_match' | 'numeric_range' | 'exists' | 'not_exists' | 'output_contains';

// Request/Response interfaces
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: TemplateCategory;
  supportedOS: string[];
  steps: Omit<TemplateStep, 'order'>[];
  config: TemplateConfig;
  tags?: string[];
  status?: TemplateStatus;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  version?: string;
  status?: TemplateStatus;
}

export interface CloneTemplateRequest {
  name: string;
  description: string;
}

export interface TemplateListQuery {
  category?: TemplateCategory;
  status?: TemplateStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TemplateListResponse {
  templates: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    active: number;
    draft: number;
    archived: number;
    byCategory: Record<string, number>;
  };
}

export interface TemplateResponse {
  template: Template;
}

export interface CloneTemplateResponse {
  template: Template;
  originalTemplate: Template;
}