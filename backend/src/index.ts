import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDb, closeDb, getDb } from './db/init.js';
import { createSchema, ensureIndexes } from './db/schema.js';
import { hashPassword } from './utils/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_COLLEGE_ID, DEFAULT_COLLEGE_NAME } from './utils/tenant.js';
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

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// Ensure multi-college baseline exists in legacy SQLite databases.
async function migrateCollegeTenancy(): Promise<void> {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);
  `);

  const defaultCollegeCode = (DEFAULT_COLLEGE_ID || 'DEFAULT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .slice(0, 20) || 'DEFAULT';

  await db.run(
    'INSERT OR IGNORE INTO colleges (id, name, code, is_active) VALUES (?, ?, ?, 1)',
    [DEFAULT_COLLEGE_ID, DEFAULT_COLLEGE_NAME, defaultCollegeCode]
  );

  for (const table of TENANT_SCOPED_TABLES) {
    const cols: any[] = await db.all(`PRAGMA table_info('${table}')`);
    const hasCollegeCol = cols.some((c: any) => c.name === 'college_id');

    if (!hasCollegeCol) {
      console.log(`⏩  Adding college_id column to ${table} table...`);
      await db.exec(
        `ALTER TABLE ${table} ADD COLUMN college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}'`
      );
    }

    await db.run(
      `UPDATE ${table} SET college_id = ? WHERE college_id IS NULL OR TRIM(college_id) = ''`,
      [DEFAULT_COLLEGE_ID]
    );

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_college_id ON ${table}(college_id)`);
  }
}

async function ensureTableColumns(
  tableName: string,
  columns: Array<{ name: string; definition: string; backfillSql?: string }>
): Promise<void> {
  const db = await getDb();
  const existingColumns: any[] = await db.all(`PRAGMA table_info('${tableName}')`);
  const existingNames = new Set(existingColumns.map((column: any) => column.name));

  for (const column of columns) {
    if (!existingNames.has(column.name)) {
      console.log(`⏩  Adding ${column.name} column to ${tableName} table...`);
      await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`);
    }

    if (column.backfillSql) {
      await db.exec(column.backfillSql);
    }
  }
}

async function migrateExtendedSchema(): Promise<void> {
  await ensureTableColumns('students', [
    { name: 'date_of_birth', definition: 'TEXT' },
    { name: 'contact_number', definition: 'TEXT' },
    { name: 'address', definition: 'TEXT' },
    { name: 'guardian_name', definition: 'TEXT' },
    { name: 'guardian_contact', definition: 'TEXT' },
    { name: 'emergency_contact', definition: 'TEXT' },
    { name: 'medical_notes', definition: 'TEXT' },
    { name: 'room_id', definition: 'TEXT' },
    { name: 'bed_id', definition: 'TEXT' },
    { name: 'profile_image', definition: 'TEXT' },
    { name: 'parent_image_1', definition: 'TEXT' },
    { name: 'parent_image_2', definition: 'TEXT' },
    { name: 'joining_date', definition: 'TEXT' },
    {
      name: 'current_status',
      definition: "TEXT DEFAULT 'present'",
      backfillSql: "UPDATE students SET current_status = 'present' WHERE current_status IS NULL OR TRIM(current_status) = ''",
    },
  ]);

  await ensureTableColumns('leave_requests', [
    { name: 'emergency_contact', definition: 'TEXT' },
    { name: 'approval_code', definition: 'TEXT' },
    {
      name: 'parent_approval_status',
      definition: "TEXT DEFAULT 'pending'",
      backfillSql: "UPDATE leave_requests SET parent_approval_status = 'pending' WHERE parent_approval_status IS NULL OR TRIM(parent_approval_status) = ''",
    },
    {
      name: 'parent_call_verified',
      definition: 'INTEGER DEFAULT 0',
      backfillSql: 'UPDATE leave_requests SET parent_call_verified = 0 WHERE parent_call_verified IS NULL',
    },
    { name: 'parent_call_timestamp', definition: 'TEXT' },
    { name: 'parent_call_notes', definition: 'TEXT' },
    { name: 'parent_call_by', definition: 'TEXT' },
  ]);
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
    const existing = await db.get(
      'SELECT id FROM users WHERE email = ? AND college_id = ?',
      [acct.email, DEFAULT_COLLEGE_ID]
    );
    if (!existing) {
      const hashed = await hashPassword(acct.password);
      await db.run(
        'INSERT INTO users (id, college_id, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [uuidv4(), DEFAULT_COLLEGE_ID, acct.email, hashed, acct.name, acct.role]
      );
      console.log(`  ✅  Seeded ${acct.role}: ${acct.email} (${DEFAULT_COLLEGE_ID})`);
    }
  }
}

async function seedDefaultRooms(): Promise<void> {
  const db = await getDb();
  const inventory = getDefaultRoomInventory();
  let createdCount = 0;

  for (const room of inventory) {
    let roomRecord = await db.get(
      `SELECT id, total_beds
       FROM rooms
       WHERE college_id = ? AND number = ?`,
      [DEFAULT_COLLEGE_ID, room.number]
    );

    if (!roomRecord) {
      const roomId = uuidv4();
      await db.run(
        `INSERT INTO rooms (
          id, college_id, number, floor, capacity, type, gender, status, occupied_beds, total_beds, last_cleaned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'available', 0, ?, datetime('now'))`,
        [roomId, DEFAULT_COLLEGE_ID, room.number, room.floor, room.capacity, room.type, room.gender, room.capacity]
      );
      roomRecord = { id: roomId, total_beds: room.capacity };
      createdCount += 1;
    }

    const existingBeds: Array<{ number: number }> = await db.all(
      'SELECT number FROM beds WHERE room_id = ? AND college_id = ?',
      [roomRecord.id, DEFAULT_COLLEGE_ID]
    );
    const existingBedNumbers = new Set(existingBeds.map((bed) => Number(bed.number)));

    for (let bedNumber = 1; bedNumber <= room.capacity; bedNumber += 1) {
      if (!existingBedNumbers.has(bedNumber)) {
        await db.run(
          'INSERT INTO beds (id, college_id, room_id, number, status) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), DEFAULT_COLLEGE_ID, roomRecord.id, bedNumber, 'available']
        );
      }
    }

    const amenityRows: Array<{ amenity: string }> = await db.all(
      'SELECT amenity FROM room_amenities WHERE room_id = ?',
      [roomRecord.id]
    );
    const existingAmenities = new Set(amenityRows.map((entry) => entry.amenity));

    for (const amenity of DEFAULT_ROOM_AMENITIES) {
      if (!existingAmenities.has(amenity)) {
        await db.run(
          'INSERT INTO room_amenities (id, room_id, amenity) VALUES (?, ?, ?)',
          [uuidv4(), roomRecord.id, amenity]
        );
      }
    }
  }

  if (createdCount > 0) {
    console.log(`  ✅  Seeded ${createdCount} missing rooms for ${DEFAULT_COLLEGE_ID}`);
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

    // Ensure college_id baseline exists across tables.
    await migrateCollegeTenancy();

    // Ensure newer non-tenant columns exist on legacy databases.
    await migrateExtendedSchema();

    // Create indexes only after legacy tables have college_id.
    await ensureIndexes(db);

    // Seed default accounts
    console.log('Seeding default accounts...');
    await seedDefaultAccounts();

    console.log('Seeding default room inventory...');
    await seedDefaultRooms();

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
