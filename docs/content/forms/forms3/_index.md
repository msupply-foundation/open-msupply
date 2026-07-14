+++
title = "Forms Tutorial 3"
description = "Advanced Templating and Data Manipulation"
weight = 6
sort_by = "weight"
template = "docs/section.html"

[extra]
toc = true
top = false
+++

## Tutorial 3: Advanced Templating and Data Manipulation

### Objective

Enhance our Equipment Request form with advanced Tera templating features, conditional logic, calculations, and better data presentation.

### Advanced Tera Template Features - part 1

#### 1. Conditional Logic

Tera supports various conditional statements. Let's enhance our template with better conditional logic:

```html
<!-- replace "request_info" section in header.html -->
<div class="info_row">
    <span>Request Number: {{ data.requisition.requisitionNumber }}</span>
    <span>Date: {{ data.requisition.createdDatetime | date(format="%d/%m/%Y") }}</span>
  </div>

<div class="request_info">
  {% if data.requisition.status == "DRAFT" %}
    <div class="status_banner draft">DRAFT - Not Yet Submitted</div>
  {% elif data.requisition.status == "SENT" %}
    <div class="status_banner sent">SUBMITTED - Awaiting Approval</div>
  {% elif data.requisition.status == "FINALISED" %}
    <div class="status_banner approved">APPROVED</div>
  {% else %}
    <div class="status_banner">Status: {{ data.requisition.status }}</div>
  {% endif %}
  </div>
</div>

<!-- Conditional supplier information -->
{% if data.requisition.otherParty %}
  <div class="supplier_info">
    <h3>Supplier Information</h3>
    <p><strong>{{ data.requisition.otherParty.name }}</strong></p>
    <p>Code: {{ data.requisition.otherParty.code }}</p>
    {% if data.requisition.otherParty.address1 %}
      <p>{{ data.requisition.otherParty.address1 }}</p>
      {% if data.requisition.otherParty.address2 %}
        <p>{{ data.requisition.otherParty.address2 }}</p>
      {% endif %}
    {% endif %}
  </div>
{% endif %}
```

#### 2. Loops and Filters

Enhance the items table with more sophisticated looping and filters:

```html
<!-- update "items_table" section in template.html -->
<table class="items_table">
  <thead>
    <tr class="table_header">
      <th>Line #</th>
      <th>Item Code</th>
      <th>Item Name</th>
      <th>Requested Qty</th>
      <th>Priority</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {% for line in data.requisition.lines.nodes %}
    <tr class="item_row {% if loop.index is odd %}odd{% else %}even{% endif %}">
      <td class="line_number">{{ loop.index }}</td>
      <td>{{ line.item.code }}</td>
      <td>{{ line.item.name }}</td>
      <td class="quantity">{{ line.requestedQuantity | default(value=0) }}</td>
      <td class="priority">
        {% if line.requestedQuantity > 100 %} HIGH {% elif line.requestedQuantity > 50 %} MEDIUM {%
        else %} LOW {% endif %}
      </td>
      <td class="status">
        {% if line.requestedQuantity %} REQUESTED {% else %} PENDING {% endif %}
      </td>
    </tr>
    {% endfor %} {% if data.requisition.lines.nodes | length == 0 %}
    <tr>
      <td colspan="6" class="no_items">No items requested</td>
    </tr>
    {% endif %}
  </tbody>
</table>
```

#### 3. Macros for Reusable Code

Define macros for commonly used formatting:

```html
<!-- At the top of template.html -->
{% macro formatDate(datetime) %} {% if datetime %} {{ datetime | date(format="%d/%m/%Y") }} {% else
%} N/A {% endif %} {% endmacro %} {% macro formatCurrency(amount) %} {% if amount %} ${{ amount |
round(precision=2) }} {% else %} $0.00 {% endif %} {% endmacro %} {% macro priorityBadge(quantity)
%} {% if quantity > 100 %}
<span class="priority high">HIGH</span>
{% elif quantity > 50 %}
<span class="priority medium">MEDIUM</span>
{% else %}
<span class="priority low">LOW</span>
{% endif %} {% endmacro %}

<!-- Using the macros -->
<div class="dates">
  <p>Created: {{ self::formatDate(datetime=data.requisition.createdDatetime) }}</p>
  <p>Updated: {{ self::formatDate(datetime=data.requisition.finalisedDatetime) }}</p>
</div>

<!-- In the table replace the "priority" line with -->
<td class="priority">{{ self::priorityBadge(quantity=line.requestedQuantity) }}</td>
```

Note that this requires that you add the new `finalisedDatetime` field to the requisition query in `query.graphql`

### Enhanced CSS for New Features

Add these styles to `style.css` and then regenerate the form:

