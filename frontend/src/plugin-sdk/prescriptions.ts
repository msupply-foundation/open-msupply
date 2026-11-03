/*
 * The prescription data functions the SDK offers form plugins: a prescription
 * written from a form, giving the patient stock from the store's batches, as
 * the old client's `Prescription` control writes one from an encounter. The
 * form library's `PrescriptionInput` is built on them. They act in the entered
 * store, like every SDK call. A permission refusal opens the app's
 * permission dialog, as it does on the store's own screens.
 */
import { createMemo, createResource } from 'solid-js';
import {
  barReasons,
  fillOrderCompare,
  type AllocationPreferences,
} from '../domain/allocation';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlResult,
} from '../api/graphql';
import { t } from '../intl';
import { currentStoreId, prescriptionPreferences } from '../store/storeContext';
import { generateUUID } from '../uuid';
import type { PluginQuery } from './bridge';
import {
  SdkInsertPrescription,
  SdkItemBatches,
  SdkPickPrescription,
  SdkPrescriptionSummary,
  SdkSavePrescriptionItemLines,
  type SdkItemBatchesResult,
  type SdkPrescriptionSummaryResult,
} from './prescriptions.generated';

/** One batch of an item the store can give now. Read-only. */
export interface ItemBatchView {
  /** The stock line's id. */
  readonly id: string;
  readonly batch: string | undefined;
  /** The expiry date, `yyyy-MM-dd`. */
  readonly expiryDate: string | undefined;
  readonly packSize: number;
  /** Packs available to give: on hand, less those already allocated. */
  readonly availablePacks: number;
}

/**
 * A written prescription, as a form shows it. Read-only. Always one made in
 * the entered store: the read finds no other.
 */
export interface PrescriptionSummaryView {
  readonly id: string;
  readonly invoiceNumber: number;
  /** When it was made, as an RFC 3339 instant. */
  readonly createdDatetime: string;
  /** Each item it gives, once per item, in units over all its batches. */
  readonly lines: readonly {
    readonly itemId: string;
    readonly itemName: string;
    readonly units: number;
  }[];
}

/**
 * The batches of an item the store can give now, read reactively: refetched
 * when the item changes, paused while it is `undefined`, never suspending.
 * Left out, as the prescription screen bars them: a batch with nothing
 * available, on hold (itself or its location), expired under the store's
 * _prevent issue of expired stock_, or with an unusable VVM status under
 * _manage VVM status_. In the prescription screen's order: soonest expiry
 * first, or VVM status first under its preference.
 */
export const useItemBatches = (
  itemId: () => string | undefined
): PluginQuery<readonly ItemBatchView[]> => {
  const request = createMemo(() => {
    const storeId = currentStoreId();
    const id = itemId();
    return storeId && id ? `${storeId}|${id}` : undefined;
  });
  const [resource] = createResource(request, async key => {
    const [storeId = '', id = ''] = key.split('|');
    const result = await graphqlFetch(SdkItemBatches, {
      storeId,
      itemId: id,
    });
    return result.kind === 'success'
      ? result.data.historicalStockLines.nodes
      : undefined;
  });
  // Judged on reading, so the store's preferences apply as they stand.
  const batches = createMemo(() => {
    const lines =
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined;
    return lines && issuableBatches(lines, prescriptionPreferences());
  });
  return { data: batches, loading: () => resource.loading };
};

type StockLine = SdkItemBatchesResult['historicalStockLines']['nodes'][number];

/** The stock lines the store may give, in its order, in the SDK's view. */
export const issuableBatches = (
  lines: readonly StockLine[],
  prefs: AllocationPreferences,
  today: Date = new Date()
): ItemBatchView[] =>
  lines
    .filter(
      line =>
        line.availableNumberOfPacks > 0 &&
        barReasons({ ...line, stockLineOnHold: line.onHold }, prefs, today)
          .length === 0
    )
    .sort((a, b) => fillOrderCompare(a, b, prefs))
    .map((line): ItemBatchView => ({
      id: line.id,
      batch: line.batch ?? undefined,
      expiryDate: line.expiryDate ?? undefined,
      packSize: line.packSize,
      availablePacks: line.availableNumberOfPacks,
    }));

type InvoiceNode = Extract<
  SdkPrescriptionSummaryResult['invoice'],
  { __typename: 'InvoiceNode' }
>;

/**
 * What a prescription read by id found. `not-found` is no prescription under
 * the id in the entered store: one never written, or one made in another
 * store, which this read cannot tell apart. `unreadable` is a read that
 * failed, which the app's error handling has already reported.
 */
export type PrescriptionReadOutcome = 'found' | 'not-found' | 'unreadable';

type SummaryRead =
  | { kind: 'found'; invoice: InvoiceNode }
  | { kind: 'not-found' }
  | { kind: 'unreadable' };

const readSummary = async (
  storeId: string,
  id: string
): Promise<SummaryRead> => {
  const result = await graphqlFetch(SdkPrescriptionSummary, { storeId, id });
  if (result.kind !== 'success') return { kind: 'unreadable' };
  const invoice = result.data.invoice;
  return invoice.__typename === 'InvoiceNode'
    ? { kind: 'found', invoice }
    : { kind: 'not-found' };
};

/**
 * The summary a prescription read gives, in the SDK's view. The prescription
 * holds a line per batch given; the view has one per item, with the units of
 * all its batches added up, in the order the items first appear.
 */
