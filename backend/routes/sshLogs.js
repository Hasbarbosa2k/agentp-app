const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const sshLogsController = require('../controllers/sshLogsController');

/**
 * @swagger
 * tags:
 *   name: SSH Logs
 *   description: Endpoints para gerenciar logs SSH
 */

// Obter logs SSH
router.get('/', auth, sshLogsController.getSSHLogs);

// Obter estatísticas dos logs SSH
router.get('/stats', auth, sshLogsController.getSSHLogsStats);

// Limpar logs SSH (apenas admin)
router.delete('/', auth, sshLogsController.clearSSHLogs);

module.exports = router; 