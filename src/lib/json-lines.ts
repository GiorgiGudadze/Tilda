/**
 * Splits text that arrives in chunks into complete lines.
 *
 * A network delivers a stream in pieces of any size, so a chunk can end in
 * the middle of a line. The unfinished part is kept and joined with the next
 * chunk. Empty lines are dropped.
 */
export function createLineSplitter() {
  let unfinished = '';

  return {
    /** Adds a chunk and returns the lines it completed. */
    push(chunk: string): string[] {
      const parts = (unfinished + chunk).split('\n');
      // The last part has no line break after it yet.
      unfinished = parts.pop() ?? '';
      return parts.filter((line) => line.trim() !== '');
    },

    /** Call when the stream ends. Returns the last line if it had no line break. */
    end(): string[] {
      const last = unfinished;
      unfinished = '';
      return last.trim() === '' ? [] : [last];
    },
  };
}
