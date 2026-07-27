import { createSignal, For } from 'solid-js';
import { Select } from '../ui/elements/selectors/Select';
import { Combobox } from '../ui/elements/selectors/Combobox';
import { AsyncCombobox } from '../ui/elements/selectors/AsyncCombobox';
import type { Page } from '../ui/utils/createPaginatedSearch';
import { MultiSelect } from '../ui/elements/selectors/MultiSelect';
import {
  ColourTagDot,
  ColourTagPicker,
  TAG_COLOURS,
} from '../ui/elements/selectors/ColourTag';
import { t } from '../intl';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { Button } from '../ui/elements/buttons/Button';
import { CancelButton } from '../ui/elements/buttons/StandardButtons';
import { PlusCircleIcon } from '../ui/icons';
import {
  FilterBar,
  FilterCheckbox,
  FilterDateRange,
  FilterMultiSelect,
  FilterNumberInput,
  FilterSelect,
  FilterTextInput,
  type Filter,
} from '../ui/elements/selectors/FilterBar';
import type { IsoDateRange } from '../ui/elements/inputs/DateRangeField';
import { ITEMS, INVOICE_STATUSES, type DemoItem } from './selectorData';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './SelectorsShowcase.module.css';

/**
 * A coloured status dot — the kind of rich option a native <option> can't
 * hold.
 */
const Dot = (props: { color: string }) => (
  <span
    class={styles.dot}
    style={{ background: props.color }}
    aria-hidden="true"
  />
);

/* Two-line item option: name on top, code + stock beneath. */
const renderItem = (item: DemoItem) => (
  <span class={styles.itemRow}>
    <span class={styles.itemName}>{item.name}</span>
    <span class={styles.itemMeta}>
      {item.code}
      {' · '}
      {item.availableStock > 0 ? (
        `${item.availableStock.toLocaleString()} in stock`
      ) : (
        <span class={styles.outOfStock}>Out of stock</span>
      )}
    </span>
  </span>
);

// A MOCK server-paginated fetcher for the AsyncCombobox demo: filters the fixed
// ITEMS list by code/name, returns one page at a time, and fakes network
// latency — so the demo shows the loading spinner, infinite-scroll paging, and
// selected-value display without a live backend. Real callers pass a fetcher
// backed by a GraphQL query (see ItemSearch / NameSearch).
const ASYNC_PAGE_SIZE = 5;
const mockFetchPage = (
  search: string,
  offset: number
): Promise<Page<DemoItem>> =>
  new Promise(resolve => {
    const needle = search.toLocaleLowerCase();
    const filtered = ITEMS.filter(
      item =>
        item.name.toLocaleLowerCase().includes(needle) ||
        item.code.toLocaleLowerCase().includes(needle)
    );
    setTimeout(
      () =>
        resolve({
          nodes: filtered.slice(offset, offset + ASYNC_PAGE_SIZE),
          totalCount: filtered.length,
        }),
      350
    );
  });

// Match either the item name or its code, case-insensitively.
const itemFilter = (item: DemoItem, input: string) => {
  const needle = input.toLocaleLowerCase();
  return (
    item.name.toLocaleLowerCase().includes(needle) ||
    item.code.toLocaleLowerCase().includes(needle)
  );
};

/*
 * A demo filter object, shaped like a list page's GraphQL filter (the
 * FilterBar is generic over it — see kdd/page-composition). A key PRESENT
 * (even as null/'') means its chip is shown; absent means it isn't. One of
 * EVERY chip editor type: text, number, single-select, multi-select, date
 * range and boolean — the full OMS filter-type parity set.
 */
interface InvoiceFilter {
  otherPartyName?: string | null;
  invoiceNumber?: number | null;
  theirReference?: string | null;
  status?: string | null;
  statuses?: string[] | null;
  createdDatetime?: IsoDateRange | null;
  onHold?: boolean | null;
}

/*
 * Built once as a stable const — labels are accessors, so FilterBar's <For>
 * reuses chip rows instead of remounting them (kdd/state-management: no
 * remounts). Every render passes props.testId through — the FilterBar's
 * add-a-filter focus hand-off finds the new chip's editor by that id. */
