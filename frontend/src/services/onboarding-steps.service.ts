import { api } from './api';

// Types for the new onboarding steps endpoints
export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  required: boolean;
  order: number;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
  }>;
}

export interface StepResult {
  name: string;
  status: 'success' | 'failed' | 'pending';
  command: string;
  output: string;
  error?: string;
  duration: number;
  timestamp: string;
  exitCode?: number;
}

export interface ConnectivityTestRequest {
  host: string;
  port: number;
  options?: {
    pingCount?: number;
    pingTimeout?: number;
    portTimeout?: number;
    includeTraceroute?: boolean;
  };
}

export interface ConnectivityTestResponse {
  success: boolean;
  message: string;
  data: {
    step: StepResult;
    details: {
      host: string;
      port: number;
      overall: {
        success: boolean;
        duration: number;
        status: string;
      };
      ping: {
        success: boolean;
        packetsTransmitted: number;
        packetsReceived: number;
        packetLoss: number;
        avgTime: number;
        minTime: number;
        maxTime: number;
      };
      portTest: {
        success: boolean;
        open: boolean;
        duration: number;
        error: string;
      };
      traceroute?: {
        success: boolean;
        hops: Array<{
          hop: number;
          raw: string;
        }>;
      };
    };
  };
}

export interface OSDetectionRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
}

export interface OSDetectionResponse {
  success: boolean;
  message: string;
  data: {
    step: StepResult;
    osInfo: {
      id: string;
      version: string;
      prettyName: string;
      architecture: string;
      kernel: string;
      like: string;
    };
  };
}

export interface SystemInfoRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  commands?: string[];
}

export interface SystemInfoResponse {
  success: boolean;
  message: string;
  data: {
    step: StepResult;
    commandResults: Array<{
      command: string;
      success: boolean;
      output: string;
      error: string;
      exitCode: number;
    }>;
    summary: {
      totalCommands: number;
      successfulCommands: number;
      failedCommands: number;
    };
  };
}

export interface ResourceCheckRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  thresholds?: {
    minMemoryMB?: number;
    maxCpuLoad?: number;
    minDiskSpaceGB?: number;
    maxDiskUsage?: number;
  };
}

export interface ResourceCheckResponse {
  success: boolean;
  message: string;
  data: {
    step: StepResult;
    checks: Array<{
      name: string;
      success: boolean;
      details: any;
      output: string;
    }>;
    thresholds: {
      minMemoryMB: number;
      maxCpuLoad: number;
      maxDiskUsage: number;
    };
    summary: {
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
    };
  };
}

export interface CustomCommandRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  command: string;
  options?: {
    timeout?: number;
  };
}

export interface MultiPortTestRequest {
  host: string;
  ports: number[];
  timeout?: number;
}

export interface PingOnlyRequest {
  host: string;
  count?: number;
}

export interface PortOnlyRequest {
  host: string;
  port: number;
}

export interface PrivilegesTestRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  commands?: string[]; // Optional, defaults to privilege-specific commands
}

export interface ProcessAnalysisRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  options?: {
    includeDetails?: boolean;
    filterByUser?: boolean;
  };
}

export interface ServiceAnalysisRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  options?: {
    includeInactive?: boolean;
    serviceManager?: string;
  };
}

export interface OpenPortsAnalysisRequest {
  systemId: string;
  credentials: {
    username: string;
    password?: string;
    privateKey?: string;
  };
  options?: {
    includeTCP?: boolean;
    includeUDP?: boolean;
    includeListening?: boolean;
  };
}

export interface UpdateProcessRequest {
  onboardingId: string;
  stepData: {
    name: string;
    status: 'success' | 'failed' | 'pending';
    command: string;
    output: string;
    error?: string;
    duration: number;
  };
}

export interface AvailableStepsResponse {
  success: boolean;
  message: string;
  data: {
    steps: OnboardingStep[];
    totalSteps: number;
    requiredSteps: number;
    optionalSteps: number;
  };
}

export interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    timestamp: string;
    services: {
      connectivity: string;
      ssh: string;
      database: string;
    };
    features: {
      ping: boolean;
      portTest: boolean;
      sshConnection: boolean;
      osDetection: boolean;
      commandExecution: boolean;
    };
    limits: {
      maxPingCount: number;
      maxPortTimeout: number;
      maxCommandTimeout: number;
      maxPorts: number;
    };
  };
}

export class OnboardingStepsService {
  
  // 1. Get available steps
  async getAvailableSteps(): Promise<AvailableStepsResponse> {
    try {
      const response = await api.get('/onboarding-steps/available');
      return response.data as AvailableStepsResponse;
    } catch (error) {
      console.error('Failed to get available steps:', error);
      throw error;
    }
  }

  // 2. Connectivity test (first mandatory step)
  async testConnectivity(request: ConnectivityTestRequest): Promise<ConnectivityTestResponse> {
    try {
      console.log('🌐 [ONBOARDING] Starting connectivity test:', request);
      const response = await api.post('/onboarding-steps/connectivity', request);
      console.log('🌐 [ONBOARDING] Connectivity test response:', response.data);
      return response.data as ConnectivityTestResponse;
    } catch (error) {
      console.error('🌐 [ONBOARDING] Connectivity test failed:', error);
      throw error;
    }
  }

  // 3. Ping only test
  async pingOnly(request: PingOnlyRequest): Promise<any> {
    try {
      const response = await api.post('/onboarding-steps/ping-only', request);
      return response.data;
    } catch (error) {
      console.error('Ping test failed:', error);
      throw error;
    }
  }

  // 4. Port only test
  async portOnly(request: PortOnlyRequest): Promise<any> {
    try {
      const response = await api.post('/onboarding-steps/port-only', request);
      return response.data;
    } catch (error) {
      console.error('Port test failed:', error);
      throw error;
    }
  }

  // 5. Multi-port test
  async multiPortTest(request: MultiPortTestRequest): Promise<any> {
    try {
      const response = await api.post('/onboarding-steps/multi-port-test', request);
      return response.data;
    } catch (error) {
      console.error('Multi-port test failed:', error);
      throw error;
    }
  }

  // 6. OS Detection (second mandatory step)
  async detectOS(request: OSDetectionRequest): Promise<OSDetectionResponse> {
    try {
      console.log('🖥️ [ONBOARDING] Starting OS detection:', request);
      const response = await api.post('/onboarding-steps/os-detection', request);
      console.log('🖥️ [ONBOARDING] OS detection response:', response.data);
      return response.data as OSDetectionResponse;
    } catch (error) {
      console.error('🖥️ [ONBOARDING] OS detection failed:', error);
      throw error;
    }
  }

  // 7. System Information (third mandatory step)
  async getSystemInfo(request: SystemInfoRequest): Promise<SystemInfoResponse> {
    try {
      console.log('ℹ️ [ONBOARDING] Starting system info:', request);
      const response = await api.post('/onboarding-steps/system-info', request);
      console.log('ℹ️ [ONBOARDING] System info response:', response.data);
      return response.data as SystemInfoResponse;
    } catch (error) {
      console.error('ℹ️ [ONBOARDING] System info failed:', error);
      throw error;
    }
  }

  // 8. Resource Check (fourth mandatory step)
  async checkResources(request: ResourceCheckRequest): Promise<ResourceCheckResponse> {
    try {
      console.log('📊 [ONBOARDING] Starting resource check:', request);
      const response = await api.post('/onboarding-steps/resource-check', request);
      console.log('📊 [ONBOARDING] Resource check response:', response.data);
      return response.data as ResourceCheckResponse;
    } catch (error) {
      console.error('📊 [ONBOARDING] Resource check failed:', error);
      throw error;
    }
  }

  // 9. Test Privileges (mandatory step) - wrapper for system-info with privilege commands
  async testPrivileges(request: PrivilegesTestRequest): Promise<any> {
    try {
      // Use system-info endpoint with privilege-specific commands
      const systemInfoRequest = {
        ...request,
        commands: ['sudo -l', 'whoami', 'id', 'groups']
      };
      console.log('🔐 [ONBOARDING] Starting privileges test:', systemInfoRequest);
      const response = await api.post('/onboarding-steps/system-info', systemInfoRequest);
      console.log('🔐 [ONBOARDING] Privileges test response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔐 [ONBOARDING] Privileges test failed:', error);
      throw error;
    }
  }

