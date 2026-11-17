import { createEffect, createMemo, createSignal, on } from 'solid-js';
import type { Accessor } from 'solid-js';
import { getLegacyTableImport, setLegacyTableImport } from '../appData';

/*
 * The one-time import of the React front end's table layouts (#2072): whether
 * the current user still needs it, and running it once per user per device.
 *
 * Eager, so it must stay cheap: it reads the user's flag in app data and, if
 * that isn't set, looks for any old layout key. The map and the conversion
 * are in the lazy import chunk, loaded only when there is something to import
 * (vite/lazyChunkGuard.ts keeps them out of the startup bundle).
 */

/** The React front end's localStorage key for a table's layout, per device. */
export const LEGACY_TABLE_KEY_PREFIX = '@openmsupply-client/tables/';

const hasLegacyTableKeys = (): boolean => {
  try {
    for (let index = 0; index < localStorage.length; index++) {
      if (localStorage.key(index)?.startsWith(LEGACY_TABLE_KEY_PREFIX)) {
        return true;
      }
    }
  } catch {
    // No storage: nothing to import.
  }
  return false;
};

/**
 * Whether the user's import still has to run on this device. With no old
 * layouts on the device the import is marked done (version 0) at once, so a
 * device with nothing to import never loads the import chunk.
 */
export const needsLegacyTableImport = (userId: string): boolean => {
  if (getLegacyTableImport(userId) !== undefined) return false;
  if (!hasLegacyTableKeys()) {
    setLegacyTableImport(userId, 0);
    return false;
  }
  return true;
};

const runLegacyTableImport = async (userId: string): Promise<void> => {
  const { importLegacyTables } = await import('./importLegacyTables');
  importLegacyTables(userId);
};

/**
 * Tracks the current user and runs their import when they need it. `ready` is
 * false only while an import is running: the gate holds the app back so that
 * every table mounts reading the imported layouts. The user is tracked rather
 * than read once because the re-login modal can sign a different user in
 * without unmounting the app.
 *
 * An import that fails (the chunk can't load, say) still opens the gate, with
 * the flag unset, so it is tried again next time rather than holding the app
 * at the loading screen.
 */
export const createLegacyTableImport = (
  userId: Accessor<string | undefined>,
  runImport: (userId: string) => Promise<void> = runLegacyTableImport
): { ready: Accessor<boolean> } => {
  const [doneFor, setDoneFor] = createSignal<string>();
  const pending = createMemo(() => {
    const id = userId();
    return id !== undefined && id !== doneFor() && needsLegacyTableImport(id)
      ? id
      : undefined;
  });
  createEffect(
    on(pending, id => {
      if (id === undefined) return;
      void runImport(id)
        .catch(error =>
          console.error('[legacy table import] import failed', error)
        )
        .finally(() => setDoneFor(id));
    })
  );
  return { ready: () => pending() === undefined };
};