```css
/* Status banners */
.status_banner {
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 5px;
  font-weight: bold;
  text-align: center;
}

.status_banner.draft {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.status_banner.sent {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.status_banner.approved {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

/* Priority badges */
.priority {
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 8pt;
  font-weight: bold;
}

.priority.high {
  background-color: #dc3545;
  color: white;
}

.priority.medium {
  background-color: #ffc107;
  color: black;
}

.priority.low {
  background-color: #28a745;
  color: white;
}

/* Table enhancements */
.item_row.odd {
  background-color: #f8f9fa;
}

.item_row.even {
  background-color: white;
}

.line_number {
  text-align: center;
  width: 50px;
  font-weight: bold;
}

.cost,
.total {
  text-align: right;
  font-family: monospace;
}

.no_items {
  text-align: center;
  font-style: italic;
  color: #666;
  padding: 20px;
}

/* Summary section */
.summary {
  margin-top: 30px;
  padding: 20px;
  border: 2px solid #333;
  background-color: #f8f9fa;
}

.summary_grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 10px;
}

.summary_item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.summary_item label {
  font-weight: bold;
}

/* Supplier info box */
.supplier_info {
  float: right;
  width: 300px;
  padding: 15px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  margin-left: 20px;
  margin-bottom: 20px;
}

.supplier_info h3 {
  margin-top: 0;
  color: #333;
}

/* Print-specific adjustments */
@media print {
  .status_banner {
    border: 2px solid #333 !important;
    background-color: white !important;
    color: black !important;
  }

  .priority {
    border: 1px solid #333 !important;
    background-color: white !important;
    color: black !important;
  }

  .summary_grid {
    display: block;
  }

  .summary_item {
    margin-bottom: 5px;
  }
}
```

### Advanced Tera Template Features - part 2

#### 4. Variables and Calculations

Use set and set_global for calculations in template.html:

```html
<!-- Initialise totals -->

{% set_global total_items = 0 %} {% set_global high_priority_items = 0 %}

<!-- Add to <tr class="table_header">  section -->

<th>Est. Cost</th>
<th>Line Total</th>

<!-- Add at the start of the {% for line in data.requisition.lines.nodes %} loop -->

{% set_global total_items = total_items + line.requestedQuantity %} {% if line.requestedQuantity >
100 %} {% set_global high_priority_items = high_priority_items + 1 %} {% endif %} {% set
estimated_cost = 25.00 %}
<!-- This would come from item data -->
{% set line_total = line.requestedQuantity * estimated_cost %}

<!-- Add to <tr class="item_row">  section -->

<td class="cost">{{ self::formatCurrency(amount=estimated_cost) }}</td>
<td class="total">{{ self::formatCurrency(amount=line_total) }}</td>

<!-- Add summary section -->

<div class="summary">
  <h3>Request Summary</h3>
  <div class="summary_grid">
    <div class="summary_item">
      <label>Total Items:</label>
      <span>{{ total_items }}</span>
    </div>
    <div class="summary_item">
      <label>High Priority Items:</label>
      <span>{{ high_priority_items }}</span>
    </div>
    <div class="summary_item">
      <label>Total Lines:</label>
      <span>{{ data.requisition.lines.nodes | length }}</span>
    </div>
  </div>
</div>
```

### Working with Complex Data Structures

When dealing with nested data, use dot notation and filters effectively:

```html
<!-- Accessing nested data safely -->
{% if data.requisition.lines.nodes %} {% for line in data.requisition.lines.nodes %}
<!-- Safe access with defaults -->
<tr>
  <td>{{ line.item.code | default(value="NO CODE") }}</td>
  <td>{{ line.item.name | default(value="Unknown Item") }}</td>

  <!-- Number formatting -->
  <td>{{ line.requestedQuantity | round(precision=0) }}</td>

  <!-- String manipulation -->
  <td>{{ line.item.name | upper | truncate(length=30) }}</td>

  <!-- Date formatting with timezone -->
  <td>{{ line.createdDatetime | date(format="%d/%m/%Y %H:%M", timezone="UTC") }}</td>
</tr>
{% endfor %} {% else %}
<tr>
  <td colspan="5">No data available</td>
</tr>
{% endif %}
```

### Error Handling in Templates

Add robust error handling:

```html
<!-- Safe data access with error handling -->
<div class="request_info">
  {% try %}
  <h2>Request #{{ data.requisition.requisitionNumber }}</h2>
  <p>Status: {{ data.requisition.status | title }}</p>
  {% catch %}
  <h2>Equipment Request</h2>
  <p class="error">Request information unavailable</p>
  {% endtry %}
</div>

<!-- Conditional blocks with fallbacks -->
{% if data.requisition %}
<!-- Main content -->
{% else %}
<div class="error_message">
  <h2>Error: No Request Data Available</h2>
  <p>Please ensure you have selected a valid requisition.</p>
</div>
{% endif %}
```

### Testing Advanced Features

1. Create test data with various scenarios:
   - Empty requisitions
   - Different statuses
   - Large quantities
   - Missing optional fields

2. Test print layout:
   - Use browser's print preview
   - Check page breaks
   - Verify color handling in print mode

3. Validate calculations:
   - Ensure totals are correct
   - Test edge cases (zero quantities, etc.)

### What We've Learned

- Advanced Tera conditionals and loops
- Macro definitions and usage
- Variable calculations and global state
- Safe data access patterns
- Print-specific styling
- Error handling in templates

In Tutorial 4, we'll dive deep into GraphQL queries and data fetching strategies.

---
