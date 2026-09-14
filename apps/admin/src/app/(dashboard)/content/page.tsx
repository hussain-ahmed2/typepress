/**
 * Content List Page — Displays all content with filtering and status badges.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api_client';

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  status: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

const status_colors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
  TRASH: 'bg-red-100 text-red-800',
};

export default function ContentListPage() {
  const [contents, set_contents] = useState<ContentItem[]>([]);
  const [loading, set_loading] = useState(true);

  useEffect(() => {
    async function fetch_content() {
      const result = await api.get<{ data: ContentItem[] }>('/api/content');
      if (result.success && result.data) {
        set_contents(result.data.data);
      }
      set_loading(false);
    }
    fetch_content();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content</h1>
        <Link
          href="/content/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Content
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No content yet. Create your first post!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contents.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/content/${item.id}`} className="text-blue-600 hover:underline font-medium">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status_colors[item.status] || 'bg-gray-100'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.author_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
