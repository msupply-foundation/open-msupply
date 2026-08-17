import { generateUUID } from '@/uuid';
import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { InsetPanel } from '@/ui/layout/InsetPanel/InsetPanel';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { RadioGroup } from '@/ui/elements/inputs/RadioGroup';
import { DateField } from '@/ui/elements/inputs/DateField';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { masterListsResource, MasterListSelect } from '@/domain/masterList';
import {
  fetchLocations,
  LocationSelect,
  type Location,
} from '@/domain/location';
import { VvmStatusSelect } from '@/domain/vvmStatus';
import { stocktakePreferences } from '@/store/storeContext';
import { PlusCircleIcon } from '@/ui/icons';
import { t, tPlural } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import { userDisplayName } from '@/auth/authContext';
import { shallowEqual } from '@/typeHelpers';
import { dayBefore } from '@/intl/dateArithmetic';
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
  vvmStatusId: string;
  expiryDate: string;
  includeAllItems: boolean;
};

const EMPTY_FORM: FormState = {
  type: 'full',
  masterListId: '',
  locationId: '',
  vvmStatusId: '',
  expiryDate: '',
  includeAllItems: false,
};

// The mode cards: a short name plus the sentence that says what it does, so the
// choice is made from the cards themselves and not from the panel that appears
// below them (#837).
const TYPE_OPTIONS: readonly {
  value: StocktakeType;
  labelKey:
    | 'stocktake.create-full'
    | 'stocktake.create-filtered'
    | 'stocktake.create-blank';
  descriptionKey:
    | 'stocktake.create-full-description'
    | 'stocktake.create-filtered-description'
    | 'stocktake.create-blank-description';
}[] = [
  {
    value: 'full',
    labelKey: 'stocktake.create-full',
    descriptionKey: 'stocktake.create-full-description',
  },
  {
    value: 'filtered',
    labelKey: 'stocktake.create-filtered',
    descriptionKey: 'stocktake.create-filtered-description',
  },
  {
    value: 'blank',
    labelKey: 'stocktake.create-blank',
    descriptionKey: 'stocktake.create-blank-description',
  },
];

