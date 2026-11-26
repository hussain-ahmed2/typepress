/**
 * Settings Panel — Property editor for the selected block.
 *
 * Uses semantic shadcn inputs for consistent styling and accessibility.
 */
'use client';

import { Trash2 } from 'lucide-react';
import type { BuilderBlockPropValue } from '@typepress/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Block } from './block_editor';
import { block_types } from './block_types';

/** Props for the settings panel. */
interface SettingsPanelProps {
  block: Block;
  onUpdate: (props: Record<string, BuilderBlockPropValue>) => void;
  onDelete: () => void;
}

/** Renders editable settings for the selected block type. */
export function SettingsPanel({ block, onUpdate, onDelete }: SettingsPanelProps) {
  const block_type = block_types.find((candidate) => candidate.type === block.type);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {block_type?.label || block.type}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          aria-label={`Delete ${block_type?.label || block.type} block`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {block_type?.settings.map((setting) => {
          const input_id = `block-setting-${block.id}-${setting.key}`;
          const value = block.props[setting.key];

          return (
            <div key={setting.key} className="space-y-1">
              <Label htmlFor={input_id} className="text-xs text-muted-foreground">
                {setting.label}
              </Label>

              {setting.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    id={input_id}
                    type="color"
                    value={String(value || '#000000')} // Fallback for empty color value; user-editable.
                    onChange={(event) => onUpdate({ [setting.key]: event.target.value })}
                    className="h-9 w-10 cursor-pointer rounded-md border border-input bg-background p-1"
                    aria-label={`${setting.label} color picker`}
                  />
                  <Input
                    type="text"
                    value={String(value || '')}
                    onChange={(event) => onUpdate({ [setting.key]: event.target.value })}
                    aria-label={`${setting.label} hex value`}
                  />
                </div>
              ) : setting.type === 'number' ? (
                <div className="space-y-1">
                  <input
                    id={input_id}
                    type="range"
                    min={setting.min ?? 0}
                    max={setting.max ?? 100}
                    value={Number(value ?? 0)}
                    onChange={(event) => onUpdate({ [setting.key]: Number(event.target.value) })}
                    className="w-full accent-primary"
                    aria-label={setting.label}
                  />
                  <p className="text-xs text-muted-foreground">{String(Number(value ?? 0))}</p>
                </div>
              ) : setting.type === 'select' ? (
                <select
                  id={input_id}
                  value={String(value || '')}
                  onChange={(event) => onUpdate({ [setting.key]: event.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {setting.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={input_id}
                  type="text"
                  value={String(value || '')}
                  onChange={(event) => onUpdate({ [setting.key]: event.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
