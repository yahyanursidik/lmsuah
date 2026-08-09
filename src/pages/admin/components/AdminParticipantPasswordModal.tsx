import { useState } from 'react';
import { X, KeyRound, Save, Shuffle } from 'lucide-react';

interface AdminParticipantPasswordModalProps {
  isOpen: boolean;
  userId: string | null;
  userName: string;
  onClose: () => void;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
  isLoading?: boolean;
}

export function AdminParticipantPasswordModal({ isOpen, userId, userName, onClose, onSubmit, isLoading = false }: AdminParticipantPasswordModalProps) {
  const [password, setPassword] = useState('');

  if (!isOpen || !userId) return null;

  const handleGenerate = () => {
    const randomChars = Math.random().toString(36).slice(-8);
    setPassword(randomChars);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) return;
    await onSubmit(userId, password);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={isLoading ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <KeyRound className="h-5 w-5 text-amber-600" />
            Ganti Password
          </h2>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4 text-sm text-slate-600">
            Ganti password untuk peserta: <strong className="text-slate-900">{userName}</strong>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password Baru
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Minimal 6 karakter"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  title="Generate Acak"
                  className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Shuffle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || password.length < 6}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors focus:ring-4 focus:ring-amber-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
