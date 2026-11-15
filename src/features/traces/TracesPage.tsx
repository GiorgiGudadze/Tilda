import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useTraces } from '@/features/traces/hooks';
import { STATUS_LABELS } from '@/features/traces/status';
import { formatDateTime, formatDuration } from '@/lib/format';

export function TracesPage() {
  const { data, isPending, refetch } = useTraces();

  return (
    <>
      <h1 className="text-2xl font-semibold">Traces</h1>

      {isPending ? (
        <p>Loading traces…</p>
      ) : !data ? (
        <div role="alert" className="space-y-3">
          <p>The traces could not be loaded.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing the newest {data.items.length} of {data.total} traces
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Request
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Service
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Duration
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Spans
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((trace) => (
                  <tr key={trace.id}>
                    <td className="py-2 pr-4">
                      <Link
                        to={`/traces/${trace.id}`}
                        className="font-medium underline underline-offset-4"
                      >
                        {trace.operation}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{trace.service}</td>
                    <td className="py-2 pr-4">{STATUS_LABELS[trace.status]}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatDuration(trace.durationMs)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {trace.spanCount}
                    </td>
                    <td className="py-2 whitespace-nowrap tabular-nums">
                      {formatDateTime(trace.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
