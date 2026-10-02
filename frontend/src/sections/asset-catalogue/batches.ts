// How this vertical sends many writes: a batch at a time, each batch in
// parallel — the import's rows and a bulk delete's records alike, ten at a
// time as the reference sends them (contract § bulk import).

export const WRITE_CONCURRENCY = 10;

/** Run `fn` over `items` a batch at a time; results come back in input order.
 *  `onBatch` hears the results so far after each batch. */
export const mapInBatches = async <T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  onBatch: (results: readonly R[]) => void = () => {},
  size = WRITE_CONCURRENCY
): Promise<R[]> => {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(
      ...(await Promise.all(items.slice(start, start + size).map(fn)))
    );
    onBatch(results);
  }
  return results;
};
