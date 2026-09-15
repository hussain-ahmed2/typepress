/**
 * Taxonomy Page — Manage categories and tags with create/edit/delete.
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api_client';

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export default function TaxonomyPage() {
  const [taxonomies, set_taxonomies] = useState<TaxonomyItem[]>([]);
  const [loading, set_loading] = useState(true);
  const [new_name, set_new_name] = useState('');
  const [new_slug, set_new_slug] = useState('');
  const [new_type, set_new_type] = useState('category');
  const [creating, set_creating] = useState(false);

  async function fetch_taxonomies() {
    const result = await api.get<{ data: TaxonomyItem[] }>('/api/taxonomy');
    if (result.success && result.data) {
      set_taxonomies(result.data.data);
    }
    set_loading(false);
  }

  useEffect(() => {
    fetch_taxonomies();
  }, []);

  async function handle_create() {
    if (!new_name) return;
    set_creating(true);

    const result = await api.post('/api/taxonomy', {
      name: new_name,
      slug: new_slug || new_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: new_type,
    });

    set_creating(false);

    if (result.success) {
      set_new_name('');
      set_new_slug('');
      fetch_taxonomies();
    } else {
      alert(result.error?.message || 'Failed to create');
    }
  }

  async function handle_delete(id: string) {
    if (!confirm('Delete this taxonomy?')) return;

    const result = await api.delete(`/api/taxonomy/${id}`);
    if (result.success) {
      fetch_taxonomies();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Taxonomy</h1>

      {/* Create form */}
      <div className="bg-white rounded-lg drop-shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add Taxonomy</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={new_name}
              onChange={(e) => set_new_name(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Category name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={new_slug}
              onChange={(e) => set_new_slug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="auto-generated"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={new_type}
              onChange={(e) => set_new_type(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="category">Category</option>
              <option value="tag">Tag</option>
            </select>
          </div>
          <button
            onClick={handle_create}
            disabled={creating || !new_name}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : taxonomies.length === 0 ? (
        <div className="bg-white rounded-lg drop-shadow p-8 text-center">
          <p className="text-gray-500">No taxonomies yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg drop-shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {taxonomies.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.type}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handle_delete(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
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
