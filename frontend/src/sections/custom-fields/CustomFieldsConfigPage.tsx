import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { Button } from '../../ui/elements/buttons/Button';
import { Alert } from '../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { BareCheckbox } from '../../ui/elements/inputs/BareCheckbox';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { Tabs, TabList, TabPanel } from '../../ui/elements/tabs/Tabs';
import type { TabDef } from '../../ui/elements/tabs/Tabs';
import { SaveIcon } from '../../ui/icons';
import { createTableConfig } from '../../api/createTableConfig';
import { createConfirmOnLeave } from '../../domain/confirmOnLeave';
import { readScopeConfig, saveScopePlacements } from './customFieldConfigApi';
import type { ConfigRead } from './customFieldConfigApi';
import {
  applyChoice,
  currentMode,
  hasPendingChanges,
  offersPromotion,
  prominentChecked,
  valueTypeLabelKey,
  visibleChecked,
  withProminent,
  withVisible,
  type ConfigRow,
  type PendingChanges,
} from './placement';
import {
  CUSTOM_FIELD_SCOPES,
  DEFAULT_SCOPE,
  scopeOffersProminent,
} from './scopes';

// S1 — the custom-field configuration screen (spec/custom-fields ui-surface
// S1). One scope at a time: read that scope's placements (out-of-sight fields
// INCLUDED — this is the only read that keeps them), buffer the admin's
// placement changes, save the scope in one go.
//
// Reached only on a central server by a server admin (the nav entry is gated
// `centralAdmin`; a route guard blocks direct-URL entry — see index.tsx). Not
// store-scoped: neither read nor write takes a storeId.
//
// Composes library components only, no page CSS (kdd/page-composition).

// No column sorts: the list is a configuration surface whose order IS the
// configured order (rules § what the screen lists), so there is no sort key
// vocabulary at all.
type SortKey = never;

