import React, { useMemo, useState } from 'react';
import {
  Alert,
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
  UploadFile,
  ConfirmationModal,
} from '@common/components';
import { Box, Select, Typography } from '@openmsupply-client/common';
import {
  SaveIcon,
  DownloadIcon,
  DeleteIcon,
  EditIcon,
  UploadIcon,
} from '@common/icons';
import { useIntlUtils, useTranslation } from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  mergeTranslations,
  ImportMode,
} from './helpers';
import { TranslationsTable } from './TranslationsInputTable';

export const EditCustomTranslations = ({
  value,
  update,
  disabled,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<boolean>;
  disabled: boolean;
}) => {
  const t = useTranslation();
  const isOpen = useToggle();

  const onClose = () => {
    isOpen.toggleOff();
  };

  return (
    <>
      <ButtonWithIcon
        label={t('button.edit')}
        onClick={isOpen.toggleOn}
        Icon={<EditIcon />}
        disabled={disabled}
      />
      {isOpen.isOn && (
        <CustomTranslationsModal
          value={value}
          update={update}
          onClose={onClose}
        />
      )}
    </>
  );
};

export const CustomTranslationsModal = ({
  value,
  update,
  onClose,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<boolean>;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { invalidateCustomTranslations, isRtl } = useIntlUtils();
  const { success, error } = useNotification();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, t)
  );
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const downloadTranslations = () => {
    const asObject = mapTranslationsToObject(translations);
    const dataStr = JSON.stringify(asObject, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-translations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadTranslations = (files: File[], importMode: ImportMode) => {
    if (files.length === 0) return;

    const file = files[0]!;

    if (!file.name.endsWith('.json')) {
      error(t('error.invalid-json'))();
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic validation: ensure it's an object with string values
        if (typeof parsed !== 'object' || parsed === null) {
          error(t('error.invalid-json'))();
          return;
        }

        const isValid = Object.entries(parsed).every(
          ([, val]) => typeof val === 'string'
        );

        if (!isValid) {
          error(t('error.invalid-custom-translation'))();
          return;
        }

        const importedData = parsed as Record<string, string>;
        const importedArray = mapTranslationsToArray(importedData, t);

        setTranslations(
          mergeTranslations(translations, importedArray, importMode)
        );

        success(t('messages.translations-loaded'))();
      } catch {
        error(t('error.an-error-occurred'))();
      }
    };

    reader.readAsText(file);
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    setTranslations([]);
  };

  const save = async (shouldClose = false) => {
    const hasInvalidTranslations = translations.some(tr => tr.isInvalid);
    if (hasInvalidTranslations) {
      setShowValidationErrors(true);
      const errorSnack = error(t('error.invalid-custom-translation'));
      errorSnack();
      return;
    }

    setLoading(true);
    const asObject = mapTranslationsToObject(translations);

    const successfulSave = await update(asObject);
    setLoading(false);

    if (successfulSave) {
      invalidateCustomTranslations();
      success(t('messages.saved'))();
      if (shouldClose) onClose();
    } else {
      error(t('error.failed-to-save-translations'))();
    }
  };

  return (
    <>
      <Modal
        title={t('label.edit-custom-translations')}
        width={1200}
        height={900}
        cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
        saveButton={
          <LoadingButton
            isLoading={loading}
            onClick={() => save(false)}
            label={t('button.save')}
            startIcon={<SaveIcon />}
            variant="outlined"
            color="secondary"
          />
        }
        okButton={
          <LoadingButton
            isLoading={loading}
            onClick={() => save(true)}
            label={t('button.save-and-close')}
            startIcon={<SaveIcon />}
            variant="contained"
            color="secondary"
          />
        }
      >
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          height="100%"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <Box display="flex" gap={1}>
            <ButtonWithIcon
              label={t('button.import')}
              onClick={() => setShowUploadModal(true)}
              Icon={<UploadIcon />}
              disabled={loading}
            />
            <ButtonWithIcon
              label={t('button.download')}
              onClick={downloadTranslations}
              Icon={<DownloadIcon />}
              disabled={loading}
            />
            <ButtonWithIcon
              label={t('button.delete-all')}
              onClick={() => setShowDeleteAllConfirm(true)}
              Icon={<DeleteIcon />}
              disabled={loading}
            />
          </Box>
          <Box flex={1} overflow="auto">
            <TranslationsTable
              translations={translations}
              setTranslations={setTranslations}
              showValidationErrors={showValidationErrors}
            />
          </Box>
        </Box>
      </Modal>

      {showUploadModal && (
        <CustomTranslationsUploadModal
          onUpload={(files, importMode) => {
            handleUploadTranslations(files, importMode);
            setShowUploadModal(false);
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      <ConfirmationModal
        open={showDeleteAllConfirm}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
        title={t('label.delete-all-translations')}
        message={t('messages.delete-all-translations-confirm')}
        info={t('messages.download-first-warning')}
        iconType="alert"
        buttonLabel={t('button.delete')}
      />
    </>
  );
};

const IMPORT_MODE_WARNING = {
  replace: 'messages.import-mode-replace-warning',
  'keep-existing': 'messages.import-mode-keep-existing-warning',
  overwrite: 'messages.import-mode-overwrite-warning',
} as const satisfies Record<ImportMode, string>;

const CustomTranslationsUploadModal = ({
  onUpload,
  onClose,
}: {
  onUpload: (files: File[], importMode: ImportMode) => void;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { isRtl } = useIntlUtils();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('keep-existing');
  const { Modal } = useDialog({
    isOpen: true,
    onClose,
    disableBackdrop: true,
  });

  const importModeOptions = useMemo(
    () => [
      {
        label: t('label.import-mode-keep-existing'),
        value: 'keep-existing' as const,
      },
      {
        label: t('label.import-mode-overwrite'),
        value: 'overwrite' as const,
      },
      {
        label: t('label.import-mode-replace'),
        value: 'replace' as const,
      },
    ],
    [t]
  );

  return (
    <Modal
      title={t('label.import-translations')}
      width={800}
      height={550}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={selectedFiles.length === 0}
          onClick={() => onUpload(selectedFiles, importMode)}
        />
      }
    >
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100%"
        gap={2}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <Alert
          severity={
            importMode === 'replace'
              ? 'error'
              : importMode === 'overwrite'
                ? 'warning'
                : 'info'
          }
          sx={{ width: '100%' }}
        >
          {t(IMPORT_MODE_WARNING[importMode])}
        </Alert>
        <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%' }}>
          <Typography sx={{ whiteSpace: 'nowrap' }}>
            {t('label.import-mode')}:
          </Typography>
          <Select
            value={importMode}
            onChange={e => setImportMode(e.target.value as ImportMode)}
            options={importModeOptions}
            sx={{ flex: 1 }}
          />
        </Box>
        <UploadFile
          onUpload={setSelectedFiles}
          color="secondary"
          accept={{ 'application/json': ['.json'] }}
        />
        {selectedFiles.length > 0 && (
          <Typography color="textSecondary">
            {selectedFiles[0]?.name}
          </Typography>
        )}
      </Box>
    </Modal>
  );
};
