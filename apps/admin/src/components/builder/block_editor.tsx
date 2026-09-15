/**
 * Block Editor — Custom page builder for Typepress.
 *
 * Built from scratch for React 19 compatibility.
 */
'use client';

import { useState, useCallback } from 'react';
import { Trash2, GripVertical } from 'lucide-react';

export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
  order: number;
}

let next_id = 1;
function generate_id(): string { return `block_${next_id++}`; }

export function BlockEditor({ initial_blocks = [] }: { initial_blocks?: Block[] }) {
  const [blocks, set_blocks] = useState<Block[]>(initial_blocks);
  const [selected_id, set_selected_id] = useState<string | null>(null);
  const [dragged_id, set_dragged_id] = useState<string | null>(null);

  const add_block = useCallback((type: string) => {
    const new_block: Block = { id: generate_id(), type, props: get_defaults(type), order: blocks.length };
    set_blocks((prev) => [...prev, new_block]);
    set_selected_id(new_block.id);
  }, [blocks.length]);

  const update_block = useCallback((id: string, props: Record<string, unknown>) => {
    set_blocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)));
  }, []);

  const delete_block = useCallback((id: string) => {
    set_blocks((prev) => prev.filter((b) => b.id !== id));
    set_selected_id(null);
  }, []);

  const move_block = useCallback((from: number, to: number) => {
    set_blocks((prev) => {
      const arr = [...prev];
      const moved = arr.splice(from, 1)[0]!;
      arr.splice(to, 0, moved);
      return arr.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const selected: Block | undefined = blocks.find((b) => b.id === selected_id);

  return (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-md drop-shadow p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#303841' }}>Blocks</h3>
          <div className="space-y-2">
            {block_types.map((bt) => (
              <button key={bt.type} onClick={() => add_block(bt.type)}
                className="w-full flex items-center gap-3 p-2 rounded-md text-sm text-left hover:opacity-90"
                style={{ backgroundColor: '#f3f3f3', color: '#3a4750' }}>
                <bt.icon size={16} />
                {bt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="bg-white rounded-md drop-shadow p-4 min-h-[400px]">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center h-64" style={{ color: '#3a4750' }}>
              Click a block to add it
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <div key={block.id} draggable onDragStart={() => set_dragged_id(block.id)}
                  onDragEnd={() => set_dragged_id(null)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragged_id) { move_block(blocks.findIndex((b) => b.id === dragged_id), index); set_dragged_id(null); } }}
                  onClick={() => set_selected_id(block.id)}
                  className={`p-4 rounded-md cursor-pointer flex items-center gap-2 ${selected_id === block.id ? 'ring-2 ring-[#2185d5]' : 'hover:bg-gray-50'}`}>
                  <GripVertical size={16} style={{ color: '#3a4750' }} />
                  <BlockRenderer block={block} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-md drop-shadow p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: '#303841' }}>{selected.type}</h3>
                <button onClick={() => delete_block(selected.id)} style={{ color: '#ef4444' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(selected.props).map(([key, value]) => (
                  <PropEditor key={key} prop_key={key} value={value}
                    onChange={(val) => update_block(selected.id, { [key]: val })} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: '#3a4750' }}>Select a block</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const { type, props } = block;
  switch (type) {
    case 'heading': return <h2 style={{ fontSize: `${props.fontSize || 32}px`, color: String(props.color || '#1E293B'), textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right' }}>{String(props.text || 'Heading')}</h2>;
    case 'text': return <p style={{ fontSize: `${props.fontSize || 16}px`, color: String(props.color || '#64748B'), textAlign: (props.textAlign || 'left') as 'left' | 'center' | 'right' }}>{String(props.text || 'Text')}</p>;
    case 'image': return props.src ? <img src={String(props.src)} alt={String(props.alt || '')} style={{ width: '100%', borderRadius: '6px' }} /> : <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-md p-8 text-center" style={{ color: '#3a4750' }}>Image</div>;
    case 'button': return <button style={{ backgroundColor: String(props.color || '#2185d5'), color: '#fff', padding: '10px 24px', borderRadius: `${props.borderRadius || 6}px`, border: 'none', fontWeight: 'bold' }}>{String(props.text || 'Button')}</button>;
    case 'divider': return <hr style={{ border: 'none', borderTop: `${props.thickness || 1}px ${props.style || 'solid'} ${props.color || '#e5e7eb'}`, margin: `${props.margin || 16}px 0` }} />;
    case 'container': return <div style={{ background: String(props.background || '#f9fafb'), padding: `${props.padding || 16}px`, borderRadius: '6px', minHeight: '40px', border: '1px dashed #d1d5db' }}><p style={{ color: '#3a4750', textAlign: 'center', fontSize: '12px' }}>Container</p></div>;
    default: return <div style={{ color: '#3a4750' }}>Unknown: {type}</div>;
  }
}

function PropEditor({ prop_key, value, onChange }: { prop_key: string; value: unknown; onChange: (v: any) => void }) {
  if (prop_key === 'children' || prop_key === 'canvas') return null;
  const label = prop_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  if (typeof value === 'string' && value.startsWith('#')) {
    return <div><label className="block text-xs font-medium mb-1" style={{ color: '#3a4750' }}>{label}</label><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-8 rounded-md border border-gray-300" /></div>;
  }
  if (typeof value === 'number') {
    return <div><label className="block text-xs font-medium mb-1" style={{ color: '#3a4750' }}>{label}</label><input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" /><span className="text-xs" style={{ color: '#3a4750' }}>{value}</span></div>;
  }
  if (typeof value === 'boolean') {
    return <div className="flex items-center gap-2"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><label className="text-xs" style={{ color: '#3a4750' }}>{label}</label></div>;
  }
  return <div><label className="block text-xs font-medium mb-1" style={{ color: '#3a4750' }}>{label}</label><input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:border-[#2185d5] focus:outline-none" /></div>;
}

function get_defaults(type: string): Record<string, unknown> {
  const d: Record<string, Record<string, unknown>> = {
    heading: { text: 'Heading', fontSize: 32, color: '#1E293B', textAlign: 'left' },
    text: { text: 'Text', fontSize: 16, color: '#64748B', textAlign: 'left' },
    image: { src: '', alt: 'Image', width: '100%' },
    button: { text: 'Button', color: '#2185d5', borderRadius: 6, link: '' },
    divider: { style: 'solid', color: '#e5e7eb', thickness: 1, margin: 16 },
    container: { background: '#f9fafb', padding: 16 },
  };
  return d[type] || {};
}

const block_types = [
  { type: 'heading', label: 'Heading', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h8M4 18V6M12 18V6"/></svg> },
  { type: 'text', label: 'Text', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
  { type: 'image', label: 'Image', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> },
  { type: 'button', label: 'Button', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="5" y="5" rx="2"/></svg> },
  { type: 'divider', label: 'Divider', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/></svg> },
  { type: 'container', label: 'Container', icon: (p: { size: number }) => <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg> },
];
