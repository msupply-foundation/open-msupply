// The old-UI/new-UI choice (issue #1075) is device-local like everything in
// appData.ts, but this ONE key is different: the sibling legacy "old UI" — a
// separate codebase, served from the same origin at /old-ui/ — reads and
// writes it too. Folding it into appData.ts's typed JSON blob would force
// that other app to safely read-merge-write our shape just to flip one bit,
// so it deliberately sits outside both apps' own preference conventions as a
// single plain key with a raw string value.
const STORAGE_KEY = 'oms-preferred-frontend';

// Whether this device should be bounced to the old UI instead of showing this
// app's own login page. Nothing is stored for "new" — absence of the key (or
// any other value old UI might write there) already means new.
export const prefersOldUi = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'old';
  } catch {
    return false;
  }
};

// Recorded when the user follows the login page's link to the old UI.
export const recordPrefersOldUi = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, 'old');
  } catch {
    // storage unavailable (private mode) — the choice just won't survive a
    // reload, same trade-off as every other appData preference.
  }
};
