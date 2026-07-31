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
 *        A per-key `maxSize: null` drops the kind's cap for that one key.
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
  | 'time'
  | 'expiry'
  | 'comment'
  | 'chipList'
  | 'proportion';

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
    // ~9 chars. A real cap for a column that holds only a code — but a batch
    // column that also renders a WORD outgrows it and then can't be dragged at
    // all, so such a column drops the cap at its call site (the outbound detail
    // table's Batch renders "Placeholder"; `locationCode` does the same via
    // `maxSize: null`). Widen the cap here only with every code column in mind.
    code: { size: 5, maxSize: 7 },
    // No maxSize on numbers/percentages/dates: `size` is a good default and the
    // user should be free to drag them as wide as they like (Carl 2026-07-24).
    number: { size: 4.5 },
    percentage: { size: 4.5 },
    currency: { size: 7.5 },
    date: { size: 8.125 },
    // A clock ("3:45 pm") is shorter than a date, and right-aligned.
    time: { size: 6 },
    expiry: { size: 8.125 },
    comment: { size: 5, maxSize: 8 }, // fixed — an icon, never grows
    chipList: { size: 12 },
    // A fullness bar + its figure: the bar needs room to read as a proportion
    // (its track flexes into whatever is left after the figure), so this is a
    // floor, not a content measure. No maxSize — wider is a better bar.
    proportion: { size: 8 },
  };

// Each common column key → its cell `kind` (the rendering) plus optional
// per-KEY width overrides (rem) that beat the kind's KIND_WIDTH default. This
// is THE place per-key widths live (the kind default is content-driven; the
// per-key size also accounts for the column's HEADER label, which is usually
// the wider constraint — e.g. a number is narrow but "Pack quantity" is not).
// invoiceNumber is narrower than a generic number. size/maxSize in rem; omitted
// → the kind default. NOTE: the header-aware sizes below are first-cut
// estimates — tune them here against the rendered table.
// `maxSize` omitted inherits the kind's cap; `null` says "explicitly UNCAPPED"
// and beats it — for a key whose HEADER outgrows the kind's value-shaped cap
// (a capped column can't be dragged wider than the cap).
export type CellSpec = {
  kind: CellKind;
  size?: number;
  maxSize?: number | null;
};
// The standard width (rem) for a short record-number column — a few digits,
// shared by every "record #" column so they line up and never drift.
const RECORD_NUMBER_WIDTH = 3.5;

export const CELL_DEF = {
  // Text — the flex-fill "sink" columns.
  itemName: { kind: 'text' },
  name: { kind: 'text' },
  otherPartyName: { kind: 'text' },
  supplierName: { kind: 'text' },
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
  user: { kind: 'shortText' }, // acting user's username (log / ledger tables)
  firstName: { kind: 'shortText' },
  lastName: { kind: 'shortText' },
  gender: { kind: 'shortText' },
  email: { kind: 'shortText' },
  phone: { kind: 'shortText' },
  mobile: { kind: 'shortText' },
  unit: { kind: 'shortText' },
  unitName: { kind: 'shortText', size: 2 },
  // A VVM status description ("Stage 1") — short text until the Status chip
  // preset exists (see docs/CELL_TYPES.md § Status).
  vvmStatus: { kind: 'shortText' },
  // Code / identifier.
  code: { kind: 'code' },
  itemCode: { kind: 'code' },
  code2: { kind: 'code' },
  batch: { kind: 'code' },
  location: { kind: 'code', size: 6.5 }, // header "Location"
  // Header "Location code" is the binding constraint here, not the value — it
  // needs more room than a bare "Location", and the kind's 7rem growth cap
  // would stop a user widening it to fit on one line (#601). Own size, NO cap.
  locationCode: { kind: 'code', size: 8.5, maxSize: null }, // measured: 127px
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
  balance: { kind: 'number', size: 6 }, // header "Balance" (ledger tables)
  // Short record numbers (invoice #, stocktake #) — a few digits, tighter than
  // a generic number; one shared width (RECORD_NUMBER_WIDTH) so they never
  // drift apart.
  invoiceNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
  stocktakeNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
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
  // Time of day — the sibling of a Date column over the same instant.
  time: { kind: 'time' },
  // Expiry (date + near-expiry error tone).
  expiryDate: { kind: 'expiry' },
  // Comment (icon + popover).
  comment: { kind: 'comment' },
  // Chip list.
  masterLists: { kind: 'chipList' },
  // Proportion (fullness bar) — the locations list's Volume used column. The
  // value is the proportion as a percentage; header "Volume used" is the
  // binding constraint on the width, not the bar.
  volumeUsed: { kind: 'proportion', size: 10 },
} satisfies Record<string, CellSpec>;

// The closed union of keys getCellDefinition accepts.
export type CellDefinitionKey = keyof typeof CELL_DEF;
