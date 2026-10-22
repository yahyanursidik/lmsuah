import React, { useEffect, useState } from 'react';
import { useCreate, useUpdate, useOne } from '@refinedev/core';
import { Button } from '../../components/ui/Button';
import { ImageUrlField } from '../../components/ui/ImageUrlField';
import { normalizeImageSource } from '../../lib/image-source';
import { getErrorMessage } from '../../lib/error-message';

interface AdminAnnouncementFormProps {
  id?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AdminAnnouncementForm: React.FC<AdminAnnouncementFormProps> = ({ id, onSuccess, onCancel }) => {
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { result } = useOne({
    resource: 'announcements',
    id: id || '',
    queryOptions: {
      enabled: !!id,
    },
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    linkUrl: '',
    imageUrl: '',
    status: 'published'
  });

  useEffect(() => {
    if (result) {
      setFormData({
        title: result.title || '',
        content: result.content || '',
        linkUrl: result.linkUrl || '',
        imageUrl: result.imageUrl || '',
        status: result.status || 'published'
      });
    }
  }, [result]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    if (formData.imageUrl.trim() && !normalizeImageSource(formData.imageUrl)) {
      setFormError('URL gambar tidak valid. Gunakan HTTP/HTTPS atau jalur lokal.');
      return;
    }
    setIsSubmitting(true);
    if (id) {
      updateMutation.mutate({
        resource: 'announcements',
        id,
        values: formData,
      }, {
        onSuccess: () => {
          setIsSubmitting(false);
          if (onSuccess) onSuccess();
        },
        onError: error => { setIsSubmitting(false); setFormError(getErrorMessage(error, 'Pengumuman gagal disimpan. Silakan coba lagi.')); }
      });
    } else {
      createMutation.mutate({
        resource: 'announcements',
        values: formData,
      }, {
        onSuccess: () => {
          setIsSubmitting(false);
          if (onSuccess) onSuccess();
        },
        onError: error => { setIsSubmitting(false); setFormError(getErrorMessage(error, 'Pengumuman gagal disimpan. Silakan coba lagi.')); }
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      {formError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Pengumuman</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Masukkan judul..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Konten (Teks)</label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Isi pesan pengumuman..."
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Hyperlink (Opsional)</label>
        <input
          type="url"
          name="linkUrl"
          value={formData.linkUrl}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="https://contoh.com/link"
        />
      </div>

      <ImageUrlField value={formData.imageUrl} onChange={imageUrl => setFormData(previous => ({ ...previous, imageUrl }))} />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : id ? 'Simpan Perubahan' : 'Buat Pengumuman'}
        </Button>
      </div>
    </form>
  );
};
