const express = require('express');
const router = express.Router();

// ⚠️ ROTAS DESATIVADAS: SISTEMA AGORA USA APENAS TEMPLATES
// Todas as execuções manuais de passos foram desativadas
// Para executar onboarding, use templates via /templates e /onboarding/start

const { authMiddleware: auth } = require('../middleware/auth');

// RESPOSTA PADRÃO PARA TODAS AS ROTAS DESATIVADAS
const templateOnlyResponse = (req, res) => {
  res.status(410).json({
        success: false,
    message: 'Funcionalidade descontinuada: O sistema agora executa apenas templates de onboarding.',
    error: 'FEATURE_DISCONTINUED',
    alternatives: {
      listTemplates: 'GET /templates - Lista templates disponíveis',
      createTemplate: 'POST /templates - Cria novo template',
      startOnboarding: 'POST /onboarding/start - Inicia onboarding com template (templateId obrigatório)',
      executeOnboarding: 'POST /onboarding-execution/run - Executa onboarding via SSH'
    },
    hint: 'Use templates personalizáveis em vez de passos manuais individuais'
  });
};

// Todas as rotas antigas agora retornam a mensagem de template obrigatório
router.get('/available', auth, templateOnlyResponse);
router.post('/connectivity', auth, templateOnlyResponse);
router.post('/privileges-test', auth, templateOnlyResponse);
router.post('/os-detection', auth, templateOnlyResponse);
router.post('/system-info', auth, templateOnlyResponse);
router.post('/resource-check', auth, templateOnlyResponse);
router.post('/process-analysis', auth, templateOnlyResponse);
router.post('/service-analysis', auth, templateOnlyResponse);
router.post('/open-ports', auth, templateOnlyResponse);
router.post('/security-scan', auth, templateOnlyResponse);
router.post('/custom-command', auth, templateOnlyResponse);
router.post('/multi-port-test', auth, templateOnlyResponse);

module.exports = router; 