import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
  untrack,
} from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { gated } from '../../api/gated';
import { invalidateCustomTranslations, locale, t } from '../../intl';
import { currentLanguageName } from '../../intl/intlUtils';
import { loadedPlugins } from '../../plugins/registry';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import {
  CancelButton,
  OkButton,
} from '../../ui/elements/buttons/StandardButtons';
import { Button } from '../../ui/elements/buttons/Button';
import { IconButton } from '../../ui/elements/buttons/IconButton';
import { Alert } from '../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Table } from '../../ui/elements/table/Table';
import { TextField } from '../../ui/elements/inputs/TextField';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { UploadZone } from '../../ui/elements/inputs/UploadZone';
import { Select } from '../../ui/elements/selectors/Select';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { Stack } from '../../ui/layout/Stack/Stack';
import { HStack } from '../../ui/layout/Stack/HStack';
import { Text } from '../../ui/elements/typography/Text';
import { CopyIcon, TrashIcon, DownloadIcon, UploadIcon } from '../../ui/icons';
import {
  LegacyCustomTranslations,
  UpsertGlobalPreferences,
} from './globalPreferences.generated';
import {
  asFlatMap,
  buildExportObject,
  DEFAULT_NAMESPACE,
  filterRows,
  isInvalidCustom,
  isValidFlatImport,
  LEGACY_NAMESPACE,
  mapToRows,
  mergeFlatMaps,
  mergeNestedTranslations,
  mergeRows,
  namespaceOptions,
  pluralisationFamily,
  rowsToFlatMap,
  rowsToNamespaceMap,
  setNamespaceTranslations,
  splitImportObject,
  type CustomTranslationsV2,
  type ImportMode,
  type TranslationOption,
  type TranslationRow,
} from './translationsLogic';
import styles from './CustomTranslationsModal.module.css';

type Notice =
  { kind: 'saved' } | { kind: 'loaded' } | { kind: 'error'; message: string };

/*
 * S2 — the custom-translations editor (spec/global-preferences/ui-surface.md
 * § S2): a modal editing the per-language, per-namespace overrides and — via
 * the reserved legacy view — the flat all-languages v1 map. The language being
 * edited is fixed at open; if the app language changes underneath, saving is
 * refused (OMS-REG-GPREF-01.16/.28).
 *
 * Reactivity: every resource here first fetches on an interaction — the Edit
 * click that opened this dialog — so each is read through the `.state` gate
 * and never suspends (kdd/solid-reactivity-pitfalls § no remounts on
 * interaction).
 */
