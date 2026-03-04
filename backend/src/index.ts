import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDb, closeDb, getDb } from './db/init.js';
import { createSchema } from './db/schema.js';
import { hashPassword } from './utils/auth.js';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import roomRoutes from './routes/rooms.js';
import emailRoutes from './routes/email.js';
import leaveRoutes from './routes/leave.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/leave-requests', leaveRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ensure 'generated_id' column exists (handles databases created before migration)
async function migrateGeneratedId(): Promise<void> {
  const db = await getDb();
  const cols: any[] = await db.all("PRAGMA table_info('users')");
  const hasCol = cols.some((c: any) => c.name === 'generated_id');
  if (!hasCol) {
    console.log('⏩  Adding generated_id column to users table...');
    await db.exec('ALTER TABLE users ADD COLUMN generated_id TEXT');
    // Create a unique index separately (SQLite doesn't support ADD COLUMN … UNIQUE)
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_generated_id ON users(generated_id)');
  }
}

// Seed default admin / warden accounts so they're always available
async function seedDefaultAccounts(): Promise<void> {
  const db = await getDb();

  const defaults = [
    { email: 'admin@tchostel.edu', password: 'admin123', name: 'System Administrator', role: 'admin' },
    { email: 'warden@tchostel.edu', password: 'warden123', name: 'Dr. Priya Sharma', role: 'warden' },
    { email: 'staff@tchostel.edu', password: 'staff123', name: 'Rajesh Kumar', role: 'staff' },
    { email: 'student@tchostel.edu', password: 'student123', name: 'Arjun Sharma', role: 'student' },
  ];

  for (const acct of defaults) {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [acct.email]);
    if (!existing) {
      const hashed = await hashPassword(acct.password);
      await db.run(
        'INSERT INTO users (id, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [uuidv4(), acct.email, hashed, acct.name, acct.role]
      );
      console.log(`  ✅  Seeded ${acct.role}: ${acct.email}`);
    }
  }
}

async function start(): Promise<void> {
  try {
    console.log('Initializing database...');
    const db = await initDb();

    console.log('Creating schema...');
    await createSchema(db);

    // Ensure generated_id column exists (backward-compat migration)
    await migrateGeneratedId();

    // Seed default accounts
    console.log('Seeding default accounts...');
    await seedDefaultAccounts();

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
