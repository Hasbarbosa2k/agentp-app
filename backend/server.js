// Validar variáveis de ambiente antes de tudo
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const connectDB = require('./config/database');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const systemRoutes = require('./routes/systems');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');
const onboardingRoutes = require('./routes/onboarding');
const onboardingExecutionRoutes = require('./routes/onboardingExecution');
const onboardingStepsRoutes = require('./routes/onboardingSteps');
const onboardingRealtimeRoutes = require('./routes/onboardingRealtime');
const templateRoutes = require('./routes/templates');
const sshLogsRoutes = require('./routes/sshLogs');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');
const issueHelperRoutes = require('./routes/issueHelper');
const monitoringService = require('./services/monitoringService');
const diagnosticsRoutes = require('./routes/diagnostics');
const uiTestRunsRoutes = require('./routes/uiTestRuns');
const uiTestsRoutes = require('./routes/uiTests');
const alertsRoutes = require('./routes/alerts');
const documentationRoutes = require('./routes/documentation');
const groupsRoutes = require('./routes/groups');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Desativar ETag para evitar 304 Not Modified em GETs
app.set('etag', false);

// Rate limiting - Ativado apenas em produção
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente mais tarde.'
  },
  skip: () => process.env.NODE_ENV === 'development' // Skip em dev
});

// Rate limiting mais restrito para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limite de 10 tentativas de auth por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.'
  },
  skip: () => process.env.NODE_ENV === 'development'
});

app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Backend (self)
  'http://localhost:5173',  // Frontend (Vite dev)
  'http://localhost:4173',  // Frontend (Vite preview)
  'http://localhost:3001',  // AI Service
  'http://localhost:3002',  // UI Test Service
  process.env.FRONTEND_URL  // Production frontend
].filter(Boolean); // Remove undefined values

// Permitir acesso externo em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowExternalAccess = process.env.ALLOW_EXTERNAL_ACCESS === 'true' || isDevelopment;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento ou se ALLOW_EXTERNAL_ACCESS=true, permitir todos
    if (allowExternalAccess) {
      return callback(null, true);
    }
    
    // Em produção, verificar lista de origens permitidas
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Verifica se o servidor está a funcionar correctamente
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor a funcionar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Servidor a funcionar correctamente
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor a funcionar correctamente',
    timestamp: new Date().toISOString()
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API de Autenticação - Documentação',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));

// Routes with /api prefix (new standard)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/onboarding-execution', onboardingExecutionRoutes);
app.use('/api/onboarding-steps', onboardingStepsRoutes);
app.use('/api/onboarding/realtime', onboardingRealtimeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ssh-logs', sshLogsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/issue-helper', issueHelperRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
// NOTA: uiTestRunsRoutes deve vir ANTES de uiTestsRoutes porque /run é mais específico que /:uiTestId
app.use('/api/ui-tests/run', uiTestRunsRoutes);
app.use('/api/ui-tests', uiTestsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/documentation', documentationRoutes);
app.use('/api/groups', groupsRoutes);

// NOTA: Rotas legacy removidas - usar apenas /api/* prefix
// Se necessário compatibilidade, descomentar as rotas abaixo:
// app.use('/auth', authRoutes);
// app.use('/systems', systemRoutes);
// etc.

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado'
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor a correr em http://${HOST}:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  // Iniciar monitorização em background
  if (process.env.MONITORING_ENABLED !== 'false') {
    try {
      monitoringService.start();
    } catch (err) {
      console.warn('⚠️ Falha ao iniciar MonitoringService:', err.message);
    }
  } else {
    console.log('⏸️ MonitoringService desativado por configuração (MONITORING_ENABLED=false)');
  }
}); 