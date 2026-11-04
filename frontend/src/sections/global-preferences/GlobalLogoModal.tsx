import { createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import type { RejectionReason } from '@/ui/elements/inputs/uploadFiles';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { TrashIcon } from '@/ui/icons';
import { UpsertGlobalPreferences } from './globalPreferences.generated';
import {
  LOGO_ACCEPT,
  LOGO_MAX_SIZE_LABEL,
  logoDataUrl,
  logoMimeType,
  MAX_LOGO_FILE_BYTES,
} from './logoLogic';
import styles from './GlobalPreferencesPage.module.css';

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('unreadable'));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsDataURL(file);
  });

/*
 * S5 — the global logo editor (spec/global-preferences/ui-surface.md § S5):
 * pick or drop one image, see it, remove it, and Save. Unlike the page's other
 * rows this one drafts — a picked file is only a preview until Save, so a
 * wrong pick costs nothing — and Save writes the one `globalLogo` field. A
 * refused file or a failed save is an inline notice in the dialog, never a
 * toast (controls › action feedback); a failed save keeps the dialog open
 * with the draft intact.
 */
export const GlobalLogoModal: Component<{
  storeId: string;
  /** The current logo as a data URL; '' when not set. */
  value: string;
  onSaved: (value: string) => void;
  onClose: () => void;
}> = props => {
  // Seeded once from the stored logo — the draft is the dialog's own from here.
  // eslint-disable-next-line solid/reactivity
  const [draft, setDraft] = createSignal(props.value);
  const [notice, setNotice] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);

  const refuse = (filename: string, reason: RejectionReason) =>
    setNotice(
      reason === 'size'
        ? t('error.file-exceeds-size-limit', {
            filename,
            maxSize: LOGO_MAX_SIZE_LABEL,
          })
        : t('error.file-type-not-supported', { filename })
    );

  const onFile = async (file: File) => {
    const mimeType = logoMimeType(file);
    if (!mimeType) return refuse(file.name, 'type');
    let read: string;
    try {
      read = await readAsDataUrl(file);
    } catch {
      return refuse(file.name, 'type');
    }
    // The authoritative size check, on what is actually stored.
    const dataUrl = logoDataUrl(read, mimeType);
    if (dataUrl === undefined) return refuse(file.name, 'size');
    if (dataUrl === '') return refuse(file.name, 'type');
    setNotice(undefined);
    setDraft(dataUrl);
  };

  const save = async () => {
    setNotice(undefined);
    setSaving(true);
    const result = await graphqlFetch(
      UpsertGlobalPreferences,
      { storeId: props.storeId, input: { globalLogo: draft() } },
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (
      result.kind === 'success' &&
      result.data.centralServer.preferences.upsertPreferences.ok
    ) {
      props.onSaved(draft());
      props.onClose();
    } else {
      setNotice(t('error.something-wrong'));
    }
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.edit-image')}
      width="prose"
      testId="global-logo-modal"
      dismissable={!saving()}
      actions={
        <>
          <CancelButton
            onClick={props.onClose}
            disabled={saving()}
            data-testid="dialog-button-cancel"
          />
          <DialogSaveButton
            onClick={() => void save()}
            loading={saving()}
            disabled={saving() || draft() === props.value}
            data-testid="dialog-button-save"
          />
        </>
      }
    >
      <Stack>
        <Show when={notice()}>
          {message => (
            <Alert severity="error" testId="global-logo-error">
              {message()}
            </Alert>
          )}
        </Show>
        <UploadZone
          accept={LOGO_ACCEPT}
          maxSize={MAX_LOGO_FILE_BYTES}
          multiple={false}
          disabled={saving()}
          inputTestId="global-logo-file-input"
          testId="global-logo-upload"
          // One file per pick; a drop of several takes the first acceptable
          // one, and reports a refusal only when none is.
          onPick={(accepted, rejected) => {
            const [file] = accepted;
            if (file) void onFile(file);
            else if (rejected[0])
              refuse(rejected[0].file.name, rejected[0].reason);
          }}
        />
        <Text variant="bodySmall">
          {t('messages.image-upload-helper', { maxSize: LOGO_MAX_SIZE_LABEL })}
        </Text>
        <Show
          when={draft()}
          fallback={
            <Text variant="bodySmall">{t('messages.none-uploaded')}</Text>
          }
        >
          {src => (
            <div class={styles.logoPreview}>
              <img
                src={src()}
                alt={t('preference.globalLogo')}
                class={styles.logoPreviewImage}
                data-testid="global-logo-preview"
              />
              <Button
                variant="ghost"
                icon={<TrashIcon />}
                onClick={() => {
                  setNotice(undefined);
                  setDraft('');
                }}
                disabled={saving()}
                data-testid="global-logo-remove"
              >
                {t('label.remove')}
              </Button>
            </div>
          )}
        </Show>
      </Stack>
    </Dialog>
  );
};
