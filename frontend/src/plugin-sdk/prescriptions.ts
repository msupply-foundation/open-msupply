/*
 * The prescription data functions the SDK offers form plugins
 * (implementation-plan K3; remaining work item 23): a prescription written
 * from a form, giving the patient stock from the store's batches, as the old
 * client's `Prescription` control writes one from an encounter. The form
 * library's `PrescriptionInput` is built on them. They act in the entered
 * store, like every SDK call.
 */
import { createMemo, createResource } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import { t } from '../intl';
import { currentStoreId } from '../store/storeContext';
import { generateUUID } from '../uuid';
import type { PluginQuery } from './bridge';
import {
  SdkInsertPrescription,
  SdkItemBatches,
  SdkPickPrescription,
  SdkPrescriptionSummary,
  SdkSavePrescriptionItemLines,
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

/** A written prescription, as a form shows it. Read-only. */
export interface PrescriptionSummaryView {
  readonly id: string;
  readonly invoiceNumber: number;
  /** When it was made, as an RFC 3339 instant. */
  readonly createdDatetime: string;
  /** True when it was made in the store the user is in. */
  readonly madeHere: boolean;
  /** Each item it gives, in units. */
  readonly lines: readonly {
    readonly itemId: string;
    readonly itemName: string;
    readonly units: number;
  }[];
}

/**
 * The batches of an item the store can give now, read reactively: refetched
 * when the item changes, paused while it is `undefined`, never suspending.
 * Batches on hold and those with nothing available are left out.
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
    if (result.kind !== 'success') return undefined;
    return result.data.historicalStockLines.nodes
      .filter(line => !line.onHold && line.availableNumberOfPacks > 0)
      .map((line): ItemBatchView => ({
        id: line.id,
        batch: line.batch ?? undefined,
        expiryDate: line.expiryDate ?? undefined,
        packSize: line.packSize,
        availablePacks: line.availableNumberOfPacks,
      }));
  });
  return {
    data: () =>
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined,
    loading: () => resource.loading,
  };
};

type InvoiceResult = SdkPrescriptionSummaryResult['invoice'];

const readSummary = async (
  storeId: string,
  id: string
): Promise<InvoiceResult | undefined> => {
  const result = await graphqlFetch(
    SdkPrescriptionSummary,
    { storeId, id },
    // A prescription not written yet is an answer here, not a fault.
    { returnGraphqlErrors: true }
  );
  return result.kind === 'success' &&
    result.data.invoice.__typename === 'InvoiceNode'
    ? result.data.invoice
    : undefined;
};

/** The summary a prescription read gives, in the SDK's view. */
export const toPrescriptionSummaryView = (
  invoice: InvoiceResult,
  storeId: string
): PrescriptionSummaryView => ({
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  createdDatetime: invoice.createdDatetime,
  madeHere: invoice.store.id === storeId,
  lines: invoice.lines.nodes.map(line => ({
    itemId: line.itemId,
    itemName: line.itemName,
    units: line.numberOfPacks * line.packSize,
  })),
});

/**
 * A prescription by id, read reactively: paused while the id is `undefined`,
 * never suspending. `data()` is undefined while loading and when there is no
 * such prescription (one a form has named but not yet written). `refetch`
 * reads it again, after the form writes it.
 */
export const usePrescriptionSummary = (
  id: () => string | undefined
): PluginQuery<PrescriptionSummaryView> & { refetch: () => void } => {
  const request = createMemo(() => {
    const storeId = currentStoreId();
    const value = id();
    return storeId && value ? `${storeId}|${value}` : undefined;
  });
  const [resource, { refetch }] = createResource(request, async key => {
    const [storeId = '', value = ''] = key.split('|');
    const invoice = await readSummary(storeId, value);
    return invoice ? toPrescriptionSummaryView(invoice, storeId) : undefined;
  });
  return {
    data: () =>
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined,
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
}

export type CreatePrescriptionResult =
  | { kind: 'created'; invoiceNumber: number }
  | { kind: 'failed'; message: string };

const failed = (message?: string): CreatePrescriptionResult => ({
  kind: 'failed',
  message: message ?? t('error.prescription-not-created'),
});

/**
 * Writes a prescription for the patient giving one item from the store's
 * batches, and marks it picked, so the stock is committed as given. The
 * prescribed quantity is the total given, in units.
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

  const existing = await readSummary(storeId, input.id);
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
    if (inserted.kind === 'graphqlError') return failed(inserted.message);
    if (inserted.kind !== 'success') return failed();
    invoiceNumber = inserted.data.insertPrescription.invoiceNumber;
  }

  const batches = await graphqlFetch(SdkItemBatches, {
    storeId,
    itemId: input.itemId,
  });
  if (batches.kind !== 'success') return failed();
  const packSizes = new Map(
    batches.data.historicalStockLines.nodes.map(b => [b.id, b.packSize])
  );
  const prescribedQuantity = lines.reduce(
    (total, line) =>
      total + line.numberOfPacks * (packSizes.get(line.stockLineId) ?? 1),
    0
  );
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
        prescribedQuantity,
      },
    },
    { returnGraphqlErrors: true }
  );
  if (saved.kind === 'graphqlError') return failed(saved.message);
  if (saved.kind !== 'success') return failed();

  const picked = await graphqlFetch(
    SdkPickPrescription,
    { storeId, id: input.id },
    { returnGraphqlErrors: true }
  );
  if (picked.kind === 'graphqlError') return failed(picked.message);
  if (picked.kind !== 'success') return failed();
  const response = picked.data.updatePrescription;
  if (response.__typename !== 'InvoiceNode') {
    return failed(response.error.description);
  }
  return { kind: 'created', invoiceNumber: invoiceNumber ?? 0 };
};