const CustomFieldsConfigPage: Component = () => {
  const [scope, setScope] = createSignal(DEFAULT_SCOPE);
  const [pending, setPending] = createSignal<PendingChanges>({});
  const [saving, setSaving] = createSignal(false);
  const [saveFailed, setSaveFailed] = createSignal(false);
  // The scope a tab click asked for while changes were pending — the discard
  // confirmation's subject (S2). Undefined = no confirmation showing.
  const [scopeAwaitingDiscard, setScopeAwaitingDiscard] =
    createSignal<string>();

  // One read per scope. NON-SUSPENDING (kdd/solid-reactivity-pitfalls § no
  // remounts on interaction): switching tab refetches on an ALREADY-OPEN
  // screen, so a direct `config()` read would suspend this screen's boundary
  // and tear down everything inside it — including an open confirm dialog. The
  // safe read gates on `.state`; `.latest` alone is not safe.
  const [config, { mutate }] = createResource(scope, readScopeConfig);
  const settled = () =>
    config.state === 'ready' || config.state === 'refreshing'
      ? config.latest
      : undefined;
  // `refreshing` still carries the PREVIOUS scope's value while the new scope
  // loads, so the read is only this scope's once its own answer has landed —
  // otherwise a tab switch would flash the old scope's rows under the new tab.
  const read = createMemo<ConfigRead | undefined>(() => {
    const value = settled();
    return value && value.scope === scope() ? value : undefined;
  });
  const rows = (): ConfigRow[] => {
    const value = read();
    return value?.kind === 'ok' ? value.rows : [];
  };
  const readFailed = () => read()?.kind === 'error';

  const dirty = () => hasPendingChanges(pending());
  const offersProminent = () => scopeOffersProminent(scope());

  // Leaving the screen with changes pending (S3): the SHARED unsaved-changes
  // guard — every route navigation (nav entry, breadcrumb, back button) plus
  // the browser's own prompt on a reload. Its dialog is rendered below; the
  // scope-switch guard (S2) is separate, since a tab switch is not a
  // navigation here (the scope is local state, not a route param).
  const leaveGuard = createConfirmOnLeave({
    isDirty: dirty,
    onDiscard: () => setPending({}),
  });

  const tableConfig = createTableConfig({ tableId: 'custom-field-config' });

  // Switch scope, dropping any pending change and clearing a stale save
  // failure. Never saves anything — a guard chooses between discarding and
  // staying (rules § guarding pending changes).
  const goToScope = (next: string) => {
    setPending({});
    setSaveFailed(false);
    setScopeAwaitingDiscard(undefined);
    setScope(next);
  };

  // A tab click. With changes pending it raises the discard confirmation and
  // leaves BOTH the changes and the current tab alone until it is answered —
  // the Tabs are controlled, so refusing to move the value is refusing to
  // switch (OMS-REG-CF-02.12).
  const requestScope = (next: string) => {
    if (next === scope()) return;
    if (dirty()) setScopeAwaitingDiscard(next);
    else goToScope(next);
  };

  // Every placement choice goes through applyChoice, so a change back to the
  // saved value drops out of the pending set rather than becoming a no-op save
  // (rules § choosing and saving). A new choice also clears a stale save
  // failure — the notice describes the save that failed, not the buffer.
  const toggleVisible = (row: ConfigRow, checked: boolean) => {
    setSaveFailed(false);
    const next = withVisible(currentMode(row, pending()), checked);
    setPending(applyChoice(pending(), row, next));
  };

  const toggleProminent = (row: ConfigRow, checked: boolean) => {
    setSaveFailed(false);
    setPending(applyChoice(pending(), row, withProminent(checked)));
  };

  // Save this scope's pending placements. Success is the screen SETTLING —
  // Save disabled, rows showing their saved placement (D21: no transient
  // announcement); the response carries the whole scope's fresh configuration,
  // so the rows reseed from it with no re-read. A failure shows the inline
  // notice and KEEPS the pending changes to retry.
  const save = async () => {
    if (saving() || !dirty()) return;
    setSaving(true);
    setSaveFailed(false);
    const saveScope = scope();
    const outcome = await saveScopePlacements(saveScope, rows(), pending());
    setSaving(false);
    if (outcome.kind === 'error') {
      setSaveFailed(true);
      return;
    }
    // A late answer for a scope the admin has since left changes nothing: that
    // switch already discarded the pending set it belonged to.
    if (scope() !== saveScope) return;
    if (outcome.kind === 'saved')
      mutate({ kind: 'ok', scope: saveScope, rows: outcome.rows });
    setPending({});
  };

  const tabs = (): TabDef[] =>
    CUSTOM_FIELD_SCOPES.map(s => ({ value: s.value, label: t(s.labelKey) }));

  const crumbs = () => [{ label: t('manage') }, { label: t('custom-fields') }];

  // Columns are an accessor so their t() text re-translates on a language
  // switch, and so the Prominent column appears/disappears with the scope.
  const columns = (): Column<ConfigRow, SortKey>[] => [
    {
      // Read-only: a definition's name is central configuration
      // (OMS-REG-CF-02.9).
      c: { key: 'name' },
      header: () => t('label.name'),
    },
    {
      c: { id: 'type' },
      header: () => t('label.type'),
      cell: info => t(valueTypeLabelKey(info.row.original.valueType)),
    },
    {
      // Ticked for any shown field, promoted or not; unticking takes the field
      // out of sight (ui-surface S1 § columns). The checkbox IS the control, so
      // it carries the column's name for assistive tech — the header text is
      // not its accessible name.
      c: { id: 'visible' },
      header: () => t('label.visible'),
      meta: { align: 'center' },
      cell: info => {
        const row = info.row.original;
        return (
          <BareCheckbox
            aria-label={`${t('label.visible')}: ${row.name}`}
            checked={visibleChecked(currentMode(row, pending()))}
            disabled={saving()}
            onChange={event => toggleVisible(row, event.currentTarget.checked)}
          />
        );
      },
    },
    ...(offersProminent()
      ? [
          {
            // Present only on the five invoice scopes. The cell is EMPTY — no
            // control at all — while the row is out of sight: there is nothing
            // to promote (ui-surface S1 § columns).
            c: { id: 'prominent' },
            header: () => t('label.prominent'),
            meta: { align: 'center' },
            cell: info => {
              const row = info.row.original;
              return (
                <Show when={offersPromotion(currentMode(row, pending()))}>
                  <BareCheckbox
                    aria-label={`${t('label.prominent')}: ${row.name}`}
                    checked={prominentChecked(currentMode(row, pending()))}
                    disabled={saving()}
                    onChange={event =>
                      toggleProminent(row, event.currentTarget.checked)
                    }
                  />
                </Show>
              );
            },
          } satisfies Column<ConfigRow, SortKey>,
        ]
      : []),
  ];

  // The scope's table — one instance, rendered inside whichever tab panel is
  // active (only the selected panel mounts).
  const scopeTable = () => (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={row => row.id}
      loading={config.loading}
      // The scope's own empty state, or — when the read failed — the shared
      // data-error message in place of rows (ui-surface S1, S4). The tabs and
      // Save are untouched either way.
      emptyMessage={
        readFailed()
          ? t('error.unable-to-load-data')
          : t('messages.no-custom-fields')
      }
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      configIsDefault={tableConfig.isConfigDefault()}
    />
  );

  return (
    <Tabs value={scope()} onValueChange={requestScope}>
      <Page
        fillBody
        header={
          <Header>
            <Breadcrumb crumbs={crumbs()} />
            <HeaderButtons>
              <Button
                icon={<SaveIcon />}
                data-testid="save-button"
                loading={saving()}
                disabled={!dirty() || saving()}
                onClick={() => void save()}
              >
                {t('button.save')}
              </Button>
            </HeaderButtons>
            <TabList tabs={tabs()} />
          </Header>
        }
      >
        <Show when={saveFailed()}>
          <Alert severity="error" testId="save-error">
            {t('error.failed-to-save-custom-fields')}
          </Alert>
        </Show>
        <For each={CUSTOM_FIELD_SCOPES}>
          {s => <TabPanel value={s.value}>{scopeTable()}</TabPanel>}
        </For>
      </Page>
      {/* S2 — scope-switch discard confirmation. OK discards the pending
          changes and switches; Cancel keeps both. */}
      <ConfirmDialog
        open={scopeAwaitingDiscard() !== undefined}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-discard-custom-field-changes')}
        onClose={() => setScopeAwaitingDiscard(undefined)}
        onConfirm={() => {
          const next = scopeAwaitingDiscard();
          if (next !== undefined) goToScope(next);
        }}
      />
      {/* S3 — the shared leave guard's own dialog (generic copy, per
          ui-standards § conventions). */}
      <ConfirmDialog
        open={leaveGuard.open()}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-cancel-generic')}
        onClose={leaveGuard.cancel}
        onConfirm={leaveGuard.confirm}
      />
    </Tabs>
  );
};

export default CustomFieldsConfigPage;
