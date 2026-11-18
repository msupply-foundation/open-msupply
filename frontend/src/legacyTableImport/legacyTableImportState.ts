import { createEffect, createSignal, on, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { getLegacyTableImport, setLegacyTableImport } from '../appData';
import { bumpLegacyTableImportVersion } from './legacyTableImportVersion';

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
 * Whether the user's import still has to run on this device: it hasn't run
 * for them yet, and the device has old layouts. A pure read, so a render can
 * ask it.
 */
export const needsLegacyTableImport = (userId: string): boolean =>
  getLegacyTableImport(userId) === undefined && hasLegacyTableKeys();

const runLegacyTableImport = async (userId: string): Promise<void> => {
  const { importLegacyTables } = await import('./importLegacyTables');
  importLegacyTables(userId);
};

/**
 * Runs the import for the current user, and again for each user the re-login
 * modal signs in later. `ready` is false only while the first user's import
 * runs, before the app first renders, so that the first screen opens with the
 * imported layouts. A later user's import runs while the app stays mounted,
 * since taking an open screen down would lose what is on it (open dialogs,
 * unsaved input); the open tables pick the layouts up through
 * legacyTableImportVersion.
 *
 * With no old layouts on the device, the user's import is marked done
 * (version 0) at once, so layouts the old UI saves later are never imported,
 * and the import chunk is never loaded.
 *
 * An import that fails (the chunk can't load, say) still opens the app, with
 * the flag unset. It runs again at the user's next sign-in, which mounts this
 * afresh.
 */
export const createLegacyTableImport = (
  userId: Accessor<string | undefined>,
  runImport: (userId: string) => Promise<void> = runLegacyTableImport
): { ready: Accessor<boolean> } => {
  const firstUserId = untrack(userId);
  const [ready, setReady] = createSignal(
    firstUserId === undefined || !needsLegacyTableImport(firstUserId)
  );
  const running = new Set<string>();
  createEffect(
    on(userId, id => {
      if (id === undefined || running.has(id)) return;
      if (getLegacyTableImport(id) !== undefined) return;
      if (!hasLegacyTableKeys()) {
        setLegacyTableImport(id, 0);
        return;
      }
      running.add(id);
      void runImport(id)
        .then(bumpLegacyTableImportVersion)
        .catch(error =>
          console.error('[legacy table import] import failed', error)
        )
        .finally(() => {
          running.delete(id);
          setReady(true);
        });
    })
  );
  return { ready };
};
