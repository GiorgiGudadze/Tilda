import type * as React from 'react';
import { Toaster as Sonner } from 'sonner';

/**
 * Sonner's toaster, wearing this app's tokens. Sonner handles the hard part:
 * stacking, timing, swiping away, and announcing a toast to screen readers.
 */
function Toaster({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
    />
  );
}

export { Toaster };
