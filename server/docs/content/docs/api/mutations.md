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

<ins>Errors</ins>

* [Customer Invoice Common](/docs/api/custom-errors/#customer-invoice-common)
* [Customer Invoice Insert](/docs/api/custom-errors/#customer-invoice-insert)
* [Customer Invoice Line Common](/docs/api/custom-errors/#customer-invoice-line-common)
* [Customer Invoice Line Insert](/docs/api/custom-errors/#customer-invoice-line-insert)

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

{TODO we can expand this query to also have `deletedInvoiceLines`, `partialInvoiceLines`, if and when needed}

<ins>Errors</ins>

* [Customer Invoice Common](/docs/api/custom-errors/#customer-invoice-common)
* [Customer Invoice Update](/docs/api/custom-errors/#customer-invoice-common)
* [Customer Invoice Line Common](/docs/api/custom-errors/#customer-invoice-line-common)
* [Customer Invoice Line Insert](/docs/api/custom-errors/#customer-invoice-line-insert)

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>allInvoiceLines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `CUSTOMER_INVOICE`
`store_id` to be set as current logged in store in session

</details>

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

<ins>Errors</ins>
* [Customer Invoice Line Common](/docs/api/custom-errors/#customer-invoice-line-common)
* [Customer Invoice Line Insert](/docs/api/custom-errors/#customer-invoice-line-insert)

#### Customer Invoice Line Update

If **id** is specified, it's deemed an update and the following shape needs to be satisfied

```TypeScript
type InsertCustomerInvoiceLineInput = {
    id: string
    itemId?: string,
    stockLineId?: string,
    numberOfPacks: number
}
```

<ins>Errors</ins>
* [Customer Invoice Line Common](/docs/api/custom-errors/#customer-invoice-line-common)

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice_line`

All fields are translated directly to snake case equivalent.

`invoice_id` set as id of parent

`stock_line` links on `stock_line.id` -> `invoice_line.stock_line_id`

`item_name`, `pack_size`, `cost_price_per_pack`, `sell_price_per_pack`, `batch`, `expiry_date` to be populated from `stock_line`, when `stock_line_id` changes

Validation of reduction to be checked against each `stock_line`, and reduction applied to `stock_line`. As per [InvoiceStatus](/docs/api/types/#enum-invoicestatus)

</details>

