/**
 * Providers Component — App-level providers for admin.
 *
 * Wires Redux, tooltip context, and Sonner toasts so all dashboard
 * components can use tooltips and toast notifications consistently.
 */
'use client';

import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

/** Props for the root provider tree. */
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </Provider>
  );
}
