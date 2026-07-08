import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
  UploadFile,
  ConfirmationModal,
} from '@common/components';
import {
  Box,
  InputLabel,
  Select,
  Typography,
  usePreferences,
} from '@openmsupply-client/common';
import {
  SaveIcon,
  DownloadIcon,
  DeleteIcon,
  EditIcon,
  UploadIcon,
  CopyIcon,
} from '@common/icons';
import { useIntl, useIntlUtils, useTranslation } from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  translationsToFlatMap,
  mergeTranslations,
  mergeNestedTranslations,
  mergeFlatMaps,
  setNamespaceTranslations,
  collectNamespaces,
  buildExportObject,
  splitImportObject,
  ImportMode,
  CustomTranslationsV2,
  BASE_CUSTOM_TRANSLATION_NAMESPACES,
  LEGACY_NAMESPACE,
  DEFAULT_CUSTOM_TRANSLATION_NAMESPACE,
  Translation,
} from './helpers';
import { TranslationsTable } from './TranslationsInputTable';
import { useUpsertCustomTranslationsV2 } from '../../api';
import { useInstalledPlugins } from '../../../Plugins/api';

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
  const { i18n } = useIntl();
  const {
    currentLanguage,
    currentLanguageName,
    invalidateCustomTranslations,
    isRtl,
  } = useIntlUtils();
  const { success, error } = useNotification();
  const { mutateAsync } = useUpsertCustomTranslationsV2();

  // Snapshot the language being edited when the modal opens. All view/commit/
  // save operations use this, never the live language, so the modal always
  // edits the language it was opened with even if something changes the app
  // language underneath it.
  const [editingLanguage] = useState(currentLanguage);
  const [editingLanguageName] = useState(currentLanguageName);
  const [openedI18nLanguage] = useState(i18n.language);
  // The footer language selector normally reloads the page (closing this
  // modal), but guard against the app language changing while we're open so we
  // never save the edited rows under the wrong language.
  const languageChanged = i18n.language !== openedI18nLanguage;
  const editingLanguageLabel = editingLanguageName ?? editingLanguage;

  // Legacy v1 flat map (applies to all languages / older clients). Surfaced as
  // the reserved "legacy" namespace, and only when it already has data.
  const v1FromServer = usePreferences().customTranslations as
    | Record<string, string>
    | undefined;

  // Plugin namespaces (one per installed plugin, by plugin_code).
  const {
    query: { data: installedPlugins },
  } = useInstalledPlugins();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // The full v2 structure (all languages and namespaces). The footer language
  // selector controls which language is edited; the namespace selector below
  // controls which namespace within that language.
  const [nested, setNested] = useState<CustomTranslationsV2>(value);
  const [namespace, setNamespace] = useState<string>(
    DEFAULT_CUSTOM_TRANSLATION_NAMESPACE
  );
  // Legacy v1 map and whether it's been touched this session (so we only write
  // v1 when the admin actually edited the legacy namespace).
  const [legacyV1, setLegacyV1] = useState<Record<string, string> | undefined>(
    undefined
  );
  const [legacyDirty, setLegacyDirty] = useState(false);

  useEffect(() => {
    if (legacyV1 === undefined && v1FromServer !== undefined) {
      setLegacyV1(v1FromServer);
    }
  }, [v1FromServer, legacyV1]);

  const isLegacy = namespace === LEGACY_NAMESPACE;
  const legacyHasData = !!legacyV1 && Object.keys(legacyV1).length > 0;

  const viewFor = (
    ns: string,
    nestedSrc: CustomTranslationsV2,
    legacySrc: Record<string, string>
  ): Translation[] =>
    ns === LEGACY_NAMESPACE
      ? mapTranslationsToArray(legacySrc, t, { includeUnknownKeys: true })
      : mapTranslationsToArray(nestedSrc[editingLanguage]?.[ns] ?? {}, t, {
          includeUnknownKeys: true,
        });

  const [translations, setTranslations] = useState<Translation[]>(
    viewFor(DEFAULT_CUSTOM_TRANSLATION_NAMESPACE, value, {})
  );

  // Commit the current table edits back into either the v2 structure or the
  // legacy v1 map, depending on the selected namespace.
  const commitCurrentView = (): {
    nested: CustomTranslationsV2;
    legacyV1: Record<string, string>;
  } => {
    if (isLegacy) {
      // Keep all entries (the legacy map is global, not pruned per-language)
      return { nested, legacyV1: translationsToFlatMap(translations) };
    }
    return {
      nested: setNamespaceTranslations(
        nested,
        editingLanguage,
        namespace,
        mapTranslationsToObject(translations)
      ),
      legacyV1: legacyV1 ?? {},
    };
  };

  const namespaceOptions = useMemo(() => {
    const set = new Set<string>([
      ...BASE_CUSTOM_TRANSLATION_NAMESPACES,
      ...(installedPlugins?.nodes ?? []).map(p => p.code),
      ...collectNamespaces(nested),
    ]);
    const options = [...set].map(ns => ({ label: ns, value: ns }));
    if (legacyHasData) {
      options.push({
        label: t('label.namespace-legacy'),
        value: LEGACY_NAMESPACE,
      });
    }
    return options;
  }, [installedPlugins, nested, legacyHasData, t]);

  const handleNamespaceChange = (newNamespace: string) => {
    if (newNamespace === namespace) return;
    // Save the current edits before switching namespace
    const committed = commitCurrentView();
    if (isLegacy) setLegacyDirty(true);
    setNested(committed.nested);
    setLegacyV1(committed.legacyV1);
    setNamespace(newNamespace);
    setTranslations(
      viewFor(newNamespace, committed.nested, committed.legacyV1)
    );
  };

  const downloadTranslations = () => {
    const committed = commitCurrentView();
    const exportObj = buildExportObject(committed.nested, committed.legacyV1);
    const dataStr = JSON.stringify(exportObj, null, 2);
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
        const committed = commitCurrentView();
        const split = splitImportObject(parsed as Record<string, unknown>);

        if (split.isStructured) {
          // Multi-language / multi-namespace file (optionally with `_v1`)
          let nextNested = committed.nested;
          let nextLegacy = committed.legacyV1;
          if (split.v2) {
            nextNested = mergeNestedTranslations(
              committed.nested,
              split.v2,
              importMode
            );
          }
          if (split.legacyV1) {
            nextLegacy = mergeFlatMaps(
              committed.legacyV1,
              split.legacyV1,
              importMode
            );
            setLegacyDirty(true);
          }
          setNested(nextNested);
          setLegacyV1(nextLegacy);
          setTranslations(viewFor(namespace, nextNested, nextLegacy));
        } else {
          // Plain flat file - import into the current view
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
          if (isLegacy) setLegacyDirty(true);
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

  // Stage the legacy v1 entries into the current language + namespace so they
  // can be saved as proper per-language v2 translations.
  const copyLegacyIntoCurrentLanguage = () => {
    if (!legacyV1) return;
    const importedArray = mapTranslationsToArray(legacyV1, t, {
      includeUnknownKeys: true,
    });
    setTranslations(prev =>
      mergeTranslations(prev, importedArray, 'keep-existing')
    );
    success(t('messages.translations-loaded'))();
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    if (isLegacy) setLegacyDirty(true);
    // Clears the current view only (current language + namespace, or legacy)
    setTranslations([]);
  };

  const save = async (shouldClose = false) => {
    // Never save once the app language has changed - the rows belong to the
    // language the modal was opened with.
    if (languageChanged) {
      error(t('messages.custom-translations-language-changed'))();
      return;
    }

    const hasInvalidTranslations = translations.some(tr => tr.isInvalid);
    if (hasInvalidTranslations) {
      setShowValidationErrors(true);
      error(t('error.invalid-custom-translation'))();
      return;
    }

    setLoading(true);
    const committed = commitCurrentView();
    const legacyTouched = legacyDirty || isLegacy;

    try {
      await mutateAsync({
        customTranslationsV2: committed.nested,
        ...(legacyTouched ? { customTranslations: committed.legacyV1 } : {}),
      });
      setNested(committed.nested);
      setLegacyV1(committed.legacyV1);
      setLegacyDirty(false);
      // If the legacy namespace was just cleared, fall back to common so the
      // (now hidden) legacy option isn't left selected.
      if (isLegacy && Object.keys(committed.legacyV1).length === 0) {
        setNamespace(DEFAULT_CUSTOM_TRANSLATION_NAMESPACE);
        setTranslations(
          viewFor(
            DEFAULT_CUSTOM_TRANSLATION_NAMESPACE,
            committed.nested,
            committed.legacyV1
          )
        );
      }
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
            disabled={languageChanged}
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
            disabled={languageChanged}
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
          {languageChanged && (
            <Alert severity="error">
              {t('messages.custom-translations-language-changed', {
                language: editingLanguageLabel,
              })}
            </Alert>
          )}
          <Alert severity={isLegacy ? 'warning' : 'info'}>
            {isLegacy
              ? t('messages.custom-translations-legacy-banner')
              : t('messages.custom-translations-editing-language', {
                  language: editingLanguageLabel,
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
            {legacyHasData && !isLegacy && (
              <ButtonWithIcon
                label={t('button.copy-legacy-into-language', {
                  language: editingLanguageLabel,
                })}
                onClick={copyLegacyIntoCurrentLanguage}
                Icon={<CopyIcon />}
                disabled={loading}
              />
            )}
            <ButtonWithIcon
              label={t('button.import')}
              onClick={() => setShowUploadModal(true)}
              Icon={<UploadIcon />}
              disabled={loading}
            />
            <ButtonWithIcon
              label={t('button.export')}
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
