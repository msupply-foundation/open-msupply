import type {
  StockLineDetailFragment,
  UpdateStockLineVariables,
} from './stockLine.generated';

// The stock-line detail's edit buffer and the patch it commits (spec/stock S2).
// Pure, so the save contract is pinned at the cheapest layer — what a save
// actually sends is the highest-consequence decision on the screen, and a
// wrong diff either writes a field the user didn't touch or silently drops
// one they did.
//
// Anchors: spec/stock/cases/OMS-REG-INV-02.
//   .38 — a line whose location violates the item's restriction warns
//   .39 — a saved edit changes exactly the edited fields
//   .40 — clearing an optional field leaves it empty
//   .45 — saving a barcode links the GTIN
//   .46 — saving an emptied barcode unlinks it

// The locally-buffered editable attributes. Read-only quantities are read from
// the fetched line directly, never buffered.
export interface Edit {
  costPricePerPack: number;
  sellPricePerPack: number;
  batch: string;
  barcode: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  onHold: boolean;
  location: { id: string; code: string; name: string } | null;
  volumePerPack: number;
  manufacturer: { id: string; name: string } | null;
  donorId: string | null;
  donorName: string | null;
  // Campaign and program are one mutually-exclusive field (the campaign-or-
  // program lookup) — never both set at once.
  campaignId: string | null;
  programId: string | null;
}

export const seedEdit = (line: StockLineDetailFragment): Edit => ({
  costPricePerPack: line.costPricePerPack,
  sellPricePerPack: line.sellPricePerPack,
  batch: line.batch ?? '',
  barcode: line.barcode ?? '',
  manufactureDate: line.manufactureDate ?? null,
  expiryDate: line.expiryDate ?? null,
  onHold: line.onHold,
  location: line.location
    ? {
        id: line.location.id,
        code: line.location.code,
        name: line.location.name,
      }
    : null,
  volumePerPack: line.volumePerPack,
  manufacturer: line.manufacturer
    ? { id: line.manufacturer.id, name: line.manufacturer.name }
    : null,
  donorId: line.donor?.id ?? null,
  donorName: line.donor?.name ?? null,
  campaignId: line.campaign?.id ?? null,
  programId: line.program?.id ?? null,
});

// The partial update: only the fields that changed. Clear via the nullable
// wrappers; batch / barcode are plain scalars (an empty barcode unlinks).
export const buildPatch = (
  edit: Edit,
  line: StockLineDetailFragment
): UpdateStockLineVariables['input'] => {
  const patch: UpdateStockLineVariables['input'] = { id: line.id };
  if (edit.costPricePerPack !== line.costPricePerPack)
    patch.costPricePerPack = edit.costPricePerPack;
  if (edit.sellPricePerPack !== line.sellPricePerPack)
    patch.sellPricePerPack = edit.sellPricePerPack;
  if (edit.batch !== (line.batch ?? '')) patch.batch = edit.batch;
  if (edit.barcode !== (line.barcode ?? '')) patch.barcode = edit.barcode;
  if (edit.manufactureDate !== (line.manufactureDate ?? null))
    patch.manufactureDate = { value: edit.manufactureDate };
  if (edit.expiryDate !== (line.expiryDate ?? null))
    patch.expiryDate = { value: edit.expiryDate };
  if (edit.onHold !== line.onHold) patch.onHold = edit.onHold;
  if ((edit.location?.id ?? null) !== (line.location?.id ?? null))
    patch.location = { value: edit.location?.id ?? null };
  if (edit.volumePerPack !== line.volumePerPack)
    patch.volumePerPack = edit.volumePerPack;
  if ((edit.manufacturer?.id ?? null) !== (line.manufacturer?.id ?? null)) {
    patch.manufacturerId = { value: edit.manufacturer?.id ?? null };
    // Changing the manufacturer clears the item variant (spec/stock S2).
    patch.itemVariantId = { value: null };
  }
  if ((edit.donorId ?? null) !== (line.donor?.id ?? null))
    patch.donorId = { value: edit.donorId };
  if (
    edit.campaignId !== (line.campaign?.id ?? null) ||
    edit.programId !== (line.program?.id ?? null)
  ) {
    // One mutually-exclusive choice over two wire fields: always send both
    // wrappers so choosing one side clears the other.
    patch.campaignId = { value: edit.campaignId };
    patch.programId = { value: edit.programId };
  }
  return patch;
};

// The item is restricted to a location type and the line's current location is
// of another type — the standing warning on S2 (spec/stock OMS-REG-INV-02.38).
export const invalidLocation = (line: StockLineDetailFragment): boolean =>
  !!line.item.restrictedLocationTypeId &&
  !!line.location &&
  line.location.locationType?.id !== line.item.restrictedLocationTypeId;
