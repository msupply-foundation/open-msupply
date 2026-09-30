// The capture window's render (spec/barcode-scanning ui-surface.md § S2).
//
// A primitive plus a render, like the scan control it sits behind: every
// state shown here is the control's, made by createCaptureWindow
// (./createCaptureWindow), which the detail view creates ONE of.

import { Show } from 'solid-js';
import { t, tPlural } from '@/intl';
import { ItemSearch } from '@/domain/item';
import { activeSource } from '@/platform/barcodeScanner';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TextField } from '@/ui/elements/inputs/TextField';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { CheckIcon } from '@/ui/icons';
import { captureMessage, saveRefusal, shortContent } from './captureScan';
import type { CaptureWindowControl } from './createCaptureWindow';

export const CaptureWindow = (props: { control: CaptureWindowControl }) => {
  const c = () => props.control;
  const message = () => {
    const draft = c().draft();
    if (!draft) return undefined;
    const refusal = c().refusal();
    if (refusal) return { severity: 'error' as const, text: refusal };
    // Always information — not knowing a code is a normal answer (.110).
    const found = captureMessage(draft, c().match());
    return {
      severity: 'info' as const,
      text:
        found.key === 'messages.batch-already-exists'
          ? tPlural(found.key, found.numberOfPacks)
          : t(found.key),
    };
  };
  const canConfirm = () => {
    const draft = c().draft();
    return !!draft && saveRefusal(draft) === undefined;
  };
  // The diagnostic readout exists only to debug what manual input sent.
  const diagnostic = () => activeSource() === 'manual';

  return (
    <Dialog
      open={c().open()}
      onClose={() => c().close()}
      title={t('heading.scan-product')}
      width="prose"
      // A keyboard-emulation scanner ends every read with Enter. With focus
      // in Quantity, Enter-to-confirm would close the window on the very
      // next scan instead of scanning on (spec/keyboard KB-E2 allows the
      // opt-out).
      enterConfirms={false}
      testId="scan-capture-window"
      actionsLead={
        <Show when={c().savedNotice()}>
          {text => (
            <Alert severity="success" compact testId="scan-line-saved">
              {text()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <CancelButton onClick={() => c().close()} />
          <Button
            variant="primary"
            icon={<CheckIcon />}
            confirms="plain"
            loading={c().working()}
            disabled={!canConfirm() || c().working()}
            data-testid="scan-capture-ok"
            onClick={() => void c().confirm()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Show when={c().draft()}>
        {draft => (
          <Stack gap="md">
            <Show when={diagnostic()}>
              <Text variant="body">
                <strong>{t('label.barcode')}:</strong>{' '}
                {shortContent(draft().content)}
              </Text>
            </Show>
            <Show when={!c().working() && message()}>
              {m => (
                <Alert severity={m().severity} testId="scan-capture-message">
                  {m().text}
                </Alert>
              )}
            </Show>
            {/* Label-above fields, one per line at full width
                (kdd/form-layout), in the S2 field order. */}
            <ItemSearch
              label={t('label.item')}
              storeId={c().storeId()}
              value={draft().item?.id}
              selectedItem={draft().item}
              disabled={draft().itemLocked || c().working()}
              focusTarget={c().itemField}
              onSelect={option => c().pickItem(option)}
            />
            <TextField
              label={t('label.batch')}
              value={draft().batch}
              disabled={c().working()}
              onInput={e => c().update({ batch: e.currentTarget.value })}
            />
            <DateField
              label={t('label.expiry-date')}
              value={draft().expiryDate}
              disabled={c().working()}
              onChange={value => c().update({ expiryDate: value })}
            />
            <NumberField
              label={t('label.pack-size')}
              value={draft().packSize}
              min={1}
              disabled={draft().packSizeLocked || c().working()}
              onChange={value => c().update({ packSize: value || 1 })}
            />
            <NumberField
              ref={c().quantityField.ref}
              label={t('label.quantity')}
              value={draft().quantity}
              min={0}
              disabled={c().working()}
              onChange={value => c().update({ quantity: value ?? 0 })}
            />
            <DateField
              label={t('label.manufacture-date')}
              value={draft().manufactureDate}
              max={localTodayIso()}
              disabled={c().working()}
              onChange={value => c().update({ manufactureDate: value })}
            />
          </Stack>
        )}
      </Show>
    </Dialog>
  );
};
