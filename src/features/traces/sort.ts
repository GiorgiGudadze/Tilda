import type { Sort } from '@/features/traces/schemas';

/** The orders of the list, as the Sort dropdown names them. */
export const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'slowest', label: 'Slowest first' },
  { value: 'fastest', label: 'Fastest first' },
];

/**
 * The columns of the table that can be sorted, each with its two orders.
 * `descending` is the one a first click picks: the slowest or the newest,
 * which is what someone looking for trouble wants to see first.
 */
const SORT_COLUMNS = {
  duration: { descending: 'slowest', ascending: 'fastest' },
  started: { descending: 'newest', ascending: 'oldest' },
} as const satisfies Record<string, { descending: Sort; ascending: Sort }>;

export type SortColumn = keyof typeof SORT_COLUMNS;
type SortDirection = 'descending' | 'ascending';

/** How the list is sorted by this column, or `null` when it is not. */
export function directionOf(
  sort: Sort,
  column: SortColumn,
): SortDirection | null {
  const orders = SORT_COLUMNS[column];
  return sort === orders.descending
    ? 'descending'
    : sort === orders.ascending
      ? 'ascending'
      : null;
}

/**
 * The order after a click on a column header: the other direction of a
 * column that is sorted already, or the first direction of one that is not.
 */
export function nextSort(sort: Sort, column: SortColumn): Sort {
  const orders = SORT_COLUMNS[column];
  return directionOf(sort, column) === 'descending'
    ? orders.ascending
    : orders.descending;
}
