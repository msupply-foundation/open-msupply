+++
title = "Patterns"
description = "Description of all API sorting"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 2
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++


# Lists

Lists query and result have different shapes of request and response and lists share three generic arguments,

<ins>Query</ins>

For example query node, `invoices`

```graphqls
type query {
  invoices(sort: InvoiceSort, filter: InvoiceFilter, page: Page): {
      totalCount: Int,
      nodes: Invoice
  }
}
```

[Sort](/docs/api/patterns/#sorting) [Filter](/docs/api/patterns/#filtering) [Page](/docs/api/patterns/#pagination)


# Sorting

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting an array of sort objects.

**The sort object**

The sort object is two Key:Value pairs defining the field the result set is sorted by and an indicator of ascending or descending. Each entity is sortable by any of the fields of that entity.

For example, `InvoiceSort`

```graphqls
type InvoiceSort: [InvoiceSortOption]

type InvoiceSortOption {
   key: [InvoiceSortField]
   desc: Boolean
}

enum InvoiceSortOptions {
  CODE
  OTHER_PARTY_NAME
  ...
}
```

- key: Any scalar field on the entity in standard graphQL enum value case (capital snake).
- desc: Boolean indicator whether the sort should be descending.

**Limitations**

The API currently supports an array of a single sort object. (will apply only one element from sort array and discard the rest {TODO update when changed to do multi sort})

**Error handling**

Empty/undefined sort fields will result in no filtering and will not return an error.

However, when a field does not exist, or the key value is null, an error will be returned.

TODO: Shape of error

**Examples**

```graphql
query { 
    transaction(filter: [{ key: CONFIRM_DATE, desc: true }]) {
        id
        status
    }
}
```

# Filtering

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting a Filter object.

**The filter object**

The filter object is a set of Key:Value pairs, where each key is a field of the node returned by the query, and the value is an object with a [comparison operator](#comparison-operators) and value to filter by.

For example, `InvoiceFilter`

```graphqls
type InvoiceFilter {
  id: IntFilter
  code: StringFilter
  ...
}

type IntFilter {
  isNull: Boolean
  equalTo: Int
  notEqualTo: Int
  distinctFrom: Int
  notDistinctFrom: Int
  in: [Int]
  notIn: [Int]
  lessThan: Int
  greaterThan: Int
  greaterThanOrQualTo: Int
}

type StringFilter {
  isNull: Boolean
  equalTo: String
  ...
}
```

- Field: Any scalar field that query exposes
- Comparison operator: See below for available operators.
- Value: A value to filter the result set by.

The filter object can accept more than one field to filter by. Each additional field will filter the result set as if it were an `AND`.

**Comparison operators**

| SQL                  | GraphQL                   | Description                                                                |
| -------------------- | ------------------------- | -------------------------------------------------------------------------- |
| IS [NOT] NULL        | isNull: `Boolean`         | Is null (if `true` is specified) or is not null (if `false` is specified). |
| =                    | equalTo: `T`              | Equal to the specified value.                                              |
| <>                   | notEqualTo: `T`           | Not equal to the specified value.                                          |
| IS DISTINCT FROM     | distinctFrom: `T`         | Not equal to the specified value, treating null like an ordinary value.    |
| IS NOT DISTINCT FROM | notDistinctFrom: `T`      | Equal to the specified value, treating null like an ordinary value.        |
| IN (...)             | in: `[T]`                 | Included in the specified list.                                            |
| NOT IN (...)         | notIn: `[T]`              | Not included in the specified list.                                        |
| <                    | lessThan: `T`             | Less than the specified value.                                             |
| <=                   | lessThanOrEqualTo: `T`    | Less than or equal to the specified value.                                 |
| >                    | greaterThan: `T`          | Greater than the specified value.                                          |
| >=                   | greaterThanOrEqualTo: `T` | Greater than or equal to the specified value.                              |

SOURCE: https://github.com/graphile-contrib/postgraphile-plugin-connection-filter

**Limitations**

The API currently does not support:

- Data type specific filtering (i.e. String LIKE)
- Filtering on related entities/nodes within the graph.
- Logic (i.e. AND/OR's)

**Error handling**

Empty/undefined filter objects will result in no filtering and will not return an error.

However, when a field does not exist, or the field or comparator value is null, or comparator doesn't exist or comparator value type is incorrect, an error will be returned.

TODO: Shape of error

**Examples**

```graphql
query {
    transaction(filter: { status: {equalTo: "cn" } }) {
        id
        status
    }
}
```

```graphql
query {
    transaction(filter: { status: {equalTo: "cn" }, confirm_date: {greaterThan: "2021-09-03T11:42:53.569Z" } }) {
        id
        status
    }
}
```


# Pagination

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting a Page object.

```graphqls
type Page {
  first: Int
  offset: Int
}
```

| Key    | Restrictions                                          | Default             | Description                |
|--------|-------------------------------------------------------|---------------------|----------------------------|
| offset | offset => 0                                           | 0                   | Zero indexed page number   |
| first  | first > 0 and first <= `MAX_PAGE_SIZE` (*exception**) | `DEFAULT_PAGE_SIZE` | Number of records per page |

Each list query defines `MAX_PAGE_SIZE` and `DEFAULT_PAGE_SIZE`, see pagination section of [queries](/docs/api/queries

*exception** limit is NOT set for inner lists (like lines in a transaction) {TODO or should it be ? or should each list just have a pagination limit ?}

Offset above row range will not result in an error or rows.

`totalCount` is added as another field at the same level as `nodes` in the [list](/docs/api/patterns/#lists-and-pagination)

**Examples**

<ins>Query</ins>

```graphql
query {
  transactions(page: { first: 1, offset: 0 }) {
    totalCount
    nodes {
      id
      comment
    }
  }
}
```

<ins>Result</ins>

```json
{
  "transactions": {
    "totalCount": 2,
    "nodes": [
      {
        "id": "ABC",
        "comment": "123"
      }
    ]
  }
}
```

**Error handling**

{TODO, once we know the shape of errors}

```
// error when restrictions are not met
// no error if too far (just return last page)
```

# Errors

{ TODO Need to confirm that we can do any shape we want with async-graphql }
