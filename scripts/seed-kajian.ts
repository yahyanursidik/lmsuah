import { db } from '../netlify/functions/utils/db.js';
import { programs, chapters, lessons, quizzes, questions, questionOptions, user } from '../netlify/functions/db/schema/index.js';
import crypto from 'crypto';

const uuidv4 = () => crypto.randomUUID();

async function seedKajian() {
  console.log('Menyiapkan sample Kajian...');

  // 1. Dapatkan user admin (atau buat user admin otomatis jika database belum ada user)
  const allUsers = await db.select().from(user).limit(1);
  let adminUserId: string;

  if (allUsers.length === 0) {
    console.log('Belum ada user di database. Membuat user Admin default...');
    adminUserId = uuidv4();
    await db.insert(user).values({
      id: adminUserId,
      name: 'Admin System',
      email: 'admin@lms.local',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    adminUserId = allUsers[0].id;
  }

  // 2. Buat Program (Kajian)
  const programId = uuidv4();
  await db.insert(programs).values({
    id: programId,
    slug: 'syarah-kitab-at-tauhid-sample',
    title: 'Syarah Kitab At-Tauhid (Sample)',
    description: 'Kajian rutin pembahasan Kitab At-Tauhid karya Syaikh Muhammad bin Abdul Wahhab.',
    status: 'published',
    createdBy: adminUserId,
  });
  console.log(`Berhasil membuat Kajian: Syarah Kitab At-Tauhid (ID: ${programId})`);

  // 3. Buat Chapters (Tahapan/Modul)
  const chapter1Id = uuidv4();
  const chapter2Id = uuidv4();
  
  await db.insert(chapters).values([
    {
      id: chapter1Id,
      programId: programId,
      title: 'Muqaddimah & Bab 1',
      sequence: 1,
      createdBy: adminUserId,
    },
    {
      id: chapter2Id,
      programId: programId,
      title: 'Bab 2 & 3: Keutamaan Tauhid',
      sequence: 2,
      createdBy: adminUserId,
    }
  ]);
  console.log(`Berhasil membuat 2 Tahapan (Modul)`);

  // 4. Buat Lessons (Materi/Pertemuan)
  const lesson1Id = uuidv4();
  const lesson2Id = uuidv4();
  const lesson3Id = uuidv4();

  await db.insert(lessons).values([
    {
      id: lesson1Id,
      programId: programId,
      chapterId: chapter1Id,
      title: 'Pertemuan 1: Pentingnya Mempelajari Tauhid',
      slug: 'pertemuan-1-pentingnya-tauhid',
      sequence: 1,
      date: new Date().toISOString().split('T')[0],
      description: 'Pendahuluan mengenai urgensi tauhid dalam kehidupan seorang muslim.',
      status: 'published',
      createdBy: adminUserId,
    },
    {
      id: lesson2Id,
      programId: programId,
      chapterId: chapter1Id,
      title: 'Pertemuan 2: Bab 1 - Definisi Tauhid',
      slug: 'pertemuan-2-definisi-tauhid',
      sequence: 2,
      date: new Date().toISOString().split('T')[0],
      description: 'Pembahasan masuk ke Bab 1 Kitab At-Tauhid.',
      status: 'published',
      createdBy: adminUserId,
    },
    {
      id: lesson3Id,
      programId: programId,
      chapterId: chapter2Id,
      title: 'Pertemuan 3: Keutamaan Tauhid',
      slug: 'pertemuan-3-keutamaan-tauhid',
      sequence: 1,
      date: new Date().toISOString().split('T')[0],
      description: 'Pembahasan Bab 2 Kitab At-Tauhid.',
      status: 'published',
      createdBy: adminUserId,
    }
  ]);
  console.log(`Berhasil membuat 3 Materi (Lesson)`);

  // 5. Buat Kuis/Ujian di Modul 1
  const quizLessonId = uuidv4();
  
  await db.insert(lessons).values({
    id: quizLessonId,
    programId: programId,
    chapterId: chapter1Id,
    title: 'Kuis Evaluasi Modul 1',
    slug: 'kuis-evaluasi-modul-1',
    sequence: 3,
    status: 'published',
    createdBy: adminUserId,
  });

  const quizId = uuidv4();
  await db.insert(quizzes).values({
    id: quizId,
    lessonId: quizLessonId,
    title: 'Evaluasi Pemahaman Muqaddimah & Bab 1',
    description: 'Kuis pilihan ganda untuk menguji pemahaman Anda pada modul pertama.',
    passingScore: 70,
    maxAttempts: 3,
    isPublished: true,
    createdBy: adminUserId,
  });

  const question1Id = uuidv4();
  await db.insert(questions).values({
    id: question1Id,
    quizId: quizId,
    type: 'multiple_choice',
    text: 'Apa hukum mempelajari ilmu tauhid?',
    points: 10,
    sequence: 1,
  });

  await db.insert(questionOptions).values([
    {
      id: uuidv4(),
      questionId: question1Id,
      text: 'Fardhu Kifayah',
      isCorrect: false,
      sequence: 1,
    },
    {
      id: uuidv4(),
      questionId: question1Id,
      text: 'Fardhu Ain',
      isCorrect: true,
      sequence: 2,
    },
    {
      id: uuidv4(),
      questionId: question1Id,
      text: 'Sunnah Muakkadah',
      isCorrect: false,
      sequence: 3,
    }
  ]);

  console.log(`Berhasil membuat 1 Kuis beserta soal`);
  
  console.log('----------------------------------------------------');
  console.log('✅ Sample Kajian berhasil dibuat!');
  process.exit(0);
}

seedKajian().catch(console.error);
