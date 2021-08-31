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

# Sorting

This API exposes a parameter on each query accepting an array of sort objects.

**The sort object**

The sort object is two Key:Value pairs defining the field the result set is sorted by and an indicator of ascending or descending. Each entity is sortable by any of the fields of that entity.

```
{
   key: [EntityField],
   desc: Boolean,
}
```

- key: Any field on the entity.
- desc: Boolean indicator whether the sort should be descending.

**Limitations**

The API currently supports an array of a single sort object.

**Error handling**

NULL and empty sort fields will result in no filtering and will not return an error.

However, when a field does not exist, or the key value is null, an error will be returned.

TODO: Shape of error

**Examples**

```
{
    query transaction([{ key: "confirmDate", desc: true }]){
        id,
        status
    }
}
```

# Filtering

This API exposes a parameter on each query accepting a Filter object.

**The filter object**

The filter object is a set of Key:Value pairs, where each key is a field of the node returned by the query, and the value is an object with a [comparison operator](#comparison-operators) and value to filter by.

```
{
   [fieldOne]: {
        [comparisonOperator]: [value]
    },
    ...,
    [fieldN]: {
        [comparisonOperator]: [value]
    }
}
```

- Field: Any field on the object returns from the query.
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

- Range filters (i.e. date within some range)
- Data type specific filtering (i.e. String LIKE)
- Filtering on related entities/nodes within the graph.
- Logic (i.e. AND/OR's)

**Error handling**

NULL and empty filter objects will result in no filtering and will not return an error.

However, when a field does not exist, or the field or comparator value is null, an error will be returned.

TODO: Shape of error

**Examples**

```
{
    query transaction({ status: {equalTo: "cn" } }){
        id,
        status
    }
}
```

```
{
    query transaction({ status: {equalTo: "cn" }, confirm_date: {greaterThan: 1629687143 } }){
        id,
        status
    }
}
```

# Lists and Pagination

For lists, the base level of results for entity contains metadata and actual records are in `nodes` field.

**Examples**

<ins>Query</ins>

```gql
query {
  transactions {
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
    "nodes": [
      {
        "id": "ABC",
        "comment": "123"
      },
      {
        "id": "DEF",
        "comment": "456"
      }
    ]
  }
}
```

<ins>Query</ins>

```gql
query {
  transaction(id: "ABC") {
    id
    comment
    lines {
      nodes {
        id
        itemName
      }
    }
  }
}
```

<ins>Result</ins>

```json
{
  "transaction": {
    "id": "ABC",
    "comment": "123",
    "lines": {
      "nodes": [
        {
          "id": "GHI",
          "itemName": "amoxicillin"
        },
        {
          "id": "JKL",
          "itemName": "paracetamol"
        }
      ]
    }
  }
}
```

**Pagination**

An optional `totalCount` is available on all list queries, which give total number of records matching applied filter (if it's present).

The following arguments are available to all list queries

| Argument   | Restrictions                                       | Default | Description                |
| ---------- | -------------------------------------------------- | ------- | -------------------------- |
| pageNumber | pageNumber > 0                                     | 0       | Zero indexed page number   |
| pageSize   | pageSize > 0 and pageSize < 1000 (\*exception\*\*) | 100     | Number of records per page |

\*exception\*\* limit is NOT set for inner lists (like lines in a transaction) {TODO or should it be ? or should each list just have a pagination limit ?}

**Examples**

<ins>Query</ins>

```gql
query {
  transactions {
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
      },
      {
        "id": "DEF",
        "comment": "456"
      }
    ]
  }
}
```

<ins>Query</ins>

```gql
query {
  transactions(pageSize: 1, pageNumber: 0) {
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
