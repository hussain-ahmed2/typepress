/**
 * Media Library Page — Grid view of uploaded media with upload form.
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api_client';

interface MediaItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  created_at: string;
}

export default function MediaPage() {
  const [media, set_media] = useState<MediaItem[]>([]);
  const [loading, set_loading] = useState(true);

  useEffect(() => {
    async function fetch_media() {
      const result = await api.get<{ data: MediaItem[] }>('/api/media');
      if (result.success && result.data) {
        set_media(result.data.data);
      }
      set_loading(false);
    }
    fetch_media();
  }, []);

  function format_size(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Media Library</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : media.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No media uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <span className="text-4xl">📄</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{item.filename}</p>
                <p className="text-xs text-gray-500">{format_size(item.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
