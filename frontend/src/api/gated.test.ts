import { createResource, createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notFound } from './gated';

/*
 * A detail read's not-found (#1746): its fetcher resolves `null` for the
 * server's own "no such record" and `undefined` for a read that failed. Only
 * the first is the screen's not-found notice; a failure has the global error
 * modal up, and the screen keeps its spinner under it.
 */

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
});

const read = <T>(fetcher: () => Promise<T>) =>
  createRoot(d => {
    dispose = d;
    const [resource] = createResource(fetcher);
    return resource;
  });

describe('notFound', () => {
  it('is the server answering the id as no record', async () => {
    const resource = read(async () => null);
    await vi.waitFor(() => expect(resource.state).toBe('ready'));
    expect(notFound(resource)).toBe(true);
  });

  it('is not a read that failed', async () => {
    const resource = read(async () => undefined);
    await vi.waitFor(() => expect(resource.state).toBe('ready'));
    expect(notFound(resource)).toBe(false);
  });

  it('is not a read still in flight', () => {
    const resource = read(() => new Promise<null>(() => {}));
    expect(resource.state).toBe('pending');
    expect(notFound(resource)).toBe(false);
  });

  it('is not a record that was found', async () => {
    const resource = read(async () => ({ id: 'a' }));
    await vi.waitFor(() => expect(resource.state).toBe('ready'));
    expect(notFound(resource)).toBe(false);
  });
});
