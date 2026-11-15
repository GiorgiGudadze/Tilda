import { cn } from '@/lib/utils';

/**
 * A grey block that stands in for content while it loads. Set its size with
 * `className`. It is hidden from screen readers and stops pulsing when the
 * user asks for reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-muted motion-reduce:animate-none',
        className,
      )}
    />
  );
}
