import { describe, expect, it } from 'vitest';
import {
  initialStreamState,
  type StreamAction,
  streamReducer,
  type StreamState,
} from '@/features/suggestion/reducer';
import type { Outcome } from '@/features/suggestion/schemas';

const finding: Outcome = {
  kind: 'finding',
  confidence: 'high',
  basis: '78% of trace time',
  evidenceSpanIds: ['s5'],
};

const meta: StreamAction = {
  type: 'event',
  event: { type: 'meta', outcome: finding },
};
const text = (value: string): StreamAction => ({
  type: 'event',
  event: { type: 'text', text: value },
});
const done: StreamAction = { type: 'event', event: { type: 'done' } };

/** The state after these actions, starting from idle. */
function after(...actions: StreamAction[]): StreamState {
  return actions.reduce(streamReducer, initialStreamState);
}

describe('streamReducer', () => {
  it('starts idle', () => {
    expect(initialStreamState).toEqual({ status: 'idle' });
  });

  it('starts streaming with no text and no outcome', () => {
    expect(after({ type: 'started' })).toEqual({
      status: 'streaming',
      text: '',
      outcome: null,
    });
  });

  it('collects the outcome and the text as they arrive', () => {
    expect(after({ type: 'started' }, meta, text('Most '), text('of'))).toEqual(
      { status: 'streaming', text: 'Most of', outcome: finding },
    );
  });

  it('is done when the done line arrives', () => {
    expect(
      after({ type: 'started' }, meta, text('Most '), text('of it.'), done),
    ).toEqual({
      status: 'done',
      suggestion: { text: 'Most of it.', outcome: finding },
    });
  });

  it('keeps a "no finding" outcome as a finished suggestion', () => {
    const noFinding: StreamAction = {
      type: 'event',
      event: { type: 'meta', outcome: { kind: 'no-finding' } },
    };
    expect(after({ type: 'started' }, noFinding, text('Fine.'), done)).toEqual({
      status: 'done',
      suggestion: { text: 'Fine.', outcome: { kind: 'no-finding' } },
    });
  });

  it('is an error when the stream is done but never said what it found', () => {
    expect(after({ type: 'started' }, text('Most'), done)).toEqual({
      status: 'error',
    });
  });

  it('is an error when the stream closes before its done line', () => {
    expect(
      after({ type: 'started' }, meta, text('Most'), { type: 'ended' }),
    ).toEqual({ status: 'error' });
  });

  it('stays done when the stream closes after its done line', () => {
    const state = after({ type: 'started' }, meta, text('Most.'), done);
    expect(streamReducer(state, { type: 'ended' })).toBe(state);
  });

  it('is an error when the request fails', () => {
    expect(after({ type: 'started' }, meta, { type: 'failed' })).toEqual({
      status: 'error',
    });
  });

  it('is cancelled when the user stops it, and drops the partial text', () => {
    expect(
      after({ type: 'started' }, meta, text('Most'), { type: 'stopped' }),
    ).toEqual({ status: 'cancelled' });
  });

  it('ignores lines that arrive after it was stopped', () => {
    const stopped = after({ type: 'started' }, meta, { type: 'stopped' });
    expect(streamReducer(stopped, text('late'))).toBe(stopped);
    expect(streamReducer(stopped, done)).toBe(stopped);
    expect(streamReducer(stopped, { type: 'failed' })).toBe(stopped);
  });

  it('ignores Stop when nothing is streaming', () => {
    expect(after({ type: 'stopped' })).toEqual({ status: 'idle' });
    const finished = after({ type: 'started' }, meta, text('Most.'), done);
    expect(streamReducer(finished, { type: 'stopped' })).toBe(finished);
  });

  it.each<[string, StreamAction[]]>([
    ['an error', [{ type: 'started' }, { type: 'failed' }]],
    ['a stop', [{ type: 'started' }, { type: 'stopped' }]],
    ['a finished suggestion', [{ type: 'started' }, meta, text('x'), done]],
  ])('starts again from scratch after %s', (_name, actions) => {
    expect(streamReducer(after(...actions), { type: 'started' })).toEqual({
      status: 'streaming',
      text: '',
      outcome: null,
    });
  });
});
