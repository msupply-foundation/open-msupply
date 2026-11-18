import { createSignal } from 'solid-js';

/*
 * Bumped each time an import of the React front end's table layouts finishes
 * (#2072). createTableConfig tracks it, so a table that is already open
 * re-reads the user's layouts: the re-login modal can sign a different user
 * in on an open screen, and that user's import runs with the screen left in
 * place.
 *
 * A module of its own so that createTableConfig, which plugins reach too,
 * doesn't import the import code and, through it, the table id map.
 */
const [version, setVersion] = createSignal(0);

export const legacyTableImportVersion = version;

export const bumpLegacyTableImportVersion = (): void => {
  setVersion(current => current + 1);
};
