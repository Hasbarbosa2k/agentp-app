const express = require('express');
const router = express.Router();

const {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  cloneTemplate,
  deleteTemplate,
  restoreTemplate,
  testTemplateValidations
} = require('../controllers/templateController');

const { authMiddleware: auth } = require('../middleware/auth');
const {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateCloneTemplate,
  validateTestValidations,
  validateTemplateId
} = require('../validators/templates');

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Gerenciamento de templates de onboarding personalizáveis
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OnboardingTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do template
 *         name:
 *           type: string
 *           description: Nome do template
 *         description:
 *           type: string
 *           description: Descrição do template
 *         version:
 *           type: string
 *           description: Versão do template
 *         category:
 *           type: string
 *           enum: [system_discovery, security_audit, performance_check, service_discovery, custom]
 *           description: Categoria do template
 *         status:
 *           type: string
 *           enum: [draft, active, deprecated, archived]
 *           description: Status do template
 *         supportedOS:
 *           type: array
 *           items:
 *             type: string
 *           description: Sistemas operativos suportados
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TemplateStep'
 *           description: Passos do template
 *         config:
 *           $ref: '#/components/schemas/TemplateConfig'
 *         usage:
 *           $ref: '#/components/schemas/TemplateUsage'
 *         createdBy:
 *           type: string
 *           description: ID do usuário criador
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     TemplateStep:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nome do passo
 *         description:
 *           type: string
 *           description: Descrição do passo
 *         command:
 *           type: string
 *           description: Comando a executar
 *         validations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TemplateValidation'
 *         timeout:
 *           type: integer
 *           description: Timeout em milissegundos
 *         retryable:
 *           type: boolean
 *           description: Se o passo pode ser repetido
 *         required:
 *           type: boolean
 *           description: Se o passo é obrigatório
 *         order:
 *           type: integer
 *           description: Ordem de execução
 *         category:
 *           type: string
 *           enum: [system, security, network, services, custom]
 *     
 *     TemplateValidation:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [string_contains, string_not_contains, regex_match, numeric_range, exists, not_exists]
 *           description: Tipo de validação
 *         value:
 *           type: string
 *           description: Valor a verificar
 *         description:
 *           type: string
 *           description: Descrição da validação
 *         required:
 *           type: boolean
 *           description: Se a validação é obrigatória
 *         minValue:
 *           type: number
 *           description: Valor mínimo (para numeric_range)
 *         maxValue:
 *           type: number
 *           description: Valor máximo (para numeric_range)
 *         flags:
 *           type: string
 *           description: Flags para regex
 *     
 *     TemplateConfig:
 *       type: object
 *       properties:
 *         stopOnFirstError:
 *           type: boolean
 *           description: Parar no primeiro erro
 *         allowParallelExecution:
 *           type: boolean
 *           description: Permitir execução paralela
 *         globalTimeout:
 *           type: integer
 *           description: Timeout global em segundos
 *         maxRetries:
 *           type: integer
 *           description: Número máximo de tentativas
 *     
 *     TemplateUsage:
 *       type: object
 *       properties:
 *         timesUsed:
 *           type: integer
 *           description: Número de vezes usado
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           description: Última utilização
 *         successRate:
 *           type: number
 *           description: Taxa de sucesso em percentagem
 *         averageDuration:
 *           type: integer
 *           description: Duração média em milissegundos
 */

// Criar novo template
router.post('/', auth, validateCreateTemplate, createTemplate);

// Listar templates
router.get('/', auth, listTemplates);

// Obter template específico
router.get('/:templateId', auth, validateTemplateId, getTemplate);

// Atualizar template
router.put('/:templateId', auth, validateTemplateId, validateUpdateTemplate, updateTemplate);

// Clonar template
router.post('/:templateId/clone', auth, validateTemplateId, validateCloneTemplate, cloneTemplate);

// Deletar template
router.delete('/:templateId', auth, validateTemplateId, deleteTemplate);

// Restaurar template arquivado
router.post('/:templateId/restore', auth, validateTemplateId, restoreTemplate);

// Testar validações do template
router.post('/:templateId/test-validations', auth, validateTemplateId, validateTestValidations, testTemplateValidations);

module.exports = router;