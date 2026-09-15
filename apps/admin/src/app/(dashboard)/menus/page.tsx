/**
 * Menus Page — Manage navigation menus with items.
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api_client';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  url: string;
  target: string | null;
  parent_id: string | null;
  order: number;
  children: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  items: MenuItem[];
}

export default function MenusPage() {
  const [menus, set_menus] = useState<Menu[]>([]);
  const [selected_menu, set_selected_menu] = useState<Menu | null>(null);
  const [new_menu_name, set_new_menu_name] = useState('');
  const [new_item_label, set_new_item_label] = useState('');
  const [new_item_url, set_new_item_url] = useState('');

  async function fetch_menus() {
    const result = await api.get<{ data: Menu[] }>('/api/menus');
    if (result.success && result.data) {
      set_menus(result.data.data);
    }
  }

  useEffect(() => { fetch_menus(); }, []);

  async function handle_create_menu() {
    if (!new_menu_name) return;
    const slug = new_menu_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await api.post('/api/menus', { name: new_menu_name, slug });
    set_new_menu_name('');
    fetch_menus();
  }

  async function handle_add_item() {
    if (!selected_menu || !new_item_label || !new_item_url) return;
    await api.post(`/api/menus/${selected_menu.id}/items`, {
      label: new_item_label,
      url: new_item_url,
    });
    set_new_item_label('');
    set_new_item_url('');
    fetch_menus();
  }

  async function handle_delete_item(item_id: string) {
    await api.delete(`/api/menus/items/${item_id}`);
    fetch_menus();
  }

  async function handle_delete_menu(menu_id: string) {
    if (!confirm('Delete this menu?')) return;
    await api.delete(`/api/menus/${menu_id}`);
    set_selected_menu(null);
    fetch_menus();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Menus</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">All Menus</h2>
          <div className="space-y-2 mb-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                onClick={() => set_selected_menu(menu)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selected_menu?.id === menu.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="font-medium">{menu.name}</p>
                <p className="text-sm text-gray-500">{menu.items?.length || 0} items</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={new_menu_name}
              onChange={(e) => set_new_menu_name(e.target.value)}
              placeholder="New menu name"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handle_create_menu}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          {selected_menu ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{selected_menu.name}</h2>
                <button
                  onClick={() => handle_delete_menu(selected_menu.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete Menu
                </button>
              </div>

              {/* Add Item Form */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={new_item_label}
                  onChange={(e) => set_new_item_label(e.target.value)}
                  placeholder="Label"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={new_item_url}
                  onChange={(e) => set_new_item_url(e.target.value)}
                  placeholder="URL"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={handle_add_item}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {selected_menu.items?.length === 0 && (
                  <p className="text-gray-500 text-sm">No items yet. Add one above.</p>
                )}
                {selected_menu.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <GripVertical size={16} className="text-gray-400" />
                    <span className="flex-1 font-medium">{item.label}</span>
                    <span className="text-sm text-gray-500">{item.url}</span>
                    <button
                      onClick={() => handle_delete_item(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500">Select a menu to edit its items.</p>
          )}
        </div>
      </div>
    </div>
  );
}
