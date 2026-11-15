/** The DOM id of a span's row, so a link elsewhere can move focus to it. */
export function spanRowId(spanId: string): string {
  return `span-row-${spanId}`;
}
