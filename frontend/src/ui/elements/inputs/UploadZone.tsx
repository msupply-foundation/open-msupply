import { createSignal, splitProps, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { UploadIcon } from '../../icons';
import {
  partitionFiles,
  type FileRejection,
  type PartitionOptions,
} from './uploadFiles';
import styles from './UploadZone.module.css';

export interface UploadZoneProps extends PartitionOptions {
  /** Called with the files that pass `accept`/`maxSize`. */
  onFiles: (files: File[]) => void;
  /**
   * Called with files rejected by `accept`/`maxSize`, so they can be surfaced.
   */
  onRejected?: (rejections: FileRejection<File>[]) => void;
  /** Allow selecting/dropping more than one file at once (default true). */
  multiple?: boolean;
  disabled?: boolean;
  class?: string;
  /**
   * `data-testid` for the hidden `<input type="file">` (locale-stable test
   * hook, e2e/TESTIDS.md) — the setInputFiles target in e2e.
   */
  inputTestId?: string;
}

/*
 * UploadZone — a hand-rolled drag-and-drop file target with a Browse button
 * (own the simple: native <input type=file> + the DnD events own the a11y and
 * platform picker; no react-dropzone). The dashed panel is a mouse affordance
 * (clicking it opens the picker); the real keyboard-operable control is the
 * Browse <button>, whose click bubbles to the same handler. Files are filtered
 * through the pure `partitionFiles` (extension/MIME/size), accepted ones handed
 * to `onFiles`, rejected ones to `onRejected`.
 */
export const UploadZone = (props: UploadZoneProps): JSX.Element => {
  const [local] = splitProps(props, [
    'onFiles',
    'onRejected',
    'multiple',
    'disabled',
    'accept',
    'maxSize',
    'class',
    'inputTestId',
  ]);

  const [dragging, setDragging] = createSignal(false);
  // Balances dragenter/dragleave across child elements so moving over inner
  // content doesn't flicker the highlight off.
  let dragDepth = 0;
  let inputRef: HTMLInputElement | undefined;

  const dispatch = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const { accepted, rejected } = partitionFiles(Array.from(fileList), {
      accept: local.accept,
      maxSize: local.maxSize,
    });
    if (rejected.length > 0) local.onRejected?.(rejected);
    if (accepted.length > 0) local.onFiles(accepted);
  };

  const openPicker = () => {
    if (!local.disabled) inputRef?.click();
  };

  const onDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = event => {
    event.preventDefault();
    dragDepth = 0;
    setDragging(false);
    if (local.disabled) return;
    dispatch(event.dataTransfer?.files ?? null);
  };

  return (
    <div
      class={local.class ? `${styles.zone} ${local.class}` : styles.zone}
      data-dragging={dragging() ? '' : undefined}
      data-disabled={local.disabled ? '' : undefined}
      onClick={openPicker}
      onDragEnter={event => {
        event.preventDefault();
        if (local.disabled) return;
        dragDepth += 1;
        setDragging(true);
      }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={() => {
        dragDepth -= 1;
        if (dragDepth <= 0) {
          dragDepth = 0;
          setDragging(false);
        }
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        class={styles.hiddenInput}
        accept={local.accept}
        multiple={local.multiple ?? true}
        disabled={local.disabled}
        tabindex={-1}
        aria-hidden="true"
        data-testid={local.inputTestId}
        onChange={event => {
          dispatch(event.currentTarget.files);
          // Reset so re-selecting the same file fires change again.
          event.currentTarget.value = '';
        }}
      />
      <UploadIcon class={styles.icon} />
      <p class={styles.invite}>{t('messages.upload-invite')}</p>
      <p class={styles.or}>{t('messages.upload-or')}</p>
      {/* The keyboard-operable control; its click bubbles to the zone's
          onClick to open the picker (single handler). */}
      <button type="button" class={styles.browse} disabled={local.disabled}>
        {t('button.browse-files')}
      </button>
    </div>
  );
};
