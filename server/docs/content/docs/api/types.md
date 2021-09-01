+++
title = "Types"
description = "Custom GraphQL types"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 1
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Int!

Not null integer

## Int

Nullable integer

## Boolean!

Not null boolean

## Boolean

Nullable boolean

## Float!

Not null float

## Float

Nullable float

## String!

Nullable string

## String

Not null string

## Datetime!

Not null date time with timezone stamp, i.e. `2021-08-31T11:32:29.631Z`

## Datetime

Nullable date time with timezone stamp, i.e. `2021-08-31T11:32:29.631Z`

### Enum - TransactionStatus

Database field `transaction.status`

| Value     | Description                              |
| --------- | ---------------------------------------- |
| DRAFT     | Editable with stock not reserved         |
| CONFIRMED | Editable with stock \*reserved\*\*       |
| FINALISED | Non editable with stock \*adjusted\*\*\* |

_reserved\*\*: Transaction's transaction_lines -> (item_line.`available_number_of_packs` _ item_line.`pack_size`) is adjusted with transaction_line.`quantity`

\*adjusted*\*\*: Transaction's transaction_lines -> (item_line.`total_number_of_packs` * item_line.`pack_size`) is adjusted with transaction_line.`quantity`

### Enum - TransactionType

Database field `transaction.type`

From perspective of `transaction.store_id` store

| Value            | Description    |
| ---------------- | -------------- |
| CUSTOMER_INVOICE | Outgoing stock |
| SUPPLIER_INVOICE | Incoming stock |
