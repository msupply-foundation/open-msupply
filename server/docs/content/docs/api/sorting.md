+++
title = "Sorting"
description = "Description of all API sorting"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 51
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

This API exposes a parameter on each query accepting an array of sort objects.

### The sort object

The sort object is two Key:Value pairs defining the field the result set is sorted by and an indicator of ascending or descending. Each entity is sortable by any of the fields of that entity.

```
{
   key: [EntityField],
   desc: Boolean,
}
```

- key: Any field on the entity.
- desc: Boolean indicator whether the sort should be descending.

### Limitations

The API currently supports an array of a single sort object.

### Error handling

NULL and empty sort fields will result in no filtering and will not return an error.

However, when a field does not exist, or the key value is null, an error will be returned.

TODO: Shape of error

### Examples

```
{
    query transaction([{ key: "confirmDate", desc: true }]){
        id,
        status
    }
}
```
