import { graphqlFetch } from '@/api/graphql';
import type { ReadScan } from '@/domain/barcode';
import { CCE_CLASS_ID } from '../equipment';
import { AssetById, type InsertAssetVariables } from '../equipment.generated';
import {
  AssetFromGs1Data,
  type AssetFromGs1DataResult,
} from './assetScan.generated';

// Scanning an asset from the list (spec/cold-chain-equipment › rules §
// scanning an asset; contract § Scanning an asset). This is NOT the item
// barcode registry: a fridge's label is looked up against the asset register,
// by one of two routes depending on what was scanned.

/** The unsaved asset the resolver builds from a label that matched nothing. */
export type ScannedAssetDraft = Extract<
  AssetFromGs1DataResult['assetFromGs1Data'],
  { __typename: 'AssetNode' }
>;

export type AssetScanResult =
  /** An existing asset — open it. */
  | { kind: 'open'; assetId: string }
  /** Nothing in the register matches; `content` is what was scanned. */
  | { kind: 'not-found'; content: string }
  /** A GS1 label that matched nothing, as a draft to confirm and create. */
  | { kind: 'draft'; draft: ScannedAssetDraft }
  /** The request failed; already reported globally. */
  | { kind: 'failed' };

/**
 * What a scan names.
 *
 * - **A GS1 label** — the manufacturer's — goes to the server's resolver with
 *   every element as read, which matches on serial and part number. The
 *   resolver answers with a match, or with a draft (an `AssetNode` whose id
 *   is empty) built from the label.
 * - **Anything else** is taken as an asset's own id — the app's printed
 *   label — and looked up directly.
 *
 * A GS1 label carrying no serial or part number (a medicine box, scanned here
 * by mistake) is rejected by the resolver as a top-level GraphQL error rather
 * than a union error; it is taken locally as "not found" instead of tripping
 * the global error modal, which is what the current app ends up showing too.
 *
 * A draft with no catalogue item — a part number the catalogue does not know
 * — is reported as not found rather than offered: an unclassified insert
 * fails as an unexplained storage failure (contract ⚠️ wire trap,
 * OMS-REG-CCE-05.8), and the current app offers it only for that to happen.
 */
export const resolveAssetScan = async (
  storeId: string,
  scan: Exclude<ReadScan, { kind: 'unreadable' }>
): Promise<AssetScanResult> => {
  const notFound = { kind: 'not-found', content: scan.content } as const;

  if (scan.kind === 'raw') {
    if (scan.content === '') return notFound;
    const result = await graphqlFetch(AssetById, {
      storeId,
      assetId: scan.content,
    });
    if (result.kind !== 'success') return { kind: 'failed' };
    const asset = result.data.assets.nodes[0];
    return asset ? { kind: 'open', assetId: asset.id } : notFound;
  }

  const result = await graphqlFetch(
    AssetFromGs1Data,
    { storeId, gs1: scan.elements },
    {
      returnGraphqlErrors: true,
      // RecordNotFound is the one reachable, expected branch; any other
      // union error is a real failure.
      mapSuccessToError: data => {
        const response = data.assetFromGs1Data;
        return response.__typename === 'ScannedDataParseError' &&
          response.error.__typename !== 'RecordNotFound'
          ? response.error.description
          : undefined;
      },
    }
  );
  if (result.kind === 'graphqlError') return notFound;
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.assetFromGs1Data;
  if (response.__typename === 'ScannedDataParseError') return notFound;
  if (response.id !== '') return { kind: 'open', assetId: response.id };
  if (!response.catalogueItemId) return notFound;
  return { kind: 'draft', draft: response };
};

/**
 * A scanned draft as an insert input. Everything the label supplied is sent
 * with its lock — the frontend's obligation, since the server never consults
 * it and no update can change it later (contract ⚠️ wire trap).
 *
 * The catalogue item classifies the asset: the server overwrites its class,
 * category and type from it. `classId` is sent anyway, as the create modal
 * does, since this register only ever holds cold-chain equipment.
 */
export const buildScannedInsertInput = (
  draft: ScannedAssetDraft,
  id: string
): InsertAssetVariables['input'] => ({
  id,
  classId: CCE_CLASS_ID,
  assetNumber: draft.assetNumber,
  serialNumber: draft.serialNumber,
  catalogueItemId: draft.catalogueItemId,
  warrantyStart: draft.warrantyStart,
  warrantyEnd: draft.warrantyEnd,
  installationDate: draft.installationDate,
  lockedFieldsJson: JSON.stringify(draft.lockedFields),
});
