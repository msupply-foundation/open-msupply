+++
title = "Forms Development Setup"
description = "Setup for developing forms"
weight = 1
sort_by = "weight"
template = "docs/section.html"
 
[extra]
toc = true
top = false
+++

# Open mSupply Form Development Tutorial Series

## Setting Up Your Development Environment

In order to add new standard forms (or reports), you'll need to have a working OMS server development setup. To do that, please follow the instructions [here](https://github.com/msupply-foundation/open-msupply/blob/develop/server/README.md). Don't worry, you don't need to understand Rust, but you will be using the [CLI](https://github.com/msupply-foundation/open-msupply/tree/develop/server#cli) to build and/or show/preview your reports. You don't need to have OMS server running to develop your report, but you will need it running if you want to show/preview your progress and also to upload it to the data file so that you can test it in the OMS client. See the [Standard Reports README](https://github.com/msupply-foundation/open-msupply/tree/develop/standard_reports) for more details. Don't forget to edit/create your `test_config.json` file (copy from the sample config in the `standard_reports` folder) and set the user name & password (same as for the OMS client), and suitable UUID values for the record data and store that you want to see in the report (you can use the record browser in OG or something like DB Browser for an OMS SQLite data file).

You'll also need to have the OMS server running to make use of the [GraphQL Playground](http://localhost:8000/graphql), which is very helpful for trying out your queries - see [here](https://docs.msupply.foundation/docs/developer/graphql) for some help to get you started. Don't forget to login (4th icon down on the left hand side) as the same user. If you want to replicate the graphQL queries in the tutorial examples which follow, you can add the same record data/store IDs in the Variables section below the query e.g.

```
{
  "dataId": "a2903708-db19-4980-bb50-22e219f0d84d",
  "storeId": "35E95EDDF4FE4225823C4E539EC89615"
}
```

## What the Docs Don't Tell You!

### Report contexts

Report contexts are defined in the [schema.ts file](https://github.com/msupply-foundation/open-msupply/blob/main/client/packages/common/src/types/schema.ts):

```
export enum ReportContext {
  Asset = 'ASSET',
  Dispensary = 'DISPENSARY',
  GoodsReceived = 'GOODS_RECEIVED',
  InboundReturn = 'INBOUND_RETURN',
  InboundShipment = 'INBOUND_SHIPMENT',
  InternalOrder = 'INTERNAL_ORDER',
  OutboundReturn = 'OUTBOUND_RETURN',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Patient = 'PATIENT',
  Prescription = 'PRESCRIPTION',
  PurchaseOrder = 'PURCHASE_ORDER',
  Repack = 'REPACK',
  Report = 'REPORT',
  Requisition = 'REQUISITION',
  Resource = 'RESOURCE',
  Stocktake = 'STOCKTAKE',
}
```

### Report sub-contexts

Some reports also have a sub-context: these don't seem to be defined centrally, but if you want to know what context (and sub-context) is expected from any particular view, have a look in the corresponding `AppBarButtons.tsx` file e.g. for [supplier returns](https://github.com/msupply-foundation/open-msupply/blob/main/client/packages/invoices/src/Returns/SupplierDetailView/AppBarButtons.tsx)

---
