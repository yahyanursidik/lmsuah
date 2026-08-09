import React, { useEffect, useState } from 'react';
import { useCreate, useUpdate, useOne } from '@refinedev/core';
import { Button } from '../../components/ui/Button';

interface AdminAnnouncementFormProps {
  id?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AdminAnnouncementForm: React.FC<AdminAnnouncementFormProps> = ({ id, onSuccess, onCancel }) => {
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        onError: () => setIsSubmitting(false)
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
        onError: () => setIsSubmitting(false)
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">URL Foto (Opsional)</label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="https://contoh.com/gambar.jpg"
        />
      </div>

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
          {id ? 'Simpan Perubahan' : 'Buat Pengumuman'}
        </Button>
      </div>
    </form>
  );
};
