/**
 * Content List Page — Responsive content management.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api_client';
import { Plus, FileText } from 'lucide-react';

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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#303841' }}>Content</h1>
        <Link
          href="/content/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: '#2185d5' }}
        >
          <Plus size={16} />
          New Content
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-md"></div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-md p-8 text-center drop-shadow">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No content yet. Create your first post!</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-md drop-shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contents.map((item) => (
              <Link key={item.id} href={`/content/${item.id}`} className="block bg-white rounded-md p-4 drop-shadow hover:drop-shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.type} · {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-3 ${status_colors[item.status] || 'bg-gray-100'}`}>
                    {item.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
