/**
 * Settings Panel — Property editor for the selected block.
 *
 * Uses useEditor to track selection and modify props directly.
 * Does NOT use useNode (which requires being inside a specific component tree).
 */
'use client';

import React from 'react';
import { useEditor } from '@craftjs/core';
import { Trash2 } from 'lucide-react';

export function SettingsPanel() {
  const { actions, selected } = useEditor((state) => {
    const [currentNodeId] = state.events.selected;
    let selected;

    if (currentNodeId && state.nodes[currentNodeId]) {
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.name,
        props: node.data.props,
        isDeletable: node.data.parent !== undefined,
      };
    }

    return { selected };
  });

  if (!selected) {
    return (
      <div className="bg-white rounded-md drop-shadow p-4">
        <p className="text-sm" style={{ color: '#3a4750' }}>Select a block to edit its properties</p>
      </div>
    );
  }

  function update_prop(key: string, value: any) {
    if (!selected) return;
    actions.setProp(selected.id, (node: any) => {
      node.data.props[key] = value;
    });
  }

  return (
    <div className="bg-white rounded-md drop-shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#303841' }}>{selected.name}</h3>
        <button
          onClick={() => actions.delete(selected.id)}
          className="p-1 hover:opacity-80"
          style={{ color: '#ef4444' }}
          title="Delete block"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(selected.props).map(([key, value]) => {
          if (key === 'children' || key === 'canvas') return null;

          return (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: '#3a4750' }}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </label>
              {typeof value === 'string' && value.startsWith('#') ? (
                <input
                  type="color"
                  value={value}
                  onChange={(e) => update_prop(key, e.target.value)}
                  className="w-full h-8 rounded-md border border-gray-300"
                />
              ) : typeof value === 'number' ? (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value as number}
                  onChange={(e) => update_prop(key, Number(e.target.value))}
                  className="w-full"
                />
              ) : typeof value === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => update_prop(key, e.target.checked)}
                />
              ) : (
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => update_prop(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-[#2185d5] focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
