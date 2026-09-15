/**
 * Content Editor Page — Create or edit content.
 *
 * Theme: #2185d5 (blue), #3a4750 (gray), #303841 (dark), #f3f3f3 (light)
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api_client';

export default function ContentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const is_editing = id && id !== 'new';

  const [title, set_title] = useState('');
  const [slug, set_slug] = useState('');
  const [type, set_type] = useState('post');
  const [status, set_status] = useState('DRAFT');
  const [meta_excerpt, set_meta_excerpt] = useState('');
  const [saving, set_saving] = useState(false);

  useEffect(() => {
    if (is_editing) {
      api.get(`/api/content/${id}`).then((result: any) => {
        if (result.success && result.data) {
          const d = result.data.data;
          set_title(d.title);
          set_slug(d.slug);
          set_type(d.type);
          set_status(d.status);
          set_meta_excerpt(d.meta?.excerpt || '');
        }
      });
    }
  }, [id, is_editing]);

  function generate_slug(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handle_submit() {
    set_saving(true);
    const body = { title, slug: slug || generate_slug(title), type, status, meta: { excerpt: meta_excerpt } };
    const result = is_editing
      ? await api.put(`/api/content/${id}`, body)
      : await api.post('/api/content', body);
    set_saving(false);
    if (result.success) router.push('/content');
    else alert(result.error?.message || 'Failed to save');
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#303841' }}>
        {is_editing ? 'Edit Content' : 'New Content'}
      </h1>

      <div className="bg-white rounded-md p-6 drop-shadow space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Title</label>
          <input type="text" value={title} onChange={(e) => set_title(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2185d5]"
            placeholder="Enter title..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Slug</label>
          <input type="text" value={slug} onChange={(e) => set_slug(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2185d5]"
            placeholder="auto-generated-from-title" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Type</label>
            <select value={type} onChange={(e) => set_type(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2185d5]">
              <option value="post">Post</option>
              <option value="page">Page</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Status</label>
            <select value={status} onChange={(e) => set_status(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2185d5]">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Excerpt</label>
          <textarea value={meta_excerpt} onChange={(e) => set_meta_excerpt(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2185d5]"
            placeholder="Optional summary..." />
        </div>

        <div className="flex gap-3">
          <button onClick={handle_submit} disabled={saving || !title}
            className="text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#2185d5' }}>
            {saving ? 'Saving...' : is_editing ? 'Update' : 'Create'}
          </button>
          <button onClick={() => router.push('/content')}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: '#f3f3f3', color: '#3a4750' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
