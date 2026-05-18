+++
title = "Front end plugin framework"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Front end plugin framework

Plugins extend the front end without modifying the base code. They are written as React components, bundled with Webpack, copied to the central server, and synced from there to every site that connects to it. A plugin can:

- Render its own page (route + menu item)
- Inject a component into a pre-defined "slot" inside a built-in page (a dashboard widget, an app-bar button on a detail view, a custom column on a list view, etc.)
- Use any shared UI component, hook, theme, translation, or GraphQL client from the host
- Store and read its own data via the `plugin_data` GraphQL endpoints

See the [example plugins repo](https://github.com/msupply-foundation/open-msupply-plugins) for working samples, and the in-repo [core-plugins package](https://github.com/msupply-foundation/open-msupply/tree/develop/client/packages/plugins/core-plugins) for the reference plugin bundled with this codebase.

## How plugins are loaded

When the app starts, every available plugin is read and added to a Zustand store (the [`usePluginProvider`](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/common/src/plugins/pluginProvider.ts)). Each plugin exports a default object that conforms to the [`Plugins` type](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/common/src/plugins/types.ts) — that object is deep-merged into the store, with array-valued slots concatenated. So multiple plugins can contribute to the same slot.

The loading mechanism differs between dev and prod:

| Mode | Source | Hot reload |
|------|--------|------------|
| Development | Local files under `client/packages/plugins/*/frontend/latest`, discovered at webpack start time | Yes for code changes inside a plugin; restart frontend when **adding** a new plugin |
| Production | Server endpoint listing compatible plugin bundles, fetched per-bundle via Webpack module federation at runtime | No |

In production the client fetches the plugin list on startup, downloads each bundle as a separate `<script>` tag, initialises it against the shared scope via `__webpack_init_sharing__`, then adds the resulting `Plugins` object to the provider.

### React context across the federation boundary

This is the single most important thing to understand. In **dev mode** a plugin lives inside the host's webpack build, so React context (theme, query client, i18n, auth) flows in naturally. In **prod mode** the plugin runs as a separately compiled bundle and only the modules listed as `shared` in its webpack config are singletons across the boundary; everything else has its own copy. That means most React contexts are **not** shared.

Two helpers from the host work around this by re-publishing their state through `react-singleton-context`:

- `ThemeProviderProxy`
- `QueryClientProviderProxy`

For **slot plugins** (dashboard widgets, app-bar buttons, list-view columns, etc.) the plugin must wrap the root of its contributed component in both, otherwise the standard hooks (`useTranslation`, `useAuthContext`, `useTheme`, `useQuery`, etc.) silently break in production. Forgetting this is the most common reason a plugin works in dev and breaks in prod.

For **plugin pages** the host applies both wrappers automatically — the page component can use those hooks directly without any boilerplate.

## Plugin identity

Each plugin's `name` field in its `package.json` is its **plugin code** — the Webpack module-federation name. It must be unique across all plugins, must be valid as a URL segment (`^[a-z0-9_-]+$`), and is also what the server uses to identify a bundle on upload.

Plugin versioning is tied to the minimum host version it supports — see [Compatibility / versioning](#compatibility-versioning) below.

## Available injection points

The full, authoritative list lives in [`Plugins` type](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/common/src/plugins/types.ts) — what follows is a reference summary of each slot, what it receives, and where the host currently renders it. Each top-level key on the `Plugins` object is optional, so a plugin contributes only the slots it cares about.

> Adding a new injection point requires changes to both `types.ts` and the host page that consumes it. See [Adding a new injection point](#adding-a-new-injection-point) below.

### Whole-page plugins — `pages`

Register a complete page with its own route and menu item. The plugin chooses whether the menu entry sits under an existing top-level category (Inventory, Manage, etc.) or contributes a brand-new top-level category that several plugins can share. See [Authoring a plugin page](#authoring-a-plugin-page) below for the full schema and URL scheme.

### Dashboard — `dashboard`

| Sub-slot | Purpose |
|---|---|
| `widget` | Top-level dashboard widget. Accepts `hiddenWidgets` to suppress built-in widgets by id. |
| `panel` | Panel inside a widget. Receives `widgetContext` prop identifying the parent widget. |
| `statistic` | Statistic inside a panel. Receives `panelContext` prop identifying the parent panel. |

### Inbound shipment — `inboundShipmentAppBar`

Array of components rendered in the app bar of the inbound-shipment detail view. Each receives the current `shipment: InboundFragment` as a prop.

### Prescription — `prescriptionPaymentForm`

Array of components rendered inside the prescription payment dialog. Receives props described by `PrescriptionPaymentComponentProps`.

### Item detail — `item.detailViewField`

Extra fields appended to the item detail view. Each receives `item: ItemFragment`.

### Stock lines — `stockLine`

| Sub-slot | Purpose |
|---|---|
| `tableStateLoader` | Renders nothing visually; receives the currently displayed `stockLines: StockLineRowFragment[]`. Used to pre-fetch any plugin-specific data for the visible page of rows and stash it in zustand state so column cells can look it up synchronously. |
| `tableColumn` | A `ColumnDef<StockLineRowFragment>` added to the stock-line list view. |
| `editViewField` | A form field rendered inside the stock-line edit view, with `events: UsePluginEvents<{ isDirty: boolean }>` to signal dirty state and respond to save events. |

### Request requisition lines — `requestRequisitionLine`

| Sub-slot | Purpose |
|---|---|
| `tableStateLoader` | Same pattern as `stockLine.tableStateLoader` but for request requisition lines. |
| `tableColumn` | A `ColumnDef<RequestLineFragment>` for the list view. |
| `editViewField` | A field rendered inside the line-edit modal, with optional `draft` and `unitName`. |
| `editViewInfo` | An info panel rendered alongside the edit modal. |
| `hideInfo` | List of built-in info panel ids to suppress. |

### Request requisition — `requestRequisition.sidePanelSection`

Section appended to the request-requisition detail view's side panel; receives the `RequestFragment`.

### Master lists — `masterLists`

| Sub-slot | Purpose |
|---|---|
| `tableStateLoader` | Same pattern; receives `masterLists: MasterListRowFragment[]`. |
| `tableColumn` | A `ColumnDef<MasterListRowFragment>` for the list view. |

## Authoring a plugin page

A plugin page contributes one entry to the `pages?: PluginPage[]` slot. The shape:

```typescript
import { AppRoute } from '@openmsupply-client/config';
import { Plugins, ReportsIcon, UserPermission } from '@openmsupply-client/common';

const myPlugin: Plugins = {
  pages: [
    {
      route: 'stock-aging',                            // single URL segment, [a-z0-9_-]+
      Component: StockAgingPage,                       // React component
      menu: {
        label: 'Stock aging',
        // (optional) gate behind permission(s); ALL must be held to see the page
        permissions: [UserPermission.StockLineQuery],
        category: {
          type: 'existing',                            // attach under built-in Inventory
          appRoute: AppRoute.Inventory,
        },
      },
    },
    {
      route: 'daily',
      Component: ReportingDailyPage,
      menu: {
        label: 'Daily',
        category: {
          type: 'new',                                 // contribute a new top-level section
          key: 'reporting',                            // URL segment + grouping key
          label: 'Reporting',
          icon: ReportsIcon,                           // any icon from @openmsupply-client/common
          order: 500,                                  // lower = earlier in drawer; default 1000
        },
      },
    },
  ],
};
```

### URL scheme

Every page mounts at `/<categoryKey>/<route>`:

- For `type: 'existing'`, `categoryKey` is the `AppRoute` string value (e.g. `inventory`)
- For `type: 'new'`, `categoryKey` is the plugin-supplied `key`

So the examples above resolve to `/inventory/stock-aging` and `/reporting/daily`. React Router picks these specific paths over the wildcard category routers, so `/inventory/stock-aging` is preferred over `/inventory/*` automatically. **It is the plugin author's responsibility** to choose a `route` that doesn't shadow a built-in sub-path of the same category. Plugin-supplied `new` category keys cannot equal any existing `AppRoute` value (the registration logic rejects these with a console warning).

If two plugins register the same `(categoryKey, route)` tuple, the later registration is dropped with a console warning.

### Menu placement and grouping

For an `existing` category, the link appears inside that category's collapsible section in the drawer, beneath the built-in items.

For a `new` category, all plugins that share the same `key` are grouped under one collapsible section. Category-level metadata (`label`, `icon`, `order`) is taken from the first page that declared the category — subsequent pages with the same key contribute only their own menu entry.

Child menu items have no icon (matching the built-in nav). The `icon` field exists only on the new-category declaration and is rendered themed (`color="primary" fontSize="small"`); omit it to use the default plug icon.

### Layouts and chrome

A `PluginPage` is a single component. The host wraps every plugin page in `ThemeProviderProxy` and `QueryClientProviderProxy` automatically, so you can use standard hooks (`useTranslation`, `useAuthContext`, `useQuery`, etc.) directly — there's no proxy-provider boilerplate to write at the page root.

The breadcrumb shown in the app bar is also set automatically from the `menu.label` (and `menu.category.label` for `new` categories), so the page title in the chrome matches the menu entry without any extra wiring.

To match the standard page layout, import the portal components from `@openmsupply-client/common` and render into them — exactly as built-in pages do:

```tsx
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  AppFooterPortal,
} from '@openmsupply-client/common';

export const MyPage = () => (
  <>
    <AppBarButtonsPortal>{/* action buttons */}</AppBarButtonsPortal>
    <AppBarContentPortal>{/* heading / extra content */}</AppBarContentPortal>
    {/* page body */}
    <AppFooterPortal Content={/* footer */} />
  </>
);
```

A plugin page can also render zero chrome — just a plain body — and the surrounding app bar and footer will stay empty. State sharing across the chrome is automatic because everything lives in a single component tree.

### Permissions

`menu.permissions` is an optional list of `UserPermission` values; **all** must be held by the current user for the menu item to be shown. The route is also guarded — direct navigation by a user who lacks the permission renders `NotFound`.

## Events between core and plugin

Some slots need to share state both ways. For example, an `editViewField` may need to (a) tell the host page when it has unsaved changes, and (b) run validation/save logic when the host's save button is pressed. The [`usePluginEvents`](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/common/src/plugins/usePluginEvents.ts) hook handles both: it stores arbitrary state plus a set of event listeners that the host can dispatch synchronously.

Declare the interface on the slot's prop type:

```typescript
// In types.ts (host side)
events: UsePluginEvents<
  { isReady: boolean },
  { validateThisString: string },
  'ok' | { error: string }
>;
```

Bind it in the host component:

```typescript
const CoreComponent = () => {
  const pluginEvents = usePluginEvents<
    { isReady: boolean },
    { validateThisString: string },
    'ok' | { error: string }
  >({ isReady: false });

  // Trigger validation from the host:
  const validate = async (value: string) => {
    const result = await pluginEvents.dispatchEvent({ validateThisString: value });
    if (result === 'ok') closeModal();
    else setError(result.error);
  };

  return (
    <>
      {pluginEvents.state.isReady && <div>Ready</div>}
      <PluginSlot events={pluginEvents} />
    </>
  );
};
```

Consume it in the plugin:

```typescript
const PluginComponent = ({ events }) => {
  // Listen for events from the host:
  useEffect(() => {
    return events.mountEvent(({ validateThisString }) => {
      return validateThisString === 'good' ? 'ok' : { error: 'string is not good' };
    });
  }, []);

  // Push state up to the host:
  useEffect(() => {
    events.setState({ isReady: true });
  }, [somethingChanged]);

  return <div>Plugin display content...</div>;
};
```

When you mount an event handler, prefer `useRef` for up-to-date but non-reactive values so that listener re-mounting (which would briefly drop events) is avoided:

```typescript
const [value, setValue] = useState('');
const valueRef = useRef(value);
valueRef.current = value;

useEffect(() => {
  return events.mountEvent(() => {
    // `valueRef.current` is always fresh; closing over `value` would be stale.
    console.log(valueRef.current);
  });
}, []); // mount once, never re-mount on `value` change
```

> TODO: example sharing the `UsePluginEvents` generic types between host and plugin without re-declaring them.

## Plugin data

Plugins can persist their own records in the shared `plugin_data` table via the GraphQL API. There are three operations:

- `pluginData` — query
- `insertPluginData` — insert
- `updatePluginData` — update

Records are scoped by plugin code (so two plugins can't read each other's data) and optionally tied to a `relatedRecordId` so a plugin can attach data to a specific stock line, master list, etc.

The querying / mutation pattern matches the rest of the app:

```typescript
const { data } = usePluginData.data(stockLine?.id ?? '');
const { mutate: insert } = usePluginData.insert();
const { mutate: update } = usePluginData.update();
```

> TODO: full reference for the data shape and how to scope queries.

## Creating a plugin

You can watch [this video for example](https://drive.google.com/file/d/1JnmPU9hRaQD4R1hTDKbbNj78FnM2l00A/view?usp=drive_link) (TODO: make public).

The simplest way to begin is by forking or copy-pasting [this template repo](https://github.com/msupply-foundation/open-msupply-plugins), then adding it as a submodule under `client/packages/plugins/`:

```
git submodule add [your-plugin-bundle-repo-url] client/packages/plugins/myPluginBundle
```

> You will need GitHub authentication set up to add a private repo from the command line — [github cli](https://cli.github.com/) is the easiest, or use one of the [alternative methods](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github).

The `myPluginBundle` directory name can be anything. The submodule and the main repo are treated as separate git repositories — changes in each only affect that repo. Make sure you don't commit the `.gitmodules` file or anything under `client/packages/plugins/<your bundle>/` to the main app.

Once added:

1. Change `name` in `package.json` — this becomes the plugin code and unique identifier
2. Update the `omSupplyPlugin.types` array to declare which slots the plugin implements (currently informational only, but will be validated on install)
3. Hot reloading works in dev once the bundle is registered. Restart the frontend after **adding** a new plugin so webpack picks it up.

> TODO: `omSupplyPlugin.types` could be derived automatically by inspecting `plugin.tsx` with ts-node — both for front-end and back-end plugins.

### Developing on branches of plugins

To pin a submodule to a specific branch, add `-b` when first adding it:

```
git submodule add [your-plugin-bundle-repo-url] -b [your-branch] client/packages/plugins/myPluginBundle
```

This adds a `branch` field to `.gitmodules`:

```.gitmodules
  [submodule "client/packages/plugins/myPluginBundle"]
    path = client/packages/plugins/myPluginBundle
    url = https://github.com/msupply-foundation/civ-plugins.git
    branch = fix-plugin-data-saving
```

Re-running the command with a different branch updates it. Alternatively, edit `.gitmodules` by hand and pull:

```
git submodule update --remote
```

> Note: the `branch` field accepts branch names only, not SHAs or tags.

### Removing a submodule

```bash
rm -rf .gitmodules
rm -rf client/packages/plugins/myPluginBundle/
rm -rf .git/modules/client/packages/plugins/myPluginBundle/
```

When using a private repo, you'll need to be logged in as a user with read access.

## Testing the production build

You can work on a plugin as if it were part of the app — types are shared, autocomplete and hot reload work. To test it as a production bundle:

```bash
# From the server directory
cargo run --bin remote_server_cli -- generate-plugin-bundle \
  -i ../client/packages/plugins/myPluginBundle/frontend \
  -o pluginbundle.json
```

This generates `pluginbundle.json` containing metadata (code, version, declared types) plus base64-encoded contents of every file in the `dist` directory that `yarn build` produced. Upload it:

```bash
cargo run --bin remote_server_cli -- install-plugin-bundle \
  -p pluginbundle.json \
  --url 'http://localhost:8000' \
  --username admin --password pass
```

Note: upload only works against a central server.

Or do both in one step:

```bash
cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle \
  -i '../client/packages/plugins/myPluginBundle/frontend' \
  --url 'http://localhost:8000' \
  --username admin --password pass
```

To exercise the plugin via the production path: `yarn build` the client from the repo root, restart the backend, and visit the app via the backend at `http://localhost:8000`. The frontend will then fetch plugins from the server (as it does in real deployments — central syncs them to remote site servers) rather than from local disk.

> Note: when running some backend plugins in dev mode you may hit a stack overflow. Increase the stack size: `export RUST_MIN_STACK=8388608; cargo run`.

## Reference plugin examples

The in-repo [core-plugins](https://github.com/msupply-foundation/open-msupply/tree/develop/client/packages/plugins/core-plugins/frontend/latest) bundle ships several examples:

- **ShippingStatus** — adds an app-bar button to the inbound-shipment detail view. Demonstrates: receiving data from the host, using standard UI components, using the theme.
- **Dashboard** (`Replenishment`, `SyncStatus`) — adds two dashboard widgets. Demonstrates: exporting multiple components, fetching data via GraphQL, using utility functions.
- **Stock Donor** — adds a custom field to a stock line, showing the stored value as a list-view column and providing an edit input in the detail view. Demonstrates: column plugin, plugin data via GraphQL (insert/update), `usePluginEvents` for triggering validation and save, table state loader, `react-singleton-context` proxies.
- **Aggregate AMC** — adds a column + edit field + info panel to request requisition lines.
- **Stock aging** — a full plugin page mounted at `/inventory/stock-aging`, demonstrating a page that uses the standard `AppBarButtons` + `AppBarContent` + `AppFooter` portal chrome plus a `Toolbar`.
- **Reporting / Daily** — a bare-bones plugin page under a new "Reporting" top-level category at `/reporting/daily`, demonstrating a page that opts out of all chrome.

The Stock Donor example uses the `tableStateLoader` slot to bulk-fetch plugin data for all currently visible stock rows in one go, stash it in a zustand store, and let column cells look it up synchronously — this avoids per-row fetches in the column render path.

> TODO: notes on plugin column ordering once it's been added to the framework.

## Compatibility / versioning

> TODO: explain the folder structure (`frontend/latest`, `frontend/2_6`, …), how versions are linked to the minimum host version a plugin supports, and how older hosts can be tested with a newer plugin via the `include`/`exclude` lists in [getLocalPlugins.js](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/host/getLocalPlugins.js).

## Adding a new injection point

When a built-in page needs to be made extensible, you have to update both the type definition and the host that consumes it:

1. Add an optional field to the `Plugins` type in [client/packages/common/src/plugins/types.ts](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/common/src/plugins/types.ts). For an array-valued slot, contributions from multiple plugins will be concatenated automatically by the provider's merge logic.
2. In the consuming host component, call `usePluginProvider()` and read your new field — typically rendering each entry in a list.
3. If the slot needs two-way state, attach a `UsePluginEvents` instance per [the events docs above](#events-between-core-and-plugin).

> TODO: short video walkthrough — the existing [video](https://drive.google.com/file/d/1kEEvJ9Pk6wpQGpBfKP1z2UmCw5EwztzV/view?usp=drive_link) shows extending the front-end plugin interface; this [commit in a plugin fork](https://drive.google.com/file/d/1kEEvJ9Pk6wpQGpBfKP1z2UmCw5EwztzV/view?usp=drive_link) and this [commit on the front end](https://github.com/msupply-foundation/open-msupply/commit/86b6447eb970a32cd7d4e7d8f178a34619dffa71) show one such change end-to-end (note that commit fails compilation and includes unrelated type relocations).

# Backend plugins

> TODO: full description. The [intro video](https://drive.google.com/file/d/1JnmPU9hRaQD4R1hTDKbbNj78FnM2l00A/view?usp=drive_link) touches on backend plugins briefly.

## More about bundling

> TODO: how a bundle should be deployed in production.

## Signing

> TODO: signing process, once signing is re-instated.
