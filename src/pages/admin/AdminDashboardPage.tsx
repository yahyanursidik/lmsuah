import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextMuted } from '@/components/ui/Typography';
import { BookOpen, FileText, CheckCircle2, AlertTriangle, Plus, Eye, Edit3 } from 'lucide-react';

export function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Badge variant="emerald">Refine Core REST Provider</Badge>
          <h1 className="text-2xl font-bold text-white mt-1">Dasbor Admin & Pengelolaan Konten</h1>
          <p className="text-xs text-slate-400">Ringkasan status publikasi, review transkrip PDF, dan evaluasi kuis YTS.</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="primary" className="bg-emerald-700 hover:bg-emerald-800">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Pertemuan Baru
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-slate-950 border-slate-800 text-slate-100 p-4">
          <div className="flex items-center justify-between">
            <TextMuted className="text-slate-400">Program Aktif</TextMuted>
            <BookOpen className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">6 Program</p>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100 p-4">
          <div className="flex items-center justify-between">
            <TextMuted className="text-slate-400">Transkrip Published</TextMuted>
            <FileText className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">48 File PDF</p>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100 p-4">
          <div className="flex items-center justify-between">
            <TextMuted className="text-slate-400">Menunggu Review</TextMuted>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">3 Draft</p>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-slate-100 p-4">
          <div className="flex items-center justify-between">
            <TextMuted className="text-slate-400">Peserta Terdaftar</TextMuted>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">1,240 Jamaah</p>
        </Card>
      </div>

      {/* Admin Content Table (Refine Mock Workspace) */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Antrean Review & Publikasi Konten</CardTitle>
              <CardDescription className="text-slate-400">Status verifikasi ilmiah ringkasan, video timestamp, dan PDF Netlify Blobs.</CardDescription>
            </div>
            <Badge variant="outline" className="text-slate-300 border-slate-700">Refine dataProvider: /api/review_requests</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="p-4">Pertemuan / Materi</th>
                <th className="p-4">Program</th>
                <th className="p-4">Pengunggah</th>
                <th className="p-4">Status Review</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-900/50">
                <td className="p-4 font-semibold text-white">Pertemuan #14: Bab Syafa'at</td>
                <td className="p-4">Syarah Kitab At-Tauhid</td>
                <td className="p-4">Tim Transkrip YTS</td>
                <td className="p-4"><Badge variant="warning" dot>In Review</Badge></td>
                <td className="p-4 text-right space-x-2">
                  <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white"><Eye className="h-3.5 w-3.5 mr-1" /> Pratinjau</Button>
                  <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 hover:bg-emerald-950"><Edit3 className="h-3.5 w-3.5 mr-1" /> Disetujui</Button>
                </td>
              </tr>

              <tr className="hover:bg-slate-900/50">
                <td className="p-4 font-semibold text-white">Pertemuan #09: Pembatal Keislaman</td>
                <td className="p-4">Kitab Al-I'tisham</td>
                <td className="p-4">Ustadz Reviewer</td>
                <td className="p-4"><Badge variant="success" dot>Published</Badge></td>
                <td className="p-4 text-right space-x-2">
                  <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white"><Eye className="h-3.5 w-3.5 mr-1" /> Detail</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
