import { describe, expect, it } from 'vitest';
import { createComputed, createRoot } from 'solid-js';
import { createStoreScopedResource } from './storeScopedResource';

/*
 * The resource-path equal-data boundary (kdd/state-management decision 5;
 * kdd/solid-reactivity-pitfalls §16). Two churn sources meet at noSuspense():
 * Solid flips `resource.state` on EVERY load (ready → refreshing → ready)
 * regardless of the value, and a fetcher that derives (sort, parse) rebuilds
 * its array every load. The invariant under test: a refetch that returns
 * structurally equal data notifies NO consumer, and consumers keep the
 * ORIGINAL array reference — that is what makes an unchanged post-sync
 * refresh imperceptible (OMS-REG-SYNC-03.32). A real change still publishes,
 * exactly once.
 */

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

type Row = { id: string; priority: number };

// A fetcher that parks every call as a deferred, so tests choose what each
// load returns — including a REBUILT-but-equal array (the vvmStatus /
// tableConfig shape: a fresh `[...nodes].sort()` per load).
const createFetcher = () => {
  const calls: Deferred<Row[] | undefined>[] = [];
  const fetcher = (_storeId: string) => {
    const d = deferred<Row[] | undefined>();
    calls.push(d);
    return d.promise;
  };
  return { calls, fetcher };
};

// Let the fetcher wrapper's and createResource's continuations run (they are
// microtasks queued behind the resolved deferred).
const settle = () => new Promise<void>(r => setTimeout(r));

const rows = (): Row[] => [
  { id: 'stage-2', priority: 2 },
  { id: 'stage-1', priority: 1 },
];

describe('createStoreScopedResource noSuspense identity', () => {
  it('an unchanged refetch notifies nobody and keeps the original array; a real change publishes once', async () => {
    const { calls, fetcher } = createFetcher();
    const res = createStoreScopedResource<Row>(() => 'store-1', fetcher);

    let runs = 0;
    const dispose = createRoot(d => {
      createComputed(() => {
        res.noSuspense();
        runs++;
      });
      return d;
    });
    expect(runs).toBe(1); // pending → []

    calls[0].resolve(rows());
    await settle();
    expect(runs).toBe(2); // first data: one publication
    const original = res.noSuspense();
    expect(original.map(r => r.id)).toEqual(['stage-2', 'stage-1']);

    // Refetch resolving to a REBUILT but structurally equal array: neither the
    // ready → refreshing → ready state churn nor the fresh reference reaches a
    // consumer, and the held array is still the original object.
    const refetching = res.refetch();
    expect(runs).toBe(2); // 'refreshing' flip alone must not notify
    calls[1].resolve(rows());
    await refetching;
    await settle();
    expect(runs).toBe(2);
    expect(res.noSuspense()).toBe(original);

    // A refetch with actually different data publishes, exactly once.
    const changed = res.refetch();
    calls[2].resolve([...rows(), { id: 'stage-3', priority: 3 }]);
    await changed;
    await settle();
    expect(runs).toBe(3);
    expect(res.noSuspense()).toHaveLength(3);
    expect(res.noSuspense()).not.toBe(original);

    dispose();
  });

  it('failed fetches fall back to one stable empty list — no publication for [] → []', async () => {
    const { calls, fetcher } = createFetcher();
    const res = createStoreScopedResource<Row>(() => 'store-1', fetcher);

    let runs = 0;
    const dispose = createRoot(d => {
      createComputed(() => {
        res.noSuspense();
        runs++;
      });
      return d;
    });
    expect(runs).toBe(1);
    const empty = res.noSuspense();

    // First load fails (fetcher → undefined → []): structurally equal to the
    // pending fallback [], so consumers see nothing change.
    calls[0].resolve(undefined);
    await settle();
    expect(runs).toBe(1);
    expect(res.noSuspense()).toBe(empty);

    // A failed refetch mints another fresh [] internally — still no
    // publication, still the same held array.
    const refetching = res.refetch();
    calls[1].resolve(undefined);
    await refetching;
    await settle();
    expect(runs).toBe(1);
    expect(res.noSuspense()).toBe(empty);

    dispose();
  });
});
