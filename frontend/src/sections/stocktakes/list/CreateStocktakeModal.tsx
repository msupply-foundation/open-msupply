import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { InsetPanel } from '../../../ui/elements/inputs/InsetPanel';
import { Button } from '../../../ui/elements/buttons/Button';
import { RadioGroup } from '../../../ui/elements/inputs/RadioGroup';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import {
  masterListsResource,
  MasterListSelect,
} from '../../../domain/masterList';
import { locationsResource, LocationSelect } from '../../../domain/location';
import { PlusCircleIcon, XCircleIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import { shallowEqual } from '../../../typeHelpers';
import { dayBefore } from '../../../intl/dateArithmetic';
import {
  InsertStocktake,
  type InsertStocktakeVariables,
  NoStockItemCount,
  StockLineCount,
  type StockLineCountVariables,
} from './createStocktake.generated';

// The stocktake-creation modal — a consumer of our Dialog shell
// (kdd/explicit-composition): it owns the form + create logic, handing the
// shell its title, actions, and open/close. Rebuilt on this branch's components
// (Dialog / Combobox / Select / TextField), ported from andrei-17-card-view.
//
// Three create modes (single radio; exactly one active), each mapping onto its
// own subset of InsertStocktakeInput (built in buildInput — the generated type,
// no intermediate shape): full     — every item; those with stock on hand, or
// all master-list items filtered — items matching a master list / location /
// expiry cut-off blank    — no lines; the user adds them by hand

type StocktakeType = 'full' | 'filtered' | 'blank';

// includeAllItems is shared by full + filtered (same meaning: include items
// with no stock).
type FormState = {
  type: StocktakeType;
  masterListId: string;
  locationId: string;
  expiryDate: string;
  includeAllItems: boolean;
};

const EMPTY_FORM: FormState = {
  type: 'full',
  masterListId: '',
  locationId: '',
  expiryDate: '',
  includeAllItems: false,
};

const TYPE_OPTIONS: readonly {
  value: StocktakeType;
  labelKey:
    | 'stocktake.create.type-full'
    | 'stocktake.create.type-filtered'
    | 'stocktake.create.type-blank';
}[] = [
  { value: 'full', labelKey: 'stocktake.create.type-full' },
  { value: 'filtered', labelKey: 'stocktake.create.type-filtered' },
  { value: 'blank', labelKey: 'stocktake.create.type-blank' },
];

export const CreateStocktakeModal = (props: {
  open: boolean;
  onClose: () => void;
}) => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [form, setForm] = createSignal<FormState>(EMPTY_FORM);
  const [creating, setCreating] = createSignal(false);

  // Reset to a clean form whenever the caller closes us, so re-opening starts
  // fresh.
  const close = () => {
    setForm(EMPTY_FORM);
    props.onClose();
  };

  const isBlank = () => form().type === 'blank';

  // Estimated line count, from ONE resource keyed on the whole form (blank
  // needs no count). The resource's INPUT switches on the current state: it
  // always counts the stock lines matching the filters, and ADDS the item count
  // only when including all items. It's an ESTIMATE, so we don't over-refine it
  // — the item count is scoped to real, countable items (isVisible + isActive +
  // type STOCK), matching the master list when set. Filters are built straight
  // from the form as the generated input types (kdd/type-safety).
  const stockFilter = (): StockLineCountVariables['filter'] => {
    const { masterListId, locationId, expiryDate } = form();
    return {
      // Count only stock lines that actually hold packs — an empty/zero line
      // isn't part of the stocktake estimate (matches OMS).
      hasPacksInStore: true,
      masterList: masterListId ? { id: { equalTo: masterListId } } : undefined,
      locationId: locationId ? { equalTo: locationId } : undefined,
      expiryDate: expiryDate
        ? { beforeOrEqualTo: dayBefore(expiryDate) }
        : undefined,
    };
  };

  // Source for the estimate = the count-affecting fields
  // (kdd/solid-reactivity-pitfalls). createResource has no `equals` option — it
  // dedupes its source with ===, and a fresh array/object every setForm would
  // refetch on each edit. So the shallow compare lives on a createMemo (which
  // DOES take `equals`): the memo only emits a new value when a field actually
  // changes, and the resource watches the memo. Enumerated (not
  // JSON.stringify(form)) so the dependency is explicit — every field here is
  // read by stockFilter/the fetcher. null (blank) has no count to fetch.
  const countKey = createMemo(
    () => {
      if (isBlank()) return null;
      const { type, masterListId, locationId, expiryDate, includeAllItems } =
        form();
      return [
        type,
        masterListId,
        locationId,
        expiryDate,
        includeAllItems,
      ] as const;
    },
    undefined,
    { equals: shallowEqual }
  );

  const [estimate] = createResource(countKey, async () => {
    const { includeAllItems, masterListId } = form();
    const stock = await graphqlFetch(StockLineCount, {
      storeId: params.storeId,
      filter: stockFilter(),
    });
    const stockCount =
      stock.kind === 'success' ? stock.data.stockLines.totalCount : 0;
    if (!includeAllItems) return stockCount;
    const noStock = await graphqlFetch(NoStockItemCount, {
      storeId: params.storeId,
      filter: {
        masterListId: masterListId ? { equalTo: masterListId } : undefined,
        isVisible: true,
        isActive: true,
        type: { equalTo: 'STOCK' },
      },
    });
    return (
      stockCount +
      (noStock.kind === 'success' ? noStock.data.items.totalCount : 0)
    );
  });

  // Is a count fetch in flight? (Drives the "counting…" hint in the estimate
  // message.)
  const countLoading = () => estimate.loading;

  // Read WITHOUT suspending: this modal renders under AppShell's <Suspense>
  // (lazy section chunks), and a pending resource read there trips the fallback
  // → remounts the section → resets the form. Gate on resource.state, never
  // `.latest` (which suspends the first read) — see kdd/state-management (no
  // remounts).
  const estimatedLines = (): number =>
    estimate.state === 'ready' || estimate.state === 'refreshing'
      ? (estimate.latest ?? 0)
      : 0;

  // A short human comment describing the filtered selection (empty for
  // full/blank).
  const generatedComment = (): string | undefined => {
    const { type, masterListId, locationId, expiryDate } = form();
    if (type !== 'filtered') return undefined;
    const parts: string[] = [];
    const masterList = masterListsResource
      .noSuspense()
      .find(m => m.id === masterListId);
    const location = locationsResource
      .noSuspense()
      .find(l => l.id === locationId);
    if (masterList)
      parts.push(
        t('stocktake.create.comment-master-list', { name: masterList.name })
      );
    if (location)
      parts.push(
        t('stocktake.create.comment-location', { code: location.code })
      );
    if (expiryDate)
      parts.push(t('stocktake.create.comment-expiry', { date: expiryDate }));
    return parts.length
      ? t('stocktake.create.comment', { parts: parts.join(', ') })
      : undefined;
  };

  // Map the form onto InsertStocktakeInput. Each type contributes only its own
  // fields; the id is client-generated so the create can navigate to the new
  // stocktake.
  const buildInput = (): InsertStocktakeVariables['input'] => {
    const { type, masterListId, locationId, expiryDate, includeAllItems } =
      form();
    const base = { id: crypto.randomUUID(), comment: generatedComment() };
    switch (type) {
      case 'full':
        return { ...base, isAllItemsStocktake: includeAllItems };
      case 'filtered':
        return {
          ...base,
          masterListId: masterListId || undefined,
          locationId: locationId || undefined,
          expiresBefore: expiryDate ? dayBefore(expiryDate) : undefined,
          includeAllMasterListItems: includeAllItems,
        };
      case 'blank':
        return { ...base, createBlankStocktake: true };
    }
  };

  const create = async () => {
    setCreating(true);
    const result = await graphqlFetch(InsertStocktake, {
      storeId: params.storeId,
      input: buildInput(),
    });
    // Failures are handled globally (unexpected-error modal); on anything but
    // success we stay open in the creating state. On success, navigate to the
    // new stocktake's detail route.
    if (result.kind === 'success') {
      const id = result.data.insertStocktake.id;
      close();
      navigate(`/${params.storeId}/inventory/stocktakes/${id}`);
    }
    setCreating(false);
  };

  // Changing type resets the type-specific inputs (a stale master list can't
  // leak in).
  const setType = (type: StocktakeType) => setForm({ ...EMPTY_FORM, type });

  // Include-all choice: stock-on-hand items only, or every (master-list) item
  // (a zero line for the rest). "All items" is DISABLED when a location or
  // expiry is set — out-of-stock items aren't in any location and have no
  // expiry, so including them is incompatible with those filters (matches OMS:
  // it greys out "All items" rather than hiding the choice).
  const allItemsDisabled = () =>
    Boolean(form().locationId || form().expiryDate);
  const includeAllOptions = () => [
    {
      value: 'soh',
      label: t('stocktake.create.items-with-stock'),
      testId: 'stocktake-items-with-soh',
    },
    {
      value: 'all',
      label: t('stocktake.create.items-all'),
      disabled: allItemsDisabled(),
      testId: 'stocktake-all-items',
    },
  ];
  // If "All items" was chosen and then becomes disabled (location/expiry set),
  // fall back.
  const includeAllValue = () =>
    form().includeAllItems && !allItemsDisabled() ? 'all' : 'soh';

  return (
    <Dialog
      open={props.open}
      testId="create-stocktake-modal"
      title={t('stocktake.create.title')}
      icon={<PlusCircleIcon />}
      // Blocking while the mutation is in flight (no scrim/Escape exit until
      // it resolves).
      dismissable={!creating()}
      onClose={close}
      widthRem={42}
      // Reserve the tallest mode's height (filtered, ~38rem) so switching type
      // never resizes the dialog — full/blank pad up to the filtered height, so
      // there's no jump in any direction.
      minBodyHeightRem={39}
      // Bottom-pinned status banner (OMS): blue "N lines estimated" (or
      // Counting…) for full/filtered; green "blank stocktake" confirmation for
      // blank. Lives in the footer so it hugs the actions at the dialog's
      // bottom edge instead of floating with the form.
      footer={
        <Show
          when={!isBlank()}
          fallback={
            <Alert severity="success" testId="blank-stocktake-notice">
              {t('stocktake.create.estimate-none')}
            </Alert>
          }
        >
          <Alert severity="info" testId="stocktake-line-estimate">
            <span>
              <Show
                when={!countLoading()}
                fallback={t('stocktake.create.estimate-loading')}
              >
                {t('stocktake.create.estimate', { count: estimatedLines() })}
              </Show>
            </span>
          </Alert>
        </Show>
      }
      actions={
        <>
          {/* Cancel disappears while creating (blocking). A failed create goes to the global
              error modal, so there's no in-dialog error state that would bring it back. */}
          <Show when={!creating()}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              data-testid="dialog-button-cancel"
              onClick={close}
            >
              {t('common.cancel')}
            </Button>
          </Show>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="dialog-button-ok"
            loading={creating()}
            onClick={() => void create()}
          >
            {t('stocktake.create.action')}
          </Button>
        </>
      }
    >
      {/* The three type radios, tight together at the top. */}
      <RadioGroup
        value={form().type}
        onChange={value => setType(value as StocktakeType)}
        disabled={creating()}
        options={TYPE_OPTIONS.map(o => ({
          value: o.value,
          label: t(o.labelKey),
          testId: `stocktake-type-${o.value}`,
        }))}
      />

      {/* A grey inset panel per mode, each with its own hint line (matches OMS). */}
      <Switch>
        <Match when={form().type === 'full'}>
          <InsetPanel hint={t('stocktake.create.full-hint')}>
            <RadioGroup
              options={includeAllOptions()}
              value={includeAllValue()}
              disabled={creating()}
              onChange={value =>
                setForm({ ...form(), includeAllItems: value === 'all' })
              }
            />
          </InsetPanel>
        </Match>

        <Match when={form().type === 'filtered'}>
          <InsetPanel hint={t('stocktake.create.filtered-hint')}>
            {/* Master list row + the include-all sub-choice beneath it (OMS layout). */}
            <FieldRow label={t('stocktake.filter.master-list')}>
              <MasterListSelect
                label={t('stocktake.filter.master-list')}
                hideLabel
                disabled={creating()}
                placeholder={t('filter.any')}
                value={form().masterListId || undefined}
                onChange={id => setForm({ ...form(), masterListId: id ?? '' })}
              />
            </FieldRow>
            {/* Include-all radios: empty-label FieldRow puts them in the control column, and
                indentRem lines their labels up with the master-list combobox's text (past its
                leading search icon), matching OMS. */}
            <FieldRow label="">
              <RadioGroup
                options={includeAllOptions()}
                value={includeAllValue()}
                disabled={creating()}
                indentRem={0.2}
                onChange={value =>
                  setForm({ ...form(), includeAllItems: value === 'all' })
                }
              />
            </FieldRow>
            <FieldRow label={t('stocktake.filter.location')}>
              <LocationSelect
                label={t('stocktake.filter.location')}
                hideLabel
                disabled={creating()}
                placeholder={t('filter.any')}
                value={form().locationId || undefined}
                onChange={l => setForm({ ...form(), locationId: l?.id ?? '' })}
              />
            </FieldRow>
            <FieldRow label={t('stocktake.create.expiring-before')}>
              <TextField
                label={t('stocktake.create.expiring-before')}
                hideLabel
                type="date"
                disabled={creating()}
                value={form().expiryDate}
                onInput={e =>
                  setForm({ ...form(), expiryDate: e.currentTarget.value })
                }
              />
            </FieldRow>
          </InsetPanel>
        </Match>

        <Match when={form().type === 'blank'}>
          <InsetPanel hint={t('stocktake.create.blank-hint')}>
            {null}
          </InsetPanel>
        </Match>
      </Switch>
    </Dialog>
  );
};
