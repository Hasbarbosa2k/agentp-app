const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  streamOnboardingUpdates,
  getDetailedLogs,
  getRealtimeStats,
  getActiveConnections
} = require('../controllers/onboardingRealtimeController');

// Middleware de autenticação para todas as rotas
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Onboarding Realtime
 *   description: Endpoints para atualizações em tempo real do onboarding
 */

// Rotas de streaming em tempo real
router.get('/:systemId/stream', streamOnboardingUpdates);
router.get('/:systemId/logs', getDetailedLogs);
router.get('/:systemId/stats', getRealtimeStats);

// Rotas administrativas
router.get('/admin/connections', admin, getActiveConnections);

module.exports = router; 