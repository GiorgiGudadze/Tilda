import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One component on the Design page, under its name. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export type ThemeName = 'light' | 'dark';

/**
 * Renders the same content twice: once in the light theme, once in the dark.
 * Pass a function when the content needs to know which theme it is in.
 */
export function BothThemes({
  children,
}: {
  children: ReactNode | ((theme: ThemeName) => ReactNode);
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div
          key={theme}
          className={cn(
            theme,
            'space-y-4 rounded-lg border bg-background p-4 text-foreground',
          )}
        >
          <p className="text-xs font-medium text-muted-foreground">
            {theme === 'light' ? 'Light theme' : 'Dark theme'}
          </p>
          {typeof children === 'function' ? children(theme) : children}
        </div>
      ))}
    </div>
  );
}
