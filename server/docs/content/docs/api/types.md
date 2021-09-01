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

### Not Null

`!` exclamation mark after type identifier signifies that value type is not null. Missing exclamation mark identifies type as nullable.

## Int

Integer

## Boolean

Boolean

## Float

Floating point number

## String

A string

## Datetime

Date time with timezone stamp, i.e. `2021-08-31T11:32:29.631Z`

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
