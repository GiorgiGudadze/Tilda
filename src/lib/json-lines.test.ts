import { describe, expect, it } from 'vitest';
import { createLineSplitter } from '@/lib/json-lines';

describe('createLineSplitter', () => {
  it('returns each complete line of a chunk', () => {
    const lines = createLineSplitter();
    expect(lines.push('{"a":1}\n{"b":2}\n')).toEqual(['{"a":1}', '{"b":2}']);
    expect(lines.end()).toEqual([]);
  });

  it('joins a line that is split across two chunks', () => {
    const lines = createLineSplitter();
    expect(lines.push('{"type":"me')).toEqual([]);
    expect(lines.push('ta"}\n{"type":"text"}\n')).toEqual([
      '{"type":"meta"}',
      '{"type":"text"}',
    ]);
  });

  it('joins a line that is split across many chunks', () => {
    const lines = createLineSplitter();
    const collected = ['{"a"', ':', '1', '}', '\n'].flatMap((chunk) =>
      lines.push(chunk),
    );
    expect(collected).toEqual(['{"a":1}']);
  });

  it('handles a chunk that ends exactly at a line break', () => {
    const lines = createLineSplitter();
    expect(lines.push('{"a":1}\n')).toEqual(['{"a":1}']);
    expect(lines.push('{"b":2}\n')).toEqual(['{"b":2}']);
  });

  it('returns a last line without a line break when the stream ends', () => {
    const lines = createLineSplitter();
    expect(lines.push('{"a":1}\n{"b":2}')).toEqual(['{"a":1}']);
    expect(lines.end()).toEqual(['{"b":2}']);
    expect(lines.end()).toEqual([]);
  });

  it('drops empty lines', () => {
    const lines = createLineSplitter();
    expect(lines.push('\n{"a":1}\n\n  \n')).toEqual(['{"a":1}']);
  });
});
