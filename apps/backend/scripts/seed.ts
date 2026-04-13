import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import * as schema from '../src/core/db/schema';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'a_signal',
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('Starting seed...');

  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = '123456';

    const existingAdmin = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists, skipping seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await db.insert(schema.users).values({
      nickname: 'admin',
      email: adminEmail,
      password: hashedPassword,
    });

    console.log('Admin user created successfully');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
