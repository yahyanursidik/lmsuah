import { useState, useEffect } from 'react';
import { X, User, Phone, Save, Edit } from 'lucide-react';

export type EditParticipantFormData = {
  name: string;
  phone: string;
};

interface AdminParticipantEditModalProps {
  isOpen: boolean;
  userId: string | null;
  initialData: EditParticipantFormData | null;
  onClose: () => void;
  onSubmit: (userId: string, data: EditParticipantFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AdminParticipantEditModal({ 
  isOpen, 
  userId, 
  initialData, 
  onClose, 
  onSubmit, 
  isLoading = false 
}: AdminParticipantEditModalProps) {
  const [formData, setFormData] = useState<EditParticipantFormData>({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen || !userId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(userId, formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={isLoading ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Edit className="h-5 w-5 text-emerald-600" />
            Edit Profil Peserta
          </h2>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Nama lengkap peserta"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nomor HP / WhatsApp
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="08123456789"
                disabled={isLoading}
              />
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
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