export const toPrescriptionSummaryView = (
  invoice: InvoiceNode
): PrescriptionSummaryView => {
  const byItem = new Map<
    string,
    { itemId: string; itemName: string; units: number }
  >();
  for (const line of invoice.lines.nodes) {
    const units = line.numberOfPacks * line.packSize;
    const item = byItem.get(line.itemId);
    if (item) item.units += units;
    else
      byItem.set(line.itemId, {
        itemId: line.itemId,
        itemName: line.itemName,
        units,
      });
  }
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdDatetime: invoice.createdDatetime,
    lines: [...byItem.values()],
  };
};

/**
 * A prescription by id, read reactively: paused while the id is `undefined`,
 * never suspending. `data()` is the prescription once found; `outcome()`
 * says what the read found, undefined while paused and until the first read
 * lands. `refetch` reads it again.
 */
export const usePrescriptionSummary = (
  id: () => string | undefined
): PluginQuery<PrescriptionSummaryView> & {
  outcome: () => PrescriptionReadOutcome | undefined;
  refetch: () => void;
} => {
  const request = createMemo(() => {
    const storeId = currentStoreId();
    const value = id();
    return storeId && value ? `${storeId}|${value}` : undefined;
  });
  const [resource, { refetch }] = createResource(request, async key => {
    const [storeId = '', value = ''] = key.split('|');
    const read = await readSummary(storeId, value);
    return read.kind === 'found'
      ? { kind: read.kind, view: toPrescriptionSummaryView(read.invoice) }
      : { kind: read.kind };
  });
  const latest = () =>
    request() !== undefined &&
    (resource.state === 'ready' || resource.state === 'refreshing')
      ? resource.latest
      : undefined;
  return {
    data: () => latest()?.view,
    outcome: () => latest()?.kind,
    loading: () => resource.loading,
    refetch: () => void refetch(),
  };
};

export interface CreatePrescriptionInput {
  /** The prescription's id, chosen by the form so the record can name it. */
  id: string;
  patientId: string;
  /** The one item it gives. */
  itemId: string;
  /** How many packs to give from each batch; zero lines are left out. */
  lines: readonly { stockLineId: string; numberOfPacks: number }[];
  /** The quantity prescribed, in units: the total the user entered. */
  prescribedQuantity?: number;
}

export type CreatePrescriptionResult =
  | { kind: 'created'; invoiceNumber: number }
  | { kind: 'failed'; message: string };

const failed = (message?: string): CreatePrescriptionResult => ({
  kind: 'failed',
  message: message ?? t('error.prescription-not-created'),
});

// A write's failure as the result: a permission refusal opens the app's
// permission dialog, any other refusal is its message.
const writeFailed = (
  result: Exclude<GraphqlResult<unknown>, { kind: 'success' }>
): CreatePrescriptionResult => {
  if (result.kind !== 'graphqlError') return failed();
  if (isForbidden(result.errors)) {
    reportPermissionDenied(missingPermissions(result.errors));
    return failed();
  }
  return failed(result.message);
};

/**
 * Writes a prescription for the patient giving one item from the store's
 * batches, and marks it picked, so the stock is committed as given.
 *
 * Idempotent on the id: a prescription already picked under it is left as it
 * is, and one an interrupted call left unpicked is completed, so a form that
 * retries its save never writes a second. Never throws; a failure is the
 * result, with a message to show. Needs the prescription permissions in the
 * store.
 */
export const createPrescription = async (
  input: CreatePrescriptionInput
): Promise<CreatePrescriptionResult> => {
  const storeId = currentStoreId();
  if (!storeId) return failed();
  const lines = input.lines.filter(line => line.numberOfPacks > 0);

  const read = await readSummary(storeId, input.id);
  if (read.kind === 'unreadable') return failed();
  const existing = read.kind === 'found' ? read.invoice : undefined;
  if (existing && existing.status !== 'NEW') {
    return { kind: 'created', invoiceNumber: existing.invoiceNumber };
  }
  let invoiceNumber = existing?.invoiceNumber;
  if (!existing) {
    const inserted = await graphqlFetch(
      SdkInsertPrescription,
      { storeId, input: { id: input.id, patientId: input.patientId } },
      { returnGraphqlErrors: true }
    );
    if (inserted.kind !== 'success') return writeFailed(inserted);
    invoiceNumber = inserted.data.insertPrescription.invoiceNumber;
  }

  const saved = await graphqlFetch(
    SdkSavePrescriptionItemLines,
    {
      storeId,
      input: {
        invoiceId: input.id,
        itemId: input.itemId,
        lines: lines.map(line => ({
          id: generateUUID(),
          stockLineId: line.stockLineId,
          numberOfPacks: line.numberOfPacks,
        })),
        ...(input.prescribedQuantity !== undefined &&
        input.prescribedQuantity > 0
          ? { prescribedQuantity: input.prescribedQuantity }
          : {}),
      },
    },
    { returnGraphqlErrors: true }
  );
  if (saved.kind !== 'success') return writeFailed(saved);

  const picked = await graphqlFetch(
    SdkPickPrescription,
    { storeId, id: input.id },
    { returnGraphqlErrors: true }
  );
  if (picked.kind !== 'success') return writeFailed(picked);
  const response = picked.data.updatePrescription;
  if (response.__typename !== 'InvoiceNode') {
    return failed(response.error.description);
  }
  return { kind: 'created', invoiceNumber: invoiceNumber ?? 0 };
};
