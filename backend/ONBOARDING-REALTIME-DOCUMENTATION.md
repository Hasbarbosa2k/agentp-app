# Documentação - Onboarding em Tempo Real

## Visão Geral

Este documento descreve as melhorias implementadas no sistema de onboarding para fornecer atualizações em tempo real e registro detalhado de todos os passos e outputs por sistema.

## Principais Funcionalidades Implementadas

### 1. Modelo OnboardingProcess Aprimorado

**Novos campos adicionados:**
- `parsedOutput`: Output estruturado para facilitar parsing no frontend
- `executionDetails`: Detalhes de execução (exitCode, signal, timeout, tamanhos)
- `stepLogs`: Logs específicos de cada passo
- `currentStep`: Informações do passo atualmente em execução
- `skippedSteps`: Contador de passos ignorados
- `executionStats`: Estatísticas completas de execução

**Métodos melhorados:**
- `addStepLog()`: Adicionar logs específicos aos passos
- `startStep()`: Melhor tracking do passo atual
- `completeStep()`: Suporte a parsing automático de outputs

### 2. Server-Sent Events (SSE) para Tempo Real

**Endpoint principal:**
```
GET /onboarding/realtime/{systemId}/stream
```

**Eventos enviados:**
- `initial_state`: Estado inicial ao conectar
- `step_started`: Quando um passo inicia
- `step_completed`: Quando um passo é concluído com sucesso
- `step_failed`: Quando um passo falha
- `onboarding_completed`: Quando todo o onboarding é concluído
- `onboarding_failed`: Quando o onboarding falha
- `heartbeat`: Heartbeat a cada 30 segundos

**Exemplo de uso no frontend (JavaScript):**
```javascript
const eventSource = new EventSource('/onboarding/realtime/SYSTEM_ID/stream', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

eventSource.addEventListener('step_started', (event) => {
  const data = JSON.parse(event.data);
  console.log('Passo iniciado:', data.step);
});

eventSource.addEventListener('step_completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('Passo concluído:', data.step, 'Output:', data.output);
});
```

### 3. Endpoints de Logs Detalhados

**Obter logs detalhados:**
```
GET /onboarding/realtime/{systemId}/logs?level=info&stepIndex=0&limit=100
```

**Parâmetros:**
- `level`: Filtrar por nível (info, warning, error, debug)
- `stepIndex`: Filtrar por passo específico (-1 para logs gerais)
- `limit`: Limite de logs retornados (padrão: 100)

**Obter estatísticas em tempo real:**
```
GET /onboarding/realtime/{systemId}/stats
```

### 4. Serviço de Execução Melhorado

**Melhorias implementadas:**
- Logging detalhado de cada comando executado
- Captura de detalhes de execução (exit codes, signals, timeouts)
- Retry tracking com logs de tentativas
- Parsing automático de outputs estruturados
- Notificações em tempo real para clientes conectados

### 5. Endpoint Existente Melhorado

O endpoint `GET /onboarding/system/{systemId}` foi aprimorado com:
- `stepsSummary`: Resumo detalhado de todos os passos
- `recentLogs`: Logs dos últimos 5 minutos
- `executionStats`: Estatísticas completas de execução
- `realtime`: URLs dos endpoints de tempo real

## Estrutura de Dados

### Detalhes de Execução de Passo
```json
{
  "executionDetails": {
    "exitCode": 0,
    "signal": null,
    "timeout": false,
    "commandSize": 25,
    "outputSize": 1024
  }
}
```

### Output Estruturado
```json
{
  "parsedOutput": {
    "rawOutput": "comando executado com sucesso",
    "lines": ["comando", "executado", "com", "sucesso"],
    "lineCount": 4,
    "isEmpty": false
  }
}
```

### Estatísticas de Execução
```json
{
  "executionStats": {
    "totalDuration": 45000,
    "averageStepDuration": 3750,
    "totalOutputSize": 8192,
    "totalRetries": 2
  }
}
```

## Fluxo de Execução Detalhado

1. **Início do Onboarding**
   - Processo criado no MongoDB
   - Clientes SSE notificados sobre início

2. **Execução de Cada Passo**
   - Passo marcado como "running"
   - Evento `step_started` enviado
   - Comando executado via SSH
   - Logs detalhados registrados
   - Output processado e estruturado
   - Passo marcado como "success" ou "failed"
   - Evento `step_completed` ou `step_failed` enviado

3. **Conclusão do Onboarding**
   - Status final atualizado
   - Estatísticas calculadas
   - Evento `onboarding_completed` ou `onboarding_failed` enviado

## Exemplo de Integração Frontend

### React Hook para SSE
```javascript
import { useState, useEffect } from 'react';

export const useOnboardingStream = (systemId, token) => {
  const [onboardingData, setOnboardingData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `/onboarding/realtime/${systemId}/stream`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.addEventListener('initial_state', (event) => {
      setOnboardingData(JSON.parse(event.data));
    });

    eventSource.addEventListener('step_started', (event) => {
      const data = JSON.parse(event.data);
      setOnboardingData(prev => ({
        ...prev,
        currentStep: data
      }));
    });

    eventSource.addEventListener('step_completed', (event) => {
      const data = JSON.parse(event.data);
      setOnboardingData(prev => ({
        ...prev,
        steps: prev.steps.map((step, idx) => 
          idx === data.stepIndex ? { ...step, ...data } : step
        )
      }));
    });

    return () => eventSource.close();
  }, [systemId, token]);

  return { onboardingData, isConnected };
};
```

## Considerações de Performance

- **Conexões SSE**: Limitadas automaticamente por timeout e cleanup
- **Logs**: Filtráveis por nível e passo para reduzir dados transferidos
- **Outputs**: Truncados em resumos, completos apenas quando solicitados
- **Heartbeat**: A cada 30 segundos para manter conexão viva

## Segurança

- **Autenticação**: Todos os endpoints requerem token JWT
- **Autorização**: Usuários só podem acessar sistemas que têm permissão
- **Logs sensíveis**: Não são expostos diretamente no frontend
- **Rate limiting**: Aplicado a todos os endpoints

## Monitoramento e Debug

**Endpoint administrativo para conexões ativas:**
```
GET /onboarding/realtime/admin/connections
```

**Logs do servidor incluem:**
- Número de clientes conectados por sistema
- Eventos enviados em tempo real
- Erros de conexão SSE
- Performance de execução de passos 