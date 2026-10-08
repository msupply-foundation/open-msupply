import React, { useState } from 'react';
import {
  Accept,
  ButtonWithIcon,
  DialogButton,
  FileRejection,
  LoadingButton,
  UploadFile,
} from '@common/components';
import { Box, Typography } from '@openmsupply-client/common';
import { DeleteIcon, EditIcon, SaveIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';

/// Max length of the stored data-URL string. Must match
/// MAX_GLOBAL_LOGO_DATA_URL_LENGTH in the server's global_logo.rs.
export const MAX_DATA_URL_LENGTH = 342 * 1024;

/// Raw file cap. A 250KB file's data URL (base64's 4/3 inflation plus the
/// prefix, ~341.4KB) still fits within MAX_DATA_URL_LENGTH.
export const MAX_FILE_BYTES = 250 * 1024;

export const IMAGE_ACCEPT: Accept = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/svg+xml': ['.svg'],
};

const MAX_SIZE_LABEL = `${Math.floor(MAX_FILE_BYTES / 1024)}KB`;

const ALLOWED_MIME_TYPES = new Set(Object.keys(IMAGE_ACCEPT));

// The stored data URL's prefix comes from the file's MIME type, which some
// platforms don't report - fall back to mapping the extension so the prefix
// always matches the server's whitelist.
const mimeForFile = ({ name, type }: Pick<File, 'name' | 'type'>) => {
  if (ALLOWED_MIME_TYPES.has(type)) return type;
  return Object.entries(IMAGE_ACCEPT).find(([, extensions]) =>
    extensions.some(extension => name.toLowerCase().endsWith(extension))
  )?.[0];
};

interface EditImagePreferenceProps {
  /** Current image as a base64 data URL; '' when not set */
  value: string;
  update: (value: string) => Promise<boolean>;
  disabled: boolean;
}

export const EditImagePreference = ({
  value,
  update,
  disabled,
}: EditImagePreferenceProps) => {
  const t = useTranslation();
  const isOpen = useToggle();

  return (
    <Box display="flex" alignItems="center" gap={2}>
      {value ? (
        <Box
          component="img"
          src={value}
          alt=""
          sx={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain' }}
        />
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: 'nowrap' }}
        >
          {t('messages.none-uploaded')}
        </Typography>
      )}
      <ButtonWithIcon
        label={t('button.edit')}
        onClick={isOpen.toggleOn}
        Icon={<EditIcon />}
        disabled={disabled}
      />
      {isOpen.isOn && (
        <ImagePreferenceModal
          value={value}
          update={update}
          onClose={isOpen.toggleOff}
        />
      )}
    </Box>
  );
};

const ImagePreferenceModal = ({
  value,
  update,
  onClose,
}: {
  value: string;
  update: (value: string) => Promise<boolean>;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [draft, setDraft] = useState(value);
  const [loading, setLoading] = useState(false);

  const rejectFile = (filename: string, reason: 'type' | 'size') =>
    error(
      reason === 'size'
        ? t('error.file-exceeds-size-limit', {
            filename,
            maxSize: MAX_SIZE_LABEL,
          })
        : t('error.file-type-not-supported', { filename })
    )();

  // The drag & drop zone validates via `accept`/`maxSize`; these checks also
  // cover the native file picker path.
  const onUpload = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const mimeType = mimeForFile(file);
    if (!mimeType) return rejectFile(file.name, 'type');
    if (file.size > MAX_FILE_BYTES) return rejectFile(file.name, 'size');

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== 'string') return;

      const base64 = dataUrl.slice(
        dataUrl.indexOf('base64,') + 'base64,'.length
      );
      const normalised = `data:${mimeType};base64,${base64}`;

      // Authoritative check on what is actually stored (matches the server)
      if (normalised.length > MAX_DATA_URL_LENGTH)
        return rejectFile(file.name, 'size');

      setDraft(normalised);
    };
    reader.readAsDataURL(file);
  };

  const onRejected = (rejections: FileRejection[]) =>
    rejections.forEach(({ file, errors }) =>
      rejectFile(
        file.name,
        errors.some(e => e.code === 'file-too-large') ? 'size' : 'type'
      )
    );

  const save = async () => {
    setLoading(true);
    const successfulSave = await update(draft);
    setLoading(false);

    if (successfulSave) {
      success(t('messages.saved'))();
      onClose();
    } else {
      error(t('error.something-wrong'))();
    }
  };

  return (
    <Modal
      title={t('label.edit-image')}
      width={550}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <LoadingButton
          isLoading={loading}
          onClick={save}
          label={t('button.save')}
          startIcon={<SaveIcon />}
          variant="contained"
          color="secondary"
        />
      }
    >
      <Box display="flex" flexDirection="column" gap={2} alignItems="center">
        <UploadFile
          onUpload={onUpload}
          accept={IMAGE_ACCEPT}
          maxSize={MAX_FILE_BYTES}
          onRejected={onRejected}
        />
        <Typography variant="body2" color="text.secondary">
          {t('messages.image-upload-helper', { maxSize: MAX_SIZE_LABEL })}
        </Typography>
        {draft ? (
          <>
            <Box
              component="img"
              src={draft}
              alt=""
              sx={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }}
            />
            <ButtonWithIcon
              label={t('label.remove')}
              onClick={() => setDraft('')}
              Icon={<DeleteIcon />}
              disabled={loading}
            />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('messages.none-uploaded')}
          </Typography>
        )}
      </Box>
    </Modal>
  );
};
