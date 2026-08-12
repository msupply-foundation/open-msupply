# Page cheat sheet

> **Status (2026-07-09, integration merge):** the reference implementations this guide was written against (`src/pages/Home`, `Login`, `OutboundShipments`) were **deleted** when this branch merged into the team's app — its real verticals (`src/sections/`, stocktakes first) supersede them, routed by `@solidjs/router` with their own auth login page. The recipes below remain as prose: the composition rules, the region vocabulary, and the assembly order are unchanged and the stocktakes list is their live reference. Code snippets referencing `src/pages/` paths describe the retired skeletons.

How to build a page in `src/pages/`. Copy the closest recipe and go: [`pages/Home`](./src/pages/Home/Home.tsx) (minimal), [`pages/OutboundShipments/ListView`](./src/pages/OutboundShipments/ListView.tsx) (list), [`pages/OutboundShipments/DetailView`](./src/pages/OutboundShipments/DetailView.tsx) (detail).

## The rules

- Pages **compose library components only** — import from `src/ui/`, never from `src/ui-showcase/`.
- Pages own **no CSS**. No `.module.css` in `src/pages/` (`npm run check` fails the build if you add one). If a page seems to need CSS, a library component or token is missing — raise it.
- **One `<AppShell>` per host**, not per page. The shell owns the menu + orange footer; pages swap inside it.
- The page's **`<h1>` is the breadcrumb leaf** — never render another `h1`.
- A page **does not pass the breadcrumb's section icon**: inside the shell, `Breadcrumb` shows the current route's nav-group glyph on its own (`ShellLayout` → `shellContext`'s `ShellSection` bridge). Pass `icon` only to override it with a record-**kind** glyph the screen's `ui-surface.md` calls for.
- A **detail page's header fields** (supplier, references, dates, status, settings toggles) go in a **`<HeaderToolbar>`**, never a hand-rolled `<Toolbar>` — it enforces the field-row layout so every detail header reads the same (see [Header field cluster](#header-field-cluster)).
- Run **`npm run check`** when done.

## Anatomy

```
AppShell                          ← app container: menu bar + orange app footer (the HOST mounts this, once)
└─ Page                           ← the page frame — geometry only
   ├─ header={ <Header>…</Header> }                    pinned top
   ├─ children                                         the scrolling body
   ├─ sidePanel={ <SidePanel>…</SidePanel> }           optional — docked inline-end (detail views)
   └─ contentFooter={ <ContentFooter>…</ContentFooter> } optional — pinned bottom action bar
```

## Minimal page

```tsx
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { Button } from '../../ui/elements/buttons/Button';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { PlusCircleIcon } from '../../ui/icons';

export const MyPage = () => (
  <Page
    header={
      <Header>
        <Breadcrumb
          crumbs={[{ label: 'Distribution' }, { label: 'My Page' }]}
        />
        <HeaderButtons>
          <Button icon={<PlusCircleIcon />}>New thing</Button>
        </HeaderButtons>
      </Header>
    }
  >
    <EmptyState message="Nothing here yet." />
  </Page>
);
```

Always give the Page a `<Header>` — in overlay mode (narrow viewports) the menu hamburger renders inside it, so a header-less page has no way into the menu.

## List page

Header gets a `<Toolbar>` row (filters); the body is a `<Table>`; a contextual `<ContentFooter>` appears only while rows are selected. Full version: [`ListView.tsx`](./src/pages/OutboundShipments/ListView.tsx).

```tsx
<Page
  header={
    <Header>
      <Breadcrumb crumbs={crumbs} />
      <HeaderButtons>
        <Button icon={<PlusCircleIcon />}>New shipment</Button>
      </HeaderButtons>
      <Toolbar>
        <FilterBar
          fields={FILTER_FIELDS}
          values={filters()}
          onChange={setFilters}
        />
      </Toolbar>
    </Header>
  }
  contentFooter={
    <Show when={picked().size > 0}>
      <ContentFooter>
        <strong>{picked().size} selected</strong>
        <ContentFooterActions>
          <Button
            variant="secondary"
            icon={<TrashIcon />}
            onClick={deletePicked}
          >
            Delete
          </Button>
        </ContentFooterActions>
      </ContentFooter>
    </Show>
  }
>
  <Table label="Outbound shipments">
    <thead>
      <tr>
        <th data-check aria-label="Selected" />
        <th>Reference</th>
        <th data-numeric>Items</th>
      </tr>
    </thead>
    <tbody>
      <For each={visible()}>
        {row => (
          <tr data-selected={picked().has(row.id) ? '' : undefined}>
            <td data-check>
              <input
                type="checkbox"
                checked={picked().has(row.id)}
                onChange={() => togglePicked(row.id)}
                aria-label={`Select ${row.id}`}
              />
            </td>
            <td data-mono>
              <button
                type="button"
                data-row-link
                onClick={() => props.onOpen(row.id)}
              >
                {row.id}
              </button>
            </td>
            <td data-numeric>{row.items}</td>
          </tr>
        )}
      </For>
    </tbody>
  </Table>
</Page>
```

Table cell conventions (data attributes on your own markup): `data-numeric` (end-aligned numbers), `data-check` (checkbox column), `data-muted`, `data-mono`, `data-selected` on the `<tr>`, and `data-row-link` — a real `<button>` in the first data cell that opens the row.

## Detail page

`<Tabs>` wraps the `<Page>` from outside; the `<TabList>` goes last in the header (it becomes the header's bottom edge) and `<TabPanel>`s go in the body. The side panel docks via the `sidePanel` slot. Full version: [`DetailView.tsx`](./src/pages/OutboundShipments/DetailView.tsx).

```tsx
<Tabs value={tab()} onValueChange={setTab}>
  <Page
    header={
      <Header>
        <Breadcrumb crumbs={crumbs()} />
        <HeaderButtons>
          <Button icon={<PlusCircleIcon />}>Add item</Button>
        </HeaderButtons>
        {/* the header field cluster — see "Header field cluster" below */}
        <HeaderToolbar>{/* fields… */}</HeaderToolbar>
        <TabList
          tabs={[
            { value: 'details', label: 'Details' },
            { value: 'log', label: 'Log' },
          ]}
        />
      </Header>
    }
    sidePanel={
      <SidePanel>
        <SidePanelSection title="Additional info">
          <dl>
            <dt>Status</dt>
            <dd>New</dd>
            <dt>Customer</dt>
            <dd>{shipment()?.customer}</dd>
          </dl>
        </SidePanelSection>
        <SidePanelSection title="Comment">
          <p>Free text goes in a plain paragraph.</p>
        </SidePanelSection>
      </SidePanel>
    }
    contentFooter={
      <ContentFooter>
        <Button variant="secondary" icon={<ClockIcon />}>
          History
        </Button>
        <ContentFooterActions>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            onClick={props.onBack}
          >
            Cancel
          </Button>
          <Button variant="secondary" icon={<SaveIcon />}>
            Save
          </Button>
        </ContentFooterActions>
      </ContentFooter>
    }
  >
    <TabPanel value="details">…table etc.…</TabPanel>
    <TabPanel value="log">…</TabPanel>
  </Page>
</Tabs>
```

Side panel content is plain semantic markup: field rows are a `<dl>` of `dt`/`dd` pairs, free text is a `<p>` — the panel's own CSS styles both.

## Header field cluster

A detail page's **header fields** — a document's editable + read-only meta (supplier, references, dates, status, settings toggles) — go in a **`<HeaderToolbar>`**, the standard for this row; never hand-roll a `<Toolbar>` with your own FormRow/flex. `HeaderToolbar` enforces the field-row layout so every detail header reads the same. (The generic `<Toolbar>` stays for non-field toolbar content, e.g. a list `<FilterBar>`.)

```tsx
<HeaderToolbar
  alert={
    <Alert severity="info" compact>
      Created manually; status won't update automatically.
    </Alert>
  }
>
  <Select label="Supplier name" size="small" width="full" … />
  <TextField label="Reference" size="small" width="full" … />
  <DateField label="Received" size="small" width="full" disabled … />
  <LabelledValue label="Status" variant="field" size="small">
    <StatusChip label="Received" colour="var(--status-received)" />
  </LabelledValue>
</HeaderToolbar>
```

- **Fields** flow into a `FormRow` — equal shares at a 10rem min (`minFieldWidth`), growing to fill and wrapping as a unit. Give each the **`small`** size and **`width="full"`** — that's what makes the control fill the share the row hands it.
- **Weight the fields whose data doesn't fit an equal share.** A field's column is sized by its data, never by its count, so equal shares are only right when every field holds comparably long data. Wrap the exceptions in a **`<FormRowItem>`** (`ui/layout/Form/FormRowItem`) — the row's `minmax(min, Nfr)`: `weight` is the item's **`fr` share of the whole row**, so `1.9` beside `0.9` takes a bit over twice the width (`1` everywhere is the equal-shares default, unchanged), and `minWidth` is the floor **that** item never shrinks below, overriding `minFieldWidth` for the one slot. A fixed-format scalar is pinned with **`weight={0}`**: a formatted date can never use more room, so it sits at its floor and hands every spare pixel to its siblings. **`maxWidth`** is the other half of the `minmax()` — a ceiling for a field that has no use for more width, which both keeps a wide screen's surplus flowing past it to the name fields and stops it filling a whole line to itself if it wraps (a lone flex item with any weight otherwise stretches the full width, which reads as the header promoting its least important field).
- **The floors carry two jobs, so budget them.** They decide who gives up width as the row narrows — a field that reaches its floor stops shrinking and its siblings absorb the rest, so a real floor is what protects a name field — _and_ they set the wrap point (the row wraps when the floors + gaps stop fitting). Which fields drop to the next line is document order, not floor size: the trailing ones go first, so order the cluster identity-first. Keep the cluster's floors summing to **no more than the unweighted row's would** (`fields × minFieldWidth`), or the header gains a line on a narrower screen than it used to — which is the one thing this layout must never do. Weight the whole cluster or none of it: an unwrapped sibling keeps a `minFieldWidth` basis and an equal share of what's left, which reads oddly next to weighted ones.

  ```tsx
  {/* The prescription header (PrescriptionToolbar.tsx). Six equal shares gave
      every field the same column, so "MOHAMED, DJIBRIL ABDULLAHI" truncated at
      4 of its 26 characters while the date, which needs ~74px, held 126px of
      value room. Floors: 11 + 10 + 9 + 10 + 9.5 + 9.5 = 59rem, under the
      6 × 10rem the unweighted row already took, so the wrap point holds. */}
  <FormRowItem weight={1.9} minWidth="11rem">
    <PatientSearch label="Patient" size="small" width="full" … />
  </FormRowItem>
  {/* No minWidth: Clinician and Program keep the row's own 10rem floor. */}
  <FormRowItem weight={1.55}>
    <ClinicianSelect label="Clinician" size="small" width="full" … />
  </FormRowItem>
  <FormRowItem weight={0} minWidth="9rem">
    <DateField label="Date" size="small" width="full" … />
  </FormRowItem>
  <FormRowItem weight={1.2}>
    <ProgramNameSelect label="Program" size="small" width="full" … />
  </FormRowItem>
  ```

- **The three field kinds:** an editable input; a conditionally-locked **disabled** input (a field editable only in some document states); and a never-editable fact as a read-only **`<LabelledValue>`** (`variant="field"`, `size="small"`).
- The optional **`alert`** prop takes a compact **`<Alert>`** — a content-hugging chip pinned to the bottom baseline, so it rides the row when there's room and drops to its own line when not, while the field labels line up along the top. It must be `compact`: a full-width Alert takes an equal share of the row like a field. A non-Alert trailing chip (e.g. a `<ToggleSwitch>`) opts into the same bottom-hug with an inline `flex: 0 1 auto; align-self: flex-end`.
- A **standing explanation** for a field (why it's disabled) belongs on its label as an `<InfoTooltip>` via the input's `labelInfo` slot — carried by every labelled input and selector, so the affordance is the same whatever the field is — not as `helperText`, which as a two- or three-line paragraph drags the whole strip taller than the field it explains. Keep `helperText` for text that must always be read.
- A field's own **`error`** (the `DateField`'s, say) stays inside the field, never a sibling Alert: the message extends its own field downward and leaves the rest of the row where it was.
- Live demo: `#/showcase/header` (three field mixes).

## The host (until routing lands)

One component owns the `<AppShell>` and swaps pages inside it — the menu never remounts. Full version: [`OutboundShipments.tsx`](./src/pages/OutboundShipments/OutboundShipments.tsx).

```tsx
export const MyHost = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(MY_LEAF);
  const [detailId, setDetailId] = createSignal<string>();

  return (
    <AppShell selected={selected()} onNavigate={setSelected}>
      <Show when={detailId()} fallback={<ListView onOpen={setDetailId} />}>
        {id => (
          <DetailView reference={id()} onBack={() => setDetailId(undefined)} />
        )}
      </Show>
    </AppShell>
  );
};
```

A router will absorb this host later; the pages themselves won't change.

## Quick don'ts

- ❌ CSS files, `style=` attributes, or hard-coded colours/px in a page
- ❌ Colour words in markup — component variants are semantic (`variant="primary" | "secondary"`), never a colour name
- ❌ A second `<h1>` (the breadcrumb leaf is it)
- ❌ `<AppShell>` inside a page component (it belongs to the host)
- ❌ Importing anything from `src/ui-showcase/`
- ❌ Click handlers on `<tr>` — row opening goes through the `data-row-link` button
