/**
 * Ask a question once, however many callers need its answer.
 *
 * Electron's `certificate-error` fires per REQUEST — the document, every
 * script and stylesheet, and every GraphQL call each arrive separately — and
 * every one of them has its own callback that has to be answered. Awaiting a
 * dialog in the handler therefore opened one window per request, and a changed
 * server certificate left the user dismissing dozens of identical prompts
 * (#544).
 *
 * The first caller for a key runs the prompt; callers that arrive while it is
 * in flight get the same promise, so they all resolve with the one answer the
 * user actually gave. The entry is dropped once it settles, so a later
 * question under the same key asks again rather than replaying a stale answer.
 *
 * Kept apart from electron.ts, with no Electron import, so the sharing can be
 * tested without standing up a main process.
 */
export const createSharedPrompt = <T>() => {
  const inFlight = new Map<string, Promise<T>>();

  return (key: string, ask: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    // `ask()` may throw synchronously; keep that a rejected promise so a
    // caller cannot be left waiting on an entry that was never stored.
    let promise: Promise<T>;
    try {
      promise = ask();
    } catch (error) {
      return Promise.reject(error);
    }

    inFlight.set(key, promise);
    // Registered BEFORE the promise is handed out, so this reaction runs
    // before any caller's continuation: promise reactions run in registration
    // order, which means the entry is already gone by the time a caller acts
    // on the answer. Chaining the cleanup behind a `.catch` instead put it two
    // microtasks late, and a caller that asked again the moment it had its
    // answer got the settled entry replayed. Both arms delete, so a rejected
    // prompt does not wedge the key — and handling the rejection here keeps it
    // from surfacing as an unhandled one, while every caller still sees it
    // through the promise they were given.
    promise.then(
      () => inFlight.delete(key),
      () => inFlight.delete(key)
    );

    return promise;
  };
};
