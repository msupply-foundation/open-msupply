+++
title = "Scalar Types"
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

## Date

Date string, no timezone i.e. '2021-09-30'

## Datetime

Date time with timezone stamp, i.e. `2021-08-31T11:32:29.631Z`

### Enum - InvoiceStatus

```graphql
type InvoiceStatus {
    DRAFT
    CONFIRMED
    FINALISED
}
```

Database field `Invoice.status`

| Value     | Description                                                                                        |
|-----------|----------------------------------------------------------------------------------------------------|
| DRAFT     | Editable with stock *reserved** (`OUTBOUND_SHIPMENT`)                                               |
| CONFIRMED | Editable with stock *reserved** (`OUTBOUND_SHIPMENT`) and *adjusted** (`CUSTOMER/INBOUND_SHIPMENT`) |
| FINALISED | Non editable with stock                                                                            |

<details>
<summary>IMPLEMENTATION DETAILS*</summary>

For `OUTBOUND_SHIPMENT`

*reserved**: Invoice's invoice_lines -> (stock_line.`available_number_of_packs`) is adjusted with invoice_line.`number_of_packs`

*adjusted**: Invoice's Invoice_lines -> (stock_line.`total_number_of_packs`) is adjusted with invoice_line.`number_of_packs`)

For `INBOUND_SHIPMENT`

When invoice is `CONFIRMED`, stock_line is created and *adjusted**. Any further changes to invoice_line would translated to changes in stock_line

*adjusted**: 
* invoice_line.`number_of_pack` -> stock_line.`available_number_of_packs`, `total_number_of_packs`
* invoice_line.`pack_size`, `batch`, `expiry`, `sell_price_per_pack`, `cost_price_per_pack`, `item_id` -> to stock_line fields with the same name

</details>
&nbsp;

### Enum - InvoiceType
```graphql
type InvoiceStatus {
    OUTBOUND_SHIPMENT
    INBOUND_SHIPMENT
}
```

Database field `Invoice.type`

From perspective of `Invoice.store_id` store

| Value            | Description    |
| ---------------- | -------------- |
| OUTBOUND_SHIPMENT | Outgoing stock |
| INBOUND_SHIPMENT | Incoming stock |
