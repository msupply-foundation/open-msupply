// "Which item is this barcode?" (spec/barcode-scanning/rules.md § Looking a
// barcode up; ui-surface § The item chooser). A barcode can be mapped to
// several items; when no single mapping is confirmed the user picks one.
//
// A screen that scans creates one chooser, renders its `Chooser` once, and
// calls `choose` from its scan handler — a direct call that resolves with the
// pick (kdd/explicit-composition: no dialog service, no event bus).

import { createSignal, For, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { lookUpItemById, type ItemOption } from '@/domain/item';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import type { BarcodeFragment } from './barcodeRegistry';

export type BarcodeCandidate = { barcode: BarcodeFragment; item: ItemOption };

export type BarcodeChoice =
  /** The user picked (or only one candidate resolved in this store). */
  | { kind: 'chosen'; barcode: BarcodeFragment; item: ItemOption }
  /** The user closed the chooser without picking. */
  | { kind: 'cancelled' }
  /** None of the mapped items could be found; treat the barcode as unknown. */
  | { kind: 'none' };

export type BarcodeChooser = {
  choose: (
    storeId: string,
    barcodes: BarcodeFragment[],
    options?: { masterListId?: string }
  ) => Promise<BarcodeChoice>;
  Chooser: Component;
};

/**
 * The candidates the chooser offers: each mapping's item, in the order the
 * server sent them (confirmed first). An item that doesn't resolve here is left
 * out; a failed request fails the whole choice.
 */
export const resolveCandidates = async (
  storeId: string,
  barcodes: BarcodeFragment[],
  options: { masterListId?: string } = {}
): Promise<BarcodeCandidate[] | 'failed'> => {
  const lookups = await Promise.all(
    barcodes.map(barcode => lookUpItemById(storeId, barcode.itemId, options))
  );
  if (lookups.some(lookup => lookup.kind === 'failed')) return 'failed';
  return barcodes.flatMap((barcode, index) => {
    const lookup = lookups[index];
    return lookup?.kind === 'found' ? [{ barcode, item: lookup.item }] : [];
  });
};

export const createBarcodeChooser = (): BarcodeChooser => {
  const [pending, setPending] = createSignal<{
    candidates: BarcodeCandidate[];
    resolve: (choice: BarcodeChoice) => void;
  }>();

  const finish = (choice: BarcodeChoice) => {
    const open = pending();
    setPending(undefined);
    open?.resolve(choice);
  };

  const choose: BarcodeChooser['choose'] = async (
    storeId,
    barcodes,
    options
  ) => {
    const candidates = await resolveCandidates(storeId, barcodes, options);
    if (candidates === 'failed' || candidates.length === 0)
      return { kind: 'none' };
    if (candidates.length === 1) {
      const [only] = candidates;
      return { kind: 'chosen', barcode: only!.barcode, item: only!.item };
    }
    // A second scan while the chooser is open replaces the question.
    pending()?.resolve({ kind: 'cancelled' });
    return new Promise(resolve => setPending({ candidates, resolve }));
  };

  const Chooser: Component = () => (
    <Show when={pending()}>
      {open => (
        <Dialog
          open
          testId="barcode-item-chooser"
          width="form"
          title={t('title.which-item-is-this-barcode')}
          description={t('messages.barcode-mapped-to-several-items')}
          onClose={() => finish({ kind: 'cancelled' })}
          actions={
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={() => finish({ kind: 'cancelled' })}
            />
          }
        >
          <Stack gap="sm">
            <For each={open().candidates}>
              {candidate => (
                <Button
                  variant="secondary"
                  data-testid={`barcode-item-choice-${candidate.item.id}`}
                  onClick={() =>
                    finish({
                      kind: 'chosen',
                      barcode: candidate.barcode,
                      item: candidate.item,
                    })
                  }
                >
                  <Stack gap="sm">
                    <Text>
                      {candidate.item.name} ({candidate.item.code})
                    </Text>
                    <Show when={candidate.barcode.status === 'CONFIRMED'}>
                      <Text variant="bodySmall">
                        {t('label.barcode-confirmed')}
                      </Text>
                    </Show>
                  </Stack>
                </Button>
              )}
            </For>
          </Stack>
        </Dialog>
      )}
    </Show>
  );

  return { choose, Chooser };
};
