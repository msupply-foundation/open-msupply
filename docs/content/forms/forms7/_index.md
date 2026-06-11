+++
title = "Forms Example 2"
description = "Adding an Inbound Shipments Report"
weight = 14
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

## Example 2: Adding an Inbound Shipments Report

### Objective

Learn how to create a brand new inbound shipments report, by cloning and modifying the outbound shipments report. This report has arguments and uses filters.

### Clone an Existing Form

- Copy and paste the `standard_reports/outbound-shipments/latest` folder to `standard_reports/inbound-shipments/latest`

### Modify the Manifest (report-manifest.json)

- Change the form name and code
- Change the form sub-context (the context remains the same)

```
"code": "inbound-shipments",
  "context": "REPORT",
  "sub_context": "Replenishment",
  "name": "Inbound Shipments",
```

### Modify the Template (template.html)

- Change the first column header from "Customer" to "Supplier"

### Modify the Query (query.graphql)

- Change the query name to "inboundShipments"
- Change the filter name type and add a status filter to ignore not-yet-processed records (the outbound report should probably have a similar status filter as well)

```
type: { equalTo: INBOUND_SHIPMENT }
status: { equalAny: [RECEIVED, VERIFIED]}
```

### Modify the Arguments (arguments_ui.json)

- Change the `nameType` argument and label to "supplier"

### Test Your New Report

- Create some inbound shipments in your OMS data file if there aren't any already, and preview with `show-report`
- There is currently no way to view this report in the OMS UI (there's no "Inbound Shipments" tab in "Reports" yet) although you can still generate it with `build-reports` and upload it with `upsert-reports`

### Add Inbound Shipments Report Tab

- Add a new `ReportWidget` to [ListView.tsx](https://github.com/msupply-foundation/open-msupply/blob/main/client/packages/reports/src/ListView/ListView.tsx)

```
<ReportWidget
title={t('replenishment')}
Icon={TruckIcon}
reports={categorisedReports.replenishment}
onReportClick={onReportClick}
hasReports={!!categorisedReports.replenishment.length}
/>
```

- Add definitions to [utils.ts](https://github.com/msupply-foundation/open-msupply/blob/main/client/packages/reports/src/ListView/utils.ts)
  - Add replenishment sub-context

  ```
  export enum ReportSubContext {
    StockAndItems = 'StockAndItems',
    Distribution = 'Distribution',
    Replenishment = 'Replenishment',
    HIVCareProgram = 'HIVCareProgram',
    Vaccinations = 'Vaccinations',
    Encounters = 'Encounters',
    Other = 'Other',
  }
  ```

  - Add replenishment filter to `categoriseReports`

  ```
  replenishment: reports.filter(
      r => r.subContext === ReportSubContext.Replenishment
    ),
  ```

- Restart OMS client (`yarn start` in `client` folder) to see your new tab and report
