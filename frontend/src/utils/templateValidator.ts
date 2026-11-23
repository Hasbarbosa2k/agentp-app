import { CreateTemplateRequest } from '../services';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export function validateTemplateData(data: CreateTemplateRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.name || !data.name.trim()) {
    errors.push({ field: 'name', message: 'Nome é obrigatório' });
  }

  if (!data.description || !data.description.trim()) {
    errors.push({ field: 'description', message: 'Descrição é obrigatória' });
  }

  if (!data.category) {
    errors.push({ field: 'category', message: 'Categoria é obrigatória' });
  }

  // supportedOS validation removed - not required anymore

  if (!data.steps || data.steps.length === 0) {
    errors.push({ field: 'steps', message: 'Pelo menos um step é obrigatório' });
  }

  // Validate steps
  if (data.steps) {
    data.steps.forEach((step, index) => {
      const stepPrefix = `steps[${index}]`;

      if (!step.name || !step.name.trim()) {
        errors.push({ 
          field: `${stepPrefix}.name`, 
          message: `Step ${index + 1}: Nome é obrigatório` 
        });
      }

      if (!step.command || !step.command.trim()) {
        errors.push({ 
          field: `${stepPrefix}.command`, 
          message: `Step ${index + 1}: Command is required` 
        });
      }

      if (step.timeout && (step.timeout < 1000 || step.timeout > 300000)) {
        errors.push({ 
          field: `${stepPrefix}.timeout`, 
          message: `Step ${index + 1}: Timeout deve estar entre 1000 e 300000ms`,
          value: step.timeout
        });
      }

      // Validate validations if present
      if (step.validations) {
        step.validations.forEach((validation, vIndex) => {
          const validationPrefix = `${stepPrefix}.validations[${vIndex}]`;

          if (!validation.type) {
            errors.push({ 
              field: `${validationPrefix}.type`, 
              message: `Step ${index + 1}, Validação ${vIndex + 1}: Tipo é obrigatório` 
            });
          }

          if (!validation.value || !validation.value.trim()) {
            errors.push({ 
              field: `${validationPrefix}.value`, 
              message: `Step ${index + 1}, Validação ${vIndex + 1}: Valor é obrigatório` 
            });
          }
        });
      }
    });
  }

  // Validate config
  if (data.config) {
    if (data.config.globalTimeout && (data.config.globalTimeout < 60 || data.config.globalTimeout > 3600)) {
      errors.push({ 
        field: 'config.globalTimeout', 
        message: 'Timeout global deve estar entre 60 e 3600 segundos',
        value: data.config.globalTimeout
      });
    }

    if (data.config.maxRetries && (data.config.maxRetries < 0 || data.config.maxRetries > 10)) {
      errors.push({ 
        field: 'config.maxRetries', 
        message: 'Máximo de tentativas deve estar entre 0 e 10',
        value: data.config.maxRetries
      });
    }
  }

  return errors;
}

export function createMinimalTemplate(name: string, description: string): CreateTemplateRequest {
  return {
    name: name.trim(),
    description: description.trim(),
    category: 'system_discovery',
    // supportedOS removed - not required anymore
    steps: [
      {
        name: 'os_detection',
        description: 'Detectar sistema operacional',
        command: 'cat /etc/os-release',
        order: 1,
        timeout: 10000,
        retryable: false,
        required: true,
        category: 'system',
        validations: []
      }
    ],
    config: {
      stopOnFirstError: false,
      allowParallelExecution: false,
      globalTimeout: 300,
      maxRetries: 2
    },
    tags: ['system_discovery', 'minimal'],
    status: 'active'
  };
}