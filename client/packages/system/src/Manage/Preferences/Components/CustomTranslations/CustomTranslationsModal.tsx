import React, { useState } from 'react';
import {
  Alert,
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
  UploadFile,
  ConfirmationModal,
} from '@common/components';
import { Box, Typography} from '@openmsupply-client/common';

import { SaveIcon, DownloadIcon, DeleteIcon, EditIcon, UploadIcon } from '@common/icons';
import { useIntlUtils, useTranslation } from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import { mapTranslationsToArray, mapTranslationsToObject } from './helpers';
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
  const defaultTranslation = useTranslation('common');
  const { invalidateCustomTranslations } = useIntlUtils();
  const { success, error } = useNotification();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, defaultTranslation)
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

  const handleUploadTranslations = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0]!;

    if (!file.name.endsWith('.json')) {
      error(t('error.invalid-json'))();
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
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

        // Map the imported translations
        const importedArray = mapTranslationsToArray(
          parsed as Record<string, string>,
          defaultTranslation
        );
        setTranslations(importedArray);
        success(t('messages.translations-loaded'))();
      } catch {
        error(t('error.invalid-json'))();
      }
    };

    reader.readAsText(file);
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    setTranslations([]);
  };

  const saveAndClose = async () => {
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
      onClose();
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
        okButton={
          <LoadingButton
            isLoading={loading}
            onClick={saveAndClose}
            label={t('button.save')}
            startIcon={<SaveIcon />}
            variant="contained"
            color="secondary"
          />
        }
      >
        <Box display="flex" flexDirection="column" gap={2} height="100%">
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
          onUpload={(files) => {
            handleUploadTranslations(files);
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

const CustomTranslationsUploadModal = ({
  onUpload,
  onClose,
}: {
  onUpload: (files: File[]) => void;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { Modal } = useDialog({
    isOpen: true,
    onClose,
    disableBackdrop: true,
  });

  return (
    <Modal
      title={t('label.import-translations')}
      width={800}
      height={500}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={selectedFiles.length === 0}
          onClick={() => onUpload(selectedFiles)}
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
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          {t('messages.import-replaces-warning')}
        </Alert>
        <UploadFile
          onUpload={setSelectedFiles}
          color="secondary"
          accept={{ 'application/json': ['.json'] }}
          maxFiles={1}
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
