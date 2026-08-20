import { createMemo, createSignal, Show } from 'solid-js';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../ui/layout/Header/Toolbar';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { SplitButton } from '../../ui/elements/buttons/SplitButton';
import { DataTable, type SortState } from '../../ui/elements/table/DataTable';
import { CentralIcon, LockIcon, PlusCircleIcon } from '../../ui/icons';
import { AddItemModal } from './AddItemModal';
import { ImportItemsWizard } from './ImportItemsWizard';
// Imports from the REAL items vertical — the same move src/ui-showcase's
// TableShowcase makes for inbound shipments. This page is a faithful mock of
// the actual catalogue list (spec/items S1), so it reuses the generated row type
// and the real column definitions rather than forking lookalikes: the columns,
// their cell types and the card model then stay defined in exactly one place.
// The prototypes tree is dead-code-eliminated from the app build; the app never
// imports back the other way. See src/prototypes/README.md.
import {
  CARD_GROUPS,
  fixedColumns,
  type ItemRow,
  type SortKey,
} from '../../sections/items/list/itemColumns';

/*
 * ═══════════════════════════════════════════════════════════════════════
 * Catalogue items admin — PROTOTYPE, not a spec-conforming build.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * WHY THIS LIVES IN src/prototypes/ AND NOT IN src/sections/items/
 *
 * The shipped items vertical is deliberately read-only. spec/items is explicit
 * on both counts:
 *
 *   S1 — "find and open items; no create, edit, delete, select, or export —
 *         the catalogue is central-owned"; "Page actions: none."
 *   § Scope — "Item records themselves are maintained in central data entry
 *         outside this app."
 *   acceptance.md — OMS-FUN-ITEM-001 ("Create Items in OMS Central") was
 *         deliberately NOT folded in, because this app's items vertical does
 *         not own item creation.
 *
 * This prototype proposes exactly the capability that scope excludes: creating
 * one item, and importing many. So it does NOT touch the items vertical — doing
 * that would put the build at odds with its own spec, and spec changes go
 * through spec/PROCESS.md, not through a UI branch.
 *
 * Instead it renders in src/prototypes/ — the proposals area, deliberately
 * separate from the component showcase, which documents what the library IS and
 * should stay citeable as reference. `pnpm build:prototypes` emits it as a
 * static site the internal team can browse without a backend. If the proposal
 * is accepted, the route from here is:
 *   1. a spec change to spec/items (or a new central-catalogue vertical),
 *   2. the wizard stepper graduating into src/ui/ in its own PR,
 *   3. the screens rebuilt in src/sections/ against that spec.
 *
 * WHAT IT ARGUES
 *
 * One page per concept; permissions change the AFFORDANCES, not the location.
 * A store user and a catalogue administrator both go to Catalogue › Items —
 * the admin sees New item / Import, the store user sees a read-only list and a
 * route to request one. Toggle the role from the scope strip to compare; the
 * table, columns and URL never change.
 * ═══════════════════════════════════════════════════════════════════════
 */

const FACILITY_COUNT = 47;

const MASTER_LISTS = [
  'National EML 2026',
  'Health Centre kit',
  'Paediatric kit',
  'EPI vaccines',
  'Hospital formulary',
  'Consumables',
  'NCD kit',
];

/** Facilities each master list reaches — the picker's live reach count. */
const LIST_REACH: Record<string, number> = {
  'National EML 2026': 47,
  'Health Centre kit': 31,
  'Paediatric kit': 28,
  'EPI vaccines': 47,
  'Hospital formulary': 22,
  Consumables: 47,
  'NCD kit': 39,
};

/*
 * Demo rows conforming to the generated ItemRow (kdd/type-safety — state bound
 * for the table IS the GraphQL type, never a parallel one). Chosen to exercise
 * every cell the real columns render: a vaccine row (doses suffix), a row on no
 * master list, a zero-AMC row (months-of-stock dash, OMS-REG-CAT-04.34), and a
 * spread of chip counts.
 */
