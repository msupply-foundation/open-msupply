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
    // Fixed — an icon in the cells AND an icon in the header (CommentHeader),
    // so nothing here is text-sized. The floor is the CELL's: the 1.5rem
    // trigger (16px glyph + its 4px inline padding) inside the body cell's 2rem
    // of inline padding = 3.5rem. The header needs less (2rem — a bare glyph
    // between two --th-pad-free gutters), so the cell governs. Was 5/8, sized
    // for the word "Comment" back when the header spelled it out.
    comment: { size: 3.5, maxSize: 5 },
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
// shared by every "record #" column so they line up and never drift. The
// binding constraint is not the digits but the sortable header "Number":
// 53px of label + the th's ~32px overhead (padding + the reserved sort-arrow
// slot) — below 5.5rem it breaks mid-word at the floor ("Numbe/r").
const RECORD_NUMBER_WIDTH = 5.5;

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
  reason: { kind: 'shortText' }, // a line's variance reason (requisitions)
  donor: { kind: 'shortText' },
  campaign: { kind: 'shortText' }, // a campaign OR program name
  approvalComment: { kind: 'shortText' },
  firstName: { kind: 'shortText' },
  lastName: { kind: 'shortText' },
  gender: { kind: 'shortText' },
  email: { kind: 'shortText' },
  phone: { kind: 'shortText' },
  mobile: { kind: 'shortText' },
  unit: { kind: 'shortText' },
  // The header "Unit" is the floor here (an all-empty column would otherwise
  // collapse under its own label and clip it to "U n.."). MEASURED: the word is
  // 25px at the header's 13px/500, and a th spends 1.5rem of its width on
  // padding, so 3rem left 24px of text box and broke the label mid-word by
  // 1px — 3.5rem clears it with room for a longer translation.
  unitName: { kind: 'shortText', size: 3.5 },
  // A VVM status description ("Stage 1") — short text until the Status chip
  // preset exists (see docs/CELL_TYPES.md § Status).
  vvmStatus: { kind: 'shortText' },
  // Code / identifier.
  code: { kind: 'code' },
  itemCode: { kind: 'code' },
  code2: { kind: 'code' },
  batch: { kind: 'code' },
  // Header "Location"; the value is a location CODE. NO cap, for the reason
  // `locationCode` below gives (#601): the kind's 7rem cap sits half a rem
  // above this default, so the column was effectively undraggable — nobody
  // could widen it to read a long code, or to put a longer translated header
  // on one line.
  location: { kind: 'code', size: 6.5, maxSize: null },
  // Header "Location code" is the binding constraint here, not the value — it
  // needs more room than a bare "Location", and the kind's 7rem growth cap
  // would stop a user widening it to fit on one line (#601). Own size, NO cap.
  locationCode: { kind: 'code', size: 8.5, maxSize: null }, // measured: 127px
  // Number — size widened where the header label is the binding constraint.
  packSize: { kind: 'number', size: 5 }, // "Pack size"
  // Headed "Pack quantity" / "Packs received" / "Number of packs" depending on
  // the table — every one of them a two-word label whose longest word ("packs",
  // "quantity", "received", "Number") measures ~50-54px, over the 48px of text
  // box 4.5rem left. At 4.5rem all three broke mid-word AND clipped past the
  // 2-line clamp; 5rem fits each on two lines whole.
  numberOfPacks: { kind: 'number', size: 5 },
  countedNumberOfPacks: { kind: 'number', size: 8 },
  // Same 8 as its counted twin, and for the same reason: the figure is narrow
  // but "Packs snapshot" is not, and a stocktake reads the two side by side, so
  // a mismatched pair would read as a mistake.
  snapshotNumberOfPacks: { kind: 'number', size: 8 },
  receivedNumberOfPacks: { kind: 'number', size: 8 },
  availablePacks: { kind: 'number', size: 7 },
  volumePerPack: { kind: 'number', size: 7 },
  units: { kind: 'number' },
  dosesPerUnit: { kind: 'number', size: 7 },
  doses: { kind: 'number' },
  requestedQuantity: { kind: 'number', size: 8 },
  poQuantity: { kind: 'number', size: 7 },
  remaining: { kind: 'number', size: 6.5 }, // "Remaining" + sort — one word
  difference: { kind: 'number', size: 7 }, // "Difference"
  unitQuantity: { kind: 'number', size: 5 }, // "Unit quantity"
  balance: { kind: 'number', size: 6 }, // header "Balance" (ledger tables)
  // Requisition-family numbers — shared by the internal-order and customer-
  // requisition line tables so the two verticals' columns never drift apart.
  // Sizes account for the header label where it outgrows the number default
  // (headers wrap to two lines, so the widest WORD is the constraint).
  dps: { kind: 'number' }, // "DPS"
  available: { kind: 'number', size: 6.5 }, // "Available stock" / "Available"
  // "AMC", but "Area AMC" under the area-statistics gate — and the same column,
  // so the wider header sets the width. The kind default (4.5) left 32px of
  // text box against a 31px "Area": 5rem gives the wrapped label room.
  amc: { kind: 'number', size: 5 },
  mos: { kind: 'number' }, // "MOS"
  // "Target stock (AMC)" — three tokens, and at 7rem the sortable header's 72px
  // of text box laid them out over THREE lines, so the 2-line clamp ate
  // "(AMC)". 7.5rem wraps it "Target stock / (AMC)".
  targetStock: { kind: 'number', size: 7.5 },
  targetStockPopulation: { kind: 'number', size: 7.5 }, // "…(population)"
  suggested: { kind: 'number', size: 7 }, // "Suggested" / "quantity" + sort
  // "Requested" + sort — ONE word, so it either fits or breaks; 6.5rem left it
  // 64px of text box against a 66px word and broke it ("Requeste/d", the same
  // failure RECORD_NUMBER_WIDTH above records for "Number"). 7rem clears it,
  // and matches `suggested` — the column beside it, and its comparison.
  requested: { kind: 'number', size: 7 },
  initialSoh: { kind: 'number', size: 5 }, // "Initial SOH"
  incoming: { kind: 'number', size: 5.5 }, // "Incoming"
  outgoing: { kind: 'number', size: 5.5 }, // "Outgoing"
  losses: { kind: 'number' }, // "Losses"
  additions: { kind: 'number', size: 6 }, // "Additions"
  shortExpiry: { kind: 'number', size: 5 }, // "Short expiry"
  daysOutOfStock: { kind: 'number', size: 5.5 }, // "Days out of stock"
  ourSoh: { kind: 'number', size: 6.5 }, // "Our stock" / "on hand"
  customerSoh: { kind: 'number', size: 7.5 }, // "Their avail." / "stock" + sort
  supplyQuantity: { kind: 'number', size: 5.5 }, // "Units to supply"
  alreadyIssued: { kind: 'number', size: 5.5 }, // "Issued" + sort
  approvedQuantity: { kind: 'number', size: 6.5 }, // "Approved units" + sort
  approvedPacks: { kind: 'number', size: 6 }, // "Approved packs"
  shipments: { kind: 'number', size: 6 }, // "Shipments" (requisitions list)
  countRows: { kind: 'number', size: 5 }, // "Number of rows"
  // Short record numbers (invoice #, stocktake #, requisition #) — a few
  // digits, tighter than a generic number; one shared width
  // (RECORD_NUMBER_WIDTH) so they never drift apart.
  invoiceNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
  stockMovementNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
  stocktakeNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
  requisitionNumber: { kind: 'number', size: RECORD_NUMBER_WIDTH },
  // Percentage.
  taxPercentage: { kind: 'percentage' },
  // Currency — "Pack sell price" / "Pack cost price" headers need the room.
  sellPricePerPack: { kind: 'currency', size: 9 },
  costPricePerPack: { kind: 'currency', size: 7 },
  totalAfterTax: { kind: 'currency' },
  totalBeforeTax: { kind: 'currency' },
  pricePerUnit: { kind: 'currency' }, // "Indicative price per unit"
  indicativePrice: { kind: 'currency' },
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
  startDate: { kind: 'date' },
  endDate: { kind: 'date' },
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
