import { createSignal, For, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../intl';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { refreshAncillaryItems } from './internalOrderUpdate';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';
import styles from './InternalOrderAncillaryBanner.module.css';

// The ancillary-items banner (spec/internal-orders S3 § toolbar, AC-A2–A5).
// Shown only while the order is editable AND its server-computed plan is not
// NONE. Its message states the outstanding work; a Details popover lists the
// plan; an Add (needs-add) / Update (needs-update) button runs the refresh and
// the parent re-reads the order. Success is silent — the banner clears on the
// re-read (this app has no toast surface, unlike the reference); a rejection
// shows inline.

export interface InternalOrderAncillaryBannerProps {
  storeId: string;
  requisitionId: string;
  ancillary: InternalOrderInfoFragment['ancillaryState'];
  /** Draft + supplier-store enabled — the banner shows only while editable. */
  editable: boolean;
  /** Refresh succeeded — re-read the order (plan + lines). */
  onRefreshed: () => void;
}

export const InternalOrderAncillaryBanner: Component<
  InternalOrderAncillaryBannerProps
> = props => {
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const needsAdd = () => props.ancillary.state === 'NEEDS_ADD';
  const show = () => props.editable && props.ancillary.state !== 'NONE';
  const message = () =>
    needsAdd()
      ? tPlural('messages.ancillary-items-available', props.ancillary.count)
      : tPlural('messages.ancillary-items-need-update', props.ancillary.count);

  const run = async () => {
    if (busy()) return;
    setBusy(true);
    setError(undefined);
    const result = await refreshAncillaryItems(
      props.storeId,
      props.requisitionId,
      needsAdd() ? 'ADD' : 'UPDATE'
    );
    setBusy(false);
    if (result.kind === 'done') props.onRefreshed();
    else if (result.kind === 'error') setError(result.message);
  };

  return (
    <Show when={show()}>
      <div class={styles.banner}>
        <Alert severity="info">
          <div class={styles.row}>
            <span class={styles.message}>{message()}</span>
            <span class={styles.actions}>
              <Popover
                trigger={t('button.details')}
                triggerTestId="ancillary-details-button"
                placement="bottom-end"
              >
                <div class={styles.plan}>
                  <Show when={props.ancillary.toAdd.length > 0}>
                    <span class={styles.planTitle}>
                      {t('label.ancillary-plan-to-add')}
                    </span>
                    <For each={props.ancillary.toAdd}>
                      {delta => (
                        <div class={styles.planRow}>
                          <span>{`${delta.item.code} ${delta.item.name}`}</span>
                          <span>{`${Math.round(delta.requiredQuantity)} ${delta.item.unitName ?? ''}`}</span>
                        </div>
                      )}
                    </For>
                  </Show>
                  <Show when={props.ancillary.toUpdate.length > 0}>
                    <span class={styles.planTitle}>
                      {t('label.ancillary-plan-to-update')}
                    </span>
                    <For each={props.ancillary.toUpdate}>
                      {delta => (
                        <div class={styles.planRow}>
                          <span>{`${delta.item.code} ${delta.item.name}`}</span>
                          <span>
                            {`${t('label.current')} ${Math.round(
                              delta.currentQuantity ?? 0
                            )} → ${t('label.new')} ${Math.round(
                              delta.requiredQuantity
                            )} ${delta.item.unitName ?? ''}`}
                          </span>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </Popover>
              <Button
                variant="secondary"
                loading={busy()}
                data-testid="ancillary-refresh-button"
                onClick={() => void run()}
              >
                {needsAdd() ? t('button.add') : t('button.update')}
              </Button>
            </span>
          </div>
        </Alert>
        <Show when={error()}>
          <Alert severity="error">{error()}</Alert>
        </Show>
      </div>
    </Show>
  );
};
