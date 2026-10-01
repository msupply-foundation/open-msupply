import type { Rejection } from '@/api/rejection';
import type { PluginRow } from './pluginRows';

/*
 * Uninstalling selected rows (spec/plugin-management/rules.md › uninstalling
 * plugins): each row on its own, so a refusal of one never stops the others.
 * Sequential rather than parallel, because the server addresses a row by id
 * alone — two selected rows sharing an id (a backend and a frontend plugin)
 * must go one call after the other (contract › uninstalling plugins).
 */

export type UninstallOne = (
  id: string
) => Promise<{ ok: true } | { ok: false; rejection: Rejection }>;

export interface RefusedUninstall {
  row: PluginRow;
  rejection: Rejection;
}

export interface UninstallOutcome {
  /** How many rows the server reported uninstalled. */
  uninstalled: number;
  refused: RefusedUninstall[];
}

export const uninstallRows = async (
  rows: readonly PluginRow[],
  uninstallOne: UninstallOne
): Promise<UninstallOutcome> => {
  const refused: RefusedUninstall[] = [];
  let uninstalled = 0;
  for (const row of rows) {
    const result = await uninstallOne(row.id);
    if (result.ok) uninstalled += 1;
    else refused.push({ row, rejection: result.rejection });
  }
  return { uninstalled, refused };
};
