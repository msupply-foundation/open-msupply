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

### TRANSACTIONS

Transaction [list](/docs/api/patterns/#lists-and-pagination)

<ins>Full Shape</ins>

```gql
query {
  transactions {
    nodes {
      id
      name
      status
      type
      comment
      serialNumber
      enteredDate
      reference
    }
  }
}
```

`Base Table`: transaction

<ins>Field Mapping</ins>

**id** [String!](/docs/api/types/#string!) -> `id`

**name** [String!](/docs/api/types/#string!) -> name(`name_id` -> name.id).`name`: *destination** or *source*** of transaction

**status** [TransactionStatus!](/docs/api/types/#enum-transactionstatus) -> `status`

**type** [TransactionType!](/docs/api/types/#enum-transactiontype) -> `type`

**comment** [String](/docs/api/types/#string) -> `comment`

**serialNumber** [Int!](/docs/api/types/#int!) -> `serial_number`

**enteredDate** [Datetime!](/docs/api/types/#datetime) -> `entered_date`

**reference** [String](/docs/api/types/#String) -> `reference`: comment visible to *destination**

*destination** if type is CUSTOMER_INVOICE, linked name record represents destination of stock movement

*source*** if type is SUPPLIER_INVOICE, linked name record represents source of stock movement

<ins>Filters</ins>

The following fields are [filterable](/docs/api/Filters)

`name`
`status`
`type`
`comment`
`serialNumber`
`enteredDate`
`reference`

<ins>Session and Permissions</ins>

Transactions in this query are automatically filtered by permission system so that only transactions associated with current logged in `store` are visible {TODO link to session info} (will output transactions where `store_id = logged in store`)

### TRANSACTION

Single transaction entity

<ins>Full Shape</ins>

```gql
query {
  transaction(id: S) {
    id
    name
    status
    type
    comment
    serialNumber
    enteredDate
    reference
    lines {
      nodes {
        id
        itemName
        itemCode
        quantity
        availableQuantity
        batchName
        expiry
      }
    }
  }
}
```

`Base Table`: transaction

<ins>Arguments</ins>

**id** [String!](/docs/api/types/#string!) -> `id`: transaction entity to query

<ins>Field Mapping</ins>

**id** [String!](/docs/api/types/#string!) -> `id`

**name** [String!](/docs/api/types/#string!) -> name(`name_id` -> name.id).`name`: *destination** or *source*** of transaction

**status** [TransactionStatus!](/docs/api/types/#enum-transactionstatus) -> `status`

**type** [TransactionType!](/docs/api/types/#enum-transactiontype) -> `type`

**comment** [String](/docs/api/types/#string) -> `comment`

**serialNumber** [Int!](/docs/api/types/#int!) -> `serial_number`

**enteredDate** [Datetime!](/docs/api/types/#datetime) -> `entered_date`

**reference** [String](/docs/api/types/#String) -> `reference`: comment visible to *destination**

`Base Table`: transaction_line

**lines** -> transaction_line(`id` -> transaction_line.transaction_id): this is a [list](/docs/api/patterns/#lists-and-pagination)

**lines.id** [String!](/docs/api/types/#String) -> `id`

**lines.item_name** [String!](/docs/api/types/#string!) -> `item_name`: denormalised from item in case of item name changes after transaction is created

**lines.item_code** [String!](/docs/api/types/#string!) -> item(transaction_line.item_id -> item).`code`

**lines.quantity** [Int!](/docs/api/types/#int!) -> `quantity`

**lines.batchName** [String](/docs/api/types/#string) -> item_line(item_line_id -> item_line.id).`batch_name`

**lines.expiry** [Datetime](/docs/api/types/#datetime) -> item_line(item_line_id -> item_line.id).`expiry`

**lines.availableQuantity** [Int!](/docs/api/types/#int!) -> item_line(item_line_id -> item_line.id).`available_quantity`: transaction line quantity will affect available quantity if [transaction status](/docs/api/types/#enum-transactionstatus) is not DRAFT. When [transaction type](/docs/api/types/#enum-transactiontype) is CUSTOMER_INVOICE the quantity will be reduced, when [transaction type](/docs/api/types/#enum-transactiontype) is SUPPLIER_INVOICE it will be increased.

*destination** if type is CUSTOMER_INVOICE, linked name record represents destination of stock movement

*source*** if type is SUPPLIER_INVOICE, linked name record represents source of stock movement

<ins>Session and Permissions</ins>

Additional filter is applied to transaction by permission system to filter transaction by store associated with current session {TODO link to session info} (where `store_id = logged in store`)

### ITEMS

Item [list](/docs/api/patterns/#lists-and-pagination)

<ins>Full Shape</ins>

```gql
query {
  items {
    nodes {
      id
      code
      name
      availableQuantity
      activeBatches {
        nodes {
          packSize
          availableNumberOfPacks
          name
          expiry
        }
      }
    }
  }
}
```

`Base Table`: item

<ins>Field Mapping</ins>

**id** [String!](/docs/api/types/#string!) -> `id`

**code** [String!](/docs/api/types/#string!) -> `code`

**name** [String!](/docs/api/types/#string!) -> `name`

**availableQuantity** [Int!](/docs/api/types/#int!) -> `sum of` item_line(`id` -> item_line.item_id and item_line.store_id = session store_id and item_line.is_active).(packSize * availableNumberOfPacks) {TODO or can this be deduced by front end when batches are selected ?}

`Base Table`: item_line

**availableBatches** -> item_line(`id` -> item_line.item_id and item_line.store_id = session store_id and item_line.is_active): this is a [list](/docs/api/patterns/#lists-and-pagination), `is_active` means `totalNumberOfPacks > 0`

**availableBatches.packSize** [Int!](/docs/api/types/#int!) -> `pack_size`

**availableBatches.availableNumberOfPacks** [Float!](/docs/api/types/#float!) -> `available_number_of_packs`: float because can issue in less then pack size

**availableBatches.name** [String](/docs/api/types/#string) -> `name`: batch name, can be null

**availableBatches.expiry** [Datetime](/docs/api/types/#Datetime) -> `expiry`: can be null

`name` and `availableQuantity` are [filterable](/docs/api/Filters) {TODO gotcha for filters, need to create a view (as i don't think diesel would be able to join, sum and filter ?), and also filter view by store_id from session}

<ins>Filters</ins>

The following fields are [filterable](/docs/api/Filters)

`code` `name` `availableQuantity` {TODO gotcha for filters, need to create a view (as i don't think diesel would be able to join, sum and filter ?), and also filter view by store_id from session}

<ins>Session and Permissions</ins>

Items in this query are filtered by permission system to only show items that are visible in current `logged in store` {TODO link to session info} (will output items where `item.id -> item_store_join.item_id` and `item_store_join.store_id = logged in store`) {TODO are we using master lists for visibility now ?}

### NAMES

Names [list](/docs/api/patterns/#lists-and-pagination)

<ins>Full Shape</ins>

```gql
query {
  names {
    nodes {
      id
      code
      name
      isCustomer
      isSupplier
    }
  }
}
```

`Base Table`: Name

<ins>Field Mapping</ins>

**id** [String!](/docs/api/types/#string!) -> `id`

**name** [String!](/docs/api/types/#string!) -> `name`

**code** [String!](/docs/api/types/#string!) -> `code`

**isCustomer** [Boolean!](/docs/api/types/#boolean!) -> name_store_join(`id` -> name_store_join.name_id).`name_is_customer`

**isSupplier** [Boolean!](/docs/api/types/#boolean!) -> name_store_join(`id` -> name_store_join.name_id).`name_is_supplier`

<ins>Filters</ins>

The following fields are [filterable](/docs/api/Filters)

`code` `name` `isCustomer` `isSupplier`

<ins>Session and Permissions</ins>

Names in this query are filtered by permission system to only show names visible in current `logged in store` {TODO link to session info} (will output names where `name_store_join.store_id = logged in store`)in discussion}
