import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

const client = createClient({ url, authToken });

async function main() {
  const hashedPassword = await bcrypt.hash('Demo@1234', 10);
  const id = 'demo-user-001';
  const now = new Date().toISOString();

  // Check if demo user already exists
  const existing = await client.execute({
    sql: 'SELECT id FROM User WHERE email = ?',
    args: ['demo@datasync.app'],
  });

  if (existing.rows.length > 0) {
    console.log('Demo user already exists, updating password...');
    await client.execute({
      sql: 'UPDATE User SET password = ?, name = ? WHERE email = ?',
      args: [hashedPassword, 'Demo User', 'demo@datasync.app'],
    });
    console.log('✅ Demo user password updated!');
  } else {
    console.log('Creating demo user...');
    await client.execute({
      sql: 'INSERT INTO User (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, 'Demo User', 'demo@datasync.app', hashedPassword, now, now],
    });
    console.log('✅ Demo user created!');
  }

  await client.close();
}

main().catch(console.error);
