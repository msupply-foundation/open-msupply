+++
title = "Queries"
description = "Description of all GraphQL queries available"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 3
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++


GraphQL exposes introspection queries, and in dev version of omSupply you can explore the full api by going to /graphiql end point.

Full list of GraphQL queries is provided here is for:

- development specs
- version history
- further description for api devs and consumers

### Invoices

Invoices [list](/docs/api/patterns/#lists)

<ins>Full Shape</ins>

```graphql
query {
  invoices {
    nodes {
      id: String!
      # 'destination' or 'source' of invoice
      otherPartyName: String!
      otherPartyId: String!
      status: InvoiceStatus!
      type: InvoiceType!
      invoiceNumber: Number!
      theirReference: String
      comment: String
      CreatedDatetime: Datetime!
      confirmDatetime: DateTime
      finalisedDatetime: DateTime
      pricing {
        totalAfterTax: Float!
      }
    }
  }
}
```
`destination` if type is `OUTBOUND_SHIPMENT`, linked name record represents destination of stock movement

`source` if type is `INBOUND_SHIPMENT`, linked name record represents source of stock movement

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base Table: `invoice`

Field mapping is 1 to 1 converted to snake case, apart from:

**otherPartyId** -> name(`invoice`.`name_id` -> name.id).`id`

**otherPartyName** -> name(`invoice`.`name_id` -> name.id).`name`

`pricing`.`totalAfterTax` -> this is an aggregate of invoice_lines (sum of `total_after_tax`), linked by `invoice`.`id` -> `invoice_line`.`invoice_id`

_{TODO: do we need totalBeforeTax and serviceFee ? }_
</details>
&nbsp;

<ins> [Pagination](/docs/api/patterns/#pagination) </ins>

`MAX_PAGE_SIZE`: 1000

`DEFAULT_PAGE_SIZE`: 100

<ins>Session and Permissions</ins>

Invoices in this query are automatically filtered by permission system so that only invoices associated with current logged in `store` are visible _{TODO link to session info}_ (will output invoice where `store_id = logged in store`)



### Invoice

Single Invoice entity

<ins>Full Shape</ins>

```graphql
query {
  invoice(id: String!) {
    id: String!
    # 'destination' or 'source' of invoice
    otherPartyName: String!
    otherPartyId: String!
    status: InvoiceStatus!
    type: InvoiceType!
    invoiceNumber: Number!
    theirReference: String
    comment: String
    CreatedDatetime: Datetime!
    confirmDatetime: DateTime
    finalisedDatetime: DateTime
    lines {
      nodes {
        id: String!
        itemId: String!
        itemName: String!
        itemCode: String!
        packSize: String!
        numberOfPacks: Number!
        costPricePerPack: Float!
        sellPricePerPack: Float!
        # name of batch
        batch: String
        expiryDate: Date
        stockLine: {
          # number of pack available for a batch ("includes" numberOfPacks in this line)
          availableNumberOfPacks: Number
        }
      }
    }
  }
}
```

_{TODO do we need stockLine here ? What happen in UI ? Is it a new window to edit quantity (and we show available nubmer of packs there) ?}_

`destination` if type is `OUTBOUND_SHIPMENT`, linked name record represents destination of stock movement

`source` if type is `INBOUND_SHIPMENT`, linked name record represents source of stock movement

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base Table: `invoice`

Field mapping is 1 to 1 converted to snake case, apart from:

**otherPartyId** -> name(`invoice`.`name_id` -> name.id).`id`: *destination** or *source*** of invoice

**otherPartyName** -> name(`invoice`.`name_id` -> name.id).`name`: *destination** or *source*** of invoice

#### lines

Base Table: `invoice_lines`

Linked by `invoice`.`id` -> `invoice_line`.`invoice_id`

Field mapping is 1 to 1 converted to snake case, apart from:

`stockLine` -> `invoice_line`.`invoice_line`.`id`

Field mapping is 1 to 1 converted to snake case

</details>
&nbsp;

<ins>Session and Permissions</ins>

Additional filter is applied to invoice by permission system to filter invoice by store associated with current session _{TODO link to session info}_ (where `store_id = logged in store`)

### ITEMS

Item [list](/docs/api/patterns/#lists)

<ins>Full Shape</ins>

```graphql
query {
  items {
    nodes {
      id: String!
      code: String!
      name: String!
      # item visibility in current logged in store
      isVisible: Boolean!
      # batches available in current logged in store
      availableBatches {
        nodes {
          packSize: Number!
          costPricePerPack: Float!
          sellPricePerPack: Float!
          availableNumberOfPacks: Number!
          totalNumberOfPacks: Number!
          batch: String
          expiryDate: Date
        }
      }
    }
  }
}
```

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base Table: `item`

Field mapping is 1 to 1 converted to snake case, apart from:

`isVisible` -> this is deduce by current logged in store (in session) link to the item via master lists, `item`.`id` -> `master_list_line`.`item_id` -> `master_list_line`.`master_list_id` -> `master_list_name_join`.`master_list_id` -> `master_list_name_join`.`name_id` -> (session logged in store name_id)

#### availableBatches

Base Table: `stock_line`

Linked by `item`.`id` -> `stock_line`.`item_id` 

Stock lines are further filtered by `store_id` of currently logged in store. And where available quantity > 0

Field mapping is 1 to 1 converted to snake case

</details>
&nbsp;

<ins> [Pagination](/docs/api/patterns/#pagination) </ins>

`MAX_PAGE_SIZE`: 3000

`DEFAULT_PAGE_SIZE`: 2000

<ins>Session and Permissions</ins>

`availableBatches` are filterd by permission system to only show batches available in current logged in store

### NAMES

Names [list](/docs/api/patterns/#lists)

<ins>Full Shape</ins>

```graphql
query {
  names {
    nodes {
      id: String!
      code: String!
      name: String!
      isCustomer: Boolean!
      isSupplier: Boolean!
    }
  }
}
```

<details>
<summary>IMPLEMENTATION DETAILS</summary>

Base Table: `name`

Field mapping is 1 to 1 converted to snake case, apart from:

`isCustomer` and `isSupplier`, both come from `name_store_join`, linked by `name`.`id` -> `name_store_join`.`name_id` and `name_store_join`.`store_id` is current logged in store

</details>
&nbsp;

<ins> [Pagination](/docs/api/patterns/#pagination) </ins>

`MAX_PAGE_SIZE`: 3000

`DEFAULT_PAGE_SIZE`: 2000

<ins>Session and Permissions</ins>

Names in this query are filtered by permission system to only show names visible in current `logged in store` _{TODO link to session info}_ (will output names where `name_store_join.store_id = logged in store`)in discussion}
