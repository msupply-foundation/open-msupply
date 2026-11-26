import type { SimpleCommonMedicinesResult } from './simpleDispensing.generated';
import type {
  CommonMedicineItemsResult,
  UpsertCommonMedicinesVariables,
} from './commonMedicinesEditor.generated';

/*
 * The common medicines editor's list (spec/prescriptions › setting up the
 * common medicines), as plain data: what it reads into a draft, what makes a
 * draft unsaveable, and what a save sends. The dialog owns the draft as a
 * store; these never touch it.
 */

/** A medicine has three places for an amount (rules › common medicines). */
export const AMOUNT_PLACES = 3;
/**
 * The largest amount a place takes (front end only: the server sets none).
 * A sensible ceiling, so a mistyped 100000 never becomes a one-press button.
 */
export const MAX_AMOUNT = 9999;
/** More than this won't fit on one screen at a counter: warned, not capped. */
export const COMFORTABLE_COUNT = 12;

type ListedMedicine = SimpleCommonMedicinesResult['commonMedicines'][number];
type EditorItem = Extract<
  CommonMedicineItemsResult['items'],
  { __typename: 'ItemConnector' }
>['nodes'][number];

/** One medicine on the draft: its item, and an amount (or none) per place. */
export interface EditorRow {
  item: EditorItem;
  /** Always AMOUNT_PLACES long; `undefined` is an empty place. */
  amounts: (number | undefined)[];
}

/** A row's places, from a saved list's amounts (at most three of them). */
const places = (amounts: readonly number[]): (number | undefined)[] =>
  Array.from({ length: AMOUNT_PLACES }, (_, i) => amounts[i]);

/**
 * The draft for a store's saved list, in its order. A listed medicine the item
 * read didn't return isn't an active stock item any more, so a save can't name
 * it: it is left out and counted (rules › setting up the common medicines).
 */
export const draftFrom = (
  list: readonly ListedMedicine[],
  items: readonly EditorItem[]
): { rows: EditorRow[]; dropped: number } => {
  const byId = new Map(items.map(item => [item.id, item]));
  const rows: EditorRow[] = [];
  let dropped = 0;
  for (const medicine of list) {
    const item = byId.get(medicine.itemId);
    if (item) rows.push({ item, amounts: places(medicine.amounts) });
    else dropped += 1;
  }
  return { rows, dropped };
};

/** A medicine added from the search: no amounts yet. */
export const newRow = (item: EditorItem): EditorRow => ({
  item,
  amounts: places([]),
});

/**
 * Which places repeat an amount held by an earlier place of the same
 * medicine: two buttons for one amount do the same thing, and the server
 * refuses them. The first stays valid; the later one carries the error.
 */
export const repeatedPlaces = (
  amounts: readonly (number | undefined)[]
): boolean[] =>
  amounts.map(
    (amount, i) => amount !== undefined && amounts.slice(0, i).includes(amount)
  );

/** Whether any medicine on the draft repeats an amount. */
export const hasRepeats = (rows: readonly EditorRow[]): boolean =>
  rows.some(row => repeatedPlaces(row.amounts).some(Boolean));

/**
 * What a save sends: the whole list in order, each medicine's amounts closed
 * up in the order typed, so an empty place before an amount isn't kept.
 */
export const saveInput = (
  rows: readonly EditorRow[]
): UpsertCommonMedicinesVariables['input'] =>
  rows.map(row => ({
    itemId: row.item.id,
    amounts: row.amounts.filter(
      (amount): amount is number => amount !== undefined
    ),
  }));

/** Rows in a new order, by item id; ids not on the draft are ignored. */
export const reordered = (
  rows: readonly EditorRow[],
  orderedIds: readonly string[]
): EditorRow[] => {
  const byId = new Map(rows.map(row => [row.item.id, row]));
  return orderedIds.flatMap(id => byId.get(id) ?? []);
};
