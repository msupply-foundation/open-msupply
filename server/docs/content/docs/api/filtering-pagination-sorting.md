+++
title = "Filtering, pagination and sorting"
description = "Description of all API filtering pagination and sorting mechanisms"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 51
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

## Filtering

This API exposes a parameter on each query accepting a Filter object.

### Parameter shape

The filter object accepts a field, comparison operator and value.

```
{
   [field]: {
        [comparisonOperator]: [value]
    }
}
```

Field: Any field on the object returns from the query.
Comparison operators: See below for available operators.
Value: A value to filter the result set by.

The filter object can accept more than one field to filter by, however each additional field can be considered an `AND`.

### Comparison operators

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

### Limitations

The API currently does not support:

- Range filters (i.e. date within some range)
- Data type specific filtering (i.e. String LIKE)
- Filtering on related entities/nodes within the graph.
- Logic (i.e. AND/OR's)

### Error handling

NULL and empty filter objects will result in no filtering and will not return an error.

However, when a field does not exist, or the field or comparator value is null, an error will be returned.

TODO: Shape of error

### Examples

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

## Pagination

TODO

## Sorting

TODO
