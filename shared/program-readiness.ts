export interface ReadinessLesson { status: string; materialCount?: number; hasQuiz?: boolean }
export function programReadiness(program: { title?: string; description?: string | null }, lessons: ReadinessLesson[]) {
  const published = lessons.filter(lesson => lesson.status === 'published');
  return [
    { key: 'information', label: 'Judul dan deskripsi program terisi', ready: Boolean(program.title?.trim() && program.description?.trim()) },
    { key: 'meetings', label: 'Minimal satu pertemuan sudah terbit', ready: published.length > 0 },
    { key: 'materials', label: 'Semua pertemuan terbit memiliki materi', ready: published.length > 0 && published.every(lesson => (lesson.materialCount || 0) > 0) },
  ];
}
