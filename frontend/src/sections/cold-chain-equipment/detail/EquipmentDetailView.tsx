import { createEffect, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { gated } from '@/api/gated';
import { isCentralServer } from '@/api/serverInfo';
import { hasPermission } from '@/store/storeContext';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Tabs, TabList, TabPanel, type TabDef } from '@/ui/elements/tabs/Tabs';
import { Button } from '@/ui/elements/buttons/Button';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { PrinterIcon, TrashIcon, XCircleIcon } from '@/ui/icons';
import { ActivityLogPanel } from '@/domain/activityLog';
import { createConfirmOnLeave } from '@/domain/confirmOnLeave';
import {
  AssetById,
  DeleteAsset,
  UpdateAsset,
  type AssetDetailFragment,
} from '../equipment.generated';
import { isColdRoom } from '../equipment';
import {
  buildUpdateInput,
  formFromAsset,
  isUnchanged,
  type AssetFormState,
} from './assetEdit';
import { SummaryTab } from './SummaryTab';
import { DetailsTab } from './DetailsTab';
import { StatusHistoryTab } from './StatusHistoryTab';
import { DocumentsTab } from './DocumentsTab';
import { StatusActions } from './StatusActions';

// S2 — the equipment detail screen (spec/cold-chain-equipment, ui-surface S2).
// One asset: its identity, its dates, where its stock goes, its condition and
// why, its specification and its paperwork — edited as ONE draft, saved
// together behind a confirmation.
//
// The whole draft is written on every save: four of the update's fields are
// not partial, so omitting one ERASES it (rules › editing an asset, AC-E6).
// That obligation lives in assetEdit.buildUpdateInput; this screen's job is to
// seed the draft from the asset as loaded and hand the whole thing over.

type Tab = 'summary' | 'details' | 'statushistory' | 'documents' | 'log';

