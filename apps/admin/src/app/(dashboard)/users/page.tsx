/**
 * Users Page — User management with roles and capabilities.
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api_client';
import { Users, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

const role_colors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  EDITOR: 'bg-blue-100 text-blue-800',
  AUTHOR: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const [users, set_users] = useState<User[]>([]);
  const [loading, set_loading] = useState(true);
  const [editing_user, set_editing_user] = useState<User | null>(null);
  const [edit_role, set_edit_role] = useState('');

  async function fetch_users() {
    const result = await api.get<{ data: User[] }>('/api/users');
    if (result.success && result.data) {
      set_users(result.data.data);
    }
    set_loading(false);
  }

  useEffect(() => { fetch_users(); }, []);

  async function handle_update_role() {
    if (!editing_user) return;
    await api.put(`/api/users/${editing_user.id}`, { role: edit_role });
    set_editing_user(null);
    fetch_users();
  }

  async function handle_delete_user(user_id: string) {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/api/users/${user_id}`);
    fetch_users();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      {loading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users size={18} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${role_colors[user.role] || 'bg-gray-100'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => { set_editing_user(user); set_edit_role(user.role); }}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handle_delete_user(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Role Modal */}
      {editing_user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Role: {editing_user.name || editing_user.email}</h3>
            <select
              value={edit_role}
              onChange={(e) => set_edit_role(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            >
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="AUTHOR">Author</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => set_editing_user(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handle_update_role}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
