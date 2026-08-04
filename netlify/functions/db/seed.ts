import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import * as schema from './schema/index.js';

config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const roles = [
  { id: 'guest', name: 'Guest', description: 'Dapat melihat konten publik' },
  { id: 'participant', name: 'Participant', description: 'Peserta program' },
  { id: 'kajian_operator', name: 'Kajian Operator', description: 'Mengelola jadwal dan lokasi' },
  { id: 'content_contributor', name: 'Content Contributor', description: 'Mengelola konten dasar' },
  { id: 'transcript_uploader', name: 'Transcript Uploader', description: 'Mengunggah transkrip PDF' },
  { id: 'quiz_author', name: 'Quiz Author', description: 'Membuat kuis' },
  { id: 'scientific_reviewer', name: 'Scientific Reviewer', description: 'Memeriksa konten keilmuan' },
  { id: 'publisher', name: 'Publisher', description: 'Memublikasikan konten' },
  { id: 'support', name: 'Support', description: 'Membantu pengguna' },
  { id: 'analyst', name: 'Analyst', description: 'Melihat data agregat' },
  { id: 'administrator', name: 'Administrator', description: 'Mengelola sistem dan audit' },
  { id: 'super_administrator', name: 'Super Administrator', description: 'Mengelola sistem kritis' }
];

const permissions = [
  // Program
  'program.read', 'program.create', 'program.update', 'program.review', 'program.publish', 'program.archive',
  // Lesson
  'lesson.read', 'lesson.create', 'lesson.update', 'lesson.review', 'lesson.publish', 'lesson.archive',
  // Schedule & Venue
  'schedule.read', 'schedule.manage', 'venue.read', 'venue.manage',
  // Transcript
  'transcript.read', 'transcript.upload', 'transcript.update', 'transcript.review', 'transcript.publish', 'transcript.archive',
  // Quiz
  'quiz.read', 'quiz.create', 'quiz.update', 'quiz.review', 'quiz.publish',
  // User
  'user.read', 'user.support', 'user.suspend',
  // Governance
  'role.assign', 'permission.manage', 'audit.read', 'settings.manage', 'analytics.read'
];

async function seed() {
  console.log('🌱 Memulai proses seeding RBAC...');
  try {
    for (const role of roles) {
      await db.insert(schema.roles).values(role).onConflictDoNothing();
      console.log(`✅ Role ${role.name} berhasil dimuat.`);
    }

    for (const perm of permissions) {
      await db.insert(schema.permissions).values({ id: perm, name: perm }).onConflictDoNothing();
      console.log(`✅ Permission ${perm} berhasil dimuat.`);
    }

    // Default mapping (Simplified, can be customized later in admin UI)
    // Administrator gets all permissions
    for (const perm of permissions) {
      await db.insert(schema.rolePermissions).values({
        roleId: 'administrator',
        permissionId: perm
      }).onConflictDoNothing();
    }
    
    // Super Administrator gets all permissions
    for (const perm of permissions) {
      await db.insert(schema.rolePermissions).values({
        roleId: 'super_administrator',
        permissionId: perm
      }).onConflictDoNothing();
    }
    
    console.log('✅ Seeding role_permissions selesai.');

  } catch (err) {
    console.error('❌ Terjadi kesalahan saat seeding:', err);
  }
}

seed().then(() => process.exit(0));
