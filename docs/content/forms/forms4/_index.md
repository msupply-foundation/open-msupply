+++
title = "Forms Tutorial 4"
description = "Mastering GraphQL Queries"
weight = 8
sort_by = "weight"
template = "docs/section.html"


[extra]
toc = true
top = false
+++

## Tutorial 4: Mastering GraphQL Queries and Data Fetching

### Objective

Learn how to write efficient GraphQL queries, handle complex data relationships, and optimize data fetching for your forms.

### Understanding Open mSupply's GraphQL Schema

Open mSupply exposes data through a GraphQL API. Each context (REQUISITION, STOCKTAKE, etc.) provides access to specific data types and relationships.

#### Basic Query Structure

```graphql
query MyFormQuery($storeId: String!, $dataId: String!) {
  # Main entity query
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      # Basic fields
      id
      status
      requisitionNumber
      createdDatetime

      # Related entities
      otherParty(storeId: $storeId) {
        name
        code
      }
    }
  }

  # Store information (usually available in all contexts)
  store(id: $storeId) {
    ... on StoreNode {
      storeName
      logo
    }
  }
}
```

### Advanced Query Patterns

#### 1. Deep Nested Relationships

```graphql
query ComplexRequisitionQuery($storeId: String!, $dataId: String!) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      status
      requisitionNumber
      theirReference
      createdDatetime
      finalisedDatetime
      comment
      maxMonthsOfStock

      # Supplier/Customer information
      otherParty(storeId: $storeId) {
        name
        id
        code
        address1
        address2
        phone
        email
        isSupplier
        isCustomer
      }

      # Line items with detailed information
      lines {
        nodes {
          id
          requestedQuantity
          supplyQuantity
          remainingQuantityToSupply
          alreadyIssued
          comment

          # Item details
          item {
            id
            code
            name
            unitName
            defaultPackSize
          }

          # Stock statistics
          itemStats {
            stockOnHand
            averageMonthlyConsumption
            monthsOfStockOnHand
            maximumQuantity
            minimumQuantity
          }
        }
      }
    }
  }

  # Extended store information
  store(id: $storeId) {
    ... on StoreNode {
      id
      code
      storeName
      logo

      # Store contact details
      name(storeId: $storeId) {
        ... on NameNode {
          name
          address1
          address2
          code
          phone
          email
          website
          country
        }
      }
    }
  }
}
```

#### 2. Conditional Queries with Fragments

```graphql
query RequisitionWithConditionalData(
  $storeId: String!
  $dataId: String!
  $includeStats: Boolean = true
) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      ...BasicRequisitionInfo

      lines {
        nodes {
          ...LineItemInfo

          # Conditional inclusion of stock statistics
          itemStats @include(if: $includeStats) {
            stockOnHand
            averageMonthlyConsumption
            monthsOfStockOnHand
          }
        }
      }
    }
  }

  store(id: $storeId) {
    ...StoreInfo
  }
}

fragment BasicRequisitionInfo on RequisitionNode {
  id
  status
  requisitionNumber
  createdDatetime
  finalisedDatetime
  comment
}

fragment LineItemInfo on RequisitionLineNode {
  id
  requestedQuantity
  supplyQuantity
  item {
    code
    name
    unitName
  }
}

fragment StoreInfo on StoreNode {
  id
  storeName
  logo
  name(storeId: $storeId) {
    address1
    address2
    phone
    email
  }
}
```

#### 3. Handling Different Entity Types

```graphql
query StocktakeQuery($storeId: String!, $dataId: String!, $sort: PrintReportSortInput) {
  stocktake(storeId: $storeId, id: $dataId) {
    ... on StocktakeNode {
      id
      stocktakeDate
      stocktakeNumber
      status
      description
      comment
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }

  stocktakeLines(storeId: $storeId, stocktakeId: $dataId, reportSort: $sort) {
    ... on StocktakeLineConnector {
      totalCount
      nodes {
        id
        item {
          ... on ItemNode {
            code
            name
            unitName
          }
        }
        packSize
        expiryDate
        countedNumberOfPacks
        snapshotNumberOfPacks
        batch
        costPricePerPack

        # Location information
        location {
          id
          code
          name
          onHold
        }

        # Reason for adjustments
        reasonOption {
          ... on ReasonOptionNode {
            id
            reason
          }
        }
      }
    }
  }

  store(id: $storeId) {
    ... on StoreNode {
      storeName
      logo
    }
  }
}
```

### Query Optimization Techniques

#### 1. Selective Field Querying

Only request fields you actually use in your template:

