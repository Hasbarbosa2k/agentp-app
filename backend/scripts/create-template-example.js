#!/usr/bin/env node

/**
 * Script para criar um template exemplo de onboarding
 * Demonstra como criar templates sem especificar OS suportados
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Template de exemplo para verificação de serviços básicos
const basicServiceCheckTemplate = {
  name: "Verificação de Serviços Básicos v2",
  description: "Template para verificar os principais serviços de um servidor Linux",
  category: "service_discovery",
  status: "active",
  // Sem especificar supportedOS - o sistema agora aceita qualquer OS
  steps: [
    {
      name: "Verificar Informações do Sistema",
      description: "Obtém dados básicos do sistema",
      command: "uname -a && hostname && whoami && uptime",
      order: 1,
      category: "system",
      validations: [
        {
          type: "exists",
          description: "Deve retornar informações do sistema"
        }
      ]
    },
    {
      name: "Verificar Status do SSH",
      description: "Verifica se o serviço SSH está ativo",
      command: "systemctl status ssh || systemctl status sshd",
      order: 2,
      category: "services",
      validations: [
        {
          type: "string_contains",
          value: "active",
          description: "O serviço SSH deve estar ativo"
        }
      ]
    },
    {
      name: "Verificar Processos em Execução",
      description: "Lista os processos consumindo mais memória",
      command: "ps aux --sort=-%mem | head -10",
      order: 3,
      category: "system",
      validations: []
    },
    {
      name: "Verificar Portas Abertas",
      description: "Lista as portas TCP em escuta",
      command: "ss -tlnp",
      order: 4,
      category: "network",
      validations: [
        {
          type: "string_contains",
          value: "22",
          description: "Deve ter a porta SSH (22) aberta"
        }
      ]
    },
    {
      name: "Verificar Espaço em Disco",
      description: "Mostra o espaço livre em disco",
      command: "df -h",
      order: 5,
      category: "system",
      validations: [
        {
          type: "regex_match",
          value: "[0-9]+%",
          description: "Deve mostrar percentual de uso do disco"
        }
      ]
    }
  ],
  config: {
    stopOnFirstError: false,
    maxRetries: 2,
    globalTimeout: 300
  }
};

// Template para verificação de segurança básica
const securityCheckTemplate = {
  name: "Verificação de Segurança Básica v2",
  description: "Template para verificar configurações básicas de segurança",
  category: "security_audit",
  status: "active",
  steps: [
    {
      name: "Verificar Política de Senhas",
      description: "Verifica as configurações de senha",
      command: "cat /etc/login.defs | grep -E \"^PASS_MAX_DAYS|^PASS_MIN_DAYS|^PASS_MIN_LEN\"",
      order: 1,
      category: "security",
      validations: [
        {
          type: "exists",
          description: "Deve existir política de senhas"
        }
      ]
    },
    {
      name: "Verificar Usuários com UID 0",
      description: "Lista usuários com privilégios de root",
      command: "awk -F: '($3 == 0) { print $1 }' /etc/passwd",
      order: 2,
      category: "security",
      validations: [
        {
          type: "regex_match",
          value: "^root$",
          description: "Apenas o usuário root deve ter UID 0"
        }
      ]
    },
    {
      name: "Verificar Permissões SUID",
      description: "Lista os binários com permissão SUID",
      command: "find / -type f -perm -4000 2>/dev/null | head -10",
      order: 3,
      category: "security",
      validations: []
    },
    {
      name: "Verificar Serviços de Rede",
      description: "Lista serviços conectados à rede",
      command: "netstat -tulpn || ss -tulpn",
      order: 4,
      category: "network",
      validations: []
    },
    {
      name: "Verificar Grupos de Administrador",
      description: "Lista membros de grupos administrativos",
      command: "grep -E \"^sudo:|^wheel:|^admin:\" /etc/group",
      order: 5,
      category: "security",
      validations: [
        {
          type: "exists",
          description: "Deve existir pelo menos um grupo administrativo"
        }
      ]
    }
  ],
  config: {
    stopOnFirstError: false,
    maxRetries: 1,
    globalTimeout: 300
  }
};

// Função para criar template via MongoDB diretamente
async function createTemplateDirect(templateData) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // Obter um usuário admin para associar ao template
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Nenhum usuário admin encontrado');
      return false;
    }
    
    // Adicionar o criador ao template
    templateData.createdBy = adminUser._id;
    
    // Inserir o template
    const result = await db.collection('onboardingtemplates').insertOne(templateData);
    console.log(`✅ Template "${templateData.name}" criado com ID: ${result.insertedId}`);
    
    await mongoose.disconnect();
    console.log('🔒 Desconectado da base de dados');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar template:', error.message);
    await mongoose.disconnect();
    return false;
  }
}

// Função para criar template via API
async function createTemplateViaAPI(templateData) {
  try {
    // Autenticar primeiro para obter token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Falha na autenticação');
      return false;
    }
    
    const token = loginResponse.data.data.token;
    
    // Criar template com o token
    const response = await axios.post(`${API_URL}/templates`, templateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Template "${templateData.name}" criado via API`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar template via API:', error.response?.data?.message || error.message);
    return false;
  }
}

// Função principal que executa o script
async function main() {
  console.log('🚀 CRIANDO TEMPLATES DE EXEMPLO (SEM ESPECIFICAR OS)\n');
  
  // Determinar método a usar
  const useAPI = process.argv.includes('--api');
  
  console.log(`Usando método: ${useAPI ? 'API' : 'MongoDB Direto'}`);
  
  // Criar os templates
  if (useAPI) {
    await createTemplateViaAPI(basicServiceCheckTemplate);
    await createTemplateViaAPI(securityCheckTemplate);
  } else {
    await createTemplateDirect(basicServiceCheckTemplate);
    await createTemplateDirect(securityCheckTemplate);
  }
  
  console.log('\n✅ Processo concluído');
}

// Executar script
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = {
  basicServiceCheckTemplate,
  securityCheckTemplate,
  createTemplateDirect,
  createTemplateViaAPI
};