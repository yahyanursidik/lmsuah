// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

describe('Upgrade from the previously released schema', () => {
  it('preserves legacy users, enrollments, progress and assessment history; adds real uniqueness', async () => {
    const database = new PGlite();
    try {
      const directory = 'netlify/functions/db/migrations';
      const files = readdirSync(directory).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
      for (const file of files.filter(file => Number(file.slice(0, 4)) < 10)) await database.exec(readFileSync(`${directory}/${file}`, 'utf8'));
      const program = randomUUID(); const lesson = randomUUID(); const quiz = randomUUID(); const attempt = randomUUID();
      await database.exec("insert into \"user\" (id,name,email,email_verified,created_at,updated_at) values ('legacy','Legacy','legacy@example.test',true,now(),now())");
      await database.query("insert into programs(id,slug,title,status) values ($1,'legacy','Legacy','published')", [program]);
      await database.query("insert into lessons(id,program_id,slug,title,sequence,status) values ($1,$2,'legacy','Legacy',1,'published')", [lesson, program]);
      await database.query("insert into enrollments(user_id,program_id,status) values ('legacy',$1,'active')", [program]);
      await database.query("insert into lesson_progress(user_id,lesson_id,last_position_seconds,is_completed,completed_at) values ('legacy',$1,99,true,'2026-01-01')", [lesson]);
      await database.query("insert into quizzes(id,lesson_id,title,is_published) values ($1,$2,'Legacy',true)", [quiz, lesson]);
      await database.query("insert into quiz_attempts(id,quiz_id,user_id,status,score,passed) values ($1,$2,'legacy','submitted',100,true)", [attempt, quiz]);
      const before = await database.query('select row_to_json(t) as value from lesson_progress t');
      for (const file of files.filter(file => Number(file.slice(0, 4)) >= 10)) await database.exec(readFileSync(`${directory}/${file}`, 'utf8'));
      expect((await database.query('select row_to_json(t) as value from lesson_progress t')).rows).toEqual(before.rows);
      expect((await database.query('select score,passed,status from quiz_attempts where id=$1', [attempt])).rows).toEqual([{ score: 100, passed: true, status: 'submitted' }]);
      await expect(database.query("insert into enrollments(user_id,program_id) values ('legacy',$1)", [program])).rejects.toMatchObject({ code: '23505' });
      await expect(database.query("insert into lesson_progress(user_id,lesson_id) values ('legacy',$1)", [lesson])).rejects.toMatchObject({ code: '23505' });
    } finally { await database.close(); }
  }, 120000);
});
