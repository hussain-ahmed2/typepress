/**
 * Responsive Preview — Toggle between desktop, tablet, and mobile views.
 */
'use client';

import { useState } from 'react';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

const breakpoints: Record<Breakpoint, { width: string; label: string; icon: string }> = {
  desktop: { width: '100%', label: 'Desktop', icon: '🖥️' },
  tablet: { width: '768px', label: 'Tablet', icon: '📱' },
  mobile: { width: '375px', label: 'Mobile', icon: '📲' },
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
        {(Object.keys(breakpoints) as Breakpoint[]).map((bp) => (
          <button
            key={bp}
            onClick={() => set_breakpoint(bp)}
            className={`px-3 py-1 text-sm rounded-lg ${
              breakpoint === bp
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {breakpoints[bp].icon} {breakpoints[bp].label}
          </button>
        ))}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
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
