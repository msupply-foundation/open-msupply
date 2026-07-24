/* ==========================================================================
 *  GLOBAL COLUMN CONFIG  —  tune column widths here
 * --------------------------------------------------------------------------
 *  This is the ONE place to adjust the default width of any table column
 *  type or common column. It feeds `getCellDefinition` in tableHelpers.tsx;
 *  see docs/CELL_TYPES.md for the full model and kdd/column-config for why
 *  it's shaped this way (rem authoring, two layers, CSS delivery).
 *
 *  Two layers, in override order:
 *    • KIND_WIDTH — per cell TYPE (all numbers, all dates, …). The
 *      baseline, sized to the column's CONTENT.
 *    • CELL_DEF — per column KEY. Maps a common key (e.g. 'packSize') to
 *      its cell kind, plus an OPTIONAL size/maxSize that beats the kind
 *      default. This is where a column's HEADER label width is accounted
 *      for (a number is narrow, but "Pack quantity" is not), or a key is
 *      intentionally tighter (e.g. invoiceNumber).
 *
 *  👉  DEVS: to make a column wider/narrower, edit the rem numbers below.
 *      • `size`    = the default width. A SOFT floor (min-width): the
 *        user can still drag the column narrower OR wider than this.
 *      • `maxSize` = an OPTIONAL hard growth cap (rare — most columns
 *        omit it so they stay freely draggable; keep it only for
 *        genuinely fixed things like the comment icon or short codes).
 *      All values are REM (converted to px for TanStack, which sizes in
 *      px). For a one-off tweak in one table, override size/maxSize
 *      inline on that column def instead of changing the shared value.
 *
 *  ⚠  These widths are tuned for the DEFAULT English header strings;
 *      other languages have longer/shorter labels and will likely need
 *      different values. TODO: make these configs per-language.
 * ========================================================================== */

// The arg-free cell types getCellDefinition can resolve to.
export type CellKind =
  | 'text'
  | 'shortText'
  | 'code'
  | 'number'
  | 'percentage'
  | 'currency'
  | 'date'
  | 'expiry'
  | 'comment'
  | 'chipList';

// Default column widths per cell type (docs/CELL_TYPES.md — the authoritative
// inventory), in REM. `size` = the default = the min-width FLOOR, but a SOFT
// one (a drag overrides it both ways down to TanStack's minSize). `maxSize` =
// the growth cap; OMITTED on flex/sink columns (text, currency, chip list) so
// they absorb the table's slack. Char counts are the intent behind the rem
// values. A per-KEY override lives in CELL_DEF below.
export const KIND_WIDTH: Record<CellKind, { size: number; maxSize?: number }> =
  {
    text: { size: 18.75 },
    shortText: { size: 8 },
    code: { size: 5, maxSize: 7 }, // ~9 chars (a real cap, per the batch case)
    // No maxSize on numbers/percentages/dates: `size` is a good default and the
    // user should be free to drag them as wide as they like (Carl 2026-07-24).
    number: { size: 4.5 },
    percentage: { size: 4.5 },
    currency: { size: 7.5 },
    date: { size: 8.125 },
    expiry: { size: 8.125 },
    comment: { size: 3, maxSize: 3 }, // fixed — an icon, never grows
    chipList: { size: 12 },
  };

// Each common column key → its cell `kind` (the rendering) plus optional
// per-KEY width overrides (rem) that beat the kind's KIND_WIDTH default. This
// is THE place per-key widths live (the kind default is content-driven; the
// per-key size also accounts for the column's HEADER label, which is usually
// the wider constraint — e.g. a number is narrow but "Pack quantity" is not).
// invoiceNumber is narrower than a generic number. size/maxSize in rem; omitted
// → the kind default. NOTE: the header-aware sizes below are first-cut
// estimates — tune them here against the rendered table.
export type CellSpec = { kind: CellKind; size?: number; maxSize?: number };
export const CELL_DEF = {
  // Text — the flex-fill "sink" columns.
  itemName: { kind: 'text' },
  name: { kind: 'text' },
  otherPartyName: { kind: 'text' },
  description: { kind: 'text' },
  prescriber: { kind: 'text' },
  manufacturer: { kind: 'text' },
  locationName: { kind: 'text' },
  nextOfKinName: { kind: 'text' },
  directions: { kind: 'text' },
  // Short text — narrow free text, not the sink.
  reference: { kind: 'shortText' },
  theirReference: { kind: 'shortText' },
  note: { kind: 'shortText' },
  initials: { kind: 'shortText' },
  firstName: { kind: 'shortText' },
  lastName: { kind: 'shortText' },
  gender: { kind: 'shortText' },
  email: { kind: 'shortText' },
  phone: { kind: 'shortText' },
  mobile: { kind: 'shortText' },
  unit: { kind: 'shortText' },
  unitName: { kind: 'shortText', size: 2 },
  // Code / identifier.
  code: { kind: 'code' },
  itemCode: { kind: 'code' },
  code2: { kind: 'code' },
  batch: { kind: 'code' },
  location: { kind: 'code', size: 6.5 }, // header "Location"
  // Number — size widened where the header label is the binding constraint.
  packSize: { kind: 'number', size: 5 }, // "Pack size"
  numberOfPacks: { kind: 'number', size: 4.5 }, // "Pack quantity"
  countedNumberOfPacks: { kind: 'number', size: 8 },
  receivedNumberOfPacks: { kind: 'number', size: 8 },
  availablePacks: { kind: 'number', size: 7 },
  volumePerPack: { kind: 'number', size: 7 },
  units: { kind: 'number' },
  dosesPerUnit: { kind: 'number', size: 7 },
  doses: { kind: 'number' },
  requestedQuantity: { kind: 'number', size: 8 },
  poQuantity: { kind: 'number', size: 7 },
  remaining: { kind: 'number' },
  difference: { kind: 'number', size: 7 }, // "Difference"
  unitQuantity: { kind: 'number', size: 5 }, // "Unit quantity"
  // A short id — only ever a few digits, so tighter than a generic number.
  invoiceNumber: { kind: 'number', size: 3.5 },
  // Percentage.
  taxPercentage: { kind: 'percentage' },
  // Currency — "Pack sell price" / "Pack cost price" headers need the room.
  sellPricePerPack: { kind: 'currency', size: 9 },
  costPricePerPack: { kind: 'currency', size: 7 },
  totalAfterTax: { kind: 'currency' },
  totalBeforeTax: { kind: 'currency' },
  total: { kind: 'currency', size: 4 },
  lineTotal: { kind: 'currency' },
  // Date.
  createdDatetime: { kind: 'date' },
  deliveredDatetime: { kind: 'date' },
  confirmedDatetime: { kind: 'date' },
  manufactureDate: { kind: 'date', size: 10 }, // "Manufacture date"
  dateOfBirth: { kind: 'date' },
  datetime: { kind: 'date' },
  date: { kind: 'date' },
  startDatetime: { kind: 'date' },
  enrolmentDatetime: { kind: 'date' },
  // Expiry (date + near-expiry error tone).
  expiryDate: { kind: 'expiry' },
  // Comment (icon + popover).
  comment: { kind: 'comment' },
  // Chip list.
  masterLists: { kind: 'chipList' },
} satisfies Record<string, CellSpec>;

// The closed union of keys getCellDefinition accepts.
export type CellDefinitionKey = keyof typeof CELL_DEF;
