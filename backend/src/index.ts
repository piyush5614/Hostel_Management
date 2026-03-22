import express from 'express';
import 'dotenv/config';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initDb, closeDb, getDb } from './db/init.js';
import { createSchema, ensureIndexes } from './db/schema.js';
import { hashPassword } from './utils/auth.js';
import { logEnvironmentValidation, getEnvironmentSummary } from './utils/env-validator.js';
import { swaggerOptions } from './utils/swagger.js';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_COLLEGE_ID, DEFAULT_COLLEGE_NAME } from './utils/tenant.js';
import { applySecurityMiddleware, loginLimiter, errorHandler } from './middleware/security.js';
import { log } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import roomRoutes from './routes/rooms.js';
import emailRoutes from './routes/email.js';
import leaveRoutes from './routes/leave.js';
import attendanceRoutes from './routes/attendance.js';
import staffRoutes from './routes/staff.js';
import maintenanceRoutes from './routes/maintenance.js';
import visitorRoutes from './routes/visitors.js';
import messageRoutes from './routes/messages.js';
import reportRoutes from './routes/reports.js';
import applicationRoutes from './routes/applications.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Apply security middleware (headers, CORS, rate limiting, logging)
applySecurityMiddleware(app);

// Parse JSON with size limit
app.use(express.json({ limit: '50mb' }));

// Setup Swagger/OpenAPI documentation
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerUrl: '/api-docs.json' }));

// Serve raw OpenAPI spec
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Apply rate limiting to auth endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler (must be last)
app.use(errorHandler);

const TENANT_SCOPED_TABLES = [
  'users',
  'students',
  'staff',
  'rooms',
  'beds',
  'attendance',
  'leave_requests',
  'maintenance_requests',
  'visitors',
  'messages',
  'reports',
  'applications',
  'staff_shifts',
  'staff_tasks',
  'daily_reports',
];

const DEFAULT_ROOM_AMENITIES = ['WiFi', 'Study Table', 'Wardrobe', 'Fan'];

function getDefaultRoomInventory() {
  const floorConfigs = [
    { floor: 1, roomCount: 35 },
    { floor: 2, roomCount: 35 },
    { floor: 3, roomCount: 36 },
  ];

  return floorConfigs.flatMap(({ floor, roomCount }) => {
    const acCount = Math.floor(roomCount / 2);

    return Array.from({ length: roomCount }, (_, index) => {
      const roomSequence = index + 1;
      return {
        number: `${floor}${roomSequence.toString().padStart(2, '0')}`,
        floor,
        capacity: 3,
        type: roomSequence <= acCount ? 'AC' : 'Non-AC',
        gender: roomSequence <= acCount ? 'male' : 'female',
      };
    });
  });
}

// Ensure 'generated_id' column exists (handles databases created before migration)
// Note: In Supabase/PostgreSQL, schema changes should be done via migrations
async function migrateGeneratedId(): Promise<void> {
  log.debug('Schema migration: generated_id column (already handled by Supabase migrations)');
  // This is now handled by database migrations, no-op for backward compatibility
}

// Ensure multi-college baseline exists in legacy SQLite databases.
// Note: In Supabase, this is handled by migrations
async function migrateCollegeTenancy(): Promise<void> {
  log.debug('Schema migration: college tenancy (already handled by Supabase migrations)');
  // This is now handled by database migrations, no-op for backward compatibility
}

// Helper function to ensure table columns exist (Supabase version)
// Note: This is now handled by migrations, but kept for reference
async function ensureTableColumns(
  tableName: string,
  columns: Array<{ name: string; definition: string; backfillSql?: string }>
): Promise<void> {
  log.debug(`Schema check: ${tableName} (handled by Supabase migrations)`);
  // All schema changes should be done via database migrations, not runtime checks
}

// Extended schema migration (handled by migrations)
async function migrateExtendedSchema(): Promise<void> {
  log.debug('Extended schema migration (already handled by Supabase migrations)');
  // This is now handled by migrations, no-op for backward compatibility
}

// Seed default admin / warden accounts so they're always available
// Note: This is now handled by database migrations
async function seedDefaultAccounts(): Promise<void> {
  log.debug('Default accounts (already seeded by Supabase migrations)');
  // Seed data is now handled by migrations, this is a no-op for compatibility
}

async function seedDefaultRooms(): Promise<void> {
  try {
    const db = await getDb();
    const inventory = getDefaultRoomInventory();

    // Check if any rooms exist for the default college
    const { data: existingRooms, error: getRoomsErr } = await db
      .from('rooms')
      .select('id')
      .eq('college_id', DEFAULT_COLLEGE_ID)
      .limit(1);

    if (getRoomsErr) {
      log.warn('Failed to check existing rooms', getRoomsErr);
      return;
    }

    // If rooms already exist, skip seeding (migrations already handled this)
    if (existingRooms && existingRooms.length > 0) {
      log.debug('Default rooms already exist, skipping seed');
      return;
    }

    log.debug('Seeding default room inventory to Supabase');
    // Note: Room seeding should be done via database migrations, not at runtime
    // Migrations handle bulk room creation with better transaction support
  } catch (err) {
    log.warn('Room seeding skipped (should be handled by migrations)', err);
  }
}

async function start(): Promise<void> {
  try {
    // Validate environment variables on startup
    log.info('Validating environment configuration...');
    logEnvironmentValidation();
    log.debug('Environment summary', getEnvironmentSummary());

    log.info('Initializing database...');
    const db = await initDb();

    log.info('Creating schema...');
    await createSchema(db);

    // Ensure generated_id column exists (backward-compat migration)
    await migrateGeneratedId();

    // Ensure college_id baseline exists across tables.
    await migrateCollegeTenancy();

    // Ensure newer non-tenant columns exist on legacy databases.
    await migrateExtendedSchema();

    // Create indexes only after legacy tables have college_id.
    await ensureIndexes(db);

    // Seed default accounts
    log.info('Seeding default accounts...');
    await seedDefaultAccounts();

    log.info('Seeding default room inventory...');
    await seedDefaultRooms();

    app.listen(PORT, () => {
      log.info(`🚀 Server running on http://localhost:${PORT}`, { 
        environment: process.env.NODE_ENV,
        apiDocs: `http://localhost:${PORT}/api-docs`,
        health: `http://localhost:${PORT}/api/health`
      });
      log.info('📚 API Documentation available at /api-docs');
    });

    process.on('SIGINT', async () => {
      log.info('Shutting down gracefully...');
      await closeDb();
      log.info('Database closed');
      process.exit(0);
    });
  } catch (error) {
    log.fatal('Failed to start server', error);
    process.exit(1);
  }
}

start();