const row = (
  id: string,
  code: string,
  name: string,
  unitName: string,
  lists: string[],
  stockOnHand: number,
  amc: number,
  opts: { isVaccine?: boolean; doses?: number } = {}
): ItemRow => ({
  id,
  code,
  name,
  unitName,
  isVaccine: opts.isVaccine ?? false,
  doses: opts.doses ?? 0,
  customFields: null,
  masterLists: lists.map(l => ({ id: l, name: l })),
  stats: {
    averageMonthlyConsumption: amc,
    stockOnHand,
    // months-of-stock is null at zero AMC — the dash case.
    monthsOfStockOnHand: amc === 0 ? null : Number((stockOnHand / amc).toFixed(2)),
  },
});

const DATA: ItemRow[] = [
  row('i1', 'AS0001', 'Acetylsalicylic Acid 100mg tabs', 'Tablet', ['National EML 2026', 'Health Centre kit'], 14200, 1850),
  row('i2', 'AC0034', 'Acetazolamide 250mg tablets', 'Tablet', ['National EML 2026'], 900, 120),
  row('i3', 'AM0210', 'Amoxicillin 250mg capsules', 'Capsule', ['National EML 2026', 'Health Centre kit', 'Paediatric kit'], 32000, 4100),
  row('i4', 'AM0211', 'Amoxicillin 125mg/5mL suspension', 'Bottle', ['Paediatric kit'], 480, 96),
  row('i5', 'BC0001', 'BCG vaccine 20 dose', 'Vial', ['EPI vaccines'], 320, 40, { isVaccine: true, doses: 20 }),
  row('i6', 'CE0102', 'Ceftriaxone 1g injection', 'Vial', ['National EML 2026', 'Hospital formulary'], 610, 88),
  row('i7', 'DX0044', 'Dexamethasone 4mg/mL injection', 'Ampoule', ['Hospital formulary'], 1250, 210),
  row('i8', 'GL0009', 'Gloves, examination, latex, medium', 'Each', ['Consumables'], 8600, 1400),
  // On no master list — exists, but invisible to every store.
  row('i9', 'LB0021', 'Laboratory testing: full blood count', 'Each', [], 0, 0),
  row('i10', 'ME0303', 'Metformin 500mg tablets', 'Tablet', ['National EML 2026', 'NCD kit'], 21000, 2600),
  row('i11', 'OR0007', 'Oral rehydration salts sachet', 'Each', ['National EML 2026', 'Paediatric kit'], 5400, 900),
  row('i12', 'PA0555', 'Paracetamol 500mg tablets', 'Tablet', ['National EML 2026', 'Health Centre kit'], 46000, 6200),
  // Zero consumption — the months-of-stock dash rather than a 0.
  row('i13', 'SU0088', 'Suture, nylon 3/0, 75cm', 'Each', ['Consumables'], 240, 0),
  row('i14', 'TE0012', 'Tetanus toxoid vaccine 10 dose', 'Vial', ['EPI vaccines'], 700, 65, { isVaccine: true, doses: 10 }),
];

/** The two ways this page is reached — the whole point of the prototype. */
type Role = 'central' | 'store';