export const CreateStocktakeModal = (props: {
  open: boolean;
  onClose: () => void;
}) => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // Locations for the picker, fetched locally (the domain widget owns no cache
  // — spec/ui-standards/components.md). Volume-blind here: the picker only
  // scopes which stock to count, so capacity is irrelevant. Read WITHOUT
  // suspending (this modal renders under AppShell's <Suspense>; a pending read
  // there would remount + reset the form — see the estimate resource below).
  const [locationsData] = createResource(() => params.storeId, fetchLocations);
  const locations = (): Location[] =>
    locationsData.state === 'ready' || locationsData.state === 'refreshing'
      ? (locationsData.latest ?? [])
      : [];

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
    const location = locations().find(l => l.id === locationId);
    if (masterList)
      parts.push(
        t('stocktake.master-list-template', { masterList: masterList.name })
      );
    if (location)
      parts.push(t('stocktake.location-template', { location: location.code }));
    if (expiryDate)
      parts.push(t('stocktake.expires-before-template', { date: expiryDate }));
    return parts.length
      ? t('stocktake.comment-template', { filters: parts.join(', ') })
      : undefined;
  };

  // Map the form onto InsertStocktakeInput. Each type contributes only its own
  // fields; the id is client-generated so the create can navigate to the new
  // stocktake.
  const buildInput = (): InsertStocktakeVariables['input'] => {
    const {
      type,
      masterListId,
      locationId,
      vvmStatusId,
      expiryDate,
      includeAllItems,
    } = form();
    // Seed a default description on every create mode (OMS-REG-INV-03.9): the
    // server fabricates no default, so the client composes one — the user's
    // display name and today's date, both in the active locale. Editable in
    // place afterward; nothing re-derives it.
    const base = {
      id: generateUUID(),
      comment: generatedComment(),
      description: t('stocktake.description-template', {
        username: userDisplayName(),
        date: localisedDate(new Date()),
      }),
    };
    switch (type) {
      case 'full':
        return { ...base, isAllItemsStocktake: includeAllItems };
      case 'filtered':
        return {
          ...base,
          masterListId: masterListId || undefined,
          locationId: locationId || undefined,
          // VVM status filter — gated by manageVvmStatusForStock (the field
          // only appears when the pref is on, so vvmStatusId is otherwise
          // always '').
          vvmStatusId: vvmStatusId || undefined,
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
      label: t('stocktake.items-with-soh'),
      testId: 'stocktake-items-with-soh',
    },
    {
      value: 'all',
      label: t('label.all-items'),
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
      title={t('label.new-stocktake')}
      icon={<PlusCircleIcon />}
      // Blocking while the mutation is in flight (no scrim/Escape exit until
      // it resolves).
      dismissable={!creating()}
      // An explicit dismiss affordance in the top corner, beside the heading
      // (#837) — the same close path as Escape and the scrim, and ignored while
      // the create is in flight (dismissable above).
      closeButton
      onClose={close}
      widthRem={42}
      // NO height reservation (#837): the modes differ by a filter panel's
      // worth of content, and padding full and blank up to the filtered
      // height left two thirds of the dialog empty — a far louder artefact
      // than the box resizing when the user changes mode. Each mode is now
      // sized by what it actually holds.
      //
      // The dropdown-room reservation other picker dialogs carry (#1029)
      // isn't needed either: the only pickers are in the FILTERED panel,
      // which is the tall mode anyway.
      // Bottom-pinned status banner (OMS): blue "N lines estimated" (or
      // Counting…) for full/filtered; green "blank stocktake" confirmation for
      // blank. Lives in the footer so it hugs the actions at the dialog's
      // bottom edge instead of floating with the form.
      footer={
        <Show
          when={!isBlank()}
          fallback={
            <Alert severity="success" testId="blank-stocktake-notice">
              {t('message.create-blank-stocktake')}
            </Alert>
          }
        >
          <Alert severity="info" testId="stocktake-line-estimate">
            <span>
              <Show when={!countLoading()} fallback={t('messages.counting')}>
                {tPlural('message.lines-estimated', estimatedLines())}
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
            <CancelButton data-testid="dialog-button-cancel" onClick={close} />
          </Show>
          <Button
            variant="primary"
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={creating()}
            onClick={() => void create()}
          >
            {t('button.create-stocktake')}
          </Button>
        </>
      }
    >
      {/* Blind stocktake (spec/stocktakes › store-preference gates): an
          informational banner shown regardless of mode — there is no control
          here to turn the preference on or off per-stocktake, it only informs. */}
      <Show when={stocktakePreferences().blindStocktake}>
        <Alert severity="info" testId="blind-stocktake-notice">
          {t('message.blind-stocktake-enabled')}
        </Alert>
      </Show>

      {/* The three modes, as selectable cards (#837): each names itself and
          says what it does, and the chosen one carries a brand rim — so the
          mode is legible without reading the panel below for the difference. */}
      <RadioGroup
        appearance="card"
        value={form().type}
        onChange={value => setType(value as StocktakeType)}
        disabled={creating()}
        options={TYPE_OPTIONS.map(o => ({
          value: o.value,
          label: t(o.labelKey),
          description: t(o.descriptionKey),
          testId: `stocktake-type-${o.value}`,
        }))}
      />

      {/* A grey inset panel per mode, each with its own hint line (matches OMS). */}
      <Switch>
        <Match when={form().type === 'full'}>
          <InsetPanel hint={t('stocktake.description-full')}>
            {/* The include-all choice is a labelled row like the filtered
                panel's fields, so the two panels read the same way (#837). */}
            <FieldRow label={t('label.include')}>
              <RadioGroup
                options={includeAllOptions()}
                value={includeAllValue()}
                orientation="horizontal"
                disabled={creating()}
                onChange={value =>
                  setForm({ ...form(), includeAllItems: value === 'all' })
                }
              />
            </FieldRow>
          </InsetPanel>
        </Match>

        <Match when={form().type === 'filtered'}>
          <InsetPanel hint={t('stocktake.description-filters')}>
            {/* Master list row + the include-all sub-choice beneath it (OMS layout). */}
            <FieldRow label={t('label.master-list')}>
              <MasterListSelect
                label={t('label.master-list')}
                hideLabel
                disabled={creating()}
                placeholder={t('label.any')}
                value={form().masterListId || undefined}
                onChange={id => setForm({ ...form(), masterListId: id ?? '' })}
              />
            </FieldRow>
            {/* The include-all sub-choice, as its own labelled row in the same
                column as the pickers (#837) — it reads as one of the filters
                rather than as an unlabelled appendage to the master list. */}
            <FieldRow label={t('label.include')}>
              <RadioGroup
                options={includeAllOptions()}
                value={includeAllValue()}
                orientation="horizontal"
                disabled={creating()}
                onChange={value =>
                  setForm({ ...form(), includeAllItems: value === 'all' })
                }
              />
            </FieldRow>
            <FieldRow label={t('label.location')}>
              <LocationSelect
                label={t('label.location')}
                hideLabel
                locations={locations()}
                loading={locationsData.loading}
                disabled={creating()}
                placeholder={t('label.any')}
                value={form().locationId || undefined}
                onChange={l => setForm({ ...form(), locationId: l?.id ?? '' })}
              />
            </FieldRow>
            <FieldRow label={t('label.items-expiring-before')}>
              <DateField
                label={t('label.items-expiring-before')}
                hideLabel
                disabled={creating()}
                value={form().expiryDate || null}
                onChange={v => setForm({ ...form(), expiryDate: v ?? '' })}
              />
            </FieldRow>
            {/* VVM status filter — gated by manageVvmStatusForStock
                (spec/stocktakes › store-preference gates). Last of the filters
                (#837): the row is absent in most stores, so an optional field
                between two permanent ones would move the expiry row up and down
                with a store preference. */}
            <Show when={stocktakePreferences().manageVvmStatusForStock}>
              <FieldRow label={t('label.vvm-status')}>
                <VvmStatusSelect
                  label={t('label.vvm-status')}
                  hideLabel
                  disabled={creating()}
                  placeholder={t('label.any')}
                  value={form().vvmStatusId || undefined}
                  onChange={s =>
                    setForm({ ...form(), vvmStatusId: s?.id ?? '' })
                  }
                />
              </FieldRow>
            </Show>
          </InsetPanel>
        </Match>

        <Match when={form().type === 'blank'}>
          <InsetPanel hint={t('stocktake.description-blank')}>
            {null}
          </InsetPanel>
        </Match>
      </Switch>
    </Dialog>
  );
};