```graphql
# Bad - requesting unnecessary fields
query IneffientQuery($storeId: String!, $dataId: String!) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      # Getting all fields even if not used
      id
      status
      requisitionNumber
      type
      createdDatetime
      sentDatetime
      finalisedDatetime
      expectedDeliveryDatetime
      comment
      theirReference
      maxMonthsOfStock
      minMonthsOfStock
      approvalStatus
      programId
      period
      orderType
      # ... many more fields
    }
  }
}

# Good - only requesting needed fields
query EfficientQuery($storeId: String!, $dataId: String!) {
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
}
```

#### 2. Using Sorting and Filtering

```graphql
query SortedStocktakeQuery(
  $storeId: String!
  $dataId: String!
  $sort: PrintReportSortInput
  $filter: StocktakeLineFilterInput
) {
  stocktakeLines(
    storeId: $storeId
    stocktakeId: $dataId
    reportSort: $sort
    filter: $filter
    first: 100 # Limit results for performance
  ) {
    ... on StocktakeLineConnector {
      totalCount
      nodes {
        id
        item {
          code
          name
        }
        packSize
        countedNumberOfPacks
        snapshotNumberOfPacks
        batch
        expiryDate
      }
    }
  }
}
```

#### 3. Pagination for Large Datasets

```graphql
query PaginatedInvoiceLines(
  $storeId: String!
  $invoiceId: String!
  $first: Int = 50
  $after: String
  $sort: PrintReportSortInput
) {
  invoiceLines(
    storeId: $storeId
    filter: { invoiceId: { equalTo: $invoiceId } }
    first: $first
    after: $after
    reportSort: $sort
  ) {
    ... on InvoiceLineConnector {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        id
        itemName
        numberOfPacks
        packSize
        batch
        expiryDate
        location {
          code
        }
      }
    }
  }
}
```

### Context-Specific Query Examples

#### Purchase Order Query

```graphql
query PurchaseOrderQuery($dataId: String!, $storeId: String!) {
  purchaseOrder(storeId: $storeId, id: $dataId) {
    ... on PurchaseOrderNode {
      id
      number
      status
      createdDatetime
      expectedDeliveryDatetime
      confirmedDatetime
      finalisedDatetime
      colour
      comment
      theirReference

      # Supplier information
      supplier {
        id
        name
        code
        address1
        address2
        phone
        email
      }

      # Purchase order lines
      lines {
        nodes {
          id
          lineNumber
          itemId
          packSize
          numberOfPacks
          requestedQuantity
          approvedQuantity
          suppliedQuantity
          unitCost
          totalCost

          item {
            id
            name
            code
            unitName
            defaultPackSize
          }
        }
      }

      # Store making the purchase
      store {
        id
        storeName
        logo

        name(storeId: $storeId) {
          name
          address1
          address2
          phone
          email
        }
      }

      # Financial totals
      pricing {
        subTotal
        taxPercentage
        taxAmount
        totalAfterTax
        totalBeforeTax
      }
    }
  }
}
```

#### Invoice Query with Line Details

```graphql
query DetailedInvoiceQuery($storeId: String!, $dataId: String!, $sort: PrintReportSortInput) {
  invoice(storeId: $storeId, id: $dataId) {
    ... on InvoiceNode {
      id
      invoiceNumber
      status
      type
      createdDatetime
      allocatedDatetime
      pickedDatetime
      shippedDatetime
      deliveredDatetime
      verifiedDatetime
      comment
      theirReference

      # Customer/Supplier information
      otherParty(storeId: $storeId) {
        id
        name
        code
        address1
        address2
        phone
        email
        isCustomer
        isSupplier
      }

      # User who created the invoice
      user {
        username
        displayName
        email
      }

      # Pricing information
      pricing {
        stockTotalBeforeTax
        stockTotalAfterTax
        serviceTotalBeforeTax
        serviceTotalAfterTax
        taxPercentage
        totalBeforeTax
        totalAfterTax
        foreignCurrencyTotalAfterTax
      }

      # Currency information
      currency {
        id
        code
        rate
        isHomeCurrency
      }
    }
  }

  # Detailed line items
  invoiceLines(storeId: $storeId, filter: { invoiceId: { equalTo: $dataId } }, reportSort: $sort) {
    ... on InvoiceLineConnector {
      totalCount
      nodes {
        id
        type
        itemCode
        itemName
        locationName
        packSize
        numberOfPacks
        unitQuantity
        batch
        expiryDate
        sellPricePerPack
        costPricePerPack

        # Location details
        location {
          id
          code
          name
          onHold
        }

        # Item details
        item {
          id
          code
          name
          unitName
          defaultPackSize
          isVisible
        }

        # Stock line information (for tracking)
        stockLine {
          id
          totalQuantity
          availableQuantity
          onHold
        }

        # Line pricing
        pricing {
          totalBeforeTax
          totalAfterTax
          taxPercentage
        }
      }
    }
  }

  store(id: $storeId) {
    ... on StoreNode {
      id
      code
      storeName
      logo

      name(storeId: $storeId) {
        name
        address1
        address2
        code
        phone
        email
        website
      }
    }
  }
}
```

