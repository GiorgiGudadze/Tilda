import { describe, expect, it } from 'vitest';
import { directionOf, nextSort, SORT_OPTIONS } from '@/features/traces/sort';
import { sortSchema } from '@/features/traces/schemas';

describe('sorting by a column', () => {
  it('knows which way each order sorts each column', () => {
    expect(directionOf('slowest', 'duration')).toBe('descending');
    expect(directionOf('fastest', 'duration')).toBe('ascending');
    expect(directionOf('newest', 'started')).toBe('descending');
    expect(directionOf('oldest', 'started')).toBe('ascending');
    expect(directionOf('newest', 'duration')).toBeNull();
    expect(directionOf('slowest', 'started')).toBeNull();
  });

  it('starts an unsorted column with its first order', () => {
    expect(nextSort('newest', 'duration')).toBe('slowest');
    expect(nextSort('fastest', 'started')).toBe('newest');
  });

  it('turns a sorted column around', () => {
    expect(nextSort('slowest', 'duration')).toBe('fastest');
    expect(nextSort('fastest', 'duration')).toBe('slowest');
    expect(nextSort('newest', 'started')).toBe('oldest');
    expect(nextSort('oldest', 'started')).toBe('newest');
  });

  it('names every order the API knows, once', () => {
    expect(SORT_OPTIONS.map((option) => option.value).sort()).toEqual(
      [...sortSchema.options].sort(),
    );
  });
});
