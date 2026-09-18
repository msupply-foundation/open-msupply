import type { PrescriptionHistoryResult } from './history.generated';

// The recently-prescribed rows (spec/prescriptions/rules.md § history;
// AC-H1): one row per ITEM per prescription — an item's lines merged, units
// summed, the directions note carried from the first line that has one.

type HistoryInvoice = PrescriptionHistoryResult['invoices']['nodes'][number];

export interface HistoryRow {
  /** Stable per prescription+item. */
  id: string;
  itemName: string;
  units: number;
  directions: string;
  /** The dispense date — picked when set, else created. */
  date: string;
  prescriber: string;
}

export const historyRows = (invoices: HistoryInvoice[]): HistoryRow[] =>
  invoices.flatMap(invoice => {
    const byItem = new Map<
      string,
      { itemName: string; units: number; directions: string }
    >();
    for (const line of invoice.lines.nodes) {
      const existing = byItem.get(line.itemId);
      const units = line.numberOfPacks * line.packSize;
      if (existing) {
        existing.units += units;
        if (!existing.directions && line.note) existing.directions = line.note;
      } else {
        byItem.set(line.itemId, {
          itemName: line.itemName,
          units,
          directions: line.note ?? '',
        });
      }
    }
    const clinician = invoice.clinician
      ? `${invoice.clinician.lastName}, ${invoice.clinician.firstName}`
      : '';
    return [...byItem.entries()].map(([itemId, item]) => ({
      id: `${invoice.id}-${itemId}`,
      itemName: item.itemName,
      units: item.units,
      directions: item.directions,
      date: invoice.pickedDatetime ?? invoice.createdDatetime,
      prescriber: clinician,
    }));
  });