const DEMO_FILTERS: Filter<InvoiceFilter>[] = [
  {
    key: 'otherPartyName',
    label: () => 'Name',
    render: props => (
      <FilterTextInput
        label="Name"
        placeholder="Search by name"
        testId={props.testId}
        value={props.filter().otherPartyName ?? ''}
        onInput={value =>
          props.setPartialFilter({ otherPartyName: value || null })
        }
      />
    ),
  },
  {
    key: 'invoiceNumber',
    label: () => 'Invoice number',
    render: props => (
      <FilterNumberInput
        label="Invoice number"
        placeholder="Invoice number"
        testId={props.testId}
        value={props.filter().invoiceNumber ?? undefined}
        onChange={value =>
          props.setPartialFilter({ invoiceNumber: value ?? null })
        }
      />
    ),
  },
  {
    key: 'theirReference',
    label: () => 'Reference',
    render: props => (
      <FilterTextInput
        label="Reference"
        testId={props.testId}
        value={props.filter().theirReference ?? ''}
        onInput={value =>
          props.setPartialFilter({ theirReference: value || null })
        }
      />
    ),
  },
  {
    key: 'status',
    label: () => 'Status',
    render: props => (
      <FilterSelect
        label="Status"
        testId={props.testId}
        value={props.filter().status ?? ''}
        options={[
          { value: '', label: 'Any' },
          ...INVOICE_STATUSES.map(s => ({ value: s.value, label: s.label })),
        ]}
        onChange={value => props.setPartialFilter({ status: value || null })}
      />
    ),
  },
  {
    key: 'statuses',
    label: () => 'Statuses',
    render: props => (
      <FilterMultiSelect
        label="Statuses"
        placeholder="Any"
        testId={props.testId}
        options={INVOICE_STATUSES.map(s => ({
          value: s.value,
          label: s.label,
        }))}
        values={props.filter().statuses ?? []}
        onChange={values =>
          props.setPartialFilter({ statuses: values.length ? values : null })
        }
      />
    ),
  },
  {
    key: 'createdDatetime',
    label: () => 'Created',
    render: props => (
      <FilterDateRange
        label="Created"
        testId={props.testId}
        value={props.filter().createdDatetime ?? { start: null, end: null }}
        onChange={({ start, end }) =>
          props.setPartialFilter({
            createdDatetime: start || end ? { start, end } : null,
          })
        }
      />
    ),
  },
  {
    key: 'onHold',
    label: () => 'On hold',
    render: props => (
      <FilterCheckbox
        label="On hold"
        testId={props.testId}
        checked={props.filter().onHold ?? false}
        onChange={checked => props.setPartialFilter({ onHold: checked })}
      />
    ),
  },
];

export const selectorsMetadata: PageMetadata = {
  id: 'selectors',
  title: 'Selectors',
  searchTerms: ['dropdown', 'picker', 'choose'],
  items: [
    {
      id: 'selectors-select',
      title: 'Drop-down',
      searchTerms: ['select', 'status', 'enum'],
    },
    {
      id: 'selectors-autocomplete',
      title: 'Autocomplete / combobox',
      searchTerms: ['combobox', 'search', 'async', 'multi-select', 'typeahead'],
    },
    {
      id: 'selectors-in-dialog',
      title: 'In a dialog',
      searchTerms: ['modal', 'portal'],
    },
    {
      id: 'selectors-filter-bar',
      title: 'Filter bar',
      searchTerms: ['filter', 'chip', 'query', 'multi-select', 'enum'],
    },
    {
      id: 'selectors-colour-tag',
      title: 'Colour tag',
      searchTerms: ['color', 'swatch', 'dot', 'tag'],
    },
  ],
};