### Error Handling in GraphQL Queries

#### 1. Handling Node Errors

```graphql
query RequisitionWithErrorHandling($storeId: String!, $dataId: String!) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      status
      requisitionNumber
      # ... other fields
    }
    ... on NodeError {
      __typename
      error {
        description
        fullError
      }
    }
    ... on RecordNotFound {
      __typename
      description
    }
  }
}
```

#### 2. Template Error Handling

In your template, handle potential errors:

```html
<!-- In template.html -->
{% if data.requisition.__typename == "NodeError" %}
<div class="error_message">
  <h2>Error Loading Requisition</h2>
  <p>{{ data.requisition.error.description }}</p>
</div>
{% elif data.requisition.__typename == "RecordNotFound" %}
<div class="error_message">
  <h2>Requisition Not Found</h2>
  <p>{{ data.requisition.description }}</p>
</div>
{% elif data.requisition %}
<!-- Normal template content -->
<div class="requisition_content">
  <!-- Your form content here -->
</div>
{% else %}
<div class="error_message">
  <h2>No Data Available</h2>
  <p>Unable to load requisition data.</p>
</div>
{% endif %}
```

### Query Variables and Arguments

#### Using Variables Effectively

Update your manifest to accept custom arguments:

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
  "arguments": {
    "includeStats": true,
    "sortBy": "itemName",
    "maxItems": 100
  },
  "header": "header.html"
}
```

Then use these in your query:

```graphql
query EquipmentRequestQuery(
  $storeId: String!
  $dataId: String!
  $includeStats: Boolean = true
  $sortBy: String = "itemName"
  $maxItems: Int = 100
) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      status
      requisitionNumber

      lines(first: $maxItems) {
        nodes {
          requestedQuantity
          item {
            code
            name
          }

          itemStats @include(if: $includeStats) {
            stockOnHand
            averageMonthlyConsumption
          }
        }
      }
    }
  }
}
```

### Performance Optimization Tips

#### 1. Query Complexity Analysis

```graphql
# High complexity - avoid deep nesting
query ComplexQuery($storeId: String!) {
  invoices(storeId: $storeId) {
    nodes {
      lines {
        nodes {
          stockLine {
            item {
              masterlists {
                nodes {
                  lines {
                    nodes {
                      # Too many levels!
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

# Better - focused query
query EfficientQuery($storeId: String!, $invoiceId: String!) {
  invoice(storeId: $storeId, id: $invoiceId) {
    ... on InvoiceNode {
      id
      invoiceNumber

      lines {
        nodes {
          itemName
          numberOfPacks
          item {
            code
            name
          }
        }
      }
    }
  }
}
```

#### 2. Field Selection Best Practices

```graphql
# Instead of requesting all item fields
item {
  id
  code
  name
  description
  unitName
  defaultPackSize
  outerPackSize
  strength
  volume
  weight
  # ... many more
}

# Only request what you need
item {
  code
  name
  unitName
}
```

### Testing Your Queries

#### 1. Using GraphQL Playground

If available, test your queries in GraphQL Playground:

1. Navigate to your GraphQL endpoint
2. Paste your query
3. Add test variables
4. Execute and verify results

#### 2. Query Validation

Create a simple test template to validate your query:

```html
<!-- test-template.html -->
<h1>Query Test Results</h1>

<h2>Raw Data Debug</h2>
<pre>{{ data | json_encode(pretty=true) }}</pre>

<h2>Requisition Info</h2>
{% if data.requisition %}
<p>ID: {{ data.requisition.id }}</p>
<p>Number: {{ data.requisition.requisitionNumber }}</p>
<p>Status: {{ data.requisition.status }}</p>
<p>Lines Count: {{ data.requisition.lines.nodes | length }}</p>
{% else %}
<p>No requisition data</p>
{% endif %}

<h2>Store Info</h2>
{% if data.store %}
<p>Name: {{ data.store.storeName }}</p>
<p>Logo: {{ data.store.logo }}</p>
{% else %}
<p>No store data</p>
{% endif %}
```

### What We've Learned

- GraphQL query structure and syntax
- Advanced querying techniques (fragments, variables, conditionals)
- Context-specific query patterns
- Error handling in queries and templates
- Performance optimization strategies
- Query testing and validation

In Tutorial 5, we'll cover deployment, versioning, and maintaining your forms in production.

---
