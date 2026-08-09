import React, { useState } from 'react';
import { useList, useDelete } from '@refinedev/core';
import { Plus, Edit, Trash2, Link as LinkIcon, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AdminAnnouncementForm } from './AdminAnnouncementForm';

export const AdminAnnouncementsPage: React.FC = () => {
  const { query: listQuery, result } = useList({
    resource: 'announcements',
    pagination: { mode: 'off' },
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const announcements = result?.data || [];
  const isLoading = listQuery?.isLoading;

  const { mutate: deleteMutate } = useDelete();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus pengumuman ini?')) {
      deleteMutate({
        resource: 'announcements',
        id,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pengumuman</h1>
          <p className="text-sm text-slate-500">
            Kelola pengumuman yang akan ditampilkan di dashboard peserta
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Buat Pengumuman
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Memuat pengumuman...</div>
      ) : announcements.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">Belum ada pengumuman.</p>
          <Button onClick={handleCreate} variant="outline" className="mt-4">
            Buat Pengumuman Pertama
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map((item: any) => (
            <Card key={item.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
              {item.imageUrl && (
                <div className="h-32 bg-slate-100 rounded-t-lg overflow-hidden border-b border-slate-100">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-lg text-slate-800 line-clamp-2">{item.title}</h3>
                  <Badge variant={item.status === 'published' ? 'success' : 'secondary'} className="shrink-0">
                    {item.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                
                <p className="text-sm text-slate-600 line-clamp-3 mb-4 flex-1 whitespace-pre-wrap">
                  {item.content}
                </p>

                {item.linkUrl && (
                  <div className="flex items-center gap-1 text-sm text-emerald-600 mb-4">
                    <LinkIcon size={14} />
                    <a href={item.linkUrl} target="_blank" rel="noreferrer" className="truncate max-w-[200px] hover:underline">
                      {item.linkUrl}
                    </a>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(item.id)}
                      title="Edit"
                    >
                      <Edit size={14} className="text-slate-600" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-500"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <AdminAnnouncementForm 
              id={editingId} 
              onSuccess={() => setIsFormOpen(false)} 
              onCancel={() => setIsFormOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
