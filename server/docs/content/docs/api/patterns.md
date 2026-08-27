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

All list queries contain metadata and share three generic arguments:

- [Sort](/docs/api/patterns/#sorting)
- [Filter](/docs/api/patterns/#filtering)
- [Page](/docs/api/patterns/#pagination)

**Metadata**

- totalCount: A count of the total number of entities, ignoring any [pagination](/docs/api/patterns/#pagination). This allows a client to fetch the first five objects by passing "5" as the argument to "first", then fetch the total count so it could display "5 of 83", for example.

<ins>Example</ins>

```graphql
type Query {
  invoices(sort: InvoiceSort, filter: InvoiceFilter, page: Page): {
      totalCount: Int,
      nodes: [Invoice]
  }
}
```

_An example query for a list of `invoice` entities and some metadata: `totalCount`_

# Sorting

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting an array of sort objects.

**The sort object**

The sort object is two Key:Value pairs defining which field the result set is sorted by and an indicator of ascending or descending. Each entity is sortable by any of the fields of that entity.

- key: Any scalar field on the entity in standard graphQL enum value case (capital snake).
- desc: Boolean indicator whether the sort should be descending.

<ins>Example GraphQL schema</ins>

```graphql
type InvoiceSort: [InvoiceSortOption]

type InvoiceSortOption {
   key: InvoiceSortField
   desc: Boolean
}

enum InvoiceSortField {
  CODE
  OTHER_PARTY_NAME
  ...otherSortOptions
}
```

_Example shapes for sorting a query for `invoice` entities_

<ins>Example GraphQL query</ins>

```graphql
query {
  invoices(sort: [{ key: CONFIRM_DATE, desc: true }]) {
    id
    status
  }
}
```

_Example query for sorting `invoice` entities by their confirm date in descending order_

**Limitations**

The API currently supports an array of a single sort object. (will apply only one element from sort array and discard the rest _{TODO update when changed to do multi sort}_)

**Error handling**

Empty/undefined sort fields will result in no filtering and will not return an error.

However, when a field does not exist, or the key value is null, a [type mismatch](/docs/api/patterns/#errors) error will be returned.


# Filtering

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting a Filter object.

**The filter object**

The filter object is a set of Key:Value pairs, where each key is a field of the node returned by the query, and the value is an object with a [comparison operator](#comparison-operators) and value to filter by.

- Field: Any scalar field that query exposes
- Comparison operator: See below for available operators.
- Value: A value to filter the result set by.

The filter object can accept more than one field to filter by. Each additional field will filter the result set as if it were an `AND`.

<ins>Example</ins>

```graphql
type InvoiceFilter {
  id: IntFilter
  code: StringFilter
  ...otherFilterTypes
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
  ...otherStringFilters
}
```

_Example shapes for filtering a query for `invoice` entities_

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

<ins>Example</ins>

```graphql
query {
  invoices(filter: { status: { equalTo: "cn" } }) {
    id
    status
  }
}
```

_Example of a query for `invoice` entities being filtered by their status being equal to "cn"_

```graphql
query {
  transaction(
    filter: {
      status: { equalTo: "cn" }
      confirm_date: { greaterThan: "2021-09-03T11:42:53.569Z" }
    }
  ) {
    id
    status
  }
}
```

_Example of a query for `invoice` entities being filtered by their status being equal to "cn" and the confirm date being greater than the 3rd of September, 2021, 11:42am!_

**Error handling**

Empty/undefined filter objects will result in no filtering and will not return an error.

However, when a field does not exist, or the field or comparator value is null, or comparator doesn't exist or comparator value type is incorrect, a [type mismatch](/docs/api/patterns/#errors) will be returned.

# Pagination

This API exposes a parameter on each [list](/docs/api/patterns/#lists) query accepting a Page object.

**The Page Object**

```graphql
type PageObject {
  first: Int
  offset: Int
}
```
_Shape of the Page object_

| Key    | Restrictions                                           | Default             | Description                |
| ------ | ------------------------------------------------------ | ------------------- | -------------------------- |
| offset | offset => 0                                            | 0                   | Zero indexed page number   |
| first  | first > 0 and first <= `MAX_PAGE_SIZE` (_exception_\*) | `DEFAULT_PAGE_SIZE` | Number of records per page |

_exception_\* limit is NOT set for inner lists (like lines in a transaction) _{TODO or should it be ? or should each list just have a pagination limit ?}_

- Each list query defines the value of `MAX_PAGE_SIZE` and `DEFAULT_PAGE_SIZE` (see pagination section of [queries](/docs/api/queries)).
- A value for `offset` above `totalCount` will return an empty array.
<ins>Example</ins>


```graphql
query {
  invoices(page: { first: 1, offset: 0 }) {
    totalCount
    nodes {
      id
      comment
    }
  }
}
```

_An example query for `invoice` entities, where the first 1 entity is returned_


<ins>Result</ins>

```JSON
{
  "invoices": {
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

If restrictions are not met [pagination error](/docs/api/custom_error/#pagination) will be returned

```JS
// error when restrictions are not met
// no error if too far (just return last page)
```

# Errors

Three types of errors:

**Critical**

These are unhandled errors, they will result in connection close.

<details>
<summary>Further Info</summary>
If there is a rust `panic` in web request process, it seems the connection just closes, we can probably handle this better _{TODO}_, would assume we can catch these panics in actix-web. Of course we will try to eliminate them, but it's possible that some panics will sneak in (i.e. if we use panic vs return result method from external 
crates)
</details>
&nbsp;

**GraphQL**

These errors are handled by `async-graphql`:
* GraphQL syntax
* Type mismatch

They have the following shape:

```TypeScript
type CoreGraphqlErrorResult = {
  data: null,
  errors: {
    message: string,
    locations: {
      line: number,
      column: number
    }
  }[]
}
```

<ins>Example Response: GraphQL syntax</ins>
```JSON
{
    "data": null,
    "errors": [
        {
            "message": " --> 2:3\n  |\n2 |   name(␊\n  |   ^---\n  |\n  = expected variable_definitions, selection_set, or directive",
            "locations": [
                {
                    "line": 2,
                    "column": 3
                }
            ]
        }
    ]
}
```

<ins>Example Response: Type mismatch</ins>

```JSON
{
  "data": null,
  "errors": [
    {
      "message": "Invalid value for argument \"structuredInput.1.type\", enumeration type \"ExampleInputVariants\" does not contain the value \"FOUR\"",
      "locations": [
        {
          "line": 74,
          "column": 16
        }
      ]
    }
  ]
}
```

**Custom Error**

These are errors that we handle explicitly, they have the following shape

```TypeScript
// TypeScript
type CustomGraphqlErrorResult = {
  data: null,
  errors: {
    message: 'CUSTOM_ERROR',
    locations: {
      line: number,
      column: number
    },
    path: string[],
    extensions: {
      customErrors: CustomError[]
    } 
  }[]
}

interface CustomError {
  code: CustomErrorCodes
}

// Examples only
enum CustomErrorCodes {
  RecordNotFound = "RECORD_NOT_FOUND",
  BatchReductionBelowZero = "BATCH_REDUCTION_BELOW_ZERO",
  // Other errors codes
}

```

Custom error instances extend CustomError interface, and their shape is different based on error type.

[Full list of errors](/docs/api/custom_errors)

<ins>Example RecordNotFoundError error</ins>

```TypeScript
interface RecordNotFoundError extends CustomError {
  code: CustomErrorCodes.RecordNotFound,
  specifiedField: string,
}
```

```JSON
{
  "data": null,
  "errors": [
    {
      "message": "CUSTOM_ERROR",
      "locations": [
        {
          "line": 60,
          "column": 3
        },
      ],
      "path": [ "invoice" ],
      "extensions": {
        "customErrors": [
          {
          "code": "RECORD_NOT_FOUND",
          "specifiedField": "id",
          }
        ]
      }
    }
  ]
}
``` 

**Batched Queries**

Batched query is where more then one root query is listed in GraphQL query, i.e:

```graphql
query {
  invoice(id: 10) {
    id
    comment
  }
  items {
    id
    code
    name
  }
}
```

In error handling context, errors for individual root query would typically appear as a separate `errors` element, it looks like `async-graphql` doesn't do this and only one error is returned in the array (the first one that's triggered).