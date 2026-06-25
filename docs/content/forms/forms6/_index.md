+++
title = "Forms Example 1"
description = "Adding a Supplier Return Form"
weight = 12
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

## Example 1: Adding a Supplier Return Form

### Objective

Learn how to create a brand new supplier return form, by cloning and modifying an outbound shipment form. For this example, we'll use the portrait version, but the landscape one will be very similar.

### Clone an Existing Form

- Copy and paste the `standard_forms/outbound-invoice-portrait-with-logo/latest` folder to `standard_forms/supplier-return/latest`
- Rename the graphQL file to the standard `query.graphql`

### Modify the Manifest (report-manifest.json)

- Change the form name and code
- Change the form context and sub-context

```
"code": "supplier-return",
"context": "OUTBOUND_SHIPMENT",
"sub_context": "SupplierReturn",
"name": "Supplier Return",
"queries": {
  "gql": "query.graphql"
},
```

### Modify the Header (header.html)

- Change the form title: replace `t(k="label.outbound-shipment", f="Outbound Shipment")` with `t(k="report.supplier-return-form", f="Supplier Return Form")`
- Change the supplier label: replace `t(k="label.customer", f="Customer")` with `t(k="report.returning-to",f="Returning to")`

Note that neither of these two new "resources" exist already in mSupply, so if you want the form to work in any language other than English, you'll also need to add `report.supplier-return-form` and `report.returning-to` to the various locales e.g. [English](https://github.com/msupply-foundation/open-msupply/blob/main/client/packages/common/src/intl/locales/en/common.json)

### Test Your New Report

- Create a new supplier return in your OMS data file if there isn't one already, and make a note of its `ID` so that you can add it to your `test-config.json`
- Preview with `show-report`
- Generate with `build-reports`
- Upload with `upsert-reports` and test from the OMS supplier return