const CatalogueItemsDemo = () => {
  const [role, setRole] = createSignal<Role>('central');
  const [importing, setImporting] = createSignal(false);
  const [addOpen, setAddOpen] = createSignal(false);
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'name',
    desc: false,
  });

  const isCentral = () => role() === 'central';

  const sorted = createMemo(() => {
    const { key, desc } = sort();
    return [...DATA].sort((a, b) => {
      const cmp = String(a[key]).localeCompare(String(b[key]));
      return desc ? -cmp : cmp;
    });
  });

  const reachOf = (lists: string[]) =>
    lists.length === 0
      ? 0
      : Math.max(...lists.map(l => LIST_REACH[l] ?? 0));

  // The doses preference is on for this demo, so vaccine rows show the doses
  // equivalent — the real column definitions handle it.
  const columns = () => fixedColumns(() => true);

  return (
    <>
      <Page
        fillBody
        header={
          <Header>
            <Breadcrumb
              crumbs={
                importing()
                  ? [
                      { label: t('items'), onClick: () => setImporting(false) },
                      { label: 'Import items' },
                    ]
                  : [{ label: t('items') }]
              }
            />

            <Show when={!importing()}>
              <HeaderButtons>
                <Show
                  when={isCentral()}
                  fallback={
                    /* The read-only path is not a dead end: it offers the
                       route forward instead of nothing at all. */
                    <Button variant="secondary">Request a new item</Button>
                  }
                >
                  {/*
                   * ONE primary affordance. Add and Import are the same intent
                   * — get items into the catalogue — at different volumes, so
                   * they share a control rather than competing as two toolbar
                   * buttons. menuSelectsOnly is off: picking from the menu acts
                   * immediately, which is the export-selector convention.
                   */}
                  <SplitButton
                    icon={<PlusCircleIcon />}
                    menuLabel="More ways to add items"
                    mainLabel="New item"
                    options={[
                      { value: 'new', label: 'New item…' },
                      {
                        value: 'import',
                        label: 'Import items from a file…',
                      },
                      {
                        value: 'universal',
                        label: 'Add from Universal Catalogue…',
                      },
                      { value: 'export', label: 'Export this list…' },
                    ]}
                    onAction={value => {
                      if (value === 'import') setImporting(true);
                      else if (value === 'new') setAddOpen(true);
                    }}
                  />
                </Show>
              </HeaderButtons>
            </Show>

            {/*
             * The scope strip — the single most important device in this
             * proposal. Central-owned data is edited on the same page a store
             * user reads it on, so the page has to say out loud whose data it
             * is and how far a change reaches.
             *
             * A compact Alert in the header's Toolbar row: `compact` is exactly
             * the ui-standards `fb-banner--compact` case — persistent,
             * low-urgency context (read-only record) that shouldn't cost a
             * content row. Toolbar rather than HeaderToolbar because this is a
             * LIST page: HeaderToolbar's job is a detail view's field cluster,
             * and a list's filter row belongs to the DataTable's own toolbar.
             */}
            <Toolbar>
              <Show
                when={isCentral()}
                fallback={
                  <Alert severity="neutral" icon={LockIcon} compact>
                    Read only. Items are maintained centrally. Ask a
                    catalogue administrator, or request one from this page.
                  </Alert>
                }
              >
                <Alert severity="info" icon={CentralIcon} compact>
                  Central data. Changes sync to all {FACILITY_COUNT} facilities
                  at their next sync.
                </Alert>
              </Show>
              {/* Role switch — prototype scaffolding, not a product control.
                  It proves the page is ONE page: only affordances change. */}
              <Button
                variant="ghost"
                onClick={() => setRole(isCentral() ? 'store' : 'central')}
              >
                {isCentral()
                  ? 'View as a store user'
                  : 'View as a catalogue admin'}
              </Button>
            </Toolbar>
          </Header>
        }
      >
        <Show
          when={importing()}
          fallback={
            <DataTable
              columns={columns()}
              cardGroups={CARD_GROUPS}
              rows={sorted()}
              rowKey={r => r.id}
              sort={sort()}
              onSort={(key, desc) => setSort({ key, desc })}
              showCardToggle
              // Rows navigate to the item detail on the real page; inert here,
              // but the click affordance still reads.
              onRowClick={() => {}}
              emptyMessage={t('error.no-items-to-display')}
            />
          }
        >
          <ImportItemsWizard
            onExit={() => setImporting(false)}
            facilityCount={FACILITY_COUNT}
          />
        </Show>
      </Page>

      <AddItemModal
        open={addOpen()}
        onClose={() => setAddOpen(false)}
        takenCodes={DATA.map(i => ({ code: i.code, name: i.name }))}
        masterLists={MASTER_LISTS}
        reachOf={reachOf}
        facilityCount={FACILITY_COUNT}
      />
    </>
  );
};

export const CatalogueItemsPrototype = () => <CatalogueItemsDemo />;
