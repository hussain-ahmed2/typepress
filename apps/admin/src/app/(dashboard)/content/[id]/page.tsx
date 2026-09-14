/**
 * Content Editor Page — Create or edit content with a form-based editor.
 *
 * Handles both creation (new) and editing (existing ID) via the same component.
 * Uses controlled form state with client-side validation before API submission.
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
      api.get<{ data: { title: string; slug: string; type: string; status: string; meta: { excerpt?: string } } }>(
        `/api/content/${id}`,
      ).then((result) => {
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
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function handle_submit() {
    set_saving(true);

    const body = {
      title,
      slug: slug || generate_slug(title),
      type,
      status,
      meta: { excerpt: meta_excerpt },
    };

    const result = is_editing
      ? await api.put(`/api/content/${id}`, body)
      : await api.post('/api/content', body);

    set_saving(false);

    if (result.success) {
      router.push('/content');
    } else {
      alert(result.error?.message || 'Failed to save');
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {is_editing ? 'Edit Content' : 'New Content'}
      </h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => set_title(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => set_slug(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="auto-generated-from-title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => set_type(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="post">Post</option>
              <option value="page">Page</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => set_status(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea
            value={meta_excerpt}
            onChange={(e) => set_meta_excerpt(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional summary..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handle_submit}
            disabled={saving || !title}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : is_editing ? 'Update' : 'Create'}
          </button>
          <button
            onClick={() => router.push('/content')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
