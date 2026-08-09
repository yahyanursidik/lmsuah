import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';

export type ImportedParticipant = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
};

interface AdminParticipantImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (participants: ImportedParticipant[]) => Promise<void>;
  isLoading?: boolean;
}

export function AdminParticipantImportModal({ isOpen, onClose, onImport, isLoading = false }: AdminParticipantImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedParticipant[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('Harap unggah file dengan format .csv');
      return;
    }

    setFile(selected);
    setError('');
    
    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          throw new Error('File CSV kosong atau tidak memiliki data');
        }

        const headers = lines[0]!.toLowerCase().split(',').map(h => h.trim());
        const nameIdx = headers.findIndex(h => h.includes('nama') || h === 'name');
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const phoneIdx = headers.findIndex(h => h.includes('telp') || h.includes('hp') || h.includes('phone') || h.includes('wa'));
        const passIdx = headers.findIndex(h => h.includes('password') || h.includes('sandi'));

        if (nameIdx === -1 || emailIdx === -1) {
          throw new Error('Format CSV tidak valid. Harus memiliki kolom Nama dan Email.');
        }

        const parsedData: ImportedParticipant[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]!.trim();
          if (!line) continue;
          
          const columns = line.split(',').map(c => c.trim());
          const name = columns[nameIdx];
          const email = columns[emailIdx];
          
          if (!name || !email) continue;
          
          parsedData.push({
            name,
            email,
            phone: phoneIdx !== -1 ? columns[phoneIdx] : undefined,
            password: passIdx !== -1 ? columns[passIdx] : undefined,
          });
        }
        
        setPreview(parsedData);
      } catch (err: any) {
        setError(err.message || 'Gagal memproses file CSV');
        setFile(null);
        setPreview([]);
      }
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    await onImport(preview);
    setFile(null);
    setPreview([]);
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isLoading) {
      resetState();
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Nama,Email,No WhatsApp,Password\nBudi Santoso,budi@contoh.com,08123456789,rahasia123\nSiti Aminah,siti@contoh.com,,12345678";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_peserta.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Upload className="h-5 w-5 text-emerald-600" />
            Import Massal Peserta
          </h2>
          <button 
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {!file && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">Unggah file CSV</h3>
                <p className="mt-1 text-xs text-slate-500">Pilih file CSV yang berisi data peserta untuk diimport.</p>
                <div className="mt-5">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Pilih File CSV
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Butuh template?</h4>
                  <p className="text-xs text-slate-500">Gunakan format tabel yang sesuai agar import berhasil.</p>
                </div>
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" /> Template CSV
                </button>
              </div>
            </div>
          )}

          {file && preview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">File berhasil diproses</h4>
                    <p className="text-xs text-emerald-700">{preview.length} data peserta ditemukan dalam {file.name}.</p>
                  </div>
                </div>
                <button
                  onClick={resetState}
                  disabled={isLoading}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                >
                  Ganti File
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">No</th>
                        <th className="px-4 py-2.5">Nama</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {preview.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                          <td className="px-4 py-2.5 text-slate-600">{p.email}</td>
                          <td className="px-4 py-2.5 text-slate-600">{p.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !file || preview.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Mengimpor...' : `Import ${preview.length} Peserta`}
          </button>
        </div>
      </div>
    </div>
  );
}
