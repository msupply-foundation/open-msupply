# Front end plugin framework

Plugins are a way of extending front end functionality without altering the base code. Some examples of possible plugin usages:

- Adding a button to a toolbar of a detail view which performs an external action like looking up shipping details from an external API. The plugin is provided with details of the object being viewed (e.g. draft shipment object) and can use that data when performing actions.
- Adding a new widget to the dashboard
- Adding a column to a list view for particular objects, and adding editing support for that new field

Plugins are written as [react](https://react.dev/) components and compiled to distributable packages. These are copied to the server and then are available to all clients using that server. See `testing production build` below

A plugin can interact with the app framework, access language translations, call the data API or use the current theme. For example, a plugin can use shared UI components and utility functions from the app framework.

Note that the plugins do need to be implemented for a given area of the app - currently a plugin can be created to add a column to a list view, but only the Stock list view has implemented this functionality and is the only area of the site for which this plugin will operate. It is a simple task to support plugins in other areas, however we are only implementing plugin support as required.

For some working examples, see the [plugin repo](https://github.com/msupply-foundation/open-msupply-plugins) which has some examples.

## Plugin structure

When the app is loaded, all available plugins are read (the process differs slightly between development and production mode, see more below) and stored within a centrally accessible plugin provider.

Plugin can implement any interfaces defined in [Plugins type](../common/src/plugins/types.ts), for examples a React component a simple function or an object, and can implement multiple instances of the same interface. Plugins are accessed by core frontend functionality with usePluginProvider hook, and any related data is passed to that plugin as props.

Like data an event can be provided to a plugin component, to allow event driven interaction between the core and the plugins, for example being able to set isDirty state or invoke plugin action when save button is pressed, see more on events below.

Webpack module federation is used to bundle and serve the plugins.

When running in development mode, the required plugin files are loaded directly from disk. HMR / fast reload is available and the plugins have access to the full application context. All plugins are available in the PluginProvider - with no need to fetch additional files or components.

In production mode the process differs:

- the server provides an endpoint to fetch the list of available plugins
- the client app fetches the full list on startup, then individually fetches each plugin bundle
- Using federation module and webpack low level api the plugin is dynamically added to scope
- When plugin and it's dependencies are resolved it's added to PluginProvider and it becomes available to be used by the core functionality

### Plugin definitions

Plugin version and plugin code are defined in package.json of the plugin, code should be unique across all plugins, so it's a good idea to have something unique in the code.

Plugin's type is derived from [interfaces](../common/src/plugins/types.ts) that it implements and exposes in plugin.tsx.

### Events

Sometimes extra state needs to be shared between plugin and core component, in cases where plugin needs to update the core state or core component needs to trigger an action in plugin, [usePluginEvents](https://github.com/msupply-foundation/open-msupply/blob/1b1d8f6c1c79bcf07ab048eb1e95f666aba1d7a1/client/packages/common/src/plugins/usePluginEvents.ts#L8) hook is [bound in the core component](https://github.com/msupply-foundation/open-msupply/blob/73289fc25807543f164900020d284e9f6b2a6697/client/packages/system/src/Stock/DetailView/DetailView.tsx#L37) and [passed to the plugin](https://github.com/msupply-foundation/open-msupply/blob/1b1d8f6c1c79bcf07ab048eb1e95f666aba1d7a1/client/packages/system/src/Stock/Components/StockLineForm.tsx#L172). Plugin can then [set various state](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorEditInput.tsx#L54) which can be used in [core component](https://github.com/msupply-foundation/open-msupply/blob/73289fc25807543f164900020d284e9f6b2a6697/client/packages/system/src/Stock/DetailView/DetailView.tsx#L110) and plugin can [mount an event listener](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorEditInput.tsx#L38-L39) which is [triggered from within core component](https://github.com/msupply-foundation/open-msupply/blob/73289fc25807543f164900020d284e9f6b2a6697/client/packages/system/src/Stock/DetailView/DetailView.tsx#L56).

`usePluginEvents` helper can store any state and provide any type to event listener which in turn can return any type, for example if you want to set `isReady` state and trigger an event `onSave` that passes in a `string` to be validated, expecting `error` if not valid then:

```typescript
// In Core
// When defining plugin interface
events: UsePluginEvents<
  { isReady: boolean },
  { validateThisString: string },
  'ok' | { error: 'string' }
>;

const CoreComponent = () => {
  //  Bind to component
  const pluginEvents = usePluginEvents<
    _,
    { validateThisString: string },
    'ok' | { error: 'string' }
  >({ isReady: false });
  // When asking for validation
  const validate = async (validateThisString: string) => {
    let validationResult = await pluginEvents.dispatchEvent({
      validateThisString: 'good',
    });
    if (validationResult == 'ok') {
      closeModal();
    }
    error(validationResult.error); // This is a toast
    setError(validationResult.error);
  };

  ...

  return (
    <>
      ...

      // Checking for isReady
      {pluginEvents.state.isReady && <div>I am ready</div>}
    </>
  );
};
```

```typescript
// In Plugin
const PluginComponent = ({ events }) => {
// events should come as a parameter to component
  useEffect(() => {
    const unmountEvent = events.mountEvent(({ validateThisString }) => {
      // types should be know by typescript at this stage
      if (validateThisString == 'good') {
        return 'ok';
      }
      return { error: 'string is not good' };
    });
    return unmountEvent; // mountEvent return a handler to unmountEvent
  }, []);

  // Setting isReady
  useEffect(() => {
    events.setState({ isReady: true });
  }, [somethingChanged]);

  return <div>Plugin display content...</div>;
}
```

Of course in above example the types should be defined once and shared (even though typescript guarantees they are valid it's a bit verbose)

TODO actually tried to share types but had typescript error when doing `const pluginEvents: SomeConcreteTypeOfUsePluginEvent = usePluginEvents>({ isReady: false });` <- said that (boolean is not false ¯\_(ツ)\_/¯)

When mounting event it's a good idea to reduce number of dependencies of the method that is mounted and triggered, useRef() can be used for this reason to pass non reactive but up to date state to the plugin:

```typescript
const [value, setValue] = useEffect('')

const valueRef = useRef('')
const valueRef.current = value

// ...

useEffect(() => {
  const unmountEvent = events.mountEvent(() => {
  console.log(`this will be the current value ${valueRef.current} this will be stale value ${value}`)
   
  return unmountEvent;
}, [/* can also just listen to value here but on every value change we are mounting event and unmounting even */])
```

### Plugin data

TODO update this

Plugins can store data in the `plugin_data` table. The following methods are available in the graphQL API for interacting with plugin data:

- `pluginData`
- `insertPluginData`
- `updatePluginData`

The querying and mutating of data follows the standard pattern used throughout open mSupply:

```typescript
  const { data } = usePluginData.data(stockLine?.id ?? '');
  const { mutate: insert } = usePluginData.insert();
  const { mutate: update } = usePluginData.update();
```

These functions can be implemented within your plugin and used to fetch and update data.

## Creating a plugin

You can watch [this video for example](https://drive.google.com/file/d/1JnmPU9hRaQD4R1hTDKbbNj78FnM2l00A/view?usp=drive_link) TODO make public

The simplest way to begin is by cloning (forking for now or just copy and create new repo, until we have a template), this repository https://github.com/msupply-foundation/open-msupply-plugins, then add it as a submodule to `client/packages/plugins/`. From the root of this repository, run: 

```
git submodule add [your-plugin-bundle-repo-url] client/packages/plugins/myPluginBundle
```


Note the `myPluginBundle` can be anything. The inner repository and core will be treated as two different repositories, changes in them will only be reflected in relative repositories (i.e. you can add the inner repository as local repository in github desktop). Make sure that you don't commit the `.gitmodule` or the single `client/packages/plugins/{your plugin bundle name}` to the core.

You would need to change [name](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/package.json#L3) in package.json, which is also the plugin code and unique identifier (every plugin should have unique code). You should also add types that are implemented, in the future those will be displayed before plugin is installed, for validation form the user, for frontend plugins they are not essential though. TODO these types can be looked up when building, both for front end and backed plugin, by running ts-node and inspecting import { plugins } from './plugins.tsx' or '.ts'.

Hot reloading will be working on dev mode but frontend needs to be restarted when adding a new plugin because local plugins are only discovered when webpack starts

## Testing production build

You can work on plugins as if they were part of the app (types should be shared, autocompletion and hot reload should work). If you want to test plugin in production, you can bundle it and deploy to server via:

```bash
# From server directory
cargo run --bin remote_server_cli -- generate-plugin-bundle -i ../client/packages/plugins/myPluginBundle/frontend -o pluginbundle.json
```

Above will generate `pluginbundle.json` with all backend and frontend plugins in the directory specified by `-i`, this bundle includes metadata, like code and plugin types and base64 contents of all of the files in the `dist` directory which was generated with `yarn build` command that was executed in every plugin directory.

This can now be uploaded to the server via

```bash
# From server directory
cargo run --bin remote_server_cli -- install-plugin-bundle -p pluginbundle.json --url 'http://localhost:8000' --username admin --password pass
```

Note you must be uploading plugins to central server for this to work

Alternatively one command can be used for both:

```bash
cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/myPluginBundle/frontend' --url 'http://localhost:8000' --username admin --password pass
```

In order to test this plugins in front end, you will need to start front end via `yarn -- -- --env LOAD_REMOTE_PLUGINS` which fetched plugins from the server rather then serving them from local directory, this is how plugins will be loaded in production (and plugins will sync and be served by remote site servers)

## Example plugin types

**ShippingStatus**
This adds a simple toolbar button to the detail view of Inbound Shipments. The plugin demonstrates:

- creating a plugin
- receiving data from the host environment
- using standard app components
- use of the app theme

**Dashboard**
This example adds two widgets to the standard dashboard. It demonstrates:

- creating a plugin
- using standard app components
- use of the app theme
- the export of two plugin components
- fetching data using the graphQL API
- utilising utility functions from the app

**Stock Donor**
This example adds a new field to a stock line, displaying the stored data in a new column within the list view and allowing editing of the field in the detail view. It demonstrates:

- creating a plugin
- using standard app components
- use of the app theme
- implementing a column plugin
- fetching data using the graphQL API
- inserting and updating data using graphQL
- utilising utility functions from the app
- using plugin events to
  - trigger validation in the host page
  - save data when the host page is saving
- store data which is specific to the plugin

Stock Donor example fetched data for all of the columns with [StateLoader component](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorColumn.tsx#L26-L30), which expects StockRowFragment array so that only pluginData for those rows is queried, and then [shares](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorColumn.tsx#L34) this data using [zustand state](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorColumn.tsx#L15-L22), [columns can then be populated](https://github.com/andreievg/open-msupply-plugins-andrei/blob/433e662e4b69a947681e437e66b5ea957e8d8042/frontend/latest/src/StockDonor/StockDonorColumn.tsx#L42-L44) based on the StockRowFragment id they belong to

TODO about column order

### Things to note

When plugins are running in 'production' mode, the standard react contexts are not available. The package `react-singleton-context` is used instead of the standard react context in order to share the context across the two app environments. It requires the use of proxy providers:

- ThemeProviderProxy
- QueryClientProviderProxy

which are storing the provider state locally and providing that to an instance of the Provider which the child components are then accessing.

When using private repository submodule you will have to be logged in as the user with adequate permissions to the repository.

When removing submodule, you will need to delete `.gitmodules` file, the plugin folder and git cache for submodule, for example:

```bash
rm -rf .gitmodules
rm -rf client/packages/plugins/myPluginBundle/
rm -rf .git/modules/client/packages/plugins/myPluginBundle/
```

### Compatibility/versioning

TODO explain why the folder structure is the way it is, that versioning will be linked to min version of omSupply, and when making new version previous version is copied from latest to say `2_6` (when `2_7` is the new version with feature added to API that plugin uses). And then we can checkout older version of omSupply, with current version of plugin, and only load `2_6` with exclude and include in [getLocalPlugin.js](https://github.com/msupply-foundation/open-msupply/blob/73289fc25807543f164900020d284e9f6b2a6697/client/packages/host/getLocalPlugins.js#L11-L12)

### Adding new plugin interface

There is this video that shows extending front end plugins https://drive.google.com/file/d/1kEEvJ9Pk6wpQGpBfKP1z2UmCw5EwztzV/view?usp=drive_link
And this commit in the fork of plugins: https://drive.google.com/file/d/1kEEvJ9Pk6wpQGpBfKP1z2UmCw5EwztzV/view?usp=drive_link and this commit in front end: https://github.com/msupply-foundation/open-msupply/commit/86b6447eb970a32cd7d4e7d8f178a34619dffa71, although front end fails compilation and has a lot of extra changes relocating API types.

TODO explain more about extending front end interface

TODO make video and explanation about back end plugin interface extension

# Backend plugins

This video touches a little bit on backend plugins: https://drive.google.com/file/d/1JnmPU9hRaQD4R1hTDKbbNj78FnM2l00A/view?usp=drive_link

TODO full description about backend plugins

### More about bundling

TODO more about how bundle should be used in production

### Signing

TOD When signing is re-instated talk about the process
