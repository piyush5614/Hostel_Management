import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createSuperAdminAuth } from './middleware/superAdminAuth.js';
import { collegesRouter } from './routes/colleges.js';
import { governanceRouter } from './routes/governance.js';
import { healthRouter } from './routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const config = loadConfig();
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.use(express.static(publicDir));

app.use('/api/health', healthRouter);
app.use('/api', createSuperAdminAuth(config));
app.use('/api/colleges', collegesRouter);
app.use('/api/governance', governanceRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[control-center] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`[control-center] running at http://localhost:${config.port}`);
});
