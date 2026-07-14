import { createSignal, type JSX } from 'solid-js'
import { Select } from '../ui/elements/selectors/Select'
import { Combobox } from '../ui/elements/selectors/Combobox'
import { MultiSelect } from '../ui/elements/selectors/MultiSelect'
import { Dialog } from '../ui/elements/feedback/Dialog'
import { Button } from '../ui/elements/buttons/Button'
import { PlusCircleIcon, XCircleIcon } from '../ui/icons'
import {
  FilterBar,
  FilterSelect,
  FilterTextInput,
  type Filter,
} from '../ui/elements/selectors/FilterBar'
import { ITEMS, INVOICE_STATUSES, type DemoItem } from './selectorData'
import styles from './SelectorsShowcase.module.css'

const Card = (props: { title: string; lead: JSX.Element; children: JSX.Element }) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
)

/* A coloured status dot — the kind of rich option a native <option> can't hold. */
const Dot = (props: { color: string }) => (
  <span
    class={styles.dot}
    style={{ background: props.color }}
    aria-hidden="true"
  />
)

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
)

// Match either the item name or its code, case-insensitively.
const itemFilter = (item: DemoItem, input: string) => {
  const needle = input.toLocaleLowerCase()
  return (
    item.name.toLocaleLowerCase().includes(needle) ||
    item.code.toLocaleLowerCase().includes(needle)
  )
}

/*
 * A demo filter object, shaped like a list page's GraphQL filter (the FilterBar is
 * generic over it — see kdd/page-composition). A key PRESENT (even as null/'') means
 * its chip is shown; absent means it isn't. Three free-text columns + the status enum,
 * the current app's outbound-shipment FilterMenu set.
 */
interface InvoiceFilter {
  otherPartyName?: string | null
  invoiceNumber?: string | null
  theirReference?: string | null
  status?: string | null
}

/* Built once as a stable const — labels are accessors, so FilterBar's <For> reuses
   chip rows instead of remounting them (kdd/state-management: no remounts). */
const DEMO_FILTERS: Filter<InvoiceFilter>[] = [
  {
    key: 'otherPartyName',
    label: () => 'Name',
    render: (props) => (
      <FilterTextInput
        label="Name"
        placeholder="Search by name"
        value={props.filter().otherPartyName ?? ''}
        onInput={value => props.setPartialFilter({ otherPartyName: value || null })}
      />
    ),
  },
  {
    key: 'invoiceNumber',
    label: () => 'Invoice number',
    render: (props) => (
      <FilterTextInput
        label="Invoice number"
        value={props.filter().invoiceNumber ?? ''}
        onInput={value => props.setPartialFilter({ invoiceNumber: value || null })}
      />
    ),
  },
  {
    key: 'theirReference',
    label: () => 'Reference',
    render: (props) => (
      <FilterTextInput
        label="Reference"
        value={props.filter().theirReference ?? ''}
        onInput={value => props.setPartialFilter({ theirReference: value || null })}
      />
    ),
  },
  {
    key: 'status',
    label: () => 'Status',
    render: (props) => (
      <FilterSelect
        label="Status"
        value={props.filter().status ?? ''}
        options={[
          { value: '', label: 'Any' },
          ...INVOICE_STATUSES.map(s => ({ value: s.value, label: s.label })),
        ]}
        onChange={value => props.setPartialFilter({ status: value || null })}
      />
    ),
  },
]

