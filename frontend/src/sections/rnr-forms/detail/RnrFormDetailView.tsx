import {
  batch,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import {
  DataTable,
  type CardGroup,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { sortRows } from '@/list/sortRows';
import { ALT_M } from '@/ui/utils/shortcuts';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { Tabs, TabList, TabPanel } from '@/ui/elements/tabs/Tabs';
import { createSidePanelOpen } from '@/ui/layout/SidePanel/createSidePanelOpen';
import { createDebouncedEdit } from '@/domain/debouncedEdit';
import { ActivityLogPanel } from '@/domain/activityLog';
import { smoothScrollOptions } from '@/ui/utils/createMediaQuery';
import { SidebarIcon } from '@/ui/icons';
import {
  FilterTextInput,
  FilterBar,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import {
  RnrFormDetail,
  RnrFormDetailContext,
  type RnrFormDetailVariables,
} from './rnrFormDetail.generated';
import {
  lineHasError,
  recomputeLine,
  toDraftLines,
  type DraftRnrLine,
  type RecomputeContext,
} from './rnrFormEdit';
import {
  rnrFormLineColumns,
  sortValue,
  type RnrLineSortKey,
  type UpdateRnrLine,
} from './rnrFormLineColumns';
import {
  finaliseRnrForm,
  saveRnrForm,
  type RnrFormNode,
} from './rnrFormUpdate';
import { isFinalised } from '../list/rnrFormStatus';
import { RnrFormSidePanel, type RnrHeaderEditFields } from './RnrFormSidePanel';
import { RnrFormStatusFooter } from './RnrFormStatusFooter';
import { ExportPrintRnrFormAction } from './actions/ExportPrintRnrFormAction';

// The R&R form detail view (spec/rnr-forms/ui-surface.md S3): the inline-
// editable line table over a draft store (edits recompute the derived columns
// in place and auto-save — rules § editing a draft), the Details/Log tabs,
// the side panel, and the finalise footer. Read-only once FINALISED.

// Auto-save cadence (rules § editing: "a short interval"; the reference app's
// 10 s).
const AUTOSAVE_MS = 10_000;

// The item search — a CLIENT-side narrowing (the line set is bounded by the
// program's master list and arrives whole), so no debounce (debounceMs={0};
// the input's default 300ms is for server-bound filters).
type LineFilter = { itemCodeOrName?: { like: string } | null };

const LINE_FILTERS: Filter<LineFilter>[] = constructFilters<LineFilter>({
  itemCodeOrName: {
    label: () => t('label.code-or-name'),
    render: props => (
      <FilterTextInput
        label={t('label.code-or-name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        debounceMs={0}
        value={props.filter().itemCodeOrName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            itemCodeOrName: value ? { like: value } : null,
          })
        }
      />
    ),
  },
});

// Card view (below 600px): the item name titles the card and the secondary
// columns drop into one collapsed "More details" disclosure
// (ui docs › CARD_TABLE_MODEL).
const CARD_GROUPS: CardGroup<DraftRnrLine, 'more'>[] = [
  { key: 'more', disclosure: 'closed' },
];

// The URL-backed view state (ui-standards § tables → filtering: applied
// filters persist in the URL). The item search is the screen's default
// filter — seeded present-as-null so its chip is on the bar from the start.
type DetailUrlState = { filter: LineFilter };
const DEFAULT_URL_STATE: DetailUrlState = {
  filter: { itemCodeOrName: null },
};

const RnrFormDetailView: Component = () => {
  const params = useParams<{ storeId: string; rnrFormId: string }>();
  const navigate = useNavigate();

  const [data, { mutate }] = createResource(
    () =>
      JSON.stringify({
        storeId: params.storeId,
        id: params.rnrFormId,
      } satisfies RnrFormDetailVariables),
    async serialised => {
      const result = await graphqlFetch(
        RnrFormDetail,
        JSON.parse(serialised) as RnrFormDetailVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.rAndRForm;
    }
  );

  // `.latest` — suspends the local Suspense on first load only; every later
  // change is a mutate() splice (kdd/solid-reactivity-pitfalls).
  const node = (): RnrFormNode | undefined => {
    const d = data.latest;
    return d?.__typename === 'RnRFormNode' ? d : undefined;
  };
  const notFound = () => data.latest?.__typename === 'NodeError';

  const disabled = () => {
    const n = node();
    return n ? isFinalised(n.status) : true;
  };

  // The store's months-of-stock multipliers for the live recompute (rules §
  // line generation; the reference client's fallbacks when unset are 0 / 2).
  const [prefsData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(RnrFormDetailContext, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.storePreferences;
    }
  );
  const periodLength = () => node()?.periodLength ?? 30;

  const recomputeCtx = (): RecomputeContext => {
    const prefs = gated(prefsData);
    return {
      periodLength: periodLength(),
      monthsUnderstock: prefs?.monthsUnderstock ?? 0,
      monthsOverstock: prefs?.monthsOverstock ?? 2,
    };
  };

  // --- the draft store (kdd/solid-reactivity-pitfalls § editable collections):
  // the line set lives in a createStore, updated field-by-field in place; the
  // table renders from it, never from the resource directly.
  const [draft, setDraft] = createStore<{
    formId: string;
    lines: DraftRnrLine[];
  }>({ formId: '', lines: [] });

  // Seed once per loaded form — a different record is the one legitimate
  // rebuild; a save/refetch never re-seeds (edits are client-authoritative).
  createEffect(() => {
    const n = node();
    if (n && n.id !== draft.formId) {
      setDraft({ formId: n.id, lines: toDraftLines(n.lines) });
    }
  });

  // One edit's full consequence, in place: the field, the recomputed derived
  // figures, and the dirty/rev tracking (rules § editing a draft).
  const update: UpdateRnrLine = (id, field, value) => {
    setDraft(
      'lines',
      line => line.id === id,
      produce(line => {
        line[field] = value;
        Object.assign(line, recomputeLine(line, recomputeCtx()));
        line.dirty = true;
        line.rev += 1;
      })
    );
  };

  // --- auto-save (rules § editing; OMS-REG-REPL-07.45): a dirty sweep on an
  // interval and on leaving the screen. Error lines are withheld inside
  // saveRnrForm; a failed save leaves lines dirty for the next tick (the
  // global surface owns the description).
  let saving = false;
  const saveDirty = async () => {
    const n = node();
    if (!n || saving || isFinalised(n.status)) return;
    if (!draft.lines.some(line => line.dirty && !lineHasError(line))) return;
    saving = true;
    const revs = new Map(draft.lines.map(line => [line.id, line.rev]));
    const result = await saveRnrForm(params.storeId, n.id, draft.lines);
    saving = false;
    if (result.kind !== 'saved') return;
    mutate(() => result.node);
    batch(() => {
      for (const id of result.savedLineIds) {
        // An edit made while the save was in flight keeps its dirty flag.
        setDraft(
          'lines',
          line => line.id === id && line.rev === revs.get(id),
          'dirty',
          false
        );
      }
    });
  };
  const timer = setInterval(() => void saveDirty(), AUTOSAVE_MS);
  onCleanup(() => {
    clearInterval(timer);
    void saveDirty();
  });

  // The two buffered header fields (side panel; rules § editing). Saved as a
  // header-only patch, the fresh node spliced back.
  const edit = createDebouncedEdit<RnrHeaderEditFields>({
    id: () => node()?.id ?? '',
    initial: () => ({
      theirReference: node()?.theirReference ?? '',
      comment: node()?.comment ?? '',
    }),
    save: patch => {
      const n = node();
      if (!n || isFinalised(n.status)) return;
      void saveRnrForm(params.storeId, n.id, [], patch).then(result => {
        if (result.kind === 'saved') mutate(() => result.node);
      });
    },
  });

  // --- finalise (rules § finalise; OMS-REG-REPL-07.33/.46) ------------------
  const hasErrorLines = () => draft.lines.some(lineHasError);

  const showFirstError = () => {
    const first = draft.lines.find(lineHasError);
    if (!first) return;
    const scroll = () =>
      document
        .querySelector(`[data-row-key="${first.id}"]`)
        ?.scrollIntoView(smoothScrollOptions());
    if (visibleLines().some(line => line.id === first.id)) {
      scroll();
      return;
    }
    // The item search is hiding the error line — clear it, then scroll once
    // the row is back in the DOM (the URL-backed filter lands on the router's
    // schedule, not synchronously).
    setLineFilter(DEFAULT_URL_STATE.filter);
    requestAnimationFrame(scroll);
  };

  const runFinalise = async (): Promise<boolean> => {
    const n = node();
    if (!n) return false;
    // Flush every pending edit first (ui-surface S3 § footer): the buffered
    // header fields, then the dirty lines in one save.
    edit.flush();
    const saved = await saveRnrForm(params.storeId, n.id, draft.lines);
    if (saved.kind !== 'saved') return false;
    const result = await finaliseRnrForm(params.storeId, n.id);
    if (result.kind !== 'finalised') return false;
    mutate(() => result.node);
    // Re-seed clean: the finalised lines now carry the requisition link
    // (approved quantity reads through it — contract § finalise effects).
    setDraft({
      formId: result.node.id,
      lines: toDraftLines(result.node.lines),
    });
    return true;
  };

  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();

  // --- the line table -------------------------------------------------------
  // Filter state is URL-backed (shareable, survives reload); sort is a
  // client-side ordering over the bounded in-memory line set, like the
  // sibling fixed-line-set detail tables.
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const lineFilter = () => query().filter;
  const setLineFilter = (filter: LineFilter) =>
    setQuery({ ...query(), filter });
  const [sort, setSort] = createSignal<SortState<RnrLineSortKey>>({
    key: 'name',
    desc: false,
  });

  // Sorted first in its own memo, so each (undebounced) search keystroke
  // costs only the O(n) prefix scan below, never a re-sort.
  const sortedLines = createMemo(() =>
    sortRows(draft.lines, sort(), sortValue)
  );

  // OMS-REG-REPL-07.50: prefix match on item name or code, case-insensitive.
  const visibleLines = createMemo(() => {
    const term = lineFilter().itemCodeOrName?.like?.toLocaleLowerCase();
    if (!term) return sortedLines();
    return sortedLines().filter(
      line =>
        line.item.name.toLocaleLowerCase().startsWith(term) ||
        line.item.code.toLocaleLowerCase().startsWith(term)
    );
  });

  const tableConfig = createTableConfig({
    tableId: 'rnr-form-lines',
    defaultConfig: {
      base: { columnPinning: { left: ['code', 'name'] } },
      compact: { viewMode: 'card' },
    },
  });

  // Memoized: TanStack keys its internal caches on the array's identity
  // (kdd/solid-reactivity-pitfalls §14).
  const columns = createMemo(() =>
    rnrFormLineColumns({
      disabled,
      periodLength,
      update,
    })
  );

  const tabs = () => [
    { value: 'details', label: t('label.details') },
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (n: RnrFormNode) => [
    {
      label: t('r-and-r-forms'),
      onClick: () => navigate(`/${params.storeId}/replenishment/r-and-r-forms`),
    },
    { label: n.period.name },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* The typed not-found miss (contract § list rules) — a blocking alert
          whose OK returns to the list (ui-surface S3). */}
      <Show when={notFound()}>
        <Dialog
          open
          dismissable={false}
          onClose={() => undefined}
          title={t('error.rnr-not-found')}
          description={t('messages.click-to-return-to-rnr-list')}
          actions={
            <OkButton
              data-testid="dialog-button-ok"
              onClick={() =>
                navigate(`/${params.storeId}/replenishment/r-and-r-forms`, {
                  replace: true,
                })
              }
            />
          }
        />
      </Show>
      {/* NON-keyed Show: saves splice a fresh node object; a keyed Show would
          remount the page and drop focus (kdd/solid-reactivity-pitfalls). */}
      <Show when={node()}>
        {n => (
          <Tabs defaultValue="details">
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <RnrFormSidePanel
                  storeId={params.storeId}
                  node={n()}
                  disabled={disabled()}
                  edit={edit}
                  fullDocument={node}
                  onDeleted={() =>
                    navigate(`/${params.storeId}/replenishment/r-and-r-forms`, {
                      replace: true,
                    })
                  }
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(n())} />
                  <HeaderButtons>
                    <ExportPrintRnrFormAction rnrFormId={n().id} />
                    <Show when={!sidePanelOpen()}>
                      {/* createSidePanelOpen registers Alt+M; this is the
                          control that advertises it. */}
                      <Button
                        variant="secondary"
                        icon={<SidebarIcon />}
                        shortcut={ALT_M}
                        collapsible="narrow"
                        title={t('button.more')}
                        data-testid="open-detail-panel-button"
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <RnrFormStatusFooter
                  node={n()}
                  hasErrorLines={hasErrorLines}
                  onShowFirstError={showFirstError}
                  onFinalise={runFinalise}
                />
              }
            >
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={visibleLines()}
                  rowKey={line => line.id}
                  loading={data.loading}
                  sort={sort()}
                  onSort={(key, desc) => setSort({ key, desc })}
                  cardGroups={CARD_GROUPS}
                  // The line-level error tint (ui-surface S3/S4) — restates
                  // what the cell markers state in words, never colour alone.
                  rowTint={line => (lineHasError(line) ? 'error' : undefined)}
                  filters={
                    <FilterBar
                      filters={LINE_FILTERS}
                      filter={lineFilter()}
                      onChange={setLineFilter}
                    />
                  }
                  emptyMessage={
                    (lineFilter().itemCodeOrName?.like ?? '').trim()
                      ? t('error.no-items-filter-on')
                      : t('error.no-items')
                  }
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                />
              </TabPanel>
              <TabPanel value="log">
                {/* The shared activity-log surface (ui-surface S3 § tabs). */}
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={n().id}
                  order="oldest-first"
                />
              </TabPanel>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default RnrFormDetailView;
