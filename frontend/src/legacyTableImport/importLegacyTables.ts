import map from 'virtual:legacy-table-config-map';
import { importUserTableConfigs } from '../appData';
import { convertTables } from './convertLegacyTableConfig';
import { LEGACY_TABLE_KEY_PREFIX } from './legacyTableImportState';

/*
 * The lazy half of the one-time import of the React front end's table layouts
 * (#2072), loaded only for a user with old layouts to import. Lazy-only
 * (vite/lazyChunkGuard.ts): it carries the table id map.
 */

/**
 * The React front end's layouts on this device, by its table id. They are per
 * device, not per user, so every user on the device gets the same ones, as
 * they did in the React front end. A value that isn't valid JSON is skipped.
 */
export const readLegacyTableLayouts = (): Record<string, unknown> => {
  const layouts: Record<string, unknown> = {};
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(LEGACY_TABLE_KEY_PREFIX)) continue;
      try {
        layouts[key.slice(LEGACY_TABLE_KEY_PREFIX.length)] = JSON.parse(
          localStorage.getItem(key) ?? ''
        );
      } catch {
        // Unreadable: nothing to carry over from this table.
      }
    }
  } catch {
    // No storage: nothing to import.
  }
  return layouts;
};

/**
 * Converts every old layout on the device and stores the results as the
 * user's own, skipping any table the user has already set up in this UI, then
 * marks the user's import done. The old keys stay: the React front end, still
 * served at /old-ui/ on the same origin, reads them.
 */
export const importLegacyTables = (userId: string): void => {
  importUserTableConfigs(
    userId,
    convertTables(readLegacyTableLayouts(), map),
    map.version
  );
};
