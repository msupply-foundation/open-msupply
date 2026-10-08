import { createSharedPrompt } from './sharedPrompt';

// The bug this exists for (#544): a changed server certificate raises
// `certificate-error` once per in-flight request, and each event awaited its
// own dialog, so the user was left dismissing dozens of identical windows.
describe('createSharedPrompt', () => {
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('asks once for concurrent callers and answers them all the same', async () => {
    const shared = createSharedPrompt<boolean>();
    const dialog = deferred<boolean>();
    const ask = jest.fn(() => dialog.promise);

    // three requests raise the error before the user has answered
    const answers = [
      shared('server-a', ask),
      shared('server-a', ask),
      shared('server-a', ask),
    ];

    expect(ask).toHaveBeenCalledTimes(1);

    dialog.resolve(true);
    expect(await Promise.all(answers)).toEqual([true, true, true]);
  });

  it('asks again for a different key — a different certificate is a new question', async () => {
    const shared = createSharedPrompt<boolean>();
    const ask = jest.fn(() => Promise.resolve(true));

    await shared('server-a:fingerprint-1', ask);
    await shared('server-a:fingerprint-2', ask);

    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('asks again once the previous answer has settled', async () => {
    const shared = createSharedPrompt<boolean>();
    const ask = jest.fn(() => Promise.resolve(false));

    expect(await shared('server-a', ask)).toBe(false);
    // the user declined; if they are asked later it must be a fresh prompt and
    // not a replay of the stale answer
    expect(await shared('server-a', ask)).toBe(false);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('gives every waiting caller the rejection, and does not wedge the key', async () => {
    const shared = createSharedPrompt<boolean>();
    const dialog = deferred<boolean>();
    const failing = jest.fn(() => dialog.promise);

    const first = shared('server-a', failing);
    const second = shared('server-a', failing);
    dialog.reject(new Error('dialog closed'));

    await expect(first).rejects.toThrow('dialog closed');
    await expect(second).rejects.toThrow('dialog closed');

    // the failed entry is gone, so the next caller really asks
    const succeeding = jest.fn(() => Promise.resolve(true));
    expect(await shared('server-a', succeeding)).toBe(true);
    expect(succeeding).toHaveBeenCalledTimes(1);
  });

  it('a synchronous throw rejects rather than storing a broken entry', async () => {
    const shared = createSharedPrompt<boolean>();
    const throwing = () => {
      throw new Error('no window');
    };

    await expect(shared('server-a', throwing)).rejects.toThrow('no window');

    const ask = jest.fn(() => Promise.resolve(true));
    expect(await shared('server-a', ask)).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });
});
