# Data Table implementation — Developer guide

The new implementation of front-end **Data Tables** uses the [**Material React Table**](https://www.material-react-table.com/) library, which is Material-UI wrapper around [**Tanstack Table**](https://tanstack.com/table/latest) — **Tanstack Table** provides a powerful (though headless) table framework, and **Material React Table** provides Material UI components to work with it.

Both those libraries are very well-documented, so you are encouraged to read and understand the relevant areas if you need to make any changes to our implementations.

These new tables provide much-expanded functionality for the user as well as making implementation and configuration simpler and more powerful for developers. New functionality (for the user) includes:
- 🚀 Much better **performance**, even with tables that have thousands of rows
- 🔍 Built-in **filtering** and **sorting**
- ↔️ Variable table **density**
- 📐 User-controlled **column widths** and **column order**
- 📌 User-controlled **"pinned" columns**
- 💾 Reliable persistence (via local storage) of *all* user customisations, with reset capability.

Using Material React Table, we've created some abstractions that allow developers to easily implement tables using a standardised pattern, with minimal boilerplate and a UI consistent with the existing app.

There are three main types of tables used throughout OMS, and we've created a different hook to implement each one:

### Paginated tables

These are tables that fetch a single **page** of data at a time, and therefore every change to the sorting or filtering requires an additional query to the server.

The hook for this type of table is `usePaginatedMaterialTable`

### Non-paginated tables

These are tables that fetch the *full* data set in one query, and so all filtering/sorting is done in the front-end by the table library itself.

The hook for this type of table is `useNonPaginatedMaterialTable`

### "Simple" tables

These are the tables used in the "Line Edit" views -- i.e. one line per batch, with inputs for stock allocation. They only have a handful of rows, so don't require any filtering/sorting UI and don't interact with the URL Query.

The hook for this type of table is `useSimpleMaterialTable`

These hooks are just wrappers around MRT's standard `useMaterialReactTable` hook, but with a lot of settings pre-defined with appropriate defaults for the given context. Note that *any* pre-defined value can still be overridden with explicit props.

## Usage

> [!TIP]
> For a reference implementation example, please check out **Outbound Shipments**' `ListView`, `DetailView` and `OutboundLineEditTable` components for a version of each of these table types. This is the "OG" implementation of the new table library, so always refer to that if you're unsure how to do something, and branch out from those examples if new functionality is needed.

All code related to these table implementations can be found in:

```
client/packages/common/src/ui/layout/tables/material-react-table
```

And all elements can be imported using the `@open-msupply/common` package.

The basic implementation for a table is to use the hook to generate the `table` object (and `selectedRows` array), which is then passed to the `MaterialTable` component (and `Footer` if required):

```tsx
const { table, selectedRows } =
    useNonPaginatedMaterialTable<StockOutLineFragment>({
        tableId: 'outbound-shipment-detail-view',
        columns,
        data,
        ...otherProperties
        ),
    });


return <>
        <MaterialTable table={table} />
        // ...Other JSX
        <Footer selectedRows={selectedRows} {...otherFooterProps}>
    </>
```

> [!NOTE]
> - Usage is the same for all three hooks
> - The hook call is **typed** with a generic parameter, which should correspond to the type of the data **row**s

### Input props

**Required**:
- `tableId`: Must be unique throughout the whole app — this is used as part of the data key when the table config is saved to local storage
- `columns`: Column definitions, as described [below](#column-definitions)
- `data`: `T[] | undefined` The data to display, as an array of objects which correspond to rows in the table

**Optional**: 
- `onRowClick`: `(row: T) => void` Callback to execute when table rows are clicked
- `isLoading`: `boolean` Loading state of the data, will be reflected in table as a "Loading" spinner
- `initialSort`: `{ key: string; dir: 'asc' | 'desc' }` Field to sort data by initially, as per the `UrlQuerySort` type in `useUrlQueryParams`
- `getIsPlaceholderRow`: `(row: T) => boolean` Tester function to determine if a row should be formatted as a **placeholder** 
- `getIsRestrictedRow`: `(row: T) => boolean` Tester function to determine if a row should be `disabled` — i.e. greyed out and unable to be clicked
- `groupByField`: `string` field (property on row type) to be used for matching when "Grouping" is enabled
- `noDataElement`: `React.ReactNode` JSX to display when there is no data to display in the table. Defaults to a generic "Nothing to display" icon and message

The above should be sufficient for most implementations, but all of the Material React Table options are available to use if needed: https://www.material-react-table.com/docs/api/table-options


## Column definitions

The **column definitions** form the backbone of the table configuration, where we describe what data to display in each column, how to access it, how to filter it, and how users are allowed to interact with the column (plus a lot more!).

Here is a small example:

```tsx
const columns = useMemo(() => {
    return [
        {
            accessorKey: 'item.code',
            header: t('label.code'),
            size: 120,
            pin: 'left',
            enableColumnFilter: true,
            enableSorting: true,
        },
        {
            accessorKey: 'itemName',
            header: t('label.name'),
            size: 400,
            enableColumnFilter: true,
            enableSorting: true,
        },
        {
            id: 'expiryDate',
            // expiryDate is a string - use accessorFn to convert to Date object for sort and filtering
            accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
            header: t('label.expiry-date'),
            columnType: ColumnType.Date,
            defaultHideOnMobile: true,
            enableColumnFilter: true,
            enableSorting: true,
        },
        {
            id: 'itemUnit',
            accessorKey: 'item.unitName',
            header: t('label.unit-name'),
            filterVariant: 'select',
            defaultHideOnMobile: true,
        },
        {
            accessorKey: 'packSize',
            header: t('label.pack-size'),
            columnType: ColumnType.Number,
            enableSorting: true,
        },
        {
            id: 'numberOfPacks',
            header: t('label.pack-quantity'),
            columnType: ColumnType.Number,
            accessorFn: row => {
                if ('subRows' in row)
                return ArrayUtils.getSum(row.subRows ?? [], 'numberOfPacks');

                return row.numberOfPacks;
            },
        },
        {
            id: 'unitSellPrice',
            header: t('label.unit-sell-price'),
            columnType: ColumnType.Currency,
            defaultHideOnMobile: true,
            accessorFn: rowData => {
                if ('subRows' in rowData) {
                return ArrayUtils.getAveragePrice(
                    rowData.subRows ?? [],
                    'sellPricePerPack'
                );
                } else {
                if (isDefaultPlaceholderRow(rowData)) return undefined;
                return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
                }
            },
        },
]
}, [manageVvmStatusForStock, manageVaccinesInDoses]);
```

> [!IMPORTANT]
> Column definitions should *always* be wrapped in `useMemo` to reduce unnecessary re-renders. This is recommended by Material React Table ([docs](https://www.material-react-table.com/docs/guides/memoization#memoize-columns))

### Properties

#### Required

A column must have at least an `accessorKey` *or* `accessorFn`, and a `header`.

The `accessorKey` is a simple string representing the path to the required data from each data row — it can be a base property such as `itemName` or a nested path such as `item.code`

If you require a more complex way of extracting the required data, provide an `accessorFn` instead — see the `numberOfPacks` example above.

If you use an `accessorFn`, you must also provide an `id` — a unique identifier for the column. (This is not necessary with an `accessorKey`, as the `accessorKey` also serves as a unique id.)

The `header` is simply the string to display as the header row of the column.

> [!TIP]
> If you want a column header to be blank, don't set the `header` string to `""`, as that will also remove the column from the Columns popover menu. Instead, provide an empty React component `() => <></>` to the `Header` property which will be display as the column header and your `header` field will be used in the Columns menu. 

#### Optional

You have access to the full range of [MRT column properties](https://www.material-react-table.com/docs/api/column-options) if required, but most of the time the defaults we've specified in our custom hooks will be adequate. We've also defined a handful of our own "convenience" properties which map to groups of column properties (or more complex versions) internally, or define additional functionality:

- `description`: Short explanation of the column. Displays in the Column context menu (three dots), and is useful to expand on the column header, which should be kept as concise as possible.
- `columnType`: `ColumnType enum` A shorthand property that maps to all the MRT properties required to properly display a certain data type. Default is `string`, but valid variants (as of 26/09/2025) are:
  - `ColumnType.String`
  - `ColumnType.Number` — renders a `NumericTextDisplay` component, right-aligned
  - `ColumnType.Date` — handles conversion between ISO string and Date objects, and specifies correct filter mapping for Dates
  - `ColumnType.Currency` — renders a `CurrencyValueCell`, which formats numbers as locale-specific currency values
  - `ColumnType.Comment` — renders a `PopoverCell` that displays the cell value in a column of negligible width
- `pin`: `"left" | "right"` Loads the table with the column "pinned" (i.e. it's frozen while other columns scroll sideways) to the left or the right of the table. The user can change the "pinned" settings, so this just specifies the initial state.
- `align`: `"left" | "center" | "right"` Align the value within the cell. 
- `includeColumn`: `boolean` Can set this to `false` in order to hide certain columns under certain conditions (e.g. "VVM Status" only appears if applicable permissions are enabled). Because this is a dynamic value, we'd expect an *expression* here rather than a literal `true`/`false` (otherwise you would just not define the column), so make sure any referenced variables are included in the `useMemo` dependency array.
- `defaultHideOnMobile`: `boolean` When the "Simplified Mobile UI" preference is enabled, this column will be hidden by default on smaller devices, but the user can manually show it via the Columns menu.

> [!CAUTION]
> Don't create new `ColumnType` variants unless it will always return a consistent set of MRT Column properties, and will be re-used throughout the app. Most of the time, you can just specify a custom `Cell` (see [below](#custom-cell-components)).


#### Filtering & Sorting

Filtering and sorting for each column is **OFF** by default, so you have to explicitly enable them using the `enableColumnFilter` and `enableSorting` props. The reason for this decision is that (for paginated tables), the GraphQL endpoint needs to have filters and sort fields specifically implemented, and we didn't want it to be possible for a column to have a filter/sort UI without being sure the functionality is available in the API.

By default, enabled filters are treated as `string` values, so if another filter type is required it needs to be specified in the `filterVariant` field. MRT has [several different filters](https://www.material-react-table.com/docs/guides/column-filtering#filter-variants) available, but we have currently restricted these. This is because we store the filter state in the URL query, so we have had to write parsers and stringifiers to map between the internal filter state and the URL query string, and we're only adding these as required. So for now, the following `filterVariant`s (defined in `useTableFiltering.ts`) are available (as of 26/09/2025):
- `date-range`
- `select`
- `text` (the default) 

##### The `select` filter

The `select` filter renders a drop-down menu. The values available can be defined explicitly using the `filterSelectOptions` property — an array of objects with a `value` and `label` (the display string), such as the **Invoice Status** options:
```ts
filterSelectOptions: [
    { value: InvoiceNodeStatus.New, label: t('label.new') },
    { value: InvoiceNodeStatus.Allocated, label: t('label.allocated') },
    { value: InvoiceNodeStatus.Picked, label: t('label.picked') },
    { value: InvoiceNodeStatus.Shipped, label: t('label.shipped') },
    { value: InvoiceNodeStatus.Delivered, label: t('label.delivered') },
    { value: InvoiceNodeStatus.Received, label: t('label.received') },
    { value: InvoiceNodeStatus.Verified, label: t('label.verified') },
]
```

However, the `select` options can be *automatically* generated using MRT's [Faceted Values](https://www.material-react-table.com/docs/guides/column-filtering#faceted-values-for-filter-variants), where the options are generated directly from the available data. A good example of this is the "Unit Name" field of the Outbound Shipment "Detail" view. To use this feature, just specify `filterVariant: "select"` with *no* `filterSelectOptions` defined.

> [!WARNING]
> Faceted values should only be used with *non-paginated* tables, as the component requires access to *all* data to generate a complete list of available options.


#### Custom Cell components

Several types of table data require special renderers to display correctly. Some of these have been mentioned [above](#optional) and are automatically applied using the `columnType` property (such as "Date" and "Currency").

However, you can specify the exact component to use via the `Cell` prop. You can either define your React component inline, or refer to one of the pre-existing "Cell" components we've started creating in the `/components` subfolder of the `material-react-table` folder. If you're defining a component that is likely to be re-used elsewhere, please add it to this components library. (As we migrate from the old tables, *all* the old table cell components should be migrated over to these Cell components.)

A `Cell` component can have access to the current row/column/value data (see full API [here](https://www.material-react-table.com/docs/guides/data-columns#custom-cell-render)), so if your component needs these values as props, instead of just doing:
```ts
Cell: NameAndColorSetterCell
```
you can define it like this:
```tsx
Cell: ({ row }) => (
    <NameAndColorSetterCell
    onColorChange={onUpdate}
    getIsDisabled={isOutboundDisabled}
    row={row.original}
    />
),
```        

> [!TIP]
> To make a table **editable**, you just need to render a cell that has an event handler that calls your data update method (whether it's updating the `draft` state, or running an actual mutation directly). See the `NumberInputCell` example in the Outbound Shipment line allocation table.

## Grouped rows

For now, we have simply replicated the existing "Grouped Rows" functionality, which is mostly used to "Group by Item" in the Detail View. For simplicity, we're pre-processing the data rows ourselves, and rows that match on the aforementioned [`groupByField`](#input-props) are combined into a "parent" row with a special `subRows` property, which [MRT can interpret](https://www.material-react-table.com/docs/guides/expanding-sub-rows#enable-expanding-sub-rows) and display accordingly.

The Material React Table library actually has sophisticated [built-in grouping/expansion functionality](https://www.material-react-table.com/docs/examples/expanding-tree), allowing grouping by any user-selected field, which we can use at some point if it becomes desirable. But for now, we thought it added unnecessary complexity to the UI when we really only need limited, specific grouping for our use cases.

## Additional considerations

- Most of our GraphQL **React Query** hooks need to be updated slightly to work nicely with these table elements. The `useQuery` call needs to have the `keepPreviousData` option set to `true`, and the tables `isLoading` flag should use the value from the Query hooks `isFetching` property (rather than `isLoading`). This change ensures that when a paginated table is refetching data (from a filter, sort or pagination change), we don't render the "No Results" component while loading, cos that looks fugly as. Please ensure you make these modifications when replacing an old table with a new one.
- When defining `Cell` components, please don't add any unnecessary styling to whatever "container" you render (and don't render a container at all if you can help it!). For example, any additional `padding` will make the whole table out of whack. Also, please ensure that existing table styles "cascade" through to the cell elements as much as possible — you may need to use the `inherit` value on some properties. For example, the `ExpiryDateCell` renders text in <span style="color: red">red</span> if expired, but it defaults to `inherit` otherwise, which ensures the colour will be the currently active text colour (which could be defined from the theme, or overridden if it's a placeholder row, say). (We've had problems in the past with Placeholder rows not being coloured correctly in some columns, and this is why.)
- We have removed reliance on the `TableStore` provider for tables, as we manage all table state within the new abstractions or in the MRT library itself. The only downside of this is that elements that share table state (such as `Footer`) need to share a common parent. But the good thing about this library is that we can define the `table` instance at a higher level in the component tree (using the table hooks) than the `MaterialTable` component itself, so it can be passed to whichever other components need it — and the `table` instance has [loads of useful methods](https://www.material-react-table.com/docs/api/table-instance-apis) for table data and configuration info if required.
- When migrating a table to this new structure, please look closely at all the associated utilities/helper etc. and remove as much as possible — this new library makes a *lot* of this stuff superfluous.
- Please ensure that this documentation remains up to date as table functionality is tweaked an expanded.

*Last modified: 26/09/2025 — CJS*