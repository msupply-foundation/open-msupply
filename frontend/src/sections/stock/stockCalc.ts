// Pure stock calculations (spec/stock), extracted so the screens stay thin and
// the arithmetic is unit-testable in node without a DOM or backend. These mirror
// the server's rules for the UI's previews / pre-validation; the server remains
// the guard for every MUST.

import { localDayToUtc } from '../../ui/elements/inputs/dateTimeConvert';

// Units = packs × pack size; value = packs × cost price (spec/stock rules — a
// quantity in units is packs × pack size, never a stored field).
export const packsToUnits = (packs: number, packSize: number): number =>
  packs * packSize;
export const packsToValue = (packs: number, costPricePerPack: number): number =>
  packs * costPricePerPack;

// Total volume = volume per pack × packs on hand (the server derives the stored
// field the same way — stock_line/update.rs). Computed here so the read-only
// Total volume field tracks the volume-per-pack the user is editing, instead of
// sitting on the last-saved figure (#601).
export const totalVolume = (
  volumePerPack: number,
  totalNumberOfPacks: number
): number => volumePerPack * totalNumberOfPacks;

// Repack (spec/stock rules › repack): the new line's pack count = packs × old
// pack size ÷ new pack size. Undefined when the new pack size is not positive.
export const repackNewPacks = (
  packsToRepack: number,
  oldPackSize: number,
  newPackSize: number
): number | undefined => {
  if (newPackSize <= 0) return undefined;
  return (packsToRepack * oldPackSize) / newPackSize;
};

// Whole packs only (spec/stock OMS-REG-SMV-08.16): the converted quantity
// must be a whole
// number of new packs.
export const isWholePacks = (newPacks: number | undefined): boolean =>
  newPacks !== undefined && Number.isInteger(newPacks);

// The signed adjustment delta in packs (spec/stock S4): additions add, reductions
// subtract; the amount itself is always positive (direction carries the sign).
export const signedAdjustment = (
  direction: 'ADDITION' | 'REDUCTION',
  amount: number
): number => (direction === 'ADDITION' ? amount : -amount);

// The adjusted quantity preview (spec/stock OMS-REG-SMV-02.30).
export const adjustedQuantity = (
  current: number,
  direction: 'ADDITION' | 'REDUCTION',
  amount: number
): number => current + signedAdjustment(direction, amount);

// A reduction preview goes below zero when it would drive available packs
// negative (spec/stock OMS-REG-SMV-02.32 — the below-zero case that
// disables confirm).
export const wouldGoBelowZero = (
  currentAvailable: number,
  direction: 'ADDITION' | 'REDUCTION',
  amount: number
): boolean =>
  direction === 'REDUCTION' &&
  adjustedQuantity(currentAvailable, direction, amount) < 0;

// The backdated instant for an adjustment (spec/stock S4): choosing today (or no
// date) means "not backdated" (undefined); otherwise a reduction is stamped at
// the day's end, an addition at its start.
export const backdatedDatetime = (
  date: string | null,
  today: string,
  direction: 'ADDITION' | 'REDUCTION'
): string | undefined => {
  if (!date || date === today) return undefined;
  // Local day → UTC via the shared conversion (#456): reduction at the day's
  // end, addition at its start (the input is DateTime<Utc>, so `Z` is right).
  return localDayToUtc(date, { endOfDay: direction === 'REDUCTION' });
};
