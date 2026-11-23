import express from 'express';
import dotenv from 'dotenv';
import router from './routes';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './docs/swagger';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Backend
  'http://localhost:5173',  // Frontend (Vite)
  'http://localhost:4173',  // Vite preview
  'http://localhost:3002',  // UI Test service
  process.env.FRONTEND_URL, // Production frontend
].filter(Boolean);

// Permitir acesso externo em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowExternalAccess = process.env.ALLOW_EXTERNAL_ACCESS === 'true' || isDevelopment;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowExternalAccess || !origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '2mb' }));

// Plain text request/response logging with timestamps
app.use((req, res, next) => {
  const start = Date.now();
  const ts = new Date(start).toISOString();
  const truncate = (text: string, max = 8000) => (text.length > max ? `${text.slice(0, max)}...[truncated ${text.length - max} bytes]` : text);
  const headersText = Object.entries(req.headers)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join('; ');
  let bodyText = '';
  try {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') bodyText = req.body;
      else bodyText = JSON.stringify(req.body);
    }
  } catch {
    bodyText = '[unserializable body]';
  }
  const queryText = (() => {
    try { return JSON.stringify(req.query); } catch { return '[unserializable query]'; }
  })();
  // eslint-disable-next-line no-console
  console.log(`[${ts}] REQUEST ${req.method} ${req.originalUrl}\nheaders: ${headersText}\nquery: ${queryText}\nbody: ${truncate(bodyText)}`);
  res.on('finish', () => {
    const end = Date.now();
    const tsEnd = new Date(end).toISOString();
    // eslint-disable-next-line no-console
    console.log(`[${tsEnd}] RESPONSE ${req.method} ${req.originalUrl} ${res.statusCode} (${end - start}ms)`);
  });
  next();
});

const port = Number(process.env.PORT || 3001);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const spec = buildOpenApiSpec();
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

app.use('/api', router);

const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://${host}:${port}`);
  console.log(`[docs] Swagger UI at http://${host}:${port}/docs`);
});