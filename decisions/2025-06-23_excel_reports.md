# Exporting Excel Reports from Open mSupply

- _Date_: 2025-06-23
- _Deciders_: @lache-melvin, @andreievg
- _Status_: DECIDED
- _Outcome_: Option 3 - HTML Attributes + optional Excel template

## Context

OMS Reports (and forms) are currently generated from an HTML template, by populating the template with some data. These can then be printed (by printing the rendered HTML page) or converted to Excel.

At the time of writing, export to Excel only takes the inner data table of the report (the header row and the data rows), and renders these rows in an Excel table.

This is a great start, but fails to support more complex needs:

### Use cases

- The HTML/printable exports include a header section with important information (e.g. the report name, period, relevant customer/supplier data...). Excel exports should also include this information.
- Some clients provide existing Excel sheets to us. Ideally, we could just define which areas to populate in this template, and the client keeps all their existing formatting and formulae.

### Considerations

- Most reports are designed with a specific kind of user in mind - some reports are really only for high level reporting (only be needed in printable HTML/PDF format) while others are intended for further extraction and reporting, where Excel would be their primary format. A solution should:
  - Allow easy configuration of either primary format, without too much consideration for the other format
  - The secondary format would ideally be supported, at least in a rudimentary manner, by default
- Excel reports may be further processed, e.g. used to generate pivot tables. We should support this by ensuring there is a blank row between any header data and the main table header row, as well as between the data rows and the `total` row, if applicable.
- When we support 2 formats, we take on the responsibility of ensuring both formats match for every report. Bugs fixed/fields changed etc. for one format need to be applied to the other.
  - Therefore, the more that is shared by default the better, but this needs to be without creating additional overhead (we should aim to limit "oh I can't do this in HTML because it won't be supported in the Excel version")
- When viewing Excel reports, it would be helpful to see the underlying formulae, rather than just the resulting data
- We have as few OMS reports as we ever will have, so now is the right time to define if any changes need to be made to existing reports & forms to support Excel export. However, ideally these changes would be kept to a minimum.

## Options

### Option 1 - Generate Excel sheet entirely from HTML, using HTML tables

This is how existing Excel export works - find the `<table>`, uses it's `<thead>` row for the header row, and the `<tbody>` rows for the data rows. The HTML template is defined using HTML tables, which are then parsed to create an Excel worksheet.

We can extend this, and require that if you want the header section (e.g. titles) to be included in the Excel export, you define this as an HTML table as well.

OMS would need to support parsing of at least some styles, which can be mapped to Excel cells. (e.g. background color, font size/weight...)

_Pros:_

- HTML template is the source of truth for both formats - no need to maintain two separate templates
- Once a few example reports are built this way, the pattern will be copied - so our default patterns would be building HTML report templates that are easily parsed to Excel

_Cons:_

- Header sections might not make much sense to reason about as a "table" when thinking in HTML. If Excel is not your primary format, this may be a frustrating constraint.
- If headers/tables have complex formatting, OMS core may bloat, with all the styles it needs to parse and map
  - Could be hard to know where to look for what styles are supported when defining new reports in the reports repo.
- Would be difficult/impossible to expose any formulae in the Excel report
- Existing report header sections will need to be updated to use HTML tables

### Option 2 - HTML Attributes

We keep the existing HTML template, adding custom attributes to the HTML elements, where the data inside them should be rendered in a particular Excel column/cell.

E.g. `<div excel-cell="B7">Supplier name</div>` would render `Supplier name` in the cell `B7`.

_Pros:_

- More targeted control of where data will be rendered when exported to Excel
- We can be selective about which HTML elements are mapped to Excel, e.g. images are nice in the printed report but not needed in Excel
- Existing reports can be updated to include these attributes, without needing to change the structure of the HTML template

  _Cons:_

- Requires an extra step for developers: build the HTML report, then go through and append which cells/columns should go where when exported to Excel
- Potential for bugs - if the HTML template is updated, the Excel attributes may not be updated, leading to data in the wrong place
- Same concerns as Option 1 regarding styles - we would need to support parsing of at least some styles, which can be mapped to Excel cells
- Difficult/impossible to map the formulae to Excel columns

### Option 3 - HTML Attributes + optional Excel template

HTML template is required for all reports, with HTML attributes defining where data should go. However, can also include an Excel template in the report configuration - when present, use this instead of a blank Excel worksheet.

_Pros:_

- Faster implementation of complex Excel reports - just populating a template rather than generating the whole sheet from HTML
- Formatting/styling of the Excel report is the responsibility of the template, we don't need to map this from the HTML
- Can preserve formulae in the template, so they are available in the Excel report
- Simple reports can still be generated from HTML, so we don't need to maintain two separate templates for every report

_Cons:_

- Two templates to maintain - if HTML says `excel-cell="B7"` but the Excel template has been updated, it should be in `C7`, data in the wrong place can be very misleading
  - Something should exist in the development workflow to encourage developer to always check both formats
- More complexity - supporting both HTML attributes and Excel templates may lead to confusion about which to use when

## Decision

Option 3 - HTML Attributes + optional Excel template

- HTML headers are ignored in Excel export by default - add attributes to any elements that should be included in the Excel export, e.g. `<h1 excel-cell="A1">Report Title</h1>`.
- HTML tables are still used for the main data table
- If any of the HTML `<th>` elements have an `excel-column` attribute, we'll then consider the Excel table to be "custom", and we'll only map the flagged columns, to the prescribed column in Excel. This allows for reordering of columns, or for only a subset to be mapped (e.g. map Num Packs and Cost per Pack, but leave Total Cost to be calculated in Excel).
- Will populate an Excel template if provided, otherwise create a blank one.

Means no change is required for existing reports, unless we want to add header section to Excel export - then we just need to add the `excel-cell` attribute to the relevant HTML elements.

### Consequences

- We're supporting a number of use cases, it needs to be clearly documented when to take which approach.
