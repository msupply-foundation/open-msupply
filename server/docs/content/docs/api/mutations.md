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

## Outbound Shipment

#### Outbound Shipment Insert

```graphql
query {
    insertOutboundShipment(input: InsertOutboundShipmentInput): Invoice
}

type InsertOutboundShipmentInput {
    otherPartyId: String!
    status: InvoiceStatus!
    comment: String
    theirReference: String
    lines: [InsertOutboundShipmentLineInput]
}

type InsertOutboundShipmentLineInput {
    clientId: String
    id: String
    itemId: String
    stockLineId: String
    # GraphQL Validation >= 0
    numberOfPacks: Number
}
```

[InsertOutboundShipmentLineInput](/docs/api/mutations/#customer-invoice-line-insert)

#### Outbound Shipment Update


```graphql
query {
    updateOutboundShipment(input: UpdateOutboundShipmentInput): Invoice
}

type UpdateOutboundShipmentInput {
    id: String!
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    lines: [UpsertOutboundShipmentLineInput]
}

# Intersection of InsertOutboundShipmentLineInput or UpdateOutboundShipmentLineInput
type UpsertOutboundShipmentLineInput {
    clientId: String
    id: String
    itemId: String
    stockLineId: String
    numberOfPacks: Number
}
```

[InsertOutboundShipmentLineInput](/docs/api/mutations/#customer-invoice-line-insert)
[UpdateOutboundShipmentLineInput](/docs/api/mutations/#customer-invoice-line-update)

Invoice lines that previously existed but are missing in `lines` list will be deleted. 

{TODO we can expand this query to also have `deletedLines`, `partialLines`, if and when needed}

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>lines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `OUTBOUND_SHIPMENT`
`store_id` to be set as current logged in store in session

On Insertion `created_datetime` is set.

On status change the datetime fields are set:
- `confirm_datetime` is set when the status is changed to `confirmed`
- `finalised_datetime` is set when the status is changed to `finalised`

</details>
&nbsp;

## Outbound Shipment Line

Outbound Shipment lines are always linked to an invoice, and are mutated via [Custom Invoice](/docs/api/mutations/#customer-invoice) mutations.

#### Outbound Shipment Line Insert

```GraphQL
type InsertOutboundShipmentLineInput {
    clientId: String
    itemId: String!
    stockLineId: String!
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```

#### Outbound Shipment Line Update

```GraphQL
type UpdateOutboundShipmentLineInput {
    clientId: String
    id: String!
    itemId: String
    stockLineId: String
    # GraphQL Validation >= 0
    numberOfPacks: Number!
}
```

#### Outbound Shipment Line Upsert

`UpsertOutboundShipmentLineInput` is an intersection of `InsertOutboundShipmentLineInput` and `UpdateOutboundShipmentLineInput`, the type is narrowed down by checking presence of value in **id** field

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

## Inbound Shipment

### Inbound Shipment Insert

```graphql
query {
    insertInboundShipment(input: InsertInboundShipmentInput): Invoice
}

type InsertInboundShipmentInput {
    otherPartyId: String!
    status: InvoiceStatus!
    comment: String
    theirReference: String
    lines: [InsertInboundShipmentLineInput]
}

type InsertInboundShipmentLineInput {
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

[InsertInboundShipmentLineInput](/docs/api/mutations/#supplier-invoice-line-insert)

### Inbound Shipment Update

```graphql
query {
    updateInboundShipment(input: UpdateInboundShipmentInput): Invoice
}

type UpdateInboundShipmentInput {
    id: String
    otherPartyId: String
    status: InvoiceStatus
    comment: String
    theirReference: String
    lines: [UpsertInboundShipmentLineInput]
}

# Intersection of InsertInboundShipmentLineInput or UpdateInboundShipmentLineInput
type UpsertInboundShipmentLineInput {
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

[InsertInboundShipmentLineInput](/docs/api/mutations/#supplier-invoice-line-insert)
[UpdateInboundShipmentLineInput](/docs/api/mutations/#supplier-invoice-line-update)

_{TODO we can expand this query to also have `deletedInvoiceLines`, `partialInvoiceLines`, if and when needed}_           

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base table: `invoice`

<ins>otherPartyId</ins>: `name_id`
<ins>allInvoiceLines</ins>: `id` -> `invoice_line.invoice_id`

All other fields are translated directly to snake case equivalent.

`type` to be set as: `INBOUND_SHIPMENT`
`store_id` to be set as current logged in store in session _{TODO can this be broken, if user is switched, and goes to an existing tab and looks at another invoice?}_

On status change the datetime fields are set:
- `confirm_datetime` is set when the status is changed to `confirmed`
- `finalised_datetime` is set when the status is changed to `finalised`

</details>

## Inbound Shipment Line

Inbound Shipment lines are always linked to an invoice, and are mutated via [Inbound Shipment](/docs/api/mutations/#supplier-invoice) mutations.

#### Inbound Shipment Line Insert

```GraphQL
type InsertInboundShipmentLineInput = {
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

#### Inbound Shipment Line Update

```GraphQL
type UpdateInboundShipmentLineInput = {
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

#### Inbound Shipment Line Upsert

`UpsertInboundShipmentLineInput` is an intersection of `InsertInboundShipmentLineInput` and `UpdateInboundShipmentLineInput`, the type is narrowed down by checking presence of value in **id** field

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

When stock in inbound shipment is reserved by another invoice, `invoice_line` becomes not editable.

Invoice lines are delete if they are missing in mutation but are present in database, in which case we have to make sure to delete associated `stock_line`

`clientId` is only used in error responses

</details>
