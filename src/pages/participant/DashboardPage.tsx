import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Heading2, TextBody, TextMuted } from '@/components/ui/Typography';
import { Play, CheckCircle2, BookOpen, ChevronRight, Bookmark, FileText } from 'lucide-react';
import { MOCK_PROGRAMS } from '@/mock/publicData';
import {
  getUserEnrollments,
  getUserLessonProgress,
  getUserNotes,
  getUserBookmarks,
  getProgramProgress,
} from '@/lib/userStore';

export function DashboardPage() {
  const { data: identity } = useGetIdentity<{ id: string; name: string }>();
  const userId = identity?.id || 'demo-peserta-1';
  const userName = identity?.name || 'Jamaah Penuntut Ilmu';

  const [enrollments, setEnrollments] = useState<ReturnType<typeof getUserEnrollments>>([]);
  const [progressList, setProgressList] = useState<ReturnType<typeof getUserLessonProgress>>([]);
  const [notes, setNotes] = useState<ReturnType<typeof getUserNotes>>([]);
  const [bookmarks, setBookmarks] = useState<ReturnType<typeof getUserBookmarks>>([]);

  useEffect(() => {
    if (userId) {
      setEnrollments(getUserEnrollments(userId));
      setProgressList(getUserLessonProgress(userId));
      setNotes(getUserNotes(userId));
      setBookmarks(getUserBookmarks(userId));
    }
  }, [userId]);

  const enrolledPrograms = MOCK_PROGRAMS.filter((p) =>
    enrollments.some((e) => e.programId === p.id && e.status === 'active')
  );

  // If user has no active enrollments yet, fallback to display all for initial demo
  const displayPrograms = enrolledPrograms.length > 0 ? enrolledPrograms : MOCK_PROGRAMS.slice(0, 2);

  const totalCompletedLessons = progressList.filter((p) => p.isCompleted).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-2xl space-y-3">
          <Badge variant="emerald" dot>Dashboard Peserta</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">Assalamu'alaikum, {userName}</h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Ahlan wa sahlan di portal pembelajaran syar'i Ustadz Abu Haidar As-Sundawy. Pantau progres murajaah dan catatan materi Anda di sini.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/programs">
              <Button variant="secondary" size="sm" className="bg-white text-emerald-950 hover:bg-stone-100 font-bold">
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> Jelajahi Program Kajian
              </Button>
            </Link>
            <Link to="/tersimpan">
              <Button size="sm" className="bg-emerald-900/60 border border-emerald-700/50 text-white hover:bg-emerald-800 font-semibold">
                <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Lihat Bookmark ({bookmarks.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-white border-stone-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Program Diikuti</p>
              <p className="text-xl font-bold text-slate-900">{enrollments.length} Kajian</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-stone-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Materi Selesai Disimak</p>
              <p className="text-xl font-bold text-slate-900">{totalCompletedLessons} Pertemuan</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-stone-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Catatan Privat Saya</p>
              <p className="text-xl font-bold text-slate-900">{notes.length} Catatan</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My Active Courses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading2 className="text-lg">Kajian Saya Berlangsung</Heading2>
          <Link to="/programs" className="text-xs font-bold text-emerald-900 hover:underline flex items-center">
            Cari Program Lainnya <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {displayPrograms.map((program) => {
            const lessons = program.lessons || [];
            const progInfo = getProgramProgress(userId, lessons);
            const firstUncompleted = lessons.find((l) =>
              !progressList.some((p) => p.lessonId === l.id && p.isCompleted)
            ) || lessons[0];

            return (
              <Card key={program.id} className="border border-stone-200 hover:border-emerald-700/40 transition-all shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="success" dot>Terdaftar</Badge>
                    <TextMuted font-mono className="text-xs font-bold text-emerald-900">
                      {progInfo.completedCount} / {lessons.length} ({progInfo.percentage}%)
                    </TextMuted>
                  </div>
                  <CardTitle className="mt-2 text-base">{program.title}</CardTitle>
                  <CardDescription>{program.instructor}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-700 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progInfo.percentage}%` }}
                    />
                  </div>
                  {firstUncompleted && (
                    <TextBody className="text-xs text-slate-700 font-medium">
                      Pertemuan Selanjutnya: #{firstUncompleted.meetingNumber} • {firstUncompleted.title}
                    </TextBody>
                  )}
                </CardContent>
                <CardFooter className="justify-between border-t border-stone-100 pt-4">
                  <div className="flex gap-2">
                    <Badge variant="outline"><Play className="h-3 w-3 mr-1" /> Video</Badge>
                    <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Ringkasan</Badge>
                  </div>
                  {firstUncompleted ? (
                    <Link to={`/lesson/${firstUncompleted.id}`}>
                      <Button size="sm" variant="primary">
                        Lanjutkan Belajar
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/programs/${program.id}`}>
                      <Button size="sm" variant="outline">
                        Detail Program
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
