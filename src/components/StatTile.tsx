import { Sparkline } from '@/components/Sparkline';
import { cn } from '@/lib/utils';

interface StatTileProps {
  /** What the number is, as "Requests". */
  label: string;
  /** The number, already formatted, as "1.2 s" or "3%". */
  value: string;
  /** One short line under the number, as "12 of 503 calls". */
  detail?: string;
  /** How the number went over time, oldest first, drawn behind it. */
  trend?: (number | null)[];
  className?: string;
}

/**
 * One big number with its name, and the shape of how it went over time
 * under it. The number is what matters; the line only says whether it is
 * steady, rising or spiking.
 *
 * The line has its own strip below the text, the full width of the tile.
 * Drawn behind the text, it ran into the number once three tiles shared a
 * medium screen.
 */
export function StatTile({
  label,
  value,
  detail,
  trend,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 text-card-foreground',
        className,
      )}
    >
      <dl>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
        {detail && (
          <dd className="mt-1 text-xs text-muted-foreground">{detail}</dd>
        )}
      </dl>
      {trend && trend.length > 1 && (
        <div className="mt-3 h-10">
          <Sparkline values={trend} />
        </div>
      )}
    </div>
  );
}
