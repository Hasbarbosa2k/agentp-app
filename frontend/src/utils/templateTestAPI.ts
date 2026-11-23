import { templatesService } from '../services';

/**
 * Test function to try different combinations of template data
 * to identify what the backend accepts
 */
export async function testTemplateAPIValues() {
  console.log('🧪 [API-TEST] Starting template API tests...');

  // Test 1: Minimal template with basic values
  const testCases = [
    {
      name: 'Test 1 - System Discovery + Ubuntu/CentOS',
      data: {
        name: 'API Test 1',
        description: 'Testing API with basic values',
        category: 'system_discovery' as const,
        supportedOS: ['ubuntu', 'centos'],
        steps: [{
          name: 'basic_test',
          command: 'echo "test"',
          order: 1,
          timeout: 5000,
          retryable: false,
          required: true,
        }],
        config: {
          stopOnFirstError: false,
          allowParallelExecution: false,
          globalTimeout: 300,
          maxRetries: 2
        },
        tags: ['test'],
        status: 'active' as const
      }
    },
    {
      name: 'Test 2 - Custom category + RHEL',
      data: {
        name: 'API Test 2',
        description: 'Testing with custom category',
        category: 'custom' as const,
        supportedOS: ['rhel'],
        steps: [{
          name: 'basic_test',
          command: 'echo "test"',
          order: 1,
          timeout: 5000,
          retryable: false,
          required: true,
        }],
        config: {
          stopOnFirstError: false,
          allowParallelExecution: false,
          globalTimeout: 300,
          maxRetries: 2
        },
        tags: ['test'],
        status: 'active' as const
      }
    },
    {
      name: 'Test 3 - Security Audit + Debian',
      data: {
        name: 'API Test 3',
        description: 'Testing security audit',
        category: 'security_audit' as const,
        supportedOS: ['debian'],
        steps: [{
          name: 'basic_test',
          command: 'echo "test"',
          order: 1,
          timeout: 5000,
          retryable: false,
          required: true,
        }],
        config: {
          stopOnFirstError: false,
          allowParallelExecution: false,
          globalTimeout: 300,
          maxRetries: 2
        },
        tags: ['test'],
        status: 'active' as const
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`🧪 [API-TEST] Running: ${testCase.name}`);
      console.log(`🧪 [API-TEST] Data:`, testCase.data);
      
      const result = await templatesService.createTemplate(testCase.data);
      
      console.log(`✅ [API-TEST] ${testCase.name} - SUCCESS`);
      console.log(`✅ [API-TEST] Created template ID: ${result._id}`);
      
      results.push({
        test: testCase.name,
        success: true,
        templateId: result._id,
        data: testCase.data
      });
      
    } catch (error: any) {
      console.error(`❌ [API-TEST] ${testCase.name} - FAILED`);
      console.error(`❌ [API-TEST] Error:`, error.response?.data || error.message);
      
      results.push({
        test: testCase.name,
        success: false,
        error: error.response?.data || error.message,
        data: testCase.data
      });
    }
  }

  console.log('🧪 [API-TEST] All tests completed. Results:');
  console.table(results);
  
  return results;
}

/**
 * Test different OS combinations to see which ones work
 */
export async function testOSCompatibility() {
  console.log('🧪 [OS-TEST] Testing different OS combinations...');
  
  const osTestCases = [
    ['Ubuntu 24.04.2 LTS'],
    ['Ubuntu 22.04 LTS'],
    ['ubuntu'],
    ['Ubuntu 24.04.2 LTS', 'ubuntu'],
    ['ubuntu', 'centos', 'rhel'],
    ['Ubuntu 24.04.2 LTS', 'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS'],
  ];
  
  const results = [];
  
  for (let i = 0; i < osTestCases.length; i++) {
    const supportedOS = osTestCases[i];
    try {
      console.log(`🧪 [OS-TEST] Test ${i + 1}: Testing supportedOS:`, supportedOS);
      
      const testData = {
        name: `OS Test ${i + 1}`,
        description: `Testing OS compatibility: ${supportedOS.join(', ')}`,
        category: 'custom' as const,
        supportedOS,
        steps: [{
          name: 'test',
          command: 'echo test',
          order: 1
        }],
        config: {
          stopOnFirstError: false,
          allowParallelExecution: false,
          globalTimeout: 300,
          maxRetries: 2
        }
      };
      
      const result = await templatesService.createTemplate(testData);
      console.log(`✅ [OS-TEST] Test ${i + 1} - SUCCESS`, supportedOS);
      
      results.push({
        test: `Test ${i + 1}`,
        supportedOS: supportedOS.join(', '),
        success: true,
        templateId: result._id
      });
      
    } catch (error: any) {
      console.error(`❌ [OS-TEST] Test ${i + 1} - FAILED`, supportedOS, error.response?.data || error.message);
      
      results.push({
        test: `Test ${i + 1}`,
        supportedOS: supportedOS.join(', '),
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }
  
  console.log('🧪 [OS-TEST] All OS tests completed. Results:');
  console.table(results);
  
  return results;
}

/**
 * Quick test with ultra-minimal data
 */
export async function testMinimalTemplate() {
  try {
    console.log('🧪 [MINIMAL-TEST] Testing ultra-minimal template...');
    
    const minimalData = {
      name: 'Ultra Minimal Test',
      description: 'Minimal test',
      category: 'custom' as const,
      supportedOS: ['ubuntu'],
      steps: [{
        name: 'test',
        command: 'echo test',
        order: 1
      }],
      config: {
        stopOnFirstError: false,
        allowParallelExecution: false,
        globalTimeout: 300,
        maxRetries: 2
      }
    };
    
    console.log('🧪 [MINIMAL-TEST] Data:', minimalData);
    
    const result = await templatesService.createTemplate(minimalData);
    console.log('✅ [MINIMAL-TEST] SUCCESS - Template created:', result._id);
    return result;
    
  } catch (error: any) {
    console.error('❌ [MINIMAL-TEST] FAILED:', error.response?.data || error.message);
    throw error;
  }
}