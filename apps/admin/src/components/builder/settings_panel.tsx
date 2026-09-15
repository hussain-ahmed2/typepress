/**
 * Settings Panel — Property editor for the selected block.
 *
 * Clean, minimal design like Gutenberg.
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-500 uppercase">{block_type?.label || block.type}</span>
        <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-4">
        {block_type?.settings.map((setting) => (
          <div key={setting.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{setting.label}</label>
            {setting.type === 'color' ? (
              <div className="flex items-center gap-2">
                <input type="color" value={String(block.props[setting.key] || '#000000')}
                  onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input type="text" value={String(block.props[setting.key] || '')}
                  onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm" />
              </div>
            ) : setting.type === 'number' ? (
              <input type="range" min={setting.min || 0} max={setting.max || 100}
                value={Number(block.props[setting.key] || 0)}
                onChange={(e) => onUpdate({ [setting.key]: Number(e.target.value) })}
                className="w-full" />
            ) : setting.type === 'select' ? (
              <select value={String(block.props[setting.key] || '')}
                onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm">
                {setting.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={String(block.props[setting.key] || '')}
                onChange={(e) => onUpdate({ [setting.key]: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
