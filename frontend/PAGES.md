# Page cheat sheet

How to build a page in `src/pages/`. Copy the closest recipe and go: [`pages/Home`](./src/pages/Home/Home.tsx) (minimal), [`pages/OutboundShipments/ListView`](./src/pages/OutboundShipments/ListView.tsx) (list), [`pages/OutboundShipments/DetailView`](./src/pages/OutboundShipments/DetailView.tsx) (detail).

## The rules

- Pages **compose library components only** — import from `src/components/`, never from `src/showcase/`.
- Pages own **no CSS**. No `.module.css` in `src/pages/` (`npm run check` fails the build if you add one). If a page seems to need CSS, a library component or token is missing — raise it.
- **One `<AppShell>` per host**, not per page. The shell owns the menu + orange footer; pages swap inside it.
- The page's **`<h1>` is the breadcrumb leaf** — never render another `h1`.
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
import { Page } from '../../components/layout/Page/Page'
import { Header } from '../../components/layout/Header/Header'
import { Breadcrumb } from '../../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../../components/layout/Header/HeaderButtons'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PlusCircleIcon } from '../../components/icons'

export const MyPage = () => (
  <Page
    header={
      <Header>
        <Breadcrumb crumbs={[{ label: 'Distribution' }, { label: 'My Page' }]} />
        <HeaderButtons>
          <Button icon={<PlusCircleIcon />}>New thing</Button>
        </HeaderButtons>
      </Header>
    }
  >
    <EmptyState message="Nothing here yet." />
  </Page>
)
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
        <FilterBar fields={FILTER_FIELDS} values={filters()} onChange={setFilters} />
      </Toolbar>
    </Header>
  }
  contentFooter={
    <Show when={picked().size > 0}>
      <ContentFooter>
        <strong>{picked().size} selected</strong>
        <ContentFooterActions>
          <Button color="blue" icon={<TrashIcon />} onClick={deletePicked}>Delete</Button>
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
        {(row) => (
          <tr data-selected={picked().has(row.id) ? '' : undefined}>
            <td data-check>
              <input type="checkbox" checked={picked().has(row.id)}
                onChange={() => togglePicked(row.id)} aria-label={`Select ${row.id}`} />
            </td>
            <td data-mono>
              <button type="button" data-row-link onClick={() => props.onOpen(row.id)}>
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
        <TabList tabs={[{ value: 'details', label: 'Details' }, { value: 'log', label: 'Log' }]} />
      </Header>
    }
    sidePanel={
      <SidePanel>
        <SidePanelSection title="Additional info">
          <dl>
            <dt>Status</dt><dd>New</dd>
            <dt>Customer</dt><dd>{shipment()?.customer}</dd>
          </dl>
        </SidePanelSection>
        <SidePanelSection title="Comment">
          <p>Free text goes in a plain paragraph.</p>
        </SidePanelSection>
      </SidePanel>
    }
    contentFooter={
      <ContentFooter>
        <Button color="blue" icon={<ClockIcon />}>History</Button>
        <ContentFooterActions>
          <Button color="blue" icon={<XCircleIcon />} onClick={props.onBack}>Cancel</Button>
          <Button color="blue" icon={<SaveIcon />}>Save</Button>
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

## The host (until routing lands)

One component owns the `<AppShell>` and swaps pages inside it — the menu never remounts. Full version: [`OutboundShipments.tsx`](./src/pages/OutboundShipments/OutboundShipments.tsx).

```tsx
export const MyHost = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(MY_LEAF)
  const [detailId, setDetailId] = createSignal<string>()

  return (
    <AppShell selected={selected()} onNavigate={setSelected}>
      <Show when={detailId()} fallback={<ListView onOpen={setDetailId} />}>
        {(id) => <DetailView reference={id()} onBack={() => setDetailId(undefined)} />}
      </Show>
    </AppShell>
  )
}
```

A router will absorb this host later; the pages themselves won't change.

## Quick don'ts

- ❌ CSS files, `style=` attributes, or hard-coded colours/px in a page
- ❌ A second `<h1>` (the breadcrumb leaf is it)
- ❌ `<AppShell>` inside a page component (it belongs to the host)
- ❌ Importing anything from `src/showcase/`
- ❌ Click handlers on `<tr>` — row opening goes through the `data-row-link` button
