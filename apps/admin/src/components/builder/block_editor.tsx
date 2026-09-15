/**
 * Gutenberg-style Page Builder.
 *
 * Features:
 *   - Clean white canvas with subtle gray background
 *   - Block toolbar on hover/select (move, delete, drag)
 *   - Settings panel on the right
 *   - Block inserter (plus button)
 *   - Professional typography (Inter/system font)
 *   - Smooth transitions
 *   - Accessible (keyboard, ARIA)
 */
'use client';

import { useState } from 'react';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { Trash2, Plus, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { block_types } from './block_types';
import { BlockRenderer } from './block_renderer';
import { SettingsPanel } from './settings_panel';

export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

function BlockToolbar({ block: _block, on_move_up, on_move_down, on_delete, on_select }: {
  block: Block;
  on_move_up: () => void;
  on_move_down: () => void;
  on_delete: () => void;
  on_select: () => void;
}) {
  return (
    <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white rounded-md shadow-md border border-gray-200 px-2 py-1 z-10">
      <button onClick={on_move_up} className="p-1 hover:bg-gray-100 rounded" title="Move up">
        <ChevronUp size={16} />
      </button>
      <button onClick={on_move_down} className="p-1 hover:bg-gray-100 rounded" title="Move down">
        <ChevronDown size={16} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button onClick={on_select} className="p-1 hover:bg-gray-100 rounded" title="Settings">
        <Settings size={16} />
      </button>
      <button onClick={on_delete} className="p-1 hover:bg-red-50 text-red-500 rounded" title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function EditableBlock({ block, is_selected, on_select, on_move_up, on_move_down, on_delete }: {
  block: Block;
  is_selected: boolean;
  on_select: () => void;
  on_move_up: () => void;
  on_move_down: () => void;
  on_delete: () => void;
}) {
  const { ref } = useDraggable({ id: block.id });

  return (
    <div
      ref={ref}
      onClick={on_select}
      className={`relative group ${is_selected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'} ring-offset-2`}
      role="button"
      tabIndex={0}
      aria-label={`${block.type} block`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on_select(); } }}
    >
      {is_selected && (
        <BlockToolbar
          block={block}
          on_move_up={on_move_up}
          on_move_down={on_move_down}
          on_delete={on_delete}
          on_select={on_select}
        />
      )}
      <div className="cursor-pointer">
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

function Canvas({ children }: { children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: 'canvas' });

  return (
    <div
      ref={ref}
      className={`min-h-[600px] bg-white border ${isDropTarget ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} rounded-lg p-8`}
    >
      {children}
    </div>
  );
}

export function BlockEditor({ initial_blocks = [] }: { initial_blocks?: Block[] }) {
  const [blocks, set_blocks] = useState<Block[]>(initial_blocks);
  const [selected_id, set_selected_id] = useState<string | null>(null);
  

  const add_block = (type: string) => {
    const bt = block_types.find((b) => b.type === type);
    if (!bt) return;
    const new_block: Block = { id: `block_${Date.now()}`, type, props: { ...bt.defaultProps } };
    set_blocks((prev) => [...prev, new_block]);
    set_selected_id(new_block.id);
    
  };

  const update_block = (id: string, props: Record<string, unknown>) => {
    set_blocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)));
  };

  const delete_block = (id: string) => {
    set_blocks((prev) => prev.filter((b) => b.id !== id));
    set_selected_id(null);
  };

  const move_block = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const arr = [...blocks];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved!);
    set_blocks(arr);
  };

  const selected = blocks.find((b) => b.id === selected_id) as Block | undefined;

  return (
    <DragDropProvider>
      <div className="flex gap-0 min-h-screen bg-gray-50">
        {/* Sidebar - Block Inserter */}
        <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Blocks</h2>
          </div>
          <div className="p-4 space-y-1">
            {block_types.map((bt) => {
              const Icon = bt.icon;
              return (
                <button
                  key={bt.type}
                  onClick={() => add_block(bt.type)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left hover:bg-gray-100 transition-colors"
                >
                  <Icon size={20} className="text-gray-500" />
                  <span className="text-gray-700">{bt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-8">
          <Canvas>
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <Plus size={48} className="mb-4" />
                <p className="text-lg">Click a block to add it</p>
                <p className="text-sm">or drag from the sidebar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <EditableBlock
                    key={block.id}
                    block={block}
                    is_selected={selected_id === block.id}
                    on_select={() => set_selected_id(block.id)}
                    on_move_up={() => move_block(index, index - 1)}
                    on_move_down={() => move_block(index, index + 1)}
                    on_delete={() => delete_block(block.id)}
                  />
                ))}
              </div>
            )}
          </Canvas>
        </div>

        {/* Settings Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
          </div>
          <div className="p-4">
            {selected ? (
              <SettingsPanel
                block={selected}
                onUpdate={(props) => update_block(selected.id, props)}
                onDelete={() => delete_block(selected.id)}
              />
            ) : (
              <p className="text-sm text-gray-500">Select a block to edit</p>
            )}
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
}