export const CustomTranslationsModal = (props: {
  storeId: string;
  value: CustomTranslationsV2;
  onSaved: (nested: CustomTranslationsV2) => void;
  onClose: () => void;
}) => {
  // The language snapshot: this modal edits the language it was opened with.
  const editingLanguage = locale();
  const editingLanguageName = currentLanguageName();
  const languageChanged = () => locale() !== editingLanguage;

  // Deliberate one-time snapshot: the modal mounts fresh per open (gated by
  // <Show>) and edits a draft — a mid-edit change to the page's value must
  // NOT reach in.
  // eslint-disable-next-line solid/reactivity
  const [nested, setNested] = createSignal<CustomTranslationsV2>(props.value);
  const [namespace, setNamespace] = createSignal<string>(DEFAULT_NAMESPACE);
  const [rows, setRows] = createSignal<TranslationRow[]>([]);
  const [filter, setFilter] = createSignal('');
  const [notice, setNotice] = createSignal<Notice | undefined>();
  const [showValidation, setShowValidation] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [importOpen, setImportOpen] = createSignal(false);
  const [deleteAllOpen, setDeleteAllOpen] = createSignal(false);
  // The legacy map and whether this session touched it — v1 is written only
  // when the legacy view was edited (rules § The custom-translations editor).
  const [legacy, setLegacy] = createSignal<Record<string, string>>({});
  const [legacyLoaded, setLegacyLoaded] = createSignal(false);
  const [legacyDirty, setLegacyDirty] = createSignal(false);
  // Remount key for the add-search, clearing it after each pick.
  const [addResetKey, setAddResetKey] = createSignal(1);

  // ---------------------------------------------------------------------
  // Interaction-opened reads — all `.state`-gated, never suspending.

  // The legacy v1 map, read through the typed runtime query because the
  // description list deliberately never describes it (contract § The
  // custom-translations editor).
  const [legacyData] = createResource(async () => {
    const result = await graphqlFetch(
      LegacyCustomTranslations,
      { storeId: props.storeId },
      { background: true }
    );
    return result.kind === 'success'
      ? asFlatMap(result.data.preferences.customTranslations)
      : {};
  });
  createEffect(() => {
    const served = legacyData.state === 'ready' ? legacyData.latest : undefined;
    if (served && !legacyLoaded()) {
      setLegacy(served);
      setLegacyLoaded(true);
    }
  });

  // The bundled catalogues: the editing language's (defaults shown in that
  // language) with English as the key universe and fallback. `desktop` loads
  // only if that namespace is visited.
  const loadBundle = async (
    language: string,
    ns: 'common' | 'desktop'
  ): Promise<Record<string, string>> => {
    try {
      const module = await import(`../../intl/locales/${language}/${ns}.json`);
      return (module.default ?? module) as Record<string, string>;
    } catch {
      return {};
    }
  };
  const [bundles] = createResource(
    () => (namespace() === 'desktop' ? 'desktop' : 'common'),
    async (ns: 'common' | 'desktop') => ({
      editingCommon: await loadBundle(editingLanguage, 'common'),
      enCommon: await loadBundle('en', 'common'),
      editingNs: await loadBundle(editingLanguage, ns),
      enNs: await loadBundle('en', ns),
    })
  );
  const loadedBundles = () => gated(bundles);

  /* The default text a key seeds/compares against (rules § The
     custom-translations editor): the bundled string for the bundled
     namespaces (editing language first, English fallback); the key itself
     elsewhere. */
  const getDefault = (ns: string, key: string): string => {
    const loaded = loadedBundles();
    if (ns === DEFAULT_NAMESPACE || ns === LEGACY_NAMESPACE)
      return loaded?.editingCommon[key] ?? loaded?.enCommon[key] ?? '';
    if (ns === 'desktop')
      return loaded?.editingNs[key] ?? loaded?.enNs[key] ?? '';
    return key;
  };

  const viewFor = (
    ns: string,
    nestedSource: CustomTranslationsV2,
    legacySource: Record<string, string>
  ): TranslationRow[] =>
    mapToRows(
      ns === LEGACY_NAMESPACE
        ? legacySource
        : (nestedSource[editingLanguage]?.[ns] ?? {}),
      key => getDefault(ns, key)
    );

  // Seed the table once the default-resolving bundles are in; afterwards a
  // newly landed bundle (the desktop namespace's) re-resolves the visible
  // rows' defaults and their validity. `on` keeps the body untracked so a
  // namespace switch or row edit never re-runs it.
  const [seeded, setSeeded] = createSignal(false);
  createEffect(
    on(loadedBundles, loaded => {
      if (!loaded) return;
      if (!untrack(seeded)) {
        setSeeded(true);
        setRows(viewFor(untrack(namespace), untrack(nested), untrack(legacy)));
        return;
      }
      const ns = untrack(namespace);
      setRows(current =>
        current.map(row => {
          const resolvedDefault = getDefault(ns, row.key);
          return {
            ...row,
            default: resolvedDefault,
            isInvalid: isInvalidCustom(resolvedDefault, row.custom),
          };
        })
      );
    })
  );

  const isLegacy = () => namespace() === LEGACY_NAMESPACE;
  const legacyHasData = () => Object.keys(legacy()).length > 0;

  /* Commit the table back into the structure it edits — called before any
     operation that leaves the current view (OMS-REG-GPREF-01.21). */
  const commitCurrentView = (): {
    nested: CustomTranslationsV2;
    legacy: Record<string, string>;
  } => {
    if (isLegacy()) return { nested: nested(), legacy: rowsToFlatMap(rows()) };
    return {
      nested: setNamespaceTranslations(
        nested(),
        editingLanguage,
        namespace(),
        rowsToNamespaceMap(rows())
      ),
      legacy: legacy(),
    };
  };

  const switchNamespace = (next: string) => {
    if (next === namespace()) return;
    const committed = commitCurrentView();
    if (isLegacy()) setLegacyDirty(true);
    setNested(committed.nested);
    setLegacy(committed.legacy);
    setNamespace(next);
    setRows(viewFor(next, committed.nested, committed.legacy));
    setFilter('');
  };

  // ---------------------------------------------------------------------
  // Adding & editing rows

  const addOptions = (): TranslationOption[] => {
    const loaded = loadedBundles();
    const existing = new Set(rows().map(row => row.key));
    let keys: string[];
    if (namespace() === DEFAULT_NAMESPACE || isLegacy())
      keys = Object.keys(loaded?.enCommon ?? {});
    else if (namespace() === 'desktop') keys = Object.keys(loaded?.enNs ?? {});
    else {
      const set = new Set<string>();
      for (const namespaces of Object.values(nested()))
        for (const key of Object.keys(namespaces[namespace()] ?? {}))
          set.add(key);
      keys = [...set].sort((a, b) => a.localeCompare(b));
    }
    return keys
      .filter(key => !existing.has(key))
      .map(key => ({ key, default: getDefault(namespace(), key) }));
  };

  /* Selecting one option adds its whole pluralisation family, each row's
     custom seeded with the default (OMS-REG-GPREF-01.17). */
  const addRows = (option: TranslationOption | null) => {
    if (!option) return;
    const family = pluralisationFamily(option, addOptions());
    setRows(current => [
      ...family.map(member => ({
        id: member.key,
        key: member.key,
        default: member.default,
        custom: member.default,
        isNew: true,
      })),
      ...current,
    ]);
    setAddResetKey(key => key + 1);
  };

  const updateCustom = (id: string, custom: string) => {
    setRows(current =>
      current.map(row =>
        row.id === id
          ? { ...row, custom, isInvalid: isInvalidCustom(row.default, custom) }
          : row
      )
    );
  };

  const deleteRow = (id: string) => {
    if (isLegacy()) setLegacyDirty(true);
    setRows(current => current.filter(row => row.id !== id));
  };

  // ---------------------------------------------------------------------
  // Import / export / delete all / copy legacy

  const exportTranslations = () => {
    const committed = commitCurrentView();
    const exportObject = buildExportObject(committed.nested, committed.legacy);
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-translations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File, mode: ImportMode) => {
    if (!file.name.endsWith('.json')) {
      setNotice({ kind: 'error', message: t('error.invalid-json') });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setNotice({ kind: 'error', message: t('error.invalid-json') });
      return;
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      setNotice({ kind: 'error', message: t('error.invalid-json') });
      return;
    }

    const committed = commitCurrentView();
    const split = splitImportObject(parsed as Record<string, unknown>);

    if (split.isStructured) {
      // A multi-language / multi-namespace file, optionally carrying `_v1`
      // (OMS-REG-GPREF-01.23).
      let nextNested = committed.nested;
      let nextLegacy = committed.legacy;
      if (split.v2)
        nextNested = mergeNestedTranslations(committed.nested, split.v2, mode);
      if (split.legacy) {
        nextLegacy = mergeFlatMaps(committed.legacy, split.legacy, mode);
        setLegacyDirty(true);
      }
      setNested(nextNested);
      setLegacy(nextLegacy);
      setRows(viewFor(namespace(), nextNested, nextLegacy));
    } else {
      // A plain flat file lands in the current view (OMS-REG-GPREF-01.24).
      if (!isValidFlatImport(parsed)) {
        setNotice({
          kind: 'error',
          message: t('error.invalid-custom-translation'),
        });
        return;
      }
      const imported = mapToRows(parsed, key => getDefault(namespace(), key));
      if (isLegacy()) setLegacyDirty(true);
      setRows(current => mergeRows(current, imported, mode));
    }
    setNotice({ kind: 'loaded' });
  };

  const deleteAll = () => {
    setDeleteAllOpen(false);
    if (isLegacy()) setLegacyDirty(true);
    setRows([]);
  };

  /* Stage the legacy entries into the current language + namespace, keeping
     existing rows (OMS-REG-GPREF-01.27). */
  const copyLegacyIntoLanguage = () => {
    const imported = mapToRows(legacy(), key =>
      getDefault(DEFAULT_NAMESPACE, key)
    );
    setRows(current => mergeRows(current, imported, 'keep-existing'));
    setNotice({ kind: 'loaded' });
  };

  // ---------------------------------------------------------------------
  // Saving (OMS-REG-GPREF-01.18/.19/.26/.28)

  const save = async (closeAfter: boolean) => {
    // Never save under a changed app language — the rows belong to the
    // language the modal opened with.
    if (languageChanged()) return;
    if (rows().some(row => row.isInvalid)) {
      setShowValidation(true);
      setNotice({
        kind: 'error',
        message: t('error.invalid-custom-translation'),
      });
      return;
    }

    setSaving(true);
    const committed = commitCurrentView();
    const legacyTouched = legacyDirty() || isLegacy();

    const result = await graphqlFetch(
      UpsertGlobalPreferences,
      {
        storeId: props.storeId,
        input: {
          customTranslationsV2: committed.nested,
          ...(legacyTouched ? { customTranslations: committed.legacy } : {}),
        },
      },
      { background: true, returnGraphqlErrors: true }
    );
    setSaving(false);
    const ok =
      result.kind === 'success' &&
      result.data.centralServer.preferences.upsertPreferences.ok;
    if (!ok) {
      setNotice({
        kind: 'error',
        message: t('error.failed-to-save-translations'),
      });
      return;
    }

    setNested(committed.nested);
    setLegacy(committed.legacy);
    setLegacyDirty(false);
    props.onSaved(committed.nested);
    // A saved override reaches the live dictionary by direct call
    // (i18n › refreshing custom translations); fire-and-forget.
    void invalidateCustomTranslations();
    // A just-emptied legacy view is no longer offered — fall back to common.
    if (isLegacy() && Object.keys(committed.legacy).length === 0) {
      setNamespace(DEFAULT_NAMESPACE);
      setRows(viewFor(DEFAULT_NAMESPACE, committed.nested, committed.legacy));
    }
    if (closeAfter) props.onClose();
    else setNotice({ kind: 'saved' });
  };

  const visibleRows = () => filterRows(rows(), filter());

  return (
    <>
      <Dialog
        open
        onClose={props.onClose}
        title={t('label.edit-custom-translations')}
        width="wide"
        actions={
          <>
            <CancelButton onClick={props.onClose} />
            <Button
              variant="secondary"
              onClick={() => void save(false)}
              disabled={saving() || languageChanged()}
              data-testid="custom-translations-save"
            >
              {t('button.save')}
            </Button>
            {/* The dialog's primary confirm carries a bespoke verb, so it is a
                plain Button declaring `confirms` by hand (StandardButtons'
                own escape hatch). */}
            <Button
              variant="primary"
              confirms="plain"
              onClick={() => void save(true)}
              disabled={saving() || languageChanged()}
              data-testid="custom-translations-save-and-close"
            >
              {t('button.save-and-close')}
            </Button>
          </>
        }
      >
        <Stack>
          <Show when={languageChanged()}>
            <Alert
              severity="error"
              testId="custom-translations-language-changed"
            >
              {t('messages.custom-translations-language-changed', {
                language: editingLanguageName,
              })}
            </Alert>
          </Show>
          <Alert severity={isLegacy() ? 'warning' : 'info'}>
            {isLegacy()
              ? t('messages.custom-translations-legacy-banner')
              : t('messages.custom-translations-editing-language', {
                  language: editingLanguageName,
                })}
          </Alert>
          <Show when={notice()}>
            {active => (
              <Alert
                severity={active().kind === 'error' ? 'error' : 'success'}
                testId="custom-translations-notice"
              >
                {active().kind === 'saved'
                  ? t('messages.saved')
                  : active().kind === 'loaded'
                    ? t('messages.translations-loaded')
                    : (active() as { message: string }).message}
              </Alert>
            )}
          </Show>

          <div class={styles.toolbar}>
            <FieldRow label={`${t('label.namespace')}:`}>
              <Select
                label={t('label.namespace')}
                hideLabel
                options={namespaceOptions(
                  nested(),
                  loadedPlugins().map(plugin => plugin.code),
                  legacyHasData()
                ).map(value => ({
                  value,
                  label:
                    value === LEGACY_NAMESPACE
                      ? t('label.namespace-legacy')
                      : value,
                }))}
                value={namespace()}
                onValueChange={switchNamespace}
                disabled={saving()}
                testId="custom-translations-namespace"
              />
            </FieldRow>
            <HStack gap="sm">
              <Show when={legacyHasData() && !isLegacy()}>
                <Button
                  variant="secondary"
                  onClick={copyLegacyIntoLanguage}
                  disabled={saving()}
                  data-testid="custom-translations-copy-legacy"
                >
                  <CopyIcon />
                  {t('button.copy-legacy-into-language', {
                    language: editingLanguageName,
                  })}
                </Button>
              </Show>
              <Button
                variant="secondary"
                onClick={() => setImportOpen(true)}
                disabled={saving()}
                data-testid="custom-translations-import"
              >
                <UploadIcon /> {t('button.import')}
              </Button>
              <Button
                variant="secondary"
                onClick={exportTranslations}
                disabled={saving()}
                data-testid="custom-translations-export"
              >
                <DownloadIcon /> {t('button.export')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDeleteAllOpen(true)}
                disabled={saving()}
                data-testid="custom-translations-delete-all"
              >
                <TrashIcon /> {t('button.delete-all')}
              </Button>
            </HStack>
          </div>

          <Show when={addResetKey()} keyed>
            {_ => (
              <Combobox
                label={t('placeholder.add-translation')}
                items={addOptions()}
                itemToString={option =>
                  option.default !== option.key
                    ? `${option.key} — ${option.default}`
                    : option.key
                }
                itemToValue={option => option.key}
                onChange={addRows}
                placeholder={t('placeholder.add-translation')}
                inputTestId="custom-translations-add"
              />
            )}
          </Show>

          <TextField
            label={t('placeholder.filter-translations')}
            hideLabel
            placeholder={t('placeholder.filter-translations')}
            value={filter()}
            onInput={event => setFilter(event.currentTarget.value)}
            data-testid="custom-translations-filter"
          />

          <Show
            when={visibleRows().length > 0}
            fallback={
              <EmptyState
                message={
                  filter()
                    ? t('messages.no-matching-translations')
                    : t('message.add-a-translation')
                }
                data-testid="custom-translations-empty"
              />
            }
          >
            <Table label={t('label.edit-custom-translations')}>
              <thead>
                <tr>
                  <th>{t('label.key')}</th>
                  <th>{t('label.default')}</th>
                  <th>{t('label.custom')}</th>
                  <th>{t('label.delete')}</th>
                </tr>
              </thead>
              <tbody>
                <For each={visibleRows()}>
                  {row => (
                    <tr data-testid={`custom-translation-row-${row.key}`}>
                      <td data-mono>{row.key}</td>
                      <td data-muted>{row.default}</td>
                      <td class={styles.customCell}>
                        <TextArea
                          label={t('label.custom')}
                          hideLabel
                          rows={1}
                          value={row.custom}
                          error={
                            row.isInvalid && showValidation()
                              ? t('error.invalid-custom-translation')
                              : undefined
                          }
                          onInput={event =>
                            updateCustom(row.id, event.currentTarget.value)
                          }
                        />
                      </td>
                      <td data-check>
                        <IconButton
                          icon={<TrashIcon />}
                          label={t('label.delete')}
                          size="small"
                          onClick={() => deleteRow(row.id)}
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </Show>
        </Stack>
      </Dialog>

      <Show when={importOpen()}>
        <ImportDialog
          onImport={(file, mode) => {
            setImportOpen(false);
            void importFile(file, mode);
          }}
          onClose={() => setImportOpen(false)}
        />
      </Show>

      <ConfirmDialog
        open={deleteAllOpen()}
        onClose={() => setDeleteAllOpen(false)}
        title={t('label.delete-all-translations')}
        message={
          <Stack gap="sm">
            <Text>{t('messages.delete-all-translations-confirm')}</Text>
            <Text variant="bodySmall">
              {t('messages.download-first-warning')}
            </Text>
          </Stack>
        }
        confirmLabel={t('button.delete')}
        confirmVariant="danger"
        onConfirm={deleteAll}
      />
    </>
  );
};

/*
 * S3 — the import dialog (ui-surface § S3): mode select with its mode-toned
 * explanation, then a JSON upload zone. OK is disabled until a file is chosen.
 */
const ImportDialog = (props: {
  onImport: (file: File, mode: ImportMode) => void;
  onClose: () => void;
}) => {
  const [mode, setMode] = createSignal<ImportMode>('keep-existing');
  const [file, setFile] = createSignal<File | undefined>();

  const modeWarning = () => {
    switch (mode()) {
      case 'keep-existing':
        return {
          severity: 'info' as const,
          message: t('messages.import-mode-keep-existing-warning'),
        };
      case 'overwrite':
        return {
          severity: 'warning' as const,
          message: t('messages.import-mode-overwrite-warning'),
        };
      case 'replace':
        return {
          severity: 'error' as const,
          message: t('messages.import-mode-replace-warning'),
        };
    }
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.import-translations')}
      width="form"
      actions={
        <>
          <CancelButton onClick={props.onClose} />
          <OkButton
            disabled={!file()}
            onClick={() => {
              const chosen = file();
              if (chosen) props.onImport(chosen, mode());
            }}
            data-testid="custom-translations-import-ok"
          />
        </>
      }
    >
      <Stack>
        <Alert severity={modeWarning().severity}>{modeWarning().message}</Alert>
        <Text variant="bodySmall">
          {t('messages.custom-translations-import-multi-language')}
        </Text>
        <FieldRow label={`${t('label.import-mode')}:`}>
          <Select
            label={t('label.import-mode')}
            hideLabel
            options={[
              {
                value: 'keep-existing',
                label: t('label.import-mode-keep-existing'),
              },
              { value: 'overwrite', label: t('label.import-mode-overwrite') },
              { value: 'replace', label: t('label.import-mode-replace') },
            ]}
            value={mode()}
            onValueChange={value => setMode(value as ImportMode)}
            testId="custom-translations-import-mode"
          />
        </FieldRow>
        <UploadZone
          accept=".json,application/json"
          multiple={false}
          onFiles={files => setFile(files[0])}
        />
        <Show when={file()}>
          {chosen => <Text variant="bodySmall">{chosen().name}</Text>}
        </Show>
      </Stack>
    </Dialog>
  );
};
