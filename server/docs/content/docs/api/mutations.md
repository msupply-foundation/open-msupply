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

Mutations will happen sequentially if batched, an error will result in cancellation of mutation batch in which it originated and further mutation in the sequence will be discarded (but batched mutation prior to erroneous one would have been executed).

For full list of errors see [custom error section](/docs/api/custom_errors)

## CUSTOMER INVOICE

```graphql
query {
    upsertCustomerInvoice(input: UpsertCustomerInvoiceInput): Invoice
}

type UpsertCustomerInvoiceInput {
    id: String
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    allInvoiceLines: [UpsertCustomerInvoiceLineInput]
}

type UpsertCustomerInvoiceLineInput {
    id: String
    itemId: String
    stockLineId: String
    numberOfPacks: Number
}
```

Beyond graphQL type validation of above schema, further validations will apply, they are different for an insert or update request:

#### Customer Invoice Insert

If **id** is missing, it's deemed an insertion and the following shape needs to be satisfied

```TypeScript
type InsertCustomerInvoiceInput = {
    otherPartyId: string,
    comment?: string,
    status?: InvoiceStatus,
    theirFerefence?: string,
    allInvoiceLines?: InsertCustomerInvoiceLineInput[]
}
```

As you can see an insert invoice mutation requires all invoice lines to be of [InsertCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-insert) type, whereas in update invoice mutation invoice lines can be upserted.


#### Customer Invoice Update

If **id** is specified, it's deemed an update and the following shape needs to be satisfied

```TypeScript
type InsertCustomerInvoiceInput = {
    id: string
    otherPartyId?: string,
    comment?: string,
    status?: InvoiceStatus,
    theirFerefence?: string,
    allInvoiceLines?: UpsertCustomerInvoiceLineInput[]
}
```

Invoice lines that previously existed but are missing in `allInvoiceLines` list will be deleted. `UpsertCustomerInvoiceLineInput` can either be of [InsertCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-insert) or [UpdateCustomerInvoiceLineInput](/docs/api/mutations/#customer-invoice-line-update). See below

_{TODO we can expand this query to also have `deletedInvoiceLines`, `partialInvoiceLines`, if and when needed}_

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>allInvoiceLines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `CUSTOMER_INVOICE`
`store_id` to be set as current logged in store in session

On status change `confirm_datetime`, `entry_datetime`, and `finalised_datetime` should be changed

</details>
&nbsp;

## CUSTOMER INVOICE LINE

Customer invoice lines are always linked to an invoice, and are mutated via [upsertCustomerInvoice](/docs/api/mutations/#customer-invoice).

#### Customer Invoice Line Insert

If **id** is missing, it's deemed an insertion and the following shape needs to be satisfied

```TypeScript
type InsertCustomerInvoiceLineInput = {
    itemId: string,
    stockLineId: string,
    numberOfPacks: number
}
```

#### Customer Invoice Line Update

If **id** is specified, it's deemed an update and the following shape needs to be satisfied

```TypeScript
type UpdateCustomerInvoiceLineInput = {
    id: string
    itemId?: string,
    stockLineId?: string,
    numberOfPacks: number
}
```

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice_line`

All fields are translated directly to snake case equivalent.

`invoice_id` set as id of parent 

`stock_line` links on `stock_line.id` -> `invoice_line.stock_line_id`

`item` links on `item.id` -> `invoice_line.item_id`

`item_name` to be populated from related item when item changes

`pack_size`, `cost_price_per_pack`, `sell_price_per_pack`, `batch`, `expiry_date` to be populated from `stock_line`, when `stock_line_id` changes

Validation of reduction to be checked against each `stock_line`, and reduction applied to `stock_line`. As per [InvoiceStatus implementation details](/docs/api/types/#enum-invoicestatus)

</details>
&nbsp;

## SUPPLIER INVOICE

```graphql
query {
    upsertSupplierInvoice(input: UpsertSupplierInvoiceInput): Invoice
}

type UpsertSupplierInvoiceInput {
    id: String
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    allInvoiceLines: [UpsertSupplierInvoiceLineInput]
}

type UpsertSupplierInvoiceLineInput {
    id: String
    itemId: String
    packSize: Number
    batch: String
    sellPricePerPack: Float
    costPricePerPack: Float
    expiryDate: Date 
    numberOfPacks: Number
}
```

Beyond graphQL type validation of above schema, further validations will apply, they are different for an insert or update request:

#### Supplier Invoice Insert

If **id** is missing, it's deemed an insertion and the following shape needs to be satisfied

```TypeScript
type SupplierCustomerInvoiceInput = {
    otherPartyId: string,
    comment?: string,
    status?: InvoiceStatus,
    theirFerefence?: string,
    allInvoiceLines?: InsertSupplierInvoiceLineInput[]
}
```

As you can see an insert invoice mutation requires all invoice lines to be of [InsertSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-insert) type, whereas in update invoice mutation invoice lines can be upserted.

#### Supplier Invoice Update

If **id** is specified, it's deemed an update and the following shape needs to be satisfied

```TypeScript
type InsertSupplierInvoiceInput = {
    id: string
    otherPartyId?: string,
    comment?: string,
    status?: InvoiceStatus,
    theirFerefence?: string,
    allInvoiceLines?: UpsertSupplierInvoiceLineInput[]
}
```

Invoice lines that previously existed but are missing in `allInvoiceLines` list will be deleted. `UpsertCustomerInvoiceLineInput` can either be of [InsertSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-insert) or [UpdateSupplierInvoiceLineInput](/docs/api/mutations/#supplier-invoice-line-update). See below

_{TODO we can expand this query to also have `deletedInvoiceLines`, `partialInvoiceLines`, if and when needed}_           

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>allInvoiceLines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `SUPPLIER_INVOICE`
`store_id` to be set as current logged in store in session _{TODO can this be broken, if user is switched, and goes to an existing tab and looks at another invoice?}_

</details>
&nbsp;
## SUPPLIER INVOICE LINE

Supplier invoice lines are always linked to an invoice, and are mutated via [upsertSupplierInvoice](/docs/api/mutations/#supplier-invoice).

#### Supplier Invoice Line Insert

If **id** is missing, it's deemed an insertion and the following shape needs to be satisfied

```TypeScript
type InsertSupplierInvoiceLineInput = {
    itemId: string,
    packSize: number,
    batch: string,
    sellPricePerPack: number,
    costPricePerPack: number
    expiryDate: date | null, 
    numberOfPacks: number
    // TODO should we have defaults ?
}
```       

#### Supplier Invoice Line Update

If **id** is specified, it's deemed an update and the following shape needs to be satisfied

```TypeScript
type InsertCustomerInvoiceLineInput = {
    id: string
    itemId?: string,
    packSize?: number,
    batch?: string,
    sellPricePerPack?: number,
    costPricePerPack?: number
    expiryDate?: date | null, 
    numberOfPacks?: number
}
```

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


</details>

