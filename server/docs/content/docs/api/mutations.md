+++
title = "Mutations"
description = "Description of all GraphQL mutations available"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 4
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

Multiple mutations in a single request are supported and each mutation will be run sequentially, in the order they were specified. If any mutation results in an error, previous mutations will not rollback and any remaining mutations will not be run. Only a single error will be returned.

For full list of errors see [custom error section](/docs/api/custom_errors)

## Customer Invoice

#### Customer Invoice Insert

```graphql
query {
    insertCustomerInvoice(input: InsertCustomerInvoiceInput): Invoice
}

type InsertCustomerInvoiceInput {
    otherPartyId: String!
    status: InvoiceStatus!
    comment: String
    theirReference: String
    lines: [InsertCustomerInvoiceLineInput]
}

type InsertCustomerInvoiceLineInput {
    clientId: String
    id: String
    itemId: String
    stockLineId: String
    # GraphQL Validation >= 0
    numberOfPacks: Number
}
```

[InsertCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-insert)

#### Customer Invoice Update


```graphql
query {
    updateCustomerInvoice(input: UpdateCustomerInvoiceInput): Invoice
}

type UpdateCustomerInvoiceInput {
    id: String!
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    lines: [UpsertCustomerInvoiceLineInput]
}

# Intersection of InsertCustomerInvoiceLineInput or UpdateCustomerInvoiceLineInput
type UpsertCustomerInvoiceLineInput {
    clientId: String
    id: String
    itemId: String
    stockLineId: String
    numberOfPacks: Number
}
```

[InsertCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-insert)
[UpdateCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-update)

Invoice lines that previously existed but are missing in `lines` list will be deleted. 

{TODO we can expand this query to also have `deletedLines`, `partialLines`, if and when needed}

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>lines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `CUSTOMER_INVOICE`
`store_id` to be set as current logged in store in session

On Insertion `entry_datetime` is set.

On status change the datetime fields are set:
- `confirm_datetime` is set when the status is changed to `confirmed`
- `finalised_datetime` is set when the status is changed to `finalised`

</details>
&nbsp;

## Customer Invoice Line

