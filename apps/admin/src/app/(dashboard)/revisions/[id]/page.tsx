/**
 * Revisions Page — View and restore content revisions.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api_client';
import { ArrowLeft, RotateCcw, Clock } from 'lucide-react';

interface Revision {
  id: string;
  data: { title: string; slug: string; status: string; meta: Record<string, unknown> };
  author: { name: string; email: string };
  created_at: string;
}

export default function RevisionsPage() {
  const params = useParams();
  const router = useRouter();
  const content_id = params?.id as string;
  const [revisions, set_revisions] = useState<Revision[]>([]);
  const [loading, set_loading] = useState(true);
  const [restoring, set_restoring] = useState<string | null>(null);

  useEffect(() => {
    if (!content_id) return;
    async function fetch_revisions() {
      const result = await api.get<{ data: Revision[] }>(`/api/content/${content_id}/revisions`);
      if (result.success && result.data) {
        set_revisions(result.data.data);
      }
      set_loading(false);
    }
    fetch_revisions();
  }, [content_id]);

  async function handle_restore(revision_id: string) {
    if (!confirm('Restore this revision? Current changes will be overwritten.')) return;
    set_restoring(revision_id);
    await api.post(`/api/content/${content_id}/revisions/${revision_id}/restore`, {});
    set_restoring(null);
    router.push(`/content/${content_id}`);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Revisions</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading revisions...</p>
      ) : revisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No revisions yet. Revisions are created when you save content.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {revisions.map((rev) => (
            <div key={rev.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{rev.data.title}</h3>
                  <p className="text-sm text-gray-500">
                    {rev.author.name} · {new Date(rev.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{rev.data.status}</span>
                    <span className="text-xs text-gray-500">Slug: {rev.data.slug}</span>
                  </div>
                </div>
                <button
                  onClick={() => handle_restore(rev.id)}
                  disabled={restoring === rev.id}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {restoring === rev.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
