/**
 * Settings Page — Site configuration and settings.
 *
 * Theme: #2185d5 (blue), #3a4750 (gray), #303841 (dark), #f3f3f3 (light)
 */
'use client';

import { useState } from 'react';
import { Globe, Mail, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
  const [site_title, set_site_title] = useState('Typepress');
  const [site_description, set_site_description] = useState('A TypeScript-native CMS');
  const [site_url, set_site_url] = useState('http://localhost:4001');
  const [admin_email, set_admin_email] = useState('admin@typepress.dev');
  const [saved, set_saved] = useState(false);

  function handle_save() {
    set_saved(true);
    setTimeout(() => set_saved(false), 2000);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#303841' }}>Settings</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-md p-6 drop-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} style={{ color: '#2185d5' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#303841' }}>General</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Site Title</label>
              <input type="text" value={site_title} onChange={(e) => set_site_title(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#2185d5] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Site Description</label>
              <input type="text" value={site_description} onChange={(e) => set_site_description(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#2185d5] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Site URL</label>
              <input type="url" value={site_url} onChange={(e) => set_site_url(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#2185d5] focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md p-6 drop-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} style={{ color: '#2185d5' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#303841' }}>Email</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#3a4750' }}>Admin Email</label>
            <input type="email" value={admin_email} onChange={(e) => set_admin_email(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#2185d5] focus:outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-md p-6 drop-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} style={{ color: '#2185d5' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#303841' }}>Security</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: '#303841' }}>Rate Limiting</p>
              <p className="text-sm" style={{ color: '#3a4750' }}>Limit login attempts</p>
            </div>
            <div className="w-11 h-6 rounded-full relative cursor-pointer"
              style={{ backgroundColor: '#2185d5' }}>
              <div className="absolute top-0.5 left-[22px] w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handle_save}
            className="flex items-center gap-2 text-white px-6 py-2 rounded-md font-medium hover:opacity-90"
            style={{ backgroundColor: '#2185d5' }}>
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
