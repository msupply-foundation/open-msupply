import React, { useMemo, useState } from 'react';
import {
  Alert,
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
  UploadFile,
  ConfirmationModal,
} from '@common/components';
import { Box, InputLabel, Select, Typography } from '@openmsupply-client/common';
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
  mergeNestedTranslations,
  setNamespaceTranslations,
  isNestedTranslations,
  ImportMode,
  CustomTranslationsV2,
  CUSTOM_TRANSLATION_NAMESPACES,
  DEFAULT_CUSTOM_TRANSLATION_NAMESPACE,
  Translation,
} from './helpers';
import { TranslationsTable } from './TranslationsInputTable';
import { useUpsertCustomTranslationsV2 } from '../../api';

export const EditCustomTranslationsV2 = ({
  value,
  disabled,
}: {
  value: CustomTranslationsV2;
  disabled: boolean;
}) => {
  const t = useTranslation();
  const isOpen = useToggle();

  return (
    <>
      <ButtonWithIcon
        label={t('button.edit')}
        onClick={isOpen.toggleOn}
        Icon={<EditIcon />}
        disabled={disabled}
      />
      {isOpen.isOn && (
        <CustomTranslationsV2Modal value={value} onClose={isOpen.toggleOff} />
      )}
    </>
  );
};

export const CustomTranslationsV2Modal = ({
  value,
  onClose,
}: {
  value: CustomTranslationsV2;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { currentLanguage, currentLanguageName, invalidateCustomTranslations, isRtl } =
    useIntlUtils();
  const { success, error } = useNotification();
  const { mutateAsync } = useUpsertCustomTranslationsV2();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // The full nested structure (all languages and namespaces). The footer
  // language selector controls which language is edited; the namespace
  // selector below controls which namespace within that language.
  const [nested, setNested] = useState<CustomTranslationsV2>(value);
  const [namespace, setNamespace] = useState<string>(
    DEFAULT_CUSTOM_TRANSLATION_NAMESPACE
  );

  const loadView = (
    source: CustomTranslationsV2,
    ns: string
  ): Translation[] =>
    mapTranslationsToArray(source[currentLanguage]?.[ns] ?? {}, t, {
      includeUnknownKeys: true,
    });

  const [translations, setTranslations] = useState<Translation[]>(
    loadView(value, DEFAULT_CUSTOM_TRANSLATION_NAMESPACE)
  );

  // Commit the current table edits back into the nested structure for the
  // current language + namespace.
  const commitCurrentView = (source: CustomTranslationsV2): CustomTranslationsV2 =>
    setNamespaceTranslations(
      source,
      currentLanguage,
      namespace,
      mapTranslationsToObject(translations)
    );

  const namespaceOptions = useMemo(
    () =>
      CUSTOM_TRANSLATION_NAMESPACES.map(ns => ({
        label: ns,
        value: ns,
      })),
    []
  );

  const handleNamespaceChange = (newNamespace: string) => {
    if (newNamespace === namespace) return;
    // Save the current edits before switching namespace
    const updated = commitCurrentView(nested);
    setNested(updated);
    setNamespace(newNamespace);
    setTranslations(loadView(updated, newNamespace));
  };

  const downloadTranslations = () => {
    // Export the whole nested structure (all languages and namespaces)
    const updated = commitCurrentView(nested);
    const dataStr = JSON.stringify(updated, null, 2);
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

        if (typeof parsed !== 'object' || parsed === null) {
          error(t('error.invalid-json'))();
          return;
        }

        // Commit current edits first so the import merges against latest state
        const current = commitCurrentView(nested);

        if (isNestedTranslations(parsed)) {
          // Multi-language nested file
          const merged = mergeNestedTranslations(current, parsed, importMode);
          setNested(merged);
          setTranslations(loadView(merged, namespace));
        } else {
          // Legacy flat file - import into the current language + namespace
          const isValid = Object.values(parsed).every(
            val => typeof val === 'string'
          );
          if (!isValid) {
            error(t('error.invalid-custom-translation'))();
            return;
          }
          const importedArray = mapTranslationsToArray(
            parsed as Record<string, string>,
            t,
            { includeUnknownKeys: true }
          );
          setTranslations(prev =>
            mergeTranslations(prev, importedArray, importMode)
          );
        }

        success(t('messages.translations-loaded'))();
      } catch {
        error(t('error.an-error-occurred'))();
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    // Clears the current language + namespace only
    setTranslations([]);
  };

  const save = async (shouldClose = false) => {
    const hasInvalidTranslations = translations.some(tr => tr.isInvalid);
    if (hasInvalidTranslations) {
      setShowValidationErrors(true);
      error(t('error.invalid-custom-translation'))();
      return;
    }

    setLoading(true);
    const updated = commitCurrentView(nested);

    try {
      await mutateAsync({ translations: updated, language: currentLanguage });
      setNested(updated);
      invalidateCustomTranslations();
      success(t('messages.saved'))();
      if (shouldClose) onClose();
    } catch {
      error(t('error.failed-to-save-translations'))();
    } finally {
      setLoading(false);
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
          <Alert severity="info">
            {t('messages.custom-translations-editing-language', {
              language: currentLanguageName ?? currentLanguage,
            })}
          </Alert>
          <Box display="flex" gap={1} alignItems="center">
            <Box display="flex" gap={1} alignItems="center">
              <InputLabel>{t('label.namespace')}:</InputLabel>
              <Select
                value={namespace}
                onChange={e => handleNamespaceChange(e.target.value)}
                options={namespaceOptions}
                disabled={loading}
              />
            </Box>
            <Box flex={1} />
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
        <CustomTranslationsV2UploadModal
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

const CustomTranslationsV2UploadModal = ({
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
        <Typography color="textSecondary" sx={{ width: '100%' }}>
          {t('messages.custom-translations-import-multi-language')}
        </Typography>
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
