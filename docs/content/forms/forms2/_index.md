+++
title = "Forms Tutorial 2"
description = "Creating Your First Form"
weight = 4
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

## Tutorial 2: Creating Your First Form - The Manifest and Basic Structure

### Objective

Create a simple "Equipment Request" form that demonstrates the basic form structure.

### Step 1: Create the Directory Structure

Create the following directory structure:

```
standard_forms/
└── equipment-request/
    └── latest/
        ├── report-manifest.json
        └── src/
            ├── template.html
            ├── header.html
            ├── query.graphql
            └── style.css
```

### Step 2: Create the Manifest File

Create `report-manifest.json`:

```json
{
  "is_custom": true,
  "version": "1.0.0",
  "code": "equipment-request",
  "context": "REQUISITION",
  "name": "Equipment Request",
  "queries": {
    "gql": "query.graphql"
  },
  "arguments": {},
  "header": "header.html"
}
```

**Key Properties Explained:**

- `is_custom`: Set to `true` for custom forms
- `version`: Semantic version of your form
- `code`: Unique identifier (must match directory name)
- `context`: Determines what data is available
- `name`: Display name in the UI
- `queries`: GraphQL query files to use
- `header`: Optional header template file

### Step 3: Create a Basic GraphQL Query

Create `src/query.graphql`:

```graphql
query equipmentRequestQuery($storeId: String!, $dataId: String!) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      status
      requisitionNumber
      createdDatetime
      comment
      otherParty(storeId: $storeId) {
        name
        code
        address1
        address2
      }
      lines {
        nodes {
          requestedQuantity
          item {
            code
            name
          }
        }
      }
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      storeName
      logo
      name(storeId: $storeId) {
        address1
        address2
        phone
        email
      }
    }
  }
}
```

### Step 4: Create the Header Template

Create `src/header.html`:

```html
<table class="header_section">
  <tr>
    <th class="logo_cell">
      <img class="logo" src="{{ data.store.logo }}" />
    </th>
    <th class="store_info">
      <span class="store_name">{{ data.store.storeName }}</span><br />
      <span class="address">{{ data.store.name.address1 }}</span><br />
      <span class="address">{{ data.store.name.address2 }}</span><br />
      <span class="contact">Phone: {{ data.store.name.phone }}</span><br />
      <span class="contact">Email: {{ data.store.name.email }}</span>
    </th>
    <th class="form_title">
      <h1>Equipment Request</h1>
    </th>
  </tr>
</table>

<div class="request_info">
  <div class="info_row">
    <span>Request Number: {{ data.requisition.requisitionNumber }}</span>
    <span>Date: {{ data.requisition.createdDatetime | date(format="%d/%m/%Y") }}</span>
  </div>
  <div class="info_row">
    <span>Status: {{ data.requisition.status }}</span>
    <span>Requested From: {{ data.requisition.otherParty.name }}</span>
  </div>
</div>
```

### Step 5: Create Basic CSS

Create `src/style.css`:

```css
/* Print and screen layout */
@media print {
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}

/* Header styling */
.header_section {
  width: 100%;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.logo_cell {
  width: 15%;
  text-align: left;
}

.logo {
  height: 80px;
  display: block;
}

.store_info {
  width: 45%;
  text-align: left;
  vertical-align: top;
}

.store_name {
  font-weight: bold;
  font-size: 14pt;
}

.address,
.contact {
  font-size: 9pt;
  color: #666;
}

.form_title {
  width: 40%;
  text-align: right;
  vertical-align: top;
}

.form_title h1 {
  font-size: 24pt;
  margin: 0;
  color: #333;
}

/* Request info section */
.request_info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

.info_row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-weight: bold;
}

/* Base typography */
body {
  font-family: Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
  margin: 0;
  padding: 20px;
}
```

### Step 6: Create the Main Template

Create `src/template.html`:

```html
<style>
  {% include "style.css" %}
</style>

<div class="equipment_request">
  <table class="items_table">
    <thead>
      <tr class="table_header">
        <th>Item Code</th>
        <th>Item Name</th>
        <th>Requested Quantity</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      {% for line in data.requisition.lines.nodes %}
      <tr class="item_row">
        <td>{{ line.item.code }}</td>
        <td>{{ line.item.name }}</td>
        <td class="quantity">{{ line.requestedQuantity }}</td>
        <td class="notes">_________________</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  {% if data.requisition.comment %}
  <div class="comments_section">
    <h3>Comments:</h3>
    <p>{{ data.requisition.comment }}</p>
  </div>
  {% endif %}

  <div class="signature_section">
    <div class="signature_box">
      <p>Requested by: _________________</p>
      <p>Date: _________________</p>
    </div>
    <div class="signature_box">
      <p>Approved by: _________________</p>
      <p>Date: _________________</p>
    </div>
  </div>
</div>
```

You may find that `cargo check` complains about the `style.css` include at line 2 - this seems to be because it doesn't understand that it's a directive to Tera rather than a raw line of code - you can safely ignore this as long as the `remote_server_cli` actually compiles correctly.

### Add Table Styling to CSS

Add this to your `style.css`:

```css
/* Table styling */
.items_table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

.table_header th {
  background-color: #e6e6e6;
  border: 1px solid #333;
  padding: 8px;
  text-align: left;
  font-weight: bold;
}

.item_row td {
  border: 1px solid #333;
  padding: 8px;
  vertical-align: top;
}

.quantity {
  text-align: center;
  width: 100px;
}

.notes {
  width: 200px;
}

/* Comments and signatures */
.comments_section {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
}

.signature_section {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
}

.signature_box {
  width: 45%;
  border: 1px solid #333;
  padding: 20px;
  min-height: 80px;
}

.signature_box p {
  margin: 10px 0;
  border-bottom: 1px solid #333;
  padding-bottom: 5px;
}
```

### Testing Your Form

1. You can preview it by running the remote_server_cli `show-report` command, which should open it in your browser (using the record data and store specified in the `test-config.json` file)

```
// Run remote_server_cli show-report from the server folder
// --path specifies the location of your report/form folder
// --config specifies the location of your test_config.json file
cargo run --bin remote_server_cli show-report --path ../standard_forms/equipment-request/latest --config ../standard_reports
```

2. When happy, you can (re)generate it using the remote_server_cli `build-reports` command and then use `upsert-reports` to upload it to the OMS data file

```
// Run remote_server_cli build-reports from the server folder to (re)generate all standard forms and reports
// Optionally you can build just a single report: use --path to specify the location of your report/form folder or --help to see all options
cargo run --bin remote_server_cli build-reports
cargo run --bin remote_server_cli build-reports --path ../standard_forms/equipment-request/latest
//
// Run remote_server_cli upsert-reports --overwrite from the server folder to upload (and replace) all standard forms and reports for your OMS data file
// Optionally you can upload just a single report: use --path to specify the location of your generated report/form JSON file or --help to see all options
cargo run --bin remote_server_cli upsert-reports --overwrite
cargo run --bin remote_server_cli upsert-reports --path ../standard_forms/equipment-request/latest/generated/reports.json --overwrite
```

3. Navigate to a requisition and select your "Equipment Request" form
4. Verify the form renders correctly with data

### What We've Learned

- Form structure and file organization
- Manifest configuration
- Basic GraphQL data querying
- Tera template syntax
- CSS styling for print and screen

In Tutorial 3, we'll explore advanced templating features and data manipulation.

---
