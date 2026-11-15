import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  /** Starts at 1. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Names the landmark. Needed when a page has more than one. */
  label?: string;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  label = 'Pagination',
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={label}
      className={cn('flex items-center gap-3 text-sm', className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <span className="tabular-nums">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
