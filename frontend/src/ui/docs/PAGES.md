# Page cheat sheet

> **Status (2026-07-09, integration merge):** the reference implementations this guide was written against (`src/pages/Home`, `Login`, `OutboundShipments`) were **deleted** when this branch merged into the team's app — its real verticals (`src/sections/`, stocktakes first) supersede them, routed by `@solidjs/router` with their own auth login page. The recipes below remain as prose: the composition rules, the region vocabulary, and the assembly order are unchanged and the stocktakes list is their live reference. Code snippets referencing `src/pages/` paths describe the retired skeletons.

How to build a page in `src/pages/`. Copy the closest recipe and go: [`pages/Home`](./src/pages/Home/Home.tsx) (minimal), [`pages/OutboundShipments/ListView`](./src/pages/OutboundShipments/ListView.tsx) (list), [`pages/OutboundShipments/DetailView`](./src/pages/OutboundShipments/DetailView.tsx) (detail).

## The rules

- Pages **compose library components only** — import from `src/ui/`, never from `src/ui-showcase/`.
- Pages own **no CSS**. No `.module.css` in `src/pages/` (`npm run check` fails the build if you add one). If a page seems to need CSS, a library component or token is missing — raise it.
- **One `<AppShell>` per host**, not per page. The shell owns the menu + orange footer; pages swap inside it.
- The page's **`<h1>` is the breadcrumb leaf** — never render another `h1`.
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

- **Fields** flow into a `FormRow` — equal shares at a 10rem min (`minFieldWidth`), growing to fill and wrapping as a unit. Give each the **`small`** size and **`width="full"`** so it fills its share.
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