  // 10. Analyze Running Processes (mandatory step)
  async analyzeProcesses(request: ProcessAnalysisRequest): Promise<any> {
    try {
      console.log('🔄 [ONBOARDING] Starting process analysis:', request);
      const response = await api.post('/onboarding-steps/process-analysis', request);
      console.log('🔄 [ONBOARDING] Process analysis response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔄 [ONBOARDING] Process analysis failed:', error);
      throw error;
    }
  }

  // 11. Analyze Running Services (mandatory step)
  async analyzeServices(request: ServiceAnalysisRequest): Promise<any> {
    try {
      console.log('⚙️ [ONBOARDING] Starting service analysis:', request);
      const response = await api.post('/onboarding-steps/service-analysis', request);
      console.log('⚙️ [ONBOARDING] Service analysis response:', response.data);
      return response.data;
    } catch (error) {
      console.error('⚙️ [ONBOARDING] Service analysis failed:', error);
      throw error;
    }
  }

  // 12. Analyze Open Ports (mandatory step)
  async analyzeOpenPorts(request: OpenPortsAnalysisRequest): Promise<any> {
    try {
      console.log('🚪 [ONBOARDING] Starting open ports analysis:', request);
      const response = await api.post('/onboarding-steps/open-ports-analysis', request);
      console.log('🚪 [ONBOARDING] Open ports analysis response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚪 [ONBOARDING] Open ports analysis failed:', error);
      throw error;
    }
  }

  // 13. Custom Command (optional)
  async executeCustomCommand(request: CustomCommandRequest): Promise<any> {
    try {
      const response = await api.post('/onboarding-steps/custom-command', request);
      return response.data;
    } catch (error) {
      console.error('Custom command failed:', error);
      throw error;
    }
  }

  // 10. Update Process
  async updateProcess(request: UpdateProcessRequest): Promise<any> {
    try {
      const response = await api.post('/onboarding-steps/update-process', request);
      return response.data;
    } catch (error) {
      console.error('Process update failed:', error);
      throw error;
    }
  }

