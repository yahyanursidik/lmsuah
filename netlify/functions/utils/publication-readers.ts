import { sql, type SQL } from 'drizzle-orm';
import { db } from './db.js';
import { featureRequested } from './advanced-features.js';
import type { ParsedQuery } from './contentHelper.js';
import type { PublicationLesson } from '../../../shared/program-publication.js';
import { publicPublicationLesson } from '../../../shared/publication-projection.js';

const pdfCount = () => featureRequested('privatePdf') ? sql`(select count(*) from transcript_versions tv inner join transcript_documents td on td.id = tv.document_id where td.lesson_id = l.id and tv.status = 'published')` : sql`0`;

export async function readPublishedLessonList(query: ParsedQuery) {
  const source = sql`with visible as (
    select candidate.value as entity from program_publications p inner join programs pr on pr.id = p.program_id
    cross join lateral jsonb_array_elements(p.snapshot->'lessons') candidate(value) where pr.status = 'published'
    union all
    select jsonb_build_object('id', l.id, 'programId', l.program_id, 'chapterId', l.chapter_id, 'slug', l.slug, 'title', l.title, 'sequence', l.sequence, 'date', l.date, 'description', l.description, 'status', 'published', 'materials', '[]'::jsonb, 'markers', '[]'::jsonb, 'quiz', null,
      'materialCount', (select count(*) from lesson_videos v where v.lesson_id = l.id) + (select count(*) from lesson_attachments a where a.lesson_id = l.id) + ${pdfCount()},
      'hasQuiz', exists(select 1 from quizzes q where q.lesson_id = l.id and q.is_published = true))
    from lessons l inner join programs pr on pr.id = l.program_id left join program_publications p on p.program_id = pr.id
    where pr.status = 'published' and l.status = 'published' and p.program_id is null
  )`;
  const conditions: SQL[] = [sql`true`];
  for (const field of ['programId', 'chapterId', 'slug']) if (query.filters[field]) conditions.push(sql`entity->>${field} = ${query.filters[field]}`);
  if (query.filters.title) conditions.push(sql`entity->>'title' ilike ${`%${query.filters.title}%`}`);
  const where = sql.join(conditions, sql` and `);
  const sort = query.sortField === 'title' ? sql`entity->>'title'` : query.sortField === 'date' ? sql`entity->>'date'` : sql`(entity->>'sequence')::integer`;
  const direction = query.sortOrder === 'desc' ? sql`desc` : sql`asc`;
  const [items, totals] = await Promise.all([
    db.execute(sql`${source} select entity from visible where ${where} order by ${sort} ${direction}, entity->>'id' asc limit ${query.limit} offset ${query.offset}`),
    db.execute(sql`${source} select count(*) as total from visible where ${where}`),
  ]);
  return { items: items.rows.map(row => publicPublicationLesson(row.entity as PublicationLesson)), total: Number(totals.rows[0]?.total || 0), page: query.page, limit: query.limit };
}

const collectionSources = {
  series: sql`select jsonb_build_object('id', s.id, 'programId', s.program_id, 'slug', s.slug, 'title', s.title, 'description', s.description, 'sequence', s.sequence, 'status', s.status, 'createdAt', s.created_at, 'updatedAt', s.updated_at,
    'books', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'title', b.title, 'slug', b.slug, 'author', b.author, 'status', b.status) order by sb.sequence) from series_books sb inner join books b on b.id = sb.book_id where sb.series_id = s.id and b.status = 'published'), '[]'::jsonb)) as entity
    from series s inner join programs pr on pr.id = s.program_id left join program_publications p on p.program_id = pr.id where pr.status = 'published' and s.status = 'published' and p.program_id is null`,
  chapters: sql`select jsonb_build_object('id', c.id, 'programId', c.program_id, 'bookId', c.book_id, 'title', c.title, 'sequence', c.sequence, 'createdAt', c.created_at, 'updatedAt', c.updated_at) as entity
    from chapters c left join programs pr on pr.id = c.program_id left join program_publications p on p.program_id = pr.id
    where (c.program_id is not null and pr.status = 'published' and p.program_id is null)
    or (c.program_id is null and exists(select 1 from books b where b.id = c.book_id and b.status = 'published'))`,
};
export async function readPublishedCollection(kind: 'chapters' | 'series', query: ParsedQuery, resourceId?: string) {
  const source = sql`with visible as (
    select candidate.value || jsonb_build_object('createdAt', p.published_at, 'updatedAt', p.published_at) as entity
    from program_publications p inner join programs pr on pr.id = p.program_id
    cross join lateral jsonb_array_elements(p.snapshot->${kind}) candidate(value)
    where pr.status = 'published' ${kind === 'series' ? sql`and candidate.value->>'status' = 'published'` : sql``}
    union all ${collectionSources[kind]}
  )`;
  const conditions: SQL[] = [sql`true`];
  for (const field of ['programId', 'bookId', 'slug', 'sequence']) if (query.filters[field]) conditions.push(sql`entity->>${field} = ${query.filters[field]}`);
  if (query.filters.title) conditions.push(sql`entity->>'title' ilike ${`%${query.filters.title}%`}`);
  if (resourceId) conditions.push(kind === 'series' ? sql`(entity->>'id' = ${resourceId} or entity->>'slug' = ${resourceId})` : sql`entity->>'id' = ${resourceId}`);
  const where = sql.join(conditions, sql` and `);
  const sort = query.sortField === 'title' ? sql`entity->>'title'` : query.sortField === 'createdAt' || query.sortField === 'updatedAt' ? sql`entity->>${query.sortField}` : sql`(entity->>'sequence')::integer`;
  const direction = query.sortOrder === 'desc' ? sql`desc` : sql`asc`;
  const [items, totals] = await Promise.all([
    db.execute(sql`${source} select entity from visible where ${where} order by ${sort} ${direction}, entity->>'id' asc limit ${query.limit} offset ${query.offset}`),
    db.execute(sql`${source} select count(*) as total from visible where ${where}`),
  ]);
  const projected = items.rows.map(row => {
    const entity = row.entity as { id: string; programId: string | null; bookId?: string | null; slug?: string; title: string; description?: string | null; sequence: number; status?: string; createdAt?: string; updatedAt?: string; books?: Array<{ id: string; title: string; slug: string; author: string | null; status: string }> };
    return { id: entity.id, programId: entity.programId, bookId: entity.bookId, slug: entity.slug, title: entity.title, description: entity.description, sequence: entity.sequence, status: entity.status, createdAt: entity.createdAt, updatedAt: entity.updatedAt,
      ...(kind === 'series' ? { books: (entity.books || []).filter(book => book.status === 'published').map(book => ({ id: book.id, title: book.title, slug: book.slug, author: book.author, status: book.status })) } : {}) };
  });
  return { items: projected, total: Number(totals.rows[0]?.total || 0), page: query.page, limit: query.limit };
}
