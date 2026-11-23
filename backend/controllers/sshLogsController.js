const sshLogger = require('../utils/sshLogger');
const { logRequest } = require('../middleware/auth');

/**
 * Obter logs SSH recentes
 * @swagger
 * /ssh-logs:
 *   get:
 *     summary: Obter logs SSH recentes
 *     tags: [SSH Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de logs a retornar
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [command, connection, all]
 *           default: all
 *         description: Tipo de log a filtrar
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, error, all]
 *           default: all
 *         description: Status dos logs a filtrar
 *     responses:
 *       200:
 *         description: Logs SSH obtidos com sucesso
 *       401:
 *         description: Não autorizado
 */
const getSSHLogs = async (req, res) => {
  try {
    logRequest(req, res, () => {});

    const { limit = 100, type = 'all', status = 'all' } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Obter logs
    let logs = sshLogger.getRecentLogs(parseInt(limit));

    // Filtrar por tipo
    if (type !== 'all') {
      logs = logs.filter(log => {
        if (type === 'command') {
          return !log.type || log.type !== 'connection';
        } else if (type === 'connection') {
          return log.type === 'connection';
        }
        return true;
      });
    }

    // Filtrar por status
    if (status !== 'all') {
      logs = logs.filter(log => log.status === status);
    }

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        filters: {
          type,
          status,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter logs SSH:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs SSH',
      error: error.message
    });
  }
};

/**
 * Limpar logs SSH
 * @swagger
 * /ssh-logs:
 *   delete:
 *     summary: Limpar todos os logs SSH
 *     tags: [SSH Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs SSH limpos com sucesso
 *       401:
 *         description: Não autorizado
 */
const clearSSHLogs = async (req, res) => {
  try {
    logRequest(req, res, () => {});

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se é admin (opcional)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem limpar logs SSH'
      });
    }

    sshLogger.clearLogs();

    res.json({
      success: true,
      message: 'Logs SSH limpos com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao limpar logs SSH:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar logs SSH',
      error: error.message
    });
  }
};

/**
 * Obter estatísticas dos logs SSH
 * @swagger
 * /ssh-logs/stats:
 *   get:
 *     summary: Obter estatísticas dos logs SSH
 *     tags: [SSH Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 */
const getSSHLogsStats = async (req, res) => {
  try {
    logRequest(req, res, () => {});

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const logs = sshLogger.getRecentLogs(1000); // Últimos 1000 logs para estatísticas

    // Calcular estatísticas
    const stats = {
      total: logs.length,
      byType: {
        command: logs.filter(log => !log.type || log.type !== 'connection').length,
        connection: logs.filter(log => log.type === 'connection').length
      },
      byStatus: {
        success: logs.filter(log => log.status === 'success').length,
        failed: logs.filter(log => log.status === 'failed').length,
        error: logs.filter(log => log.status === 'error').length
      },
      byUser: {},
      bySSHUser: {},
      recentActivity: logs.slice(0, 10).map(log => ({
        timestamp: log.timestamp,
        type: log.type || 'command',
        status: log.status,
        frontendUser: log.frontendUser,
        sshUser: log.sshUser,
        command: log.command || 'N/A'
      }))
    };

    // Estatísticas por usuário do frontend
    logs.forEach(log => {
      const user = log.frontendUser || 'unknown';
      stats.byUser[user] = (stats.byUser[user] || 0) + 1;
    });

    // Estatísticas por usuário SSH
    logs.forEach(log => {
      const sshUser = log.sshUser || 'unknown';
      stats.bySSHUser[sshUser] = (stats.bySSHUser[sshUser] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas dos logs SSH:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas dos logs SSH',
      error: error.message
    });
  }
};

module.exports = {
  getSSHLogs,
  clearSSHLogs,
  getSSHLogsStats
}; 