export const SelectorsShowcase = () => {
  const [status, setStatus] = createSignal('allocated')
  const [picked, setPicked] = createSignal<DemoItem | null>(null)
  const [multi, setMulti] = createSignal<DemoItem[]>([ITEMS[0], ITEMS[2]])
  // Selector-in-a-dialog demo: the pickers must portal INTO the dialog (not behind it).
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [dialogItem, setDialogItem] = createSignal<DemoItem | null>(null)
  const [dialogStatus, setDialogStatus] = createSignal('new')
  // Seeded non-empty to show chips restoring from an existing filter (a key being
  // present is what shows its chip — here status starts on 'new').
  const [filters, setFilters] = createSignal<InvoiceFilter>({ status: 'new' })

  // What the page would hand to a table — rendered as the URL query string the filter
  // is destined to live in once routing lands. Empty/null keys (added-but-empty chips)
  // are dropped, mirroring the page's stripEmpty before querying.
  const filterQuery = () => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters())) {
      if (value != null && value !== '') params.set(key, String(value))
    }
    const query = params.toString()
    return query ? `?${query}` : ''
  }

  return (
    <div class={styles.stack}>
      <Card
        title="Styled drop-down — Kobalte Select"
        lead={
          <>
            Pick one from a fixed list, but the options carry a status colour a
            native <code>&lt;option&gt;</code> can't render. Kobalte Select buys
            the listbox a11y contract (the Solid analogue of last week's Radix
            Select); the look is entirely ours.
          </>
        }
      >
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
      </Card>

      <Card
        title="Autocomplete / combobox — Kobalte Combobox"
        lead={
          <>
            The flagged hard widget: type to filter a large item list and pick
            one. Filters on <strong>code or name</strong>, renders a two-line
            option, and is clearable. Where last week's Downshift left popup
            placement to us, Kobalte portals it with collision-aware,
            control-width positioning. This is the real outbound-shipment item
            picker.
          </>
        }
      >
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
      </Card>

      <Card
        title="Multi-select autocomplete — Kobalte Combobox (multiple)"
        lead={
          <>
            The many-value sibling: pick several items, each a removable tag.
            Backspace removes the last; the menu stays open for picking several
            in a row. Unlike last week's Downshift version, picked items stay in
            the list check-marked — clicking one deselects it (Kobalte's
            standard multi-combobox model). Maps to the app's{' '}
            <code>AutocompleteMulti</code>.
          </>
        }
      >
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
      </Card>

      <Card
        title="Selectors in a dialog — portal-into-dialog"
        lead={
          <>
            The case that needs care: a <strong>Combobox / Select opened inside a
            modal dialog</strong>. A listbox portaled to <code>&lt;body&gt;</code>{' '}
            would render <em>behind</em> the top-layer <code>&lt;dialog&gt;</code>{' '}
            and be inert — so our selectors portal <em>into</em> the dialog
            instead, with a dismiss guard so a click on an option{' '}
            <strong>selects</strong> it rather than being read as a click-outside
            that closes the popup. Open the dialog and pick an item{' '}
            <strong>by clicking</strong> — it commits, and the listbox layers above
            the dialog.
          </>
        }
      >
        <Button icon={<PlusCircleIcon />} onClick={() => setDialogOpen(true)}>
          Open dialog with pickers
        </Button>
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
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button icon={<PlusCircleIcon />} onClick={() => setDialogOpen(false)}>
                Add
              </Button>
            </>
          }
        >
          <Combobox<DemoItem>
            label="Item"
            items={ITEMS}
            itemToString={(item) => item.name}
            itemToValue={(item) => item.code}
            filter={itemFilter}
            renderItem={renderItem}
            onChange={setDialogItem}
            placeholder="Search by item code or name…"
          />
          <Select
            label="Status"
            value={dialogStatus()}
            onValueChange={setDialogStatus}
            options={INVOICE_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              adornment: <Dot color={s.color} />,
            }))}
          />
        </Dialog>
      </Card>

      <Card
        title="Filter bar — Kobalte DropdownMenu"
        lead={
          <>
            The app's FilterMenu pattern: a <strong>Filters</strong> dropdown
            lists the addable fields; picking one adds an inline editor chip
            beside it — a text input, or a single-select menu for the status
            enum. Its menu buys Kobalte DropdownMenu, the same primitive as the
            SplitButton caret and the footer language menu; the chips are
            hand-rolled. The filter object is a controlled prop the page owns,
            in GraphQL-native shape — destined for URL query params once routing
            lands, so filtered views become shareable.
          </>
        }
      >
        <FilterBar filters={DEMO_FILTERS} filter={filters()} onChange={setFilters} />
        <p class={styles.filterReadout}>
          What the page hands to the table:{' '}
          <code>{filterQuery() || '(no filters)'}</code>
        </p>
      </Card>
    </div>
  )
}
