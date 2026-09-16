import { Show, type Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { formatNumber, t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { remToPx } from '@/ui/utils/rem';
import { PlusCircleIcon, SaveIcon, XCircleIcon } from '@/ui/icons';
import { createTableConfig } from '@/api/createTableConfig';
import { createConfirmOnLeave } from '@/domain/confirmOnLeave';
import { createDemographicsEditor } from './demographicsEditor';
import {
  YEARS,
  currentPopulation,
  isGeneralRow,
  projectYears,
  projectionShare,
  rateKey,
  type DraftIndicator,
  type Year,
} from './draft';

// S1 — the demographics grid (spec/demographics ui-surface S1): the general
// population baseline, the indicators' shares, the yearly growth rates in the
// year columns' headers, and every derived figure recomputed as you type. One
// draft; Save writes every row and the rates, Cancel throws the draft away.
//
// Reached from Manage › Demographics on a central server whose store has the
// vaccine module on — both gates are navigation's (navConfig carries them;
// ShellLayout's routeAccess redirects a direct URL that fails either), so this
// screen carries no guard of its own. Not store-scoped: the read takes a
// storeId for its auth plumbing only.
//
// Composes library components only, no page CSS (kdd/page-composition).

// No column sorts: the grid is loaded whole in the read's name order with the
// general population row pinned first (rules § the grid), so there is no sort
// key vocabulary at all.
type SortKey = never;

const yearLabel = (year: Year) => `${t('label.year')} ${year}`;
// The header's visible text keeps its two words on one line beside the
// growth-rate input (a no-break space); the accessible name uses a plain one.
const yearHeading = (year: Year) => `${t('label.year')}\u00A0${year}`;

const DemographicsPage: Component = () => {
  const params = useParams<{ storeId: string }>();
  const editor = createDemographicsEditor({
    storeId: () => params.storeId,
    generalPopulationName: () => t('label.general-population'),
  });

  // Leaving with a dirty draft (S2): the SHARED unsaved-changes guard — every
  // route navigation plus the browser's own prompt on a reload. Confirming
  // discards the draft (a Cancel) and leaves; declining stays, draft intact.
  const leaveGuard = createConfirmOnLeave({
    isDirty: editor.dirty,
    onDiscard: editor.cancel,
  });

  const tableConfig = createTableConfig({ tableId: 'demographics' });

  // Every figure a row shows other than its inputs, derived live from the
  // baseline, the row's share and the header rates (rules § the calculation).
  const figures = (row: DraftIndicator) => {
    // projectionShare, not the row's field: the general population row
    // projects at 100 % — which is what its cell displays — whatever share is
    // stored against it (rules § the calculation).
    const current = currentPopulation(editor.baseline(), projectionShare(row));
    return { current, years: projectYears(current, editor.draft.rates) };
  };

  // Read-only cells render as text, never as disabled controls (detail-views
  // › never-editable fields); the editable ones are in-place fields that name
  // themselves after their column for assistive tech, since a header is not a
  // cell's accessible name. Every dynamic cell reads its row through
  // `row.original` — a store proxy — inside the cell render, so a field edit
  // re-renders that cell; TanStack's own accessor cache would hold the value
  // it read when the row object was created.
  //
  // EVERY column is structural (meta.hideFromColumnSettings), so none of them
  // reaches the Columns popover — the exact bite CARD_TABLE_MODEL.md § the
  // structural opt-out describes. Save writes every row's name, share,
  // baseline and all five rates whatever is on screen, so hiding a column
  // would take away the only way to set a value it still sends: hide Year 3
  // and rate 3 keeps being written with no input for it; hide Current
  // population and the baseline is uneditable yet written to every row; hide
  // Name and a new row can never be named, so Save rejects it as _no name_
  // with nothing on screen to fix. Setting the flag also FORCES the column
  // visible, which heals a `false` already persisted for one of these ids.
  const columns = (): Column<DraftIndicator, SortKey>[] => [
    {
      c: { id: 'name' },
      header: () => t('label.name'),
      meta: { hideFromColumnSettings: true },
      size: remToPx(14),
      cell: info => {
        const row = info.row.original;
        return (
          <Show
            when={!isGeneralRow(row)}
            // The general population row's name is the screen's own label,
            // whatever name is stored (rules § the general population row).
            fallback={t('label.general-population')}
          >
            <TextField
              label={t('label.name')}
              hideLabel
              size="small"
              value={row.name}
              disabled={editor.saving()}
              onInput={event =>
                editor.setName(row.id, event.currentTarget.value)
              }
            />
          </Show>
        );
      },
    },
    {
      c: { id: 'percentage' },
      header: () => t('label.percentage'),
      meta: { align: 'right', hideFromColumnSettings: true },
      size: remToPx(8),
      cell: info => {
        const row = info.row.original;
        return (
          <Show
            when={!isGeneralRow(row)}
            // Always 100 %: the general population is the whole.
            fallback={`${formatNumber(100)}%`}
          >
            <NumberField
              label={t('label.percentage')}
              hideLabel
              size="small"
              min={0}
              max={100}
              decimalLimit={2}
              endAdornment="%"
              value={row.populationPercentage}
              disabled={editor.saving()}
              onChange={value => editor.setShare(row.id, value)}
            />
          </Show>
        );
      },
    },
    {
      c: { id: 'currentPopulation' },
      header: () => t('label.current-population'),
      meta: { align: 'right', hideFromColumnSettings: true },
      size: remToPx(10),
      cell: info => {
        const row = info.row.original;
        return (
          <Show
            when={isGeneralRow(row)}
            // Every other row's current population derives from the baseline.
            fallback={formatNumber(figures(row).current)}
          >
            {/* The baseline — the one editable current population, a whole
                number of people (rules § input bounds). */}
            <NumberField
              label={t('label.current-population')}
              hideLabel
              size="small"
              min={0}
              decimalLimit={0}
              value={row.basePopulation}
              disabled={editor.saving()}
              onChange={editor.setBaseline}
            />
          </Show>
        );
      },
    },
    ...YEARS.map((year): Column<DraftIndicator, SortKey> => ({
      c: { id: `year${year}` },
      // The header carries the year's growth-rate input — the only place a
      // rate is edited (ui-surface S1 § columns). Its accessible name is the
      // header text.
      header: () => (
        <HStack gap="sm" justify="end">
          <span>{yearHeading(year)}</span>
          <NumberField
            label={yearLabel(year)}
            hideLabel
            size="small"
            min={0}
            max={100}
            decimalLimit={2}
            endAdornment="%"
            value={editor.draft.rates[rateKey(year)]}
            disabled={editor.saving()}
            onChange={value => editor.setRate(year, value)}
            data-testid={`growth-rate-year-${year}`}
          />
        </HStack>
      ),
      meta: {
        align: 'right',
        hideFromColumnSettings: true,
        // A card caption names the column in words; the grid header itself is
        // the label plus its input.
        textLabel: () => yearLabel(year),
      },
      size: remToPx(11),
      cell: info => formatNumber(figures(info.row.original).years[year - 1]),
    })),
  ];

  return (
    <>
      <Page
        fillBody
        header={
          <Header>
            <Breadcrumb crumbs={[{ label: t('indicators-demographics') }]} />
            <HeaderButtons>
              {/* Unavailable after a failed load as well as while saving:
                  with nothing loaded there is no general population row, so
                  an added row would save against a baseline of 0 and its
                  growth-rate write would INSERT a second record for the base
                  year (demographics.graphql § the projection write), which
                  the server refuses. */}
              <Button
                icon={<PlusCircleIcon />}
                data-testid="new-indicator-button"
                disabled={editor.saving() || editor.loadFailed()}
                onClick={editor.addIndicator}
              >
                {t('button.new-indicator')}
              </Button>
            </HeaderButtons>
          </Header>
        }
        contentFooter={
          <ContentFooter>
            {/* Save failed (S1 § states): the reason, inline-start of the
                actions, with the server's raw detail behind the disclosure.
                The draft stays on screen and dirty. */}
            <Show when={editor.rejection()}>
              {rejection => (
                <Alert severity="error" testId="save-error">
                  <span>
                    {t('error.an-error-occurred', {
                      message: rejection().message,
                    })}
                  </span>
                  <Show when={rejection().detail}>
                    {detail => <ErrorDetails detail={detail()} />}
                  </Show>
                </Alert>
              )}
            </Show>
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                data-testid="cancel-button"
                disabled={!editor.dirty() || editor.saving()}
                onClick={editor.cancel}
              >
                {t('button.cancel')}
              </Button>
              <Button
                icon={<SaveIcon />}
                data-testid="save-button"
                loading={editor.saving()}
                disabled={
                  !editor.dirty() || editor.saving() || editor.loadFailed()
                }
                onClick={() => void editor.save()}
              >
                {t('button.save')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        }
      >
        <DataTable
          columns={columns()}
          rows={editor.draft.indicators}
          rowKey={row => row.id}
          loading={editor.loading()}
          // The grid is never empty — the general population row always exists
          // — so the only empty face is a failed load's data-error message.
          emptyMessage={t('error.unable-to-load-data')}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          configIsDefault={tableConfig.isConfigDefault()}
        />
      </Page>
      {/* S2 — the leave confirmation: the shared guard's own dialog with the
          generic copy. OK leaves and discards; Cancel stays. */}
      <ConfirmDialog
        open={leaveGuard.open()}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-cancel-generic')}
        onClose={leaveGuard.cancel}
        onConfirm={leaveGuard.confirm}
      />
    </>
  );
};

export default DemographicsPage;