const EquipmentDetailView: Component = () => {
  const params = useParams<{ storeId: string; id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = createSignal<Tab>('summary');
  const [form, setForm] = createSignal<AssetFormState>();
  const [saving, setSaving] = createSignal(false);
  const [confirmingSave, setConfirmingSave] = createSignal(false);
  const [confirmingDelete, setConfirmingDelete] = createSignal(false);

  // Back to whichever list this asset was opened from — the two destinations
  // are the same tree, so the parent path is the one to return to.
  const listPath = () => location.pathname.replace(/\/[^/]+$/, '');

  const [data, { refetch }] = createResource(
    () => `${params.storeId}|${params.id}`,
    async () => {
      const result = await graphqlFetch(AssetById, {
        storeId: params.storeId,
        assetId: params.id,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.assets.nodes[0];
    }
  );

  // Read through `gated`, never `.latest`: this screen's arrival is a first
  // pending read, and suspending it would blank the page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const asset = (): AssetDetailFragment | undefined => gated(data);
  const central = () => isCentralServer();

  // Seed the draft once the asset lands, and re-seed after a save re-reads it.
  createEffect(() => {
    const record = asset();
    if (!record) return;
    setForm(formFromAsset(record, params.storeId, central()));
  });

  const dirty = () => {
    const record = asset();
    const draft = form();
    if (!record || !draft) return false;
    return !isUnchanged(draft, record, params.storeId, central());
  };

  // Leaving with unsaved changes raises the app-wide discard prompt (AC-E4) —
  // a route change, a tab switch, browser back, or a reload. Confirming
  // re-seeds the draft from the asset, so a "leave" that stays mounted really
  // discards.
  const leaveGuard = createConfirmOnLeave({
    isDirty: dirty,
    onDiscard: () => {
      const record = asset();
      if (record) setForm(formFromAsset(record, params.storeId, central()));
    },
  });

  const onChange = (patch: Partial<AssetFormState>) => {
    const draft = form();
    if (!draft) return;
    setForm({ ...draft, ...patch });
  };

  const save = async () => {
    const record = asset();
    const draft = form();
    if (!record || !draft || saving() || !dirty()) return;
    setSaving(true);
    const result = await graphqlFetch(UpdateAsset, {
      storeId: params.storeId,
      input: buildUpdateInput(draft, record.id),
    });
    setSaving(false);
    setConfirmingSave(false);
    // Every rejection this vertical can produce is untyped — the mutation's
    // declared error members are all unreachable, so a failure fails the whole
    // request and the global error path has already surfaced it (contract ›
    // the error union). Stay put so the draft isn't lost (AC-E8).
    if (result.kind !== 'success') return;
    void refetch();
  };

  const remove = async () => {
    setSaving(true);
    const result = await graphqlFetch(DeleteAsset, {
      storeId: params.storeId,
      assetId: params.id,
    });
    setSaving(false);
    setConfirmingDelete(false);
    if (result.kind !== 'success') return;
    navigate(listPath());
  };

  const onDelete = () => {
    // Deleting needs ASSET_MUTATE; without it the user is told rather than
    // shown a dead control (AC-G2).
    if (!hasPermission('ASSET_MUTATE')) {
      reportPermissionDenied(['AssetMutate']);
      return;
    }
    setConfirmingDelete(true);
  };

  const tabs = (): TabDef[] => [
    { value: 'summary', label: t('label.summary') },
    { value: 'details', label: t('label.details') },
    { value: 'statushistory', label: t('label.statushistory') },
    { value: 'documents', label: t('label.documents') },
    { value: 'log', label: t('label.log') },
  ];

  return (
    <Show
      when={!data.loading || asset()}
      fallback={
        <Page
          header={
            <Header>
              <Breadcrumb crumbs={[{ label: t('equipment') }]} />
            </Header>
          }
        >
          <Spinner />
        </Page>
      }
    >
      <Show
        when={asset()}
        fallback={
          // The asset could not be found: a blocking alert whose only action
          // returns to the list (ui-surface S2).
          <Dialog
            open
            testId="asset-not-found"
            title={t('error.asset-not-found')}
            onClose={() => navigate(listPath())}
            actions={
              <Button variant="primary" onClick={() => navigate(listPath())}>
                {t('button.ok')}
              </Button>
            }
          >
            {t('messages.click-to-return-to-assets')}
          </Dialog>
        }
      >
        {record => (
          <Tabs value={tab()} onValueChange={value => setTab(value as Tab)}>
            <Page
              fillBody
              header={
                <Header>
                  <Breadcrumb
                    crumbs={[
                      { label: t('equipment'), to: listPath() },
                      { label: record().assetNumber ?? '' },
                    ]}
                  />
                  <HeaderButtons>
                    <StatusActions
                      storeId={params.storeId}
                      assetId={record().id}
                      isColdRoom={isColdRoom(record().assetCategory?.id)}
                      onRecorded={() => void refetch()}
                    />
                    <Button
                      variant="secondary"
                      icon={<PrinterIcon />}
                      data-testid="print-label-button"
                    >
                      {t('button.print-asset-label')}
                    </Button>
                  </HeaderButtons>
                  {/* The catalogue item's identity — absent entirely for a
                    non-catalogue asset, which has none (ui-surface S2). */}
                  <Show when={record().catalogueItem}>
                    {item => (
                      <HeaderToolbar>
                        <LabelledValue
                          size="small"
                          layout="inline"
                          label={t('label.manufacturer')}
                        >
                          {item().manufacturer ?? ''}
                        </LabelledValue>
                        <LabelledValue
                          size="small"
                          layout="inline"
                          label={t('label.model')}
                        >
                          {item().model}
                        </LabelledValue>
                      </HeaderToolbar>
                    )}
                  </Show>
                  {/* The tab strip claims the header's BOTTOM EDGE — a TabList as
                    the Header's last child (src/ui/CLAUDE.md), which is why
                    <Tabs> wraps the whole Page rather than sitting in its
                    body. */}
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <ContentFooter>
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      data-testid="close-button"
                      onClick={() => navigate(listPath())}
                    >
                      {t('button.close')}
                    </Button>
                    <Button
                      variant="danger"
                      icon={<TrashIcon />}
                      data-testid="delete-button"
                      onClick={onDelete}
                    >
                      {t('button.delete')}
                    </Button>
                    {/* Inert until the draft differs from the asset as loaded,
                      so an opened-and-closed screen cannot write
                      (AC-E1/AC-E2). */}
                    <Button
                      variant="primary"
                      data-testid="save-button"
                      loading={saving()}
                      disabled={!dirty() || saving()}
                      onClick={() => setConfirmingSave(true)}
                    >
                      {t('button.save')}
                    </Button>
                  </ContentFooterActions>
                </ContentFooter>
              }
            >
              <TabPanel value="summary">
                <Show when={form()}>
                  {draft => (
                    <SummaryTab
                      storeId={params.storeId}
                      asset={record()}
                      form={draft()}
                      onChange={onChange}
                      isCentral={central()}
                      disabled={saving()}
                    />
                  )}
                </Show>
              </TabPanel>
              <TabPanel value="details">
                <Show when={form()}>
                  {draft => (
                    <DetailsTab
                      asset={record()}
                      form={draft()}
                      onChange={onChange}
                      disabled={saving()}
                    />
                  )}
                </Show>
              </TabPanel>
              <TabPanel value="statushistory">
                <StatusHistoryTab
                  storeId={params.storeId}
                  assetId={record().id}
                  isColdRoom={isColdRoom(record().assetCategory?.id)}
                />
              </TabPanel>
              <TabPanel value="documents">
                <DocumentsTab
                  asset={record()}
                  onChanged={() => void refetch()}
                />
              </TabPanel>
              <TabPanel value="log">
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={record().id}
                />
              </TabPanel>

              {/* S7 — the save confirmation. Nothing is written until it is
                accepted (AC-E3). */}
              <ConfirmDialog
                open={confirmingSave()}
                onClose={() => setConfirmingSave(false)}
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-save-generic')}
                onConfirm={() => void save()}
              />
              {/* The app-wide unsaved-changes prompt, not one of this
                vertical's (AC-E4). */}
              <ConfirmDialog
                open={leaveGuard.open()}
                title={t('heading.are-you-sure')}
                message={t('messages.discard-changes')}
                confirmLabel={t('button.discard')}
                onConfirm={leaveGuard.confirm}
                onClose={leaveGuard.cancel}
              />
              {/* S7 — the delete confirmation. Its wording says the asset is
                permanently removed; deleting is a WITHDRAWAL and an edit brings
                it back (rules › deletion) — the copy is cited as found. */}
              <ConfirmDialog
                open={confirmingDelete()}
                onClose={() => setConfirmingDelete(false)}
                title={t('heading.are-you-sure')}
                confirmVariant="danger"
                message={t('messages.confirm-delete-assets_one', { count: 1 })}
                onConfirm={() => void remove()}
              />
            </Page>
          </Tabs>
        )}
      </Show>
    </Show>
  );
};

export default EquipmentDetailView;
