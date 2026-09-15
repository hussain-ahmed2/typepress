/**
 * Responsive Preview — Toggle between desktop, tablet, and mobile views.
 *
 * Uses Lucide icons for device indicators.
 */
'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

const breakpoints: Record<Breakpoint, { width: string; label: string; icon: LucideIcon }> = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone },
};

interface ResponsivePreviewProps {
  children: React.ReactNode;
}

export function ResponsivePreview({ children }: ResponsivePreviewProps) {
  const [breakpoint, set_breakpoint] = useState<Breakpoint>('desktop');
  const current = breakpoints[breakpoint];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(Object.keys(breakpoints) as Breakpoint[]).map((bp) => {
          const Icon = breakpoints[bp].icon;
          return (
            <button
              key={bp}
              onClick={() => set_breakpoint(bp)}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md ${
                breakpoint === bp
                  ? 'text-white'
                  : 'hover:opacity-90'
              }`}
              style={breakpoint === bp
                ? { backgroundColor: '#2185d5' }
                : { backgroundColor: '#f3f3f3', color: '#3a4750' }
              }
            >
              <Icon size={14} />
              {breakpoints[bp].label}
            </button>
          );
        })}
      </div>
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
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