export const SelectorsShowcase = () => {
  const [status, setStatus] = createSignal('allocated');
  const [picked, setPicked] = createSignal<DemoItem | null>(null);
  // Seeded to the LAST item (not on the first page) to show AsyncCombobox
  // rendering a selected value whose row hasn't been loaded yet.
  const [asyncPicked, setAsyncPicked] = createSignal<DemoItem | null>(
    ITEMS[ITEMS.length - 1]
  );
  const [multi, setMulti] = createSignal<DemoItem[]>([ITEMS[0], ITEMS[2]]);
  // Selector-in-a-dialog demo: the pickers must portal INTO the dialog (not
  // behind it).
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogItem, setDialogItem] = createSignal<DemoItem | null>(null);
  const [dialogStatus, setDialogStatus] = createSignal('new');
  // Seeded non-empty to show chips restoring from an existing filter (a key
  // being present is what shows its chip): a single-select `status` and a
  // multi-select `statuses` both start present, so the bar shows both the
  // FilterSelect and FilterMultiSelect controls in their chip habitat on load.
  const [filters, setFilters] = createSignal<InvoiceFilter>({
    status: 'new',
    statuses: ['allocated', 'picked'],
  });
  // Colour-tag demo: starts untagged so the empty dashed ring shows first.
  const [tagColour, setTagColour] = createSignal<string | null>(null);
  const tagName = () => {
    const tag = TAG_COLOURS.find(c => c.value === tagColour());
    return tag ? t(tag.label) : null;
  };

  // What the page would hand to a table — rendered as the URL query string the
  // filter is destined to live in once routing lands. Empty/null keys
  // (added-but-empty chips) are dropped, mirroring the page's stripEmpty before
  // querying.
  const filterQuery = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters())) {
      if (value == null || value === '' || value === false) continue;
      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(','));
      } else if (typeof value === 'object') {
        // The date range: {start, end} → "start..end" (either side open).
        const { start, end } = value;
        if (start || end) params.set(key, `${start ?? ''}..${end ?? ''}`);
      } else {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={selectorsMetadata} />
        <DashboardCard
          id="selectors-select"
          title="Styled drop-down — Kobalte Select"
        >
          <Lead>
            Pick one from a fixed list, but the options carry a status colour a
            native <code>&lt;option&gt;</code> can't render. Kobalte Select buys
            the listbox a11y contract (the Solid analogue of last week's Radix
            Select); the look is entirely ours.
          </Lead>
          <Select
            label="Invoice status"
            value={status()}
            onValueChange={setStatus}
            options={INVOICE_STATUSES.map(s => ({
              value: s.value,
              label: s.label,
              adornment: <Dot color={s.color} />,
            }))}
            helperText="Coloured dots + check indicator — styled, still accessible"
          />
        </DashboardCard>

        <DashboardCard
          id="selectors-autocomplete"
          title="Autocomplete / combobox — Kobalte Combobox"
        >
          <Lead>
            The flagged hard widget: type to filter a large item list and pick
            one. Filters on <strong>code or name</strong>, renders a two-line
            option, and is clearable. Where last week's Downshift left popup
            placement to us, Kobalte portals it with collision-aware,
            control-width positioning. This is the real outbound-shipment item
            picker.
          </Lead>
          <Combobox<DemoItem>
            label="Add item"
            items={ITEMS}
            itemToString={item => item.name}
            itemToValue={item => item.code}
            filter={itemFilter}
            renderItem={renderItem}
            onChange={setPicked}
            placeholder="Search by item code or name…"
            helperText={
              picked()
                ? `Selected: ${picked()!.code} — ${picked()!.name}`
                : 'Try "amox", "500", or a code like "ORS20"'
            }
          />
        </DashboardCard>

        <DashboardCard title="Async autocomplete — AsyncCombobox (server-paginated)">
          <Lead>
            The <strong>server-fed</strong> combobox: typing refetches from the
            backend, scrolling near the bottom loads the next page, and a
            controlled selection shows its label even before its page is loaded.
            The generic engine behind the domain pickers (
            <code>ItemSearch</code>, <code>NameSearch</code>) — each just
            supplies a <code>fetchPage</code> and an option row. This demo uses
            a mock fetcher (page size {ASYNC_PAGE_SIZE}, faked latency) and
            starts preselected to the last item to show it render without a
            lookup.
          </Lead>
          <AsyncCombobox<DemoItem>
            label="Add item (async)"
            fetchPage={mockFetchPage}
            itemToString={item => item.name}
            itemToValue={item => item.code}
            renderItem={renderItem}
            selected={asyncPicked() ?? undefined}
            onSelect={setAsyncPicked}
            placeholder="Search by item code or name…"
          />
        </DashboardCard>

        <DashboardCard title="Autocomplete — open-on-interaction & per-option disabled">
          <Lead>
            Every combobox opens its full list as soon as the input is
            focused/clicked — no typing needed (the customer-search modal's
            pick-first flow is just the default). <code>itemDisabled</code>{' '}
            lists an option for context without letting it be chosen (on-hold
            customers, out-of-stock items — exposed as{' '}
            <code>aria-disabled</code>). After committing a pick, reopening
            shows the <em>full</em> list again — the input text only filters
            while it's something the user typed.
          </Lead>
          <Combobox<DemoItem>
            label="Item (zero-stock rows listed but disabled)"
            items={ITEMS}
            itemToString={item => item.name}
            itemToValue={item => item.code}
            filter={itemFilter}
            itemDisabled={item => item.availableStock === 0}
            renderItem={renderItem}
            onChange={() => {}}
            placeholder="Click — the list opens without typing"
          />
        </DashboardCard>

        <DashboardCard title="Multi-select autocomplete — Kobalte Combobox (multiple)">
          <Lead>
            The many-value sibling: pick several items, each a removable tag.
            Backspace removes the last; the menu stays open for picking several
            in a row. Unlike last week's Downshift version, picked items stay in
            the list check-marked — clicking one deselects it (Kobalte's
            standard multi-combobox model). Maps to the app's{' '}
            <code>AutocompleteMulti</code>.
          </Lead>
          <MultiSelect<DemoItem>
            label="Items on this master list"
            items={ITEMS}
            itemToString={item => item.code}
            selectedItems={multi()}
            onChange={setMulti}
            renderItem={renderItem}
            placeholder="Search to add items…"
            helperText={`${multi().length} selected`}
          />
        </DashboardCard>

        <DashboardCard
          id="selectors-in-dialog"
          title="Selectors in a dialog — portal-into-dialog"
        >
          <Lead>
            The case that needs care: a{' '}
            <strong>Combobox / Select opened inside a modal dialog</strong>. A
            listbox portaled to <code>&lt;body&gt;</code> would render{' '}
            <em>behind</em> the top-layer <code>&lt;dialog&gt;</code> and be
            inert — so our selectors portal <em>into</em> the dialog instead,
            with a dismiss guard so a click on an option{' '}
            <strong>selects</strong> it rather than being read as a
            click-outside that closes the popup. Open the dialog and pick an
            item <strong>by clicking</strong> — it commits, and the listbox
            layers above the dialog.
          </Lead>
          <Row>
            <Button
              icon={<PlusCircleIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Open dialog with pickers
            </Button>
          </Row>
          <p class={styles.filterReadout}>
            {dialogItem()
              ? `Picked: ${dialogItem()!.code} — ${dialogItem()!.name} (${dialogStatus()})`
              : '(nothing picked yet)'}
          </p>
          <Dialog
            open={dialogOpen()}
            onClose={() => setDialogOpen(false)}
            icon={<PlusCircleIcon />}
            title="Add a line"
            description="Both pickers below open their listbox inside this dialog — click an option to select it."
            widthRem={34}
            actions={
              <>
                <CancelButton onClick={() => setDialogOpen(false)} />
                <Button
                  icon={<PlusCircleIcon />}
                  onClick={() => setDialogOpen(false)}
                >
                  Add
                </Button>
              </>
            }
          >
            <Combobox<DemoItem>
              label="Item"
              items={ITEMS}
              itemToString={item => item.name}
              itemToValue={item => item.code}
              filter={itemFilter}
              renderItem={renderItem}
              onChange={setDialogItem}
              placeholder="Search by item code or name…"
            />
            <Select
              label="Status"
              value={dialogStatus()}
              onValueChange={setDialogStatus}
              options={INVOICE_STATUSES.map(s => ({
                value: s.value,
                label: s.label,
                adornment: <Dot color={s.color} />,
              }))}
            />
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="selectors-filter-bar"
          title="Filter bar — Kobalte DropdownMenu"
        >
          <Lead>
            The app's FilterMenu pattern: a <strong>Filters</strong> dropdown
            lists the addable fields; picking one adds an inline editor chip
            beside it — a text input, or a single-select menu for the status
            enum. Its menu buys Kobalte DropdownMenu, the same primitive as the
            SplitButton caret and the footer language menu; the chips are
            hand-rolled. The filter object is a controlled prop the page owns,
            in GraphQL-native shape — destined for URL query params once routing
            lands, so filtered views become shareable.
          </Lead>
          <FilterBar
            filters={DEMO_FILTERS}
            filter={filters()}
            onChange={setFilters}
          />
          <p class={styles.filterReadout}>
            What the page hands to the table:{' '}
            <code>{filterQuery() || '(no filters)'}</code>
          </p>
        </DashboardCard>

        <DashboardCard
          id="selectors-colour-tag"
          title="Colour tag — dot + swatch picker"
        >
          <Lead>
            User-set colour on a record for visual grouping only. The{' '}
            <code>ColourTagDot</code> is read-only and hides the dot for
            uneditable records; the <code>ColourTagPicker</code> is a dot with a{' '}
            <code>&lt;Popover&gt;</code> that opens the swatches. The dashed
            ring circle indicates that no tag is set. The colour palette is
            currently baked into the component since all current colour tag
            usages use the same palette.
          </Lead>
          <div class={styles.tagRow}>
            <For each={TAG_COLOURS}>
              {colour => <ColourTagDot colour={colour.value} />}
            </For>
            <span class={styles.tagRowLabel}>
              <code>ColourTagDot</code> — the read-only face (uneditable rows,
              read-only panels)
            </span>
          </div>
          <div class={styles.tagRow}>
            <ColourTagPicker colour={tagColour()} onSelect={setTagColour} />
            <span class={styles.tagRowLabel}>
              Inline table variant: <code>row</code>.{' '}
              {tagName()
                ? `Tagged: ${tagName()}`
                : 'Untagged: dashed ring circle'}
            </span>
          </div>
          <div class={styles.tagRow}>
            <ColourTagPicker
              colour={tagColour()}
              onSelect={setTagColour}
              variant="field"
              placement="bottom-end"
            />
            <span class={styles.tagRowLabel}>
              Side panel variant: use <code>placement="bottom-end"</code> so the
              <code>&lt;Popover&gt;</code> grows back into the viewport from the
              panel's edge.{' '}
            </span>
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
