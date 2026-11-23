const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/issueHelperController');

// Criar nova issue para um sistema (user autenticado)
router.post('/', authenticate, ctrl.createIssueMessage);

// Colocar rotas mais específicas antes da rota dinâmica :id

// Listar issues do utilizador autenticado
router.get('/me', authenticate, (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, ctrl.listIssuesByUser);

// Listar issues por sistema
router.get('/system/:systemId', authenticate, (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, ctrl.listIssuesBySystem);

// Registar resposta de IA para uma issue específica
router.post('/:id/ai-response', authenticate, ctrl.setAIResponse);

// Chamar IA para resolver issue (via backend) e gravar
router.post('/:id/solve', authenticate, ctrl.solveIssueWithAI);

// Obter issue por id (depois das rotas específicas)
router.get('/:id', authenticate, ctrl.getIssueMessageById);

module.exports = router;