Customer invoice lines are always linked to an invoice, and are mutated via [Custom Invoice](/docs/api/mutations/#customer-invoice) mutations.

#### Customer Invoice Line Insert

```GraphQL
type InsertCustomerInvoiceLineInput {
    clientId: String
    itemId: String!
    stockLineId: String!
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```

#### Customer Invoice Line Update

```GraphQL
type UpdateCustomerInvoiceLineInput {
    clientId: String
    id: String!
    itemId: String
    stockLineId: String
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```

#### Customer Invoice Line Upsert

`UpsertCustomerInvoiceLineInput` is an intersection of `InsertCustomerInvoiceLineInput` and `UpdateCustomerInvoiceLineInput`, the type is narrowed down by checking presence of value in **id** field

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice_line`

All fields are translated directly to snake case equivalent.

`invoice_id` set as id of parent 

`stock_line` links on `stock_line.id` -> `invoice_line.stock_line_id`

`item` links on `item.id` -> `invoice_line.item_id`

`item_name` to be populated from related item when item changes

`pack_size`, `cost_price_per_pack`, `sell_price_per_pack`, `batch`, `expiry_date` to be populated from `stock_line`, when `stock_line_id` changes

Invoice lines are delete if they are missing in mutation but are present in database, in which case we have to make sure to adjust `stock_line` accordingly.

Validation of reduction to be checked against each `stock_line`, and reduction applied to `stock_line`. As per [InvoiceStatus implementation details](/docs/api/types/#enum-invoicestatus)

`clientId` is only used in error responses

</details>
&nbsp;

## Supplier Invoice

### Supplier Invoice Insert

```graphql
query {
    insertSupplierInvoice(input: InsertSupplierInvoiceInput): Invoice
}

type InsertSupplierInvoiceInput {
    otherPartyId: String!
    status: InvoiceStatus!
    comment: String
    theirReference: String
    lines: [InsertSupplierInvoiceLineInput]
}

type InsertSupplierInvoiceLineInput {
    clientId: String
    itemId: String!
    # GraphQL Validation > 0
    packSize: Number!
    batch: String
    # GraphQL Validation >= 0
    sellPricePerPack: Float!
    # GraphQL Validation >= 0
    costPricePerPack: Float!
    expiryDate: Date 
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```

[InsertSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-insert)

### Supplier Invoice Update

```graphql
query {
    updateSupplierInvoice(input: UpdateSupplierInvoiceInput): Invoice
}

type UpdateSupplierInvoiceInput {
    id: String
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    lines: [UpsertSupplierInvoiceLineInput]
}

# Intersection of InsertSupplierInvoiceLineInput or UpdateSupplierInvoiceLineInput
type UpsertSupplierInvoiceLineInput {
    clientId: String
    id: String
    itemId: String
    # GraphQL Validation > 0
    packSize: Number
    batch: String
    # GraphQL Validation >= 0
    sellPricePerPack: Float
    # GraphQL Validation >= 0
    costPricePerPack: Float
    expiryDate: Date 
    # GraphQL Validation >= 0
    numberOfPacks: Number
}
```

[InsertSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-insert)
[UpdateSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-update)

_{TODO we can expand this query to also have `deletedInvoiceLines`, `partialInvoiceLines`, if and when needed}_           

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>allInvoiceLines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `SUPPLIER_INVOICE`
`store_id` to be set as current logged in store in session _{TODO can this be broken, if user is switched, and goes to an existing tab and looks at another invoice?}_

On status change the datetime fields are set:
- `confirm_datetime` is set when the status is changed to `confirmed`
- `finalised_datetime` is set when the status is changed to `finalised`

</details>

## Supplier Invoice Line

Supplier invoice lines are always linked to an invoice, and are mutated via [Supplier Invoice](/docs/api/mutations/#supplier-invoice) mutations.

#### Supplier Invoice Line Insert

```GraphQL
type InsertSupplierInvoiceLineInput = {
    clientId: String
    itemId: String!
    # GraphQL Validation > 0
    packSize: Number!
    batch: String,
    # GraphQL Validation >= 0
    sellPricePerPack: Float!
    # GraphQL Validation >= 0
    costPricePerPack: Float!
    expiryDate: Date 
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```       

#### Supplier Invoice Line Update

```GraphQL
type UpdateSupplierInvoiceLineInput = {
    clientId: String
    id: String!
    itemId: String
    # GraphQL Validation > 0
    packSize: Number
    batch: String,
    # GraphQL Validation >= 0
    sellPricePerPack: Float
    # GraphQL Validation >= 0
    costPricePerPack: Float
    expiryDate: Date
    # GraphQL Validation >= 0
    numberOfPacks: Number
}
```

#### Supplier Invoice Line Upsert

`UpsertSupplierInvoiceLineInput` is an intersection of `InsertSupplierInvoiceLineInput` and `UpdateSupplierInvoiceLineInput`, the type is narrowed down by checking presence of value in **id** field

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice_line`

All fields are translated directly to snake case equivalent.

`invoice_id` set as id of parent

`stock_line` links on `stock_line.id` -> `invoice_line.stock_line_id`

`item` links on `item.id` -> `invoice_line.item_id`

`item_name` to be populated from related item when item changes

Stock line is created when invoice changes to `CONFIRMED` as per [InvoiceStatus implementation details](/docs/api/types/#enum-invoicestatus)

`stock_line`.`store_id` is set to currently logged in store 

During confirmation and any further subsequent change will result in:

* invoice_line.`number_of_pack` -> stock_line.`available_number_of_packs`, `total_number_of_packs`
* invoice_line.`pack_size`, `batch`, `expiry`, `sell_price_per_pack`, `cost_price_per_pack`, `item_id` -> to stock_line fields with the same name

When stock in supplier invoice is reserved by another invoice, `invoice_line` becomes not editable.

Invoice lines are delete if they are missing in mutation but are present in database, in which case we have to make sure to delete associated `stock_line`

`clientId` is only used in error responses

</details>
