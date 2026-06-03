// Standalone CSV helpers — kept out of common's main barrel so that the
// ~19KB `papaparse` library doesn't ship in the federation-shared
// bundle (most pages never export or import a CSV).
import Papa, { UnparseConfig, UnparseObject } from 'papaparse';

export { Papa };
export type { UnparseConfig, UnparseObject };

/** Build a CSV string from a list of records. Was `Formatter.csv`. */
export const toCsv = (
  data: unknown[] | UnparseObject<unknown>,
  config?: UnparseConfig
): string => Papa.unparse(data, config);
