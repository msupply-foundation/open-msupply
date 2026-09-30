import { createSignal, type Accessor } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { hasPermission } from '@/store/storeContext';
import {
  createScanControl,
  shownScanNotice,
  type ScanControl,
  type ScanNoticeShown,
} from '@/domain/barcode';
import { InsertAsset, InsertAssetLog } from '../equipment.generated';
import { buildCreatedLogInput } from './createAsset';
import {
  buildScannedInsertInput,
  resolveAssetScan,
  type ScannedAssetDraft,
} from './assetScan';

// The list's scan flow (spec/cold-chain-equipment › rules § scanning an
// asset; ui-surface S1 page actions). The list renders the pieces: the scan
// button in its page actions, the notice in the header toolbar, and the confirm
// dialog while a draft is pending.
//
// The asset READ permission the rules ask a scan to check is the destination's
// own gate, applied by the router before this screen mounts (spec/navigation),
// so there is no screen here on which it could be missing.

export type AssetScanNotice = ScanNoticeShown;

export type AssetScan = {
  control: ScanControl;
  /**
   * The latest outcome worth telling the user — a scan that found nothing, a
   * create refused or failed, or the scanner's own failure. Inline, never a
   * toast (spec/ui-standards/controls.md § Action feedback).
   */
  notice: Accessor<AssetScanNotice | undefined>;
  /** A draft awaiting the user's confirmation, while the dialog is open. */
  draft: Accessor<ScannedAssetDraft | undefined>;
  confirmCreate: () => Promise<void>;
  cancelCreate: () => void;
};

export const createAssetScan = (options: {
  storeId: Accessor<string>;
  /** An asset was found or created — open it. */
  onOpen: (assetId: string) => void;
}): AssetScan => {
  const [notice, setNotice] = createSignal<AssetScanNotice | undefined>();
  const [draft, setDraft] = createSignal<ScannedAssetDraft | undefined>();
  const [busy, setBusy] = createSignal(false);

  const control = createScanControl({
    owner: 'equipment',
    // The register waits to be pressed (ui-surface § R1: "The equipment
    // register is the exception").
    armOnArrival: false,
    onScan: scan => {
      // One scan at a time: while one resolves or waits for confirmation, a
      // second would race it to the same dialog, so it is dropped. Not
      // `disabled` — that disarms the scanner, and the user would have to
      // press Scan again after every label.
      if (busy() || draft() !== undefined) return;
      setNotice(undefined);
      setBusy(true);
      void resolveAssetScan(options.storeId(), scan).then(result => {
        setBusy(false);
        switch (result.kind) {
          case 'open':
            return options.onOpen(result.assetId);
          case 'not-found':
            return setNotice({
              severity: 'error',
              text: t('error.no-matching-asset', { id: result.content }),
            });
          case 'draft':
            // Creating from a scan is its own permission, checked client-side
            // only (contract § Scanning an asset). Without it the user is
            // told so and nothing is created.
            if (!hasPermission('ASSET_MUTATE_VIA_DATA_MATRIX'))
              return setNotice({
                severity: 'info',
                text: t('error.no-asset-create-scan-permission'),
              });
            return setDraft(result.draft);
          case 'failed':
            return; // reported globally
        }
      });
    },
  });

  const confirmCreate = async () => {
    const pending = draft();
    if (!pending) return;
    setDraft(undefined);
    setBusy(true);
    const assetId = generateUUID();
    const inserted = await graphqlFetch(
      InsertAsset,
      {
        storeId: options.storeId(),
        input: buildScannedInsertInput(pending, assetId),
      },
      // Every declared error member is unreachable; the failure arrives as a
      // top-level GraphQL error (contract ⚠️ wire trap), shown here inline.
      { returnGraphqlErrors: true }
    );
    if (inserted.kind !== 'success') {
      setBusy(false);
      setNotice({ severity: 'error', text: t('error.unable-to-save-asset') });
      return;
    }
    // The opening Functioning entry every created asset gets
    // (OMS-REG-CCE-05.6), exactly as the create modal writes it.
    await graphqlFetch(InsertAssetLog, {
      storeId: options.storeId(),
      input: buildCreatedLogInput(
        assetId,
        generateUUID(),
        t('message.asset-created')
      ),
    });
    setBusy(false);
    options.onOpen(assetId);
  };

  return {
    control,
    notice: shownScanNotice(control, notice),
    draft,
    confirmCreate,
    cancelCreate: () => setDraft(undefined),
  };
};
