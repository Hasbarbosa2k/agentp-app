/**
 * Exemplo de uso da API de Geração de Documentação
 * 
 * Este script demonstra como:
 * 1. Autenticar no sistema
 * 2. Gerar preview HTML de um relatório
 * 3. Gerar e fazer download de um relatório PDF
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuração
const API_BASE_URL = 'http://localhost:3000/api';
const USERNAME = 'admin@example.com';
const PASSWORD = 'Admin123!';

// Cliente API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, // 3 minutos
});

/**
 * 1. Autenticar e obter token JWT
 */
async function login() {
  console.log('🔐 Fazendo login...');
  try {
    const response = await api.post('/auth/login', {
      email: USERNAME,
      password: PASSWORD
    });
    
    if (response.data.success && response.data.token) {
      console.log('✅ Login realizado com sucesso');
      return response.data.token;
    } else {
      throw new Error('Login falhou: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

/**
 * 2. Gerar preview HTML do relatório
 */
async function generatePreview(token, reportData) {
  console.log('\n👁️  Gerando preview HTML...');
  try {
    const response = await api.post('/documentation/preview', reportData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.html) {
      console.log('✅ Preview gerado com sucesso');
      console.log('   Título:', response.data.title);
      console.log('   Tamanho HTML:', response.data.html.length, 'bytes');
      
      // Salvar HTML para debug (opcional)
      const htmlPath = path.join(__dirname, 'preview-report.html');
      fs.writeFileSync(htmlPath, response.data.html);
      console.log('   HTML salvo em:', htmlPath);
      
      return response.data;
    } else {
      throw new Error('Preview falhou: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ Erro ao gerar preview:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 3. Gerar relatório PDF
 */
async function generatePdfReport(token, reportData) {
  console.log('\n📄 Gerando relatório PDF...');
  try {
    const response = await api.post('/documentation/generate', reportData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });
    
    // Salvar PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `report_${timestamp}.pdf`;
    const pdfPath = path.join(__dirname, filename);
    
    fs.writeFileSync(pdfPath, response.data);
    
    console.log('✅ PDF gerado com sucesso');
    console.log('   Tamanho:', Math.round(response.data.byteLength / 1024), 'KB');
    console.log('   Salvo em:', pdfPath);
    
    return pdfPath;
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 1: Relatório simples
 */
async function example1Simple() {
  console.log('\n\n=== EXEMPLO 1: Relatório Simples ===\n');
  
  const token = await login();
  
  const reportData = {
    systemName: 'Web Server Produção',
    testDescription: `
Realizamos testes de carga no servidor web de produção durante 2 horas.

Configuração do Teste:
- Ferramenta: Apache JMeter 5.5
- Duração: 2 horas (14:00 - 16:00)
- Ramp-up: 5 minutos
- Utilizadores simultâneos: 1000

Métricas Observadas:
- Tempo de resposta médio: 220ms
- Tempo de resposta p95: 450ms
- Tempo de resposta p99: 850ms
- Taxa de erro: 0.1% (10 erros em 10.000 requests)
- Throughput: 500 requests/segundo
- CPU média: 65% (pico de 85%)
- Memória: 70% utilização (12GB de 16GB)
- Disco I/O: Normal (< 50% capacidade)

Endpoints Testados:
1. GET /api/users - 2000 req/min (200ms avg)
2. POST /api/login - 500 req/min (150ms avg)
3. GET /api/dashboard - 1000 req/min (300ms avg)
4. POST /api/orders - 300 req/min (400ms avg)

Observações:
- Sistema manteve-se estável durante todo o teste
- Alguns timeouts ocasionais (5 casos) durante o pico de carga às 15:30
- Base de dados PostgreSQL respondeu bem (< 100ms para 95% das queries)
- Cache Redis funcionou perfeitamente (hit rate de 92%)
- Nenhum crash ou restart necessário

Conclusões:
- Sistema está preparado para suportar carga atual
- Recomendado monitorizar picos de CPU
- Considerar scale horizontal se carga aumentar > 50%
    `,
    includeSystemInfo: false,
    additionalContext: 'Teste realizado no ambiente de staging (replica da produção)'
  };
  
  // Preview
  await generatePreview(token, reportData);
  
  // PDF
  await generatePdfReport(token, reportData);
}

/**
 * Exemplo 2: Relatório com informações do sistema
 */
async function example2WithSystemInfo() {
  console.log('\n\n=== EXEMPLO 2: Relatório com Info do Sistema ===\n');
  
  const token = await login();
  
  // Primeiro, buscar sistemas disponíveis
  console.log('🔍 Buscando sistemas...');
  const systemsResponse = await api.get('/systems', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (systemsResponse.data.success && systemsResponse.data.data.length > 0) {
    const firstSystem = systemsResponse.data.data[0];
    console.log('✅ Sistema encontrado:', firstSystem.name);
    
    const reportData = {
      systemId: firstSystem._id,
      testDescription: `
Teste de Performance e Disponibilidade do Sistema

Objetivo:
Validar a capacidade do sistema de manter disponibilidade e performance sob carga.

Metodologia:
- Testes de stress progressivo
- Monitorização contínua de métricas
- Validação de recovery após falhas simuladas

Resultados:
- Disponibilidade: 99.95% durante 24h de teste
- Performance mantida mesmo com 80% de CPU
- Recovery automático em < 30 segundos após falha simulada
- Todos os health checks responderam corretamente

Ferramentas Utilizadas:
- Prometheus para métricas
- Grafana para visualização
- JMeter para testes de carga
- Chaos Monkey para testes de resiliência
      `,
      includeSystemInfo: true,
      additionalContext: 'Validação pré-produção'
    };
    
    await generatePdfReport(token, reportData);
  } else {
    console.log('⚠️  Nenhum sistema encontrado. Usando nome personalizado.');
    
    const reportData = {
      systemName: 'Sistema de Teste',
      testDescription: 'Teste básico de funcionalidade',
      includeSystemInfo: false
    };
    
    await generatePdfReport(token, reportData);
  }
}

/**
 * Exemplo 3: Relatório de teste de segurança
 */
async function example3Security() {
  console.log('\n\n=== EXEMPLO 3: Relatório de Segurança ===\n');
  
  const token = await login();
  
  const reportData = {
    systemName: 'API Gateway de Produção',
    testDescription: `
Auditoria de Segurança - Q1 2026

Escopo da Auditoria:
- Testes de penetração (OWASP Top 10)
- Análise de configurações
- Review de dependências
- Validação de autenticação/autorização

Testes Realizados:

1. Injeção SQL
   - Resultado: ✅ PASS - Queries parametrizadas
   - Nenhuma vulnerabilidade encontrada

2. XSS (Cross-Site Scripting)
   - Resultado: ✅ PASS - Sanitização adequada
   - Content Security Policy implementada

3. CSRF (Cross-Site Request Forgery)
   - Resultado: ✅ PASS - Tokens CSRF presentes
   - SameSite cookies configurados

4. Autenticação
   - Resultado: ✅ PASS - JWT com rotação
   - Rate limiting implementado
   - Senhas com bcrypt (cost 12)

5. Autorização
   - Resultado: ⚠️  WARNING - Alguns endpoints sem validação
   - Recomendado: Implementar RBAC completo

6. Dependências
   - Resultado: ⚠️  WARNING - 3 vulnerabilidades médias
   - npm audit: 0 critical, 0 high, 3 medium
   - Recomendado: Atualizar pacotes

7. Headers de Segurança
   - Resultado: ✅ PASS - Helmet.js configurado
   - HSTS, X-Frame-Options, CSP presentes

8. Rate Limiting
   - Resultado: ✅ PASS - Express rate limit
   - 100 req/15min por IP

Vulnerabilidades Encontradas:
- [MEDIUM] Dependência 'axios' com CVE-2023-XXXX
- [MEDIUM] Endpoint /api/debug exposto em produção
- [LOW] Headers revelam versão do Express

Recomendações:
1. Atualizar dependências vulneráveis (prioridade alta)
2. Remover endpoint /api/debug de produção
3. Ocultar headers de servidor
4. Implementar RBAC completo
5. Adicionar logging de eventos de segurança

Score de Segurança: 8.5/10
Status: APROVADO COM RESSALVAS
    `,
    includeSystemInfo: false,
    additionalContext: 'Auditoria realizada por equipe de SecOps'
  };
  
  await generatePdfReport(token, reportData);
}

/**
 * Executar exemplos
 */
async function main() {
  console.log('🚀 Exemplos de Geração de Documentação\n');
  console.log('Certifique-se que:');
  console.log('- Backend está a correr em http://localhost:3000');
  console.log('- AI Module está a correr em http://localhost:3001');
  console.log('- MongoDB está acessível');
  console.log('');
  
  try {
    // Descomentar o exemplo que deseja executar:
    
    await example1Simple();              // Relatório completo de performance
    // await example2WithSystemInfo();   // Relatório com info do sistema
    // await example3Security();         // Relatório de segurança
    
    console.log('\n\n✅ Todos os exemplos executados com sucesso!');
    
  } catch (error) {
    console.error('\n\n❌ Erro ao executar exemplos:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  login,
  generatePreview,
  generatePdfReport
};
