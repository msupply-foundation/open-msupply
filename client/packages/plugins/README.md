# Client plugin framework

Plugins are a way of extending front end functionality without altering the base code. Some examples of possible plugin usages:
- Adding a button to a toolbar of a detail view which performs an external action like looking up shipping details from an external API. The plugin is provided with details of the object being viewed (e.g. draft shipment object) and can use that data when performing actions.
- Adding a new widget to the dashboard
- Adding a column to a list view for particular objects, and adding editing support for that new field

Plugins are written as [react](https://react.dev/) components and compiled to distributable packages. These are copied to the server and then are available to all clients using that server.

A plugin can interact with the app framework, access language translations, call the data API or use the current theme. For example, a plugin can use shared UI components and utility functions from the app framework.

Note that the plugins do need to be implemented for a given area of the app - currently a plugin can be created to add a column to a list view, but only the Stock list view has implemented this functionality and is the only area of the site for which this plugin will operate. It is a simple task to support plugins in other areas, however we are only implementing plugin support as required.

For some working examples, see the [plugin repo](https://github.com/msupply-foundation/open-msupply-plugins) which has some examples.

## Plugin structure

When the app is loaded, all available plugins are read (the process differs slightly between development and production mode, see more below), validated and then stored within a centrally accessible plugin provider.

A component of the site can query the provider for any plugins which are applicable for that component's environment (e.g. any plugins which relate to the Inbound Shipment detail view page) and render them. When rendered, the plugins are passed to the data object associated with the type of plugin (for the Inbound Shipment detail view plugin, this is the draft Inbound Shipment object). Errors are handled and a message is shown to the user if the plugin fails to load or render correctly.

Plugins and standard site components can interact with each other using events. The plugin provider has methods to register & remove an event listener and to dispatch an event.

Webpack module federation is used to bundle and serve the plugins.

When running in development mode, the required plugin files are loaded directly from disk. HMR / fast reload is available and the plugins have access to the full application context. All plugins are available in the PluginProvider - with no need to fetch additional files or components.

In production mode the process differs:

- the server provides an endpoint to fetch the list of available plugins
- the client app fetches the full list on startup and populates the PluginProvider
- this fetches only the plugin definitions. When a plugin is rendered for the first time, the component is fetched from the server and cached in the PluginProvider.
- column definitions do not require additional loading, though if the column is using a custom component for rendering, that may require fetching

### Plugin validation

Plugins are signed by the developer and require validation before they are able to be run in production mode - validation is ignored when running in developer mode; an error is logged but the plugin is loaded regardless of validation failures.

See the readme on [plugin validation](../../../server/service/src/plugin/plugin_validation.md) for details of how to sign plugins and the process of loading and validating plugins.

### Plugin definitions

Each plugin is defined in a `plugin.json` file which has the following structure

```json
{
  "name": "StockDonor",
  "version": "1.0.0",
  "components": [
    {
      "type": "StockEditForm",
      "localModule": "StockDonorEditInput",
      "module": "StockDonorEdit"
    }
  ],
  "columns": [
    {
      "type": "Stock",
      "module": "StockDonorColumn"
    }
  ],
  "dependencies": {
    "omSupplyVersion": "8.0.0"
  }
}
```

The following types of plugins are currently supported:

**ColumnPlugin**
- `Stock`

**ComponentPlugin**
- `StockEditForm`
- `Stock`
- `InboundShipmentAppBar`
- `Dashboard`


**Plugin events**
- `onSaveStockEditForm`
- `onChangeStockEditForm`


The components array lists all of the components exported by the plugin, the columns array lists all of the columns. The `name` property must match the name of the directory, as this is used to link the exported js file. See the examples for how this is implemented in the `webpack.config.js` file.

### Types of plugin

There are two types of plugin:
**ColumnPlugin**

The column plugin exports a `ColumnDefinition` for the given data type.
This is defined in the plugin provider by the following object shape:

```typescript
  type: ColumnPluginType;
  column: () => Promise<ColumnDefinition<T>>;
  module: string;
  pluginName: string;
```

**ComponentPlugin**
A component plugin exports a react component for the given data type. 
This is defined in the plugin provider by the following object shape:


```typescript
  type: ComponentPluginType;
  component: () => Promise<PluginModule<T>>;
  module: string;
  localModule?: string;
  pluginName: string;

```

There is a difference in behaviour when the app is running in development or production mode. See the **Plugin structure** section for more on this.
A `PluginProvider` stores a list of available plugins. A component within the app can retrieve a list of applicable plugins by calling the `getComponentPlugins` or `getColumnPlugins` method, passing in the type of plugin required. Even simpler, use the hook provided to fetch components like this:

```typescript
  const pluginButtons = usePluginElements({
    type: 'InboundShipmentAppBar',
    data,
  });
```

which are then rendered directly:

```typescript
{pluginButtons}
```

Similarly, the columns have a hook provided as well:

```typescript
  const pluginColumns = usePluginColumns<StockLineRowFragment>({
    type: 'Stock',
  });
```

```typescript
  const columnDefinitions: ColumnDescription<StockLineRowFragment>[] = [
    [standard column definitions go here],
    ...pluginColumns,
  ];

...

  const columns = useColumns<StockLineRowFragment>(
    columnDefinitions,
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy, pluginColumns]
  );
```


### Events

Events can be used to interact between the app and a plugin.
To register for an event use the `usePluginEvents` hook.

For example, here is how you can call the `onSave` method within a plugin, when the `onSaveStockEditForm` event is dispatched:

```typescript
  const { addEventListener, removeEventListener, dispatchEvent } = usePluginEvents();

...

   useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onSaveStockEditForm', // see the event types for available options
      listener: onSave, // provide a method here with no parameters. This method will be called when plugins dispatch onSaveStockEditFormEvent, see example below
    };
    addEventListener(listener);

    return () => removeEventListener(listener); // remove the event listener when the component is unmounted
  }, [onSave, addEventListener, removeEventListener]);
```

In the above code, the plugin is listening for an `onSave` event within the `StockEditForm` (which has a specific event type of `onSaveStockEditForm`).
When that event is dispatched, the plugin responds by calling its `onSave` method.

The corresponding code in the `StockLineEditModal` looks like this:

```typescript
const { dispatchEvent, addEventListener, removeEventListener } = usePluginEvents();

// and then, the `dispatchEvent` call is added to the save button's onClick method:
onClick={() =>
    getConfirmation({
      onConfirm: async () => {
        await onSave();
        dispatchEvent('onSaveStockEditForm', new Event(draft.id));
        onClose();
      },
    })
  }
```

Events can be dispatched and handled in the other direction too - raised by a plugin, and responded to within the main application.
For example, here is how an edit form can trigger the validation method when the plugin data is changed:

```typescript
  const { dispatchEvent, addEventListener, removeEventListener } = usePluginEvents();

  // then the `onChange` event for the text input is updated, to call the `dispatchEvent` method
  onChange={e => {
    setDonor(e.target.value);
    dispatchEvent('onChangeStockEditForm', new Event(stockLine.id));
  }}
```

The form within the app can listen for events with the following changes:

```typescript
  const { dispatchEvent, addEventListener, removeEventListener } = usePluginEvents();

...

  useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onChangeStockEditForm',
      listener: () => setHasChanged(true) // the plugin is indicating that its data has changed, so this form will need to update its changed status
    };

    addEventListener(listener);

    return () => removeEventListener(listener);
  }, [addEventListener, removeEventListener]);
```

In this example, the `hasChanged` variable is used to enable the `Ok` button, which needs to be enabled when data in the plugin input is changed by the user. The method `setHasChanged` is called to set `hasChanged` to true which enables the button.


### Plugin data

Plugins can store data in the `plugin_data` table. The following methods are available in the graphQL API for interacting with plugin data:

- `pluginData`
- `insertPluginData`
- `updatePluginData`

The querying and mutating of data follows the standard pattern used throughout open mSupply:

```typescript
  const { data } = usePluginData.data(stockLine?.id ?? '');
  const { mutate } = data?.id ? usePluginData.update() : usePluginData.insert();
```

These functions can be implemented within your plugin and used to fetch and update data.


## Creating a plugin

The simplest way to begin is by copying one of the examples from the branch `feature/front-end-plugins-example`. There are three in this branch currently:

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

Create a new directory under the `client/packages/plugins` directory. In this you will need:

- src : containing the source files of the plugin
- plugin.json : which defines the plugin
- webpack.config.js : used for bundling the plugin
- dist : build output, not committed to source control

## Development process 

Create a react component and update webpack.config.js, adding the component files to the `exposes` section:

```json
  plugins: [
    new ModuleFederationPlugin({
      name: 'StockDonor',
      remotes: {},
      exposes: {
        StockDonorEdit: './src/StockDonorEdit.tsx',
        StockDonorEditInput: './src/StockDonorEditInput.tsx',
        StockDonorColumn: './src/StockDonorColumn.tsx',
      },
      shared: {
        ...dependencies,
        react: {
          eager: true,
          singleton: true,
          requiredVersion: dependencies['react'],
        },
        'react-dom': {
          eager: true,
          singleton: true,
          requiredVersion: dependencies['react-dom'],
        },
        'react-singleton-context': { singleton: true, eager: true },
      },
    }),
```

In development mode simply run as usual (`yarn start` or `yarn start-local`) and webpack will read any plugin files from the `client/packages/plugins` directly and include them in the bundled javascript.

When you are ready, run `yarn build-plugins` from the `./client` directory. This will compile and bundle all of the plugins. The contents of the `./client/packages/plugins/[your plugin name]/dist` folder can then be copied to the `./server/app_data/plugins/[your plugin name]` - available to be read by the server.

The server will read all folders under `./server/app_data/plugins` and for any folders that have a `plugin.json` file, will make that plugin available in the list.

### Things to note

When plugins are running in 'production' mode, the standard react contexts are not available. The package `react-singleton-context` is used instead of the standard react context in order to share the context across the two app environments. It requires the use of proxy providers:

- ThemeProviderProxy
- QueryClientProviderProxy

which are storing the provider state locally and providing that to an instance of the Provider which the child components are then accessing.
