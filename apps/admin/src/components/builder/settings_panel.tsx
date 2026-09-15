/**
 * Settings Panel — Property editor for the selected block.
 *
 * Accessible, keyboard-navigable, with proper labels.
 */
'use client';

import type { Block } from './block_editor';
import { block_types } from './block_types';
import { Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
  onDelete: () => void;
}

export function SettingsPanel({ block, onUpdate, onDelete }: SettingsPanelProps) {
  const block_type = block_types.find((b) => b.type === block.type);

  return (
    <div className="bg-white rounded-md drop-shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#303841' }}>
          {block_type?.label || block.type}
        </h3>
        <button onClick={onDelete} className="p-1 hover:opacity-80" style={{ color: '#ef4444' }} aria-label="Delete block">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {block_type?.settings.map((setting) => (
          <div key={setting.key}>
            <label htmlFor={`prop-${setting.key}`} className="block text-xs font-medium mb-1" style={{ color: '#3a4750' }}>
              {setting.label}
            </label>
            {setting.type === 'color' ? (
              <input id={`prop-${setting.key}`} type="color" value={String(block.props[setting.key] || '#000000')}
                onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                className="w-full h-8 rounded-md border border-gray-300" />
            ) : setting.type === 'number' ? (
              <input id={`prop-${setting.key}`} type="range" min={setting.min || 0} max={setting.max || 100}
                value={Number(block.props[setting.key] || 0)}
                onChange={(e) => onUpdate({ [setting.key]: Number(e.target.value) })}
                className="w-full" />
            ) : setting.type === 'select' ? (
              <select id={`prop-${setting.key}`} value={String(block.props[setting.key] || '')}
                onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-[#2185d5] focus:outline-none">
                {setting.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input id={`prop-${setting.key}`} type="text" value={String(block.props[setting.key] || '')}
                onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-[#2185d5] focus:outline-none" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
