const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { healthCheck, uiTestPlan } = require('../services/aiClient');
const { summarizeSystem } = require('../controllers/systemSummaryController');

// Health do servidor de IA via backend
router.get('/health', authenticate, async (req, res) => {
  try {
    const data = await healthCheck();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(502).json({ success: false, message: 'AI server unreachable', error: err.message });
  }
});

module.exports = router; 
// System summary by raw outputs
router.post('/system/summary', summarizeSystem);

// Geração direta de plano de testes UI (compat)
router.post(
  '/generate-test-plan',
  authenticate,
  [
    body('instruction').isString().notEmpty().withMessage('instruction é obrigatório'),
    body('system').isString().notEmpty().withMessage('system é obrigatório'),
    body('testType').optional().isString().withMessage('testType deve ser uma string'),
    body('options').optional().isObject().withMessage('options deve ser um objeto')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg }))
      });
    }

    try {
      const { instruction, system, testType, options } = req.body;
      const response = await uiTestPlan({ 
        instruction, 
        system, 
        testType: testType || 'ui',
        options: options || {} 
      });
      return res.json({ success: true, data: response });
    } catch (err) {
      return res.status(502).json({ success: false, message: 'AI server error', error: err.message });
    }
  }
);

