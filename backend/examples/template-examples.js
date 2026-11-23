/**
 * EXEMPLOS DE TEMPLATES DE ONBOARDING PERSONALIZÁVEIS
 * 
 * Este arquivo demonstra como criar e usar templates personalizados
 * para onboarding de sistemas, conforme solicitado pelo usuário.
 */

// Exemplo 1: Template para verificar OS, Users e SNMP
const systemDiscoveryTemplate = {
  name: "System Discovery - OS, Users, SNMP",
  description: "Template para descobrir informações básicas do sistema: OS, usuários e status do SNMP",
  category: "system_discovery",
  supportedOS: ["ubuntu", "debian", "centos", "rhel", "any"],
  status: "active",
  tags: ["discovery", "basic", "security"],
  
  steps: [
    {
      name: "OS Detection",
      description: "Detectar tipo e versão do sistema operativo",
      command: "cat /etc/os-release",
      order: 1,
      category: "system",
      timeout: 10000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "string_contains",
          value: "ID=",
          description: "Verificar se contém identificador do OS",
          required: true
        },
        {
          type: "string_contains", 
          value: "VERSION_ID=",
          description: "Verificar se contém versão do OS",
          required: false
        }
      ]
    },
    
    {
      name: "Check Users",
      description: "Verificar usuários do sistema",
      command: "cat /etc/passwd",
      order: 2,
      category: "security",
      timeout: 15000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "string_contains",
          value: "root",
          description: "Verificar se usuário root existe",
          required: true
        },
        {
          type: "regex_match",
          value: "\\b(ssh|sshd)\\b",
          flags: "i",
          description: "Verificar se há usuário relacionado ao SSH",
          required: false
        }
      ]
    },
    
    {
      name: "SNMP Status Check",
      description: "Verificar se SNMP está ativo e configurado",
      command: "systemctl status snmpd 2>/dev/null || service snmpd status 2>/dev/null || ps aux | grep snmp",
      order: 3,
      category: "services",
      timeout: 10000,
      retryable: true,
      required: false,
      validations: [
        {
          type: "string_contains",
          value: "active",
          description: "Verificar se SNMP está ativo",
          required: false
        },
        {
          type: "string_not_contains",
          value: "inactive",
          description: "SNMP não deve estar inativo",
          required: false
        }
      ]
    }
  ],
  
  config: {
    stopOnFirstError: false,
    allowParallelExecution: false,
    globalTimeout: 300,
    maxRetries: 2
  }
};

// Exemplo 2: Template específico para verificar RHEL
const rhelSpecificTemplate = {
  name: "RHEL System Audit",
  description: "Template específico para auditoria de sistemas Red Hat Enterprise Linux",
  category: "security_audit", 
  supportedOS: ["rhel", "centos"],
  status: "active",
  tags: ["rhel", "security", "audit"],
  
  steps: [
    {
      name: "OS Version Check",
      description: "Verificar se é RHEL e a versão",
      command: "cat /etc/redhat-release",
      order: 1,
      category: "system",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "string_contains",
          value: "Red Hat Enterprise Linux",
          description: "Deve ser Red Hat Enterprise Linux",
          required: true
        },
        {
          type: "regex_match",
          value: "release [78]\\.",
          description: "Deve ser RHEL 7 ou 8",
          required: false
        }
      ]
    },
    
    {
      name: "SELinux Status",
      description: "Verificar status do SELinux",
      command: "getenforce && sestatus",
      order: 2,
      category: "security",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "string_contains",
          value: "Enforcing",
          description: "SELinux deve estar em modo Enforcing",
          required: true
        },
        {
          type: "string_not_contains",
          value: "Disabled",
          description: "SELinux não deve estar desabilitado",
          required: true
        }
      ]
    },
    
    {
      name: "Check Root User",
      description: "Verificar configuração do usuário root",
      command: "grep '^root:' /etc/passwd && id root",
      order: 3,
      category: "security",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "string_contains",
          value: "root:x:0:0",
          description: "Root deve ter UID 0",
          required: true
        },
        {
          type: "string_contains",
          value: "uid=0",
          description: "Root deve ter UID 0 confirmado",
          required: true
        }
      ]
    }
  ],
  
  config: {
    stopOnFirstError: true,
    allowParallelExecution: false,
    globalTimeout: 180,
    maxRetries: 1
  }
};

// Exemplo 3: Template para verificação de performance
const performanceCheckTemplate = {
  name: "Performance Check",
  description: "Template para verificar performance básica do sistema",
  category: "performance_check",
  supportedOS: ["any"],
  status: "active",
  tags: ["performance", "monitoring", "resources"],
  
  steps: [
    {
      name: "Memory Usage",
      description: "Verificar uso de memória",
      command: "free -m | head -2",
      order: 1,
      category: "system",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "regex_match",
          value: "Mem:\\s+(\\d+)",
          description: "Deve mostrar total de memória",
          required: true
        },
        {
          type: "numeric_range",
          value: "",
          minValue: 512,
          maxValue: null,
          description: "Sistema deve ter pelo menos 512MB de RAM",
          required: false
        }
      ]
    },
    
    {
      name: "Disk Usage",
      description: "Verificar uso de disco",
      command: "df -h / | tail -1",
      order: 2,
      category: "system",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "regex_match",
          value: "(\\d+)%",
          description: "Deve mostrar percentagem de uso",
          required: true
        },
        {
          type: "string_not_contains",
          value: "100%",
          description: "Disco não deve estar 100% cheio",
          required: false
        }
      ]
    },
    
    {
      name: "Load Average",
      description: "Verificar load average do sistema",
      command: "uptime",
      order: 3,
      category: "system",
      timeout: 5000,
      retryable: true,
      required: true,
      validations: [
        {
          type: "regex_match",
          value: "load average:",
          description: "Deve mostrar load average",
          required: true
        },
        {
          type: "exists",
          value: "",
          description: "Comando deve retornar algum output",
          required: true
        }
      ]
    }
  ],
  
  config: {
    stopOnFirstError: false,
    allowParallelExecution: true,
    globalTimeout: 120,
    maxRetries: 3
  }
};

/**
 * EXEMPLOS DE USO DA API
 */

// Exemplo de como criar um template via API
const createTemplateExample = async () => {
  const response = await fetch('/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify(systemDiscoveryTemplate)
  });
  
  const result = await response.json();
  console.log('Template criado:', result);
  return result.data.template.id;
};

// Exemplo de como iniciar onboarding com template
const startOnboardingWithTemplate = async (systemId, templateId) => {
  const response = await fetch('/onboarding/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
      systemId: systemId,
      templateId: templateId,
      config: {
        maxRetries: 2,
        timeoutSeconds: 300
      }
    })
  });
  
  const result = await response.json();
  console.log('Onboarding iniciado:', result);
  return result;
};

// Exemplo de como testar validações de um template
const testTemplateValidations = async (templateId) => {
  const testOutputs = [
    {
      stepIndex: 0,
      output: `NAME="Ubuntu"
VERSION="20.04.3 LTS (Focal Fossa)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 20.04.3 LTS"
VERSION_ID="20.04"`
    },
    {
      stepIndex: 1,
      output: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin`
    },
    {
      stepIndex: 2,
      output: `● snmpd.service - Simple Network Management Protocol (SNMP) Daemon.
   Loaded: loaded (/lib/systemd/system/snmpd.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2023-01-01 10:00:00 UTC; 1h 30min ago`
    }
  ];

  const response = await fetch(`/templates/${templateId}/test-validations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ testOutputs })
  });
  
  const result = await response.json();
  console.log('Resultados do teste:', result);
  return result;
};

/**
 * COMANDOS CURL PARA TESTE
 */

const curlExamples = `
# 1. Criar template
curl -X POST http://localhost:3000/templates \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(systemDiscoveryTemplate, null, 2)}'

# 2. Listar templates
curl -X GET http://localhost:3000/templates \\
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Iniciar onboarding com template
curl -X POST http://localhost:3000/onboarding/start \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "systemId": "SYSTEM_ID_HERE",
    "templateId": "TEMPLATE_ID_HERE"
  }'

# 4. Testar validações do template
curl -X POST http://localhost:3000/templates/TEMPLATE_ID/test-validations \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "testOutputs": [
      {
        "stepIndex": 0,
        "output": "ID=ubuntu\\nVERSION_ID=\\"20.04\\""
      }
    ]
  }'
`;

module.exports = {
  systemDiscoveryTemplate,
  rhelSpecificTemplate, 
  performanceCheckTemplate,
  createTemplateExample,
  startOnboardingWithTemplate,
  testTemplateValidations,
  curlExamples
};