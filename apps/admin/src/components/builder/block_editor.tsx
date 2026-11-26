/**
 * Gutenberg-style Page Builder.
 *
 * Features:
 * - Block inserter, canvas, and settings panel
 * - Block toolbar (move, delete, settings)
 * - Semantic theme tokens and accessible controls
 * - Emits block changes for persistence
 */
'use client';

import { useEffect, useState } from 'react';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { ChevronDown, ChevronUp, Plus, Settings, Trash2 } from 'lucide-react';
import type { BuilderBlock, BuilderBlockPropValue, BuilderBlockType } from '@typepress/shared-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { block_types } from './block_types';
import { BlockRenderer } from './block_renderer';
import { SettingsPanel } from './settings_panel';

/** Serializable block model used by the builder editor. */
export type Block = BuilderBlock;

/** Props for the block toolbar. */
interface BlockToolbarProps {
  on_move_up: () => void;
  on_move_down: () => void;
  on_delete: () => void;
  on_select: () => void;
}

/** Floating toolbar shown for the selected block. */
function BlockToolbar({ on_move_up, on_move_down, on_delete, on_select }: BlockToolbarProps) {
  return (
    <div className="absolute -top-11 left-0 z-10 flex items-center gap-1 rounded-md border border-border bg-card p-1 drop-shadow">
      <Button type="button" variant="ghost" size="icon-xs" onClick={on_move_up} aria-label="Move block up">
        <ChevronUp size={16} aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon-xs" onClick={on_move_down} aria-label="Move block down">
        <ChevronDown size={16} aria-hidden="true" />
      </Button>
      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <Button type="button" variant="ghost" size="icon-xs" onClick={on_select} aria-label="Open block settings">
        <Settings size={16} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={on_delete}
        aria-label="Delete block"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}

/** Props for an editable canvas block. */
interface EditableBlockProps {
  block: Block;
  is_selected: boolean;
  on_select: () => void;
  on_move_up: () => void;
  on_move_down: () => void;
  on_delete: () => void;
}

/** Renders a selectable, draggable block on the canvas. */
function EditableBlock({
  block,
  is_selected,
  on_select,
  on_move_up,
  on_move_down,
  on_delete,
}: EditableBlockProps) {
  const { ref } = useDraggable({ id: block.id });

  return (
    <div
      ref={ref}
      onClick={on_select}
      className={cn(
        'group relative rounded-sm ring-offset-background transition-shadow',
        is_selected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border',
      )}
      role="button"
      tabIndex={0}
      aria-label={`${block.type} block`}
      aria-pressed={is_selected}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          on_select();
        }
      }}
    >
      {is_selected ? (
        <BlockToolbar
          on_move_up={on_move_up}
          on_move_down={on_move_down}
          on_delete={on_delete}
          on_select={on_select}
        />
      ) : null}
      <div className="cursor-pointer">
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

/** Props for the droppable canvas. */
interface CanvasProps {
  children: React.ReactNode;
}

/** Main drop canvas for blocks. */
function Canvas({ children }: CanvasProps) {
  const { ref, isDropTarget } = useDroppable({ id: 'canvas' });

  return (
    <div
      ref={ref}
      className={cn(
        'min-h-[600px] rounded-md border bg-card p-8 transition-colors',
        isDropTarget ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      {children}
    </div>
  );
}

/** Props for the block editor. */
interface BlockEditorProps {
  initial_blocks?: Block[];
  /** Called whenever blocks change, for persistence by parent. */
  onChange?: (blocks: Block[]) => void;
}

/** Block editor with inserter, canvas, and settings panel. */
export function BlockEditor({ initial_blocks = [], onChange }: BlockEditorProps) {
  const [blocks, set_blocks] = useState<Block[]>(initial_blocks);
  const [selected_id, set_selected_id] = useState<string | null>(null);

  // Emit block changes to parent for save/persistence.
  useEffect(() => {
    onChange?.(blocks);
  }, [blocks, onChange]);

  /** Adds a new block of the requested type. */
  function add_block(type: BuilderBlockType): void {
    const block_type = block_types.find((candidate) => candidate.type === type);
    if (!block_type) return;
    const new_block: Block = {
      id: `block_${Date.now()}`,
      type,
      props: { ...block_type.defaultProps },
    };
    set_blocks((previous) => [...previous, new_block]);
    set_selected_id(new_block.id);
  }

  /** Updates props for a block by id. */
  function update_block(id: string, props: Record<string, BuilderBlockPropValue>): void {
    set_blocks((previous) =>
      previous.map((block) => (block.id === id ? { ...block, props: { ...block.props, ...props } } : block)),
    );
  }

  /** Deletes a block by id. */
  function delete_block(id: string): void {
    set_blocks((previous) => previous.filter((block) => block.id !== id));
    set_selected_id((current) => (current === id ? null : current));
  }

  /** Moves a block within the list. */
  function move_block(from_index: number, to_index: number): void {
    if (to_index < 0 || to_index >= blocks.length) return;
    set_blocks((previous) => {
      const next_blocks = [...previous];
      const [moved] = next_blocks.splice(from_index, 1);
      if (!moved) return previous;
      next_blocks.splice(to_index, 0, moved);
      return next_blocks;
    });
  }

  const selected_block = blocks.find((block) => block.id === selected_id);

  return (
    <DragDropProvider>
      <div className="flex min-h-[600px] flex-col bg-muted/30 lg:flex-row">
        {/* Block inserter sidebar */}
        <aside className="w-full shrink-0 border-b border-border bg-card lg:w-72 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Blocks</h2>
            <p className="mt-1 text-xs text-muted-foreground">Add blocks to the page canvas.</p>
          </div>
          <div className="space-y-1 p-4">
            {block_types.map((block_type) => {
              const Icon = block_type.icon;
              return (
                <Button
                  key={block_type.type}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 text-foreground"
                  onClick={() => add_block(block_type.type)}
                >
                  <Icon size={18} className="text-muted-foreground" aria-hidden="true" />
                  <span>{block_type.label}</span>
                </Button>
              );
            })}
          </div>
        </aside>

        {/* Main canvas */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Canvas>
            {blocks.length === 0 ? (
              <div className="flex min-h-96 flex-col items-center justify-center text-center text-muted-foreground">
                <Plus size={48} className="mb-4" aria-hidden="true" />
                <p className="text-lg font-medium text-foreground">Add your first block</p>
                <p className="mt-1 text-sm">Select a block from the sidebar to start building.</p>
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
        </main>

        {/* Settings panel */}
        <aside className="w-full shrink-0 border-t border-border bg-card lg:w-80 lg:border-l lg:border-t-0">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">Edit the selected block.</p>
          </div>
          <div className="p-4">
            {selected_block ? (
              <SettingsPanel
                block={selected_block}
                onUpdate={(props) => update_block(selected_block.id, props)}
                onDelete={() => delete_block(selected_block.id)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a block to edit its settings.</p>
            )}
          </div>
        </aside>
      </div>
    </DragDropProvider>
  );
}
