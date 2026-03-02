import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDb, closeDb } from './db/init.js';
import { createSchema } from './db/schema.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import roomRoutes from './routes/rooms.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start(): Promise<void> {
  try {
    console.log('Initializing database...');
    const db = await initDb();

    console.log('Creating schema...');
    await createSchema(db);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await closeDb();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