  // 11. Health Check
  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await api.get('/onboarding-steps/health');
      return response.data as HealthResponse;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // DEPRECATED: Helper method to run the mandatory sequence
  // ⚠️ NÃO USAR: Esta função executa testes manuais que foram removidos
  // ⚠️ O sistema agora executa APENAS templates associados aos sistemas
  // @deprecated Use template execution instead
  async runMandatorySequence(
    systemId: string,
    credentials: { username: string; password?: string; privateKey?: string },
    host: string,
    port: number = 22,
    onStepComplete?: (stepName: string, result: any) => void
  ): Promise<{
    success: boolean;
    completedSteps: number;
    totalSteps: number;
    results: any[];
    error?: string;
  }> {
    const results: any[] = [];
    const mandatorySteps = [
      'connectivity',
      'privileges-test',
      'process-analysis',
      'service-analysis', 
      'open-ports-analysis',
      'os-detection', 
      'system-info',
      'resource-check'
    ];

    try {
      console.log('🚀 [ONBOARDING] Starting mandatory sequence for system:', systemId);
      console.log('🚀 [ONBOARDING] Total steps to execute:', mandatorySteps.length);
      
      // Step 1: Connectivity Test
      console.log('🚀 [ONBOARDING] STEP 1/8: Running connectivity test...');
      const connectivityResult = await this.testConnectivity({
        host,
        port,
        options: {
          pingCount: 4,
          pingTimeout: 5000,
          portTimeout: 5000,
          includeTraceroute: true
        }
      });
      results.push({ step: 'connectivity', result: connectivityResult });
      onStepComplete?.('connectivity', connectivityResult);
      console.log('✅ [ONBOARDING] STEP 1/8 Complete:', connectivityResult.success ? 'SUCCESS' : 'FAILED');

      if (!connectivityResult.success) {
        throw new Error('Connectivity test failed');
      }

      // Step 2: Test Privileges (using system-info endpoint)
      console.log('🚀 [ONBOARDING] STEP 2/8: Testing privileges...');
      try {
        const privilegesResult = await this.getSystemInfo({
          systemId,
          credentials,
          commands: ['sudo -l', 'whoami', 'id', 'groups']
        });
        results.push({ step: 'privileges-test', result: privilegesResult });
        onStepComplete?.('privileges-test', privilegesResult);
        console.log('✅ [ONBOARDING] STEP 2/8 Complete:', privilegesResult.success ? 'SUCCESS' : 'FAILED');

        if (!privilegesResult.success) {
          console.warn('Privileges test failed, but continuing...');
        }
      } catch (error: any) {
        const isNotImplemented = error?.response?.status === 404;
        const failedResult = {
          success: false,
          message: isNotImplemented ? 'Endpoint not implemented yet' : 'Privileges test failed',
          data: { step: { name: 'privileges-test', status: 'failed' } }
        };
        results.push({ step: 'privileges-test', result: failedResult });
        onStepComplete?.('privileges-test', failedResult);
        console.log('❌ [ONBOARDING] STEP 2/8 Failed:', isNotImplemented ? 'NOT IMPLEMENTED' : 'ERROR');
        console.warn(`Privileges test ${isNotImplemented ? 'not implemented' : 'failed'}, continuing...`);
      }

      // Step 3: Analyze Running Processes
      console.log('🚀 [ONBOARDING] STEP 3/8: Analyzing running processes...');
      try {
        const processResult = await this.analyzeProcesses({ 
          systemId, 
          credentials,
          options: {
            includeDetails: true,
            filterByUser: false
          }
        });
        results.push({ step: 'process-analysis', result: processResult });
        onStepComplete?.('process-analysis', processResult);
        console.log('✅ [ONBOARDING] STEP 3/8 Complete:', processResult.success ? 'SUCCESS' : 'FAILED');

        if (!processResult.success) {
          console.warn('Process analysis failed, but continuing...');
        }
      } catch (error: any) {
        const isNotImplemented = error?.response?.status === 404;
        const failedResult = {
          success: false,
          message: isNotImplemented ? 'Endpoint not implemented yet' : 'Process analysis failed',
          data: { step: { name: 'process-analysis', status: 'failed' } }
        };
        results.push({ step: 'process-analysis', result: failedResult });
        onStepComplete?.('process-analysis', failedResult);
        console.log('❌ [ONBOARDING] STEP 3/8 Failed:', isNotImplemented ? 'NOT IMPLEMENTED' : 'ERROR');
        console.warn(`Process analysis ${isNotImplemented ? 'not implemented' : 'failed'}, continuing...`);
      }

      // Step 4: Analyze Running Services
      console.log('🚀 [ONBOARDING] STEP 4/8: Analyzing running services...');
      try {
        const serviceResult = await this.analyzeServices({
          systemId,
          credentials,
          options: {
            includeInactive: false,
            serviceManager: 'systemd'
          }
        });
        results.push({ step: 'service-analysis', result: serviceResult });
        onStepComplete?.('service-analysis', serviceResult);
        console.log('✅ [ONBOARDING] STEP 4/8 Complete:', serviceResult.success ? 'SUCCESS' : 'FAILED');

        if (!serviceResult.success) {
          console.warn('Service analysis failed, but continuing...');
        }
      } catch (error: any) {
        const isNotImplemented = error?.response?.status === 404;
        const failedResult = {
          success: false,
          message: isNotImplemented ? 'Endpoint not implemented yet' : 'Service analysis failed',
          data: { step: { name: 'service-analysis', status: 'failed' } }
        };
        results.push({ step: 'service-analysis', result: failedResult });
        onStepComplete?.('service-analysis', failedResult);
        console.log('❌ [ONBOARDING] STEP 4/8 Failed:', isNotImplemented ? 'NOT IMPLEMENTED' : 'ERROR');
        console.warn(`Service analysis ${isNotImplemented ? 'not implemented' : 'failed'}, continuing...`);
      }

      // Step 5: Analyze Open Ports
      console.log('🚀 [ONBOARDING] STEP 5/8: Analyzing open ports...');
      try {
        const portsResult = await this.analyzeOpenPorts({
          systemId,
          credentials,
          options: {
            includeTCP: true,
            includeUDP: true,
            includeListening: true
          }
        });
        results.push({ step: 'open-ports-analysis', result: portsResult });
        onStepComplete?.('open-ports-analysis', portsResult);
        console.log('✅ [ONBOARDING] STEP 5/8 Complete:', portsResult.success ? 'SUCCESS' : 'FAILED');

        if (!portsResult.success) {
          console.warn('Open ports analysis failed, but continuing...');
        }
      } catch (error: any) {
        const isNotImplemented = error?.response?.status === 404;
        const failedResult = {
          success: false,
          message: isNotImplemented ? 'Endpoint not implemented yet' : 'Open ports analysis failed',
          data: { step: { name: 'open-ports-analysis', status: 'failed' } }
        };
        results.push({ step: 'open-ports-analysis', result: failedResult });
        onStepComplete?.('open-ports-analysis', failedResult);
        console.log('❌ [ONBOARDING] STEP 5/8 Failed:', isNotImplemented ? 'NOT IMPLEMENTED' : 'ERROR');
        console.warn(`Open ports analysis ${isNotImplemented ? 'not implemented' : 'failed'}, continuing...`);
      }

      // Step 6: OS Detection
      console.log('🚀 [ONBOARDING] STEP 6/8: Running OS detection...');
      const osResult = await this.detectOS({ systemId, credentials });
      results.push({ step: 'os-detection', result: osResult });
      onStepComplete?.('os-detection', osResult);
      console.log('✅ [ONBOARDING] STEP 6/8 Complete:', osResult.success ? 'SUCCESS' : 'FAILED');

      if (!osResult.success) {
        throw new Error('OS detection failed');
      }

      // Step 7: System Info
      console.log('🚀 [ONBOARDING] STEP 7/8: Getting system information...');
      const systemInfoResult = await this.getSystemInfo({
        systemId,
        credentials,
        commands: ['uname -a', 'hostname', 'whoami', 'uptime']
      });
      results.push({ step: 'system-info', result: systemInfoResult });
      onStepComplete?.('system-info', systemInfoResult);
      console.log('✅ [ONBOARDING] STEP 7/8 Complete:', systemInfoResult.success ? 'SUCCESS' : 'FAILED');

      if (!systemInfoResult.success) {
        throw new Error('System info failed');
      }

      // Step 8: Resource Check
      console.log('🚀 [ONBOARDING] STEP 8/8: Checking resources...');
      const resourceResult = await this.checkResources({
        systemId,
        credentials,
        thresholds: {
          minMemoryMB: 1024,
          maxCpuLoad: 70,
          minDiskSpaceGB: 2,
          maxDiskUsage: 85
        }
      });
      results.push({ step: 'resource-check', result: resourceResult });
      onStepComplete?.('resource-check', resourceResult);
      console.log('✅ [ONBOARDING] STEP 8/8 Complete:', resourceResult.success ? 'SUCCESS' : 'FAILED');

      // Calculate successful steps (excluding not implemented endpoints)
      const successfulSteps = results.filter(r => 
        r.result.success || r.result.message === 'Endpoint not implemented yet'
      ).length;

      const hasRealFailures = results.some(r => 
        !r.result.success && r.result.message !== 'Endpoint not implemented yet'
      );

      console.log('🎉 [ONBOARDING] SEQUENCE COMPLETE!');
      console.log('📊 [ONBOARDING] Summary:', {
        totalSteps: mandatorySteps.length,
        completedSteps: results.length,
        successfulSteps,
        hasRealFailures,
        finalResult: !hasRealFailures ? 'SUCCESS' : 'FAILED'
      });

      return {
        success: !hasRealFailures,
        completedSteps: results.length,
        totalSteps: mandatorySteps.length,
        results
      };

    } catch (error) {
      console.error('💥 [ONBOARDING] Mandatory sequence failed:', error);
      console.log('📊 [ONBOARDING] Final Summary (FAILED):', {
        totalSteps: mandatorySteps.length,
        completedSteps: results.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        success: false,
        completedSteps: results.length,
        totalSteps: mandatorySteps.length,
        results,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const onboardingStepsService = new OnboardingStepsService(); 