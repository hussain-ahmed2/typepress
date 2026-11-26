/**
 * Responsive Preview — Toggle between desktop, tablet, and mobile views.
 *
 * Uses semantic theme tokens for controls and frame styling.
 */
'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Supported preview breakpoints. */
type Breakpoint = 'desktop' | 'tablet' | 'mobile';

/** Breakpoint metadata for preview controls. */
interface BreakpointConfig {
  width: string;
  label: string;
  icon: LucideIcon;
}

const breakpoints: Record<Breakpoint, BreakpointConfig> = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone },
};

/** Props for responsive preview wrapper. */
interface ResponsivePreviewProps {
  children: React.ReactNode;
}

/** Renders children inside a width-constrained preview frame. */
export function ResponsivePreview({ children }: ResponsivePreviewProps) {
  const [breakpoint, set_breakpoint] = useState<Breakpoint>('desktop');
  const current = breakpoints[breakpoint];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2" role="group" aria-label="Preview breakpoint">
        {(Object.keys(breakpoints) as Breakpoint[]).map((bp) => {
          const config = breakpoints[bp];
          const Icon = config.icon;
          const is_active = breakpoint === bp;
          return (
            <Button
              key={bp}
              type="button"
              size="sm"
              variant={is_active ? 'default' : 'secondary'}
              onClick={() => set_breakpoint(bp)}
              aria-pressed={is_active}
            >
              <Icon size={14} aria-hidden="true" />
              {config.label}
            </Button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card drop-shadow-sm">
        <div
          style={{
            width: current.width,
            maxWidth: '100%',
            margin: '0 auto',
            transition: 'width 0.3s ease',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
