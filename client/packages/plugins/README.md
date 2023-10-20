# Client plugin framework

Plugins are a way of extending front end functionality without altering the base code. Some examples of possible plugin usages:
- Adding a button to a toolbar of a detail view, which is provided with details of the object being viewed (such as `id`) and performs an external action like looking up shipping details from an external API
- Adding a new widget to the dashboard
- Adding a column to a list view for particular objects, and adding editing support for that new field

Plugins are written as [react](https://react.dev/) components and compiled to distributable packages. These are copied to the server and then are available to all clients using that server.

A plugin can interact with the app framework, access language translations, call the data API or use the current theme. 

For example, a plugin can use shared UI components and utility functions from the app framework.

## Plugin structure

When the app is loaded, all available plugins are read (the process differs slightly between development and production mode, see more below), validated and stored within a plugin provider.

A component of the site can query the provider for any plugins which are applicable for the component's environment (e.g. any plugins which relate to the Inbound Shipment detail view page) and render them. When rendered, the plugins are passed the data object associated with the type of plugin (for the Inbound Shipment detail view plugin, this is the draft Inbound Shipment object).

Plugins and standard site components can both interact using events. The plugin provider has methods to register & remove an event listener and to dispatch an event.

When running in development mode, the required plugin files are loaded directly from disk. HMR / fast reload is available and the plugins have access to the full application context. All plugins are available in the PluginProvider - with no need to fetch additional files or components.

Webpack module federation is used to bundle and serve the plugins when running in development mode.

In production mode the process differs

- the server provides an endpoint to fetch the list of available plugins
- the client app fetches the full list on startup and populates the PluginProvider
- this fetches only the plugin definitions. When a plugin is rendered for the first time, the component is fetched from the server and cached in the PluginProvider.

### Plugin validation

See the readme on plugin validation for details of how to sign plugins and the process of loading and validating plugins.

### Plugin definitions

Each plugin is defined in a `plugin.json` file which has the following structure

```
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


The components array lists all of the components exported by the plugin, the columns array lists all of the columns. The `name` property must match the name of the directory, as this is used to link the exported js file.

### Types of plugin

There are two types of plugin:
**ColumnPlugin**

The column plugin exports a `ColumnDefinition` for the given data type.
This is defined in the plugin provider by the following object shape:

```
  type: ColumnPluginType;
  column: () => Promise<ColumnDefinition<T>>;
  module: string;
  pluginName: string;
```

**ComponentPlugin**
A component plugin exports a react component for the given data type. 
This is defined in the plugin provider by the following object shape:


```
  type: ComponentPluginType;
  component: () => Promise<PluginModule<T>>;
  module: string;
  localModule?: string;
  pluginName: string;

```

There is a difference in behaviour when the app is running in development or production mode. See the **Development process** section for more on this.
A `PluginProvider` stores a list of available plugins. A component within the app can ****


### Events

To register for an event use the `usePluginEvents` hook.

```
  const { addEventListener, removeEventListener, dispatchEvent } = usePluginEvents();

...

   useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onSaveStockEditForm', // see the event types for available options
      listener: onSave, // provide a method here with no parameters
    };
    addEventListener(listener);

    return () => removeEventListener(listener); // remove the event listener when the component is unmounted
  }, [onSave, addEventListener, removeEventListener]);

```


### Plugin data

Plugins can store data in the `plugin_data` table. The following methods are available in the graphQL API for interacting with plugin data:

- `pluginData`
- `insertPluginData`
- `updatePluginData`

The querying and mutating of data follows the standard pattern used throughout open mSupply:

```
  const { data } = usePluginData.data(stockLine?.id ?? '');
  const { mutate } = data?.id ? usePluginData.update() : usePluginData.insert();
```


## Creating a plugin

The simplest way to begin is by copying one of the examples from the branch `feature/front-end-plugins-example`. There are three in this branch currently:

**ShippingStatus**
This adds a simple toolbar button to the detail view of inbound shipments. The plugin demonstrates:
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

```
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

### Things to note

When plugins are running in 'production' mode, the standard react contexts are not available. The package `react-singleton-context` is used instead of the standard react context in order to share the context across the two app environments in this case. It requires the use of proxy providers for example:

- ThemeProviderProxy
- QueryClientProviderProxy

which are storing the provider state locally and providing that to an instance of the Provider which the child components are then accessing.
