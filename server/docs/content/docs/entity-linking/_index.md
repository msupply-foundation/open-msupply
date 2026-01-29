+++
title = "Entity Linking"
description = "Documentation for the entity linking pattern used to support name, item, and clinician merging."
date = 2025-01-07T00:00:00+00:00
updated = 2025-01-07T00:00:00+00:00
sort_by = "weight"
weight = 5
template = "docs/section.html"
+++

# Entity Linking Pattern

This documentation explains the entity linking abstraction pattern used in Open mSupply to support merging of entities like Names, Items, and Clinicians.

## Problem Statement

Open mSupply supports **merging** entities. For example, if "Name B" is merged into "Name A", all references to Name B should resolve to Name A. This is tracked via link tables (e.g., `name_link`, `item_link`, `clinician_link`).

### The Duplication Problem

When querying entities with link tables, merged records return duplicate rows:

```sql
-- If Name B was merged into Name A:
-- name_link table contains:
-- | id | name_id |
-- | A  | A       |  <- Name A points to itself
-- | B  | A       |  <- Name B (merged) points to A

-- Joining name to name_link returns TWO rows for Name A:
SELECT * FROM name
INNER JOIN name_link ON name.id = name_link.name_id;
-- Row 1: Name A with name_link.id = 'A'
-- Row 2: Name A with name_link.id = 'B'  <- Duplicate!
```

### Related Entity Complexity

Tables like `name_store_join`, `master_list_name_join`, etc. reference `name_link_id` (not `name_id`). When names merge, the system must return the **union** of related records across merged names without duplication.

## Solution Architecture

The solution abstracts `*_link_id` columns away from the public API, keeping them private to the repository layer.

### Key Components

#### 1. Database Views

Views that resolve `*_link_id` to the actual entity ID:

```sql
-- server/repository/src/migrations/views/link_views.rs

CREATE VIEW name_store_join_view AS
SELECT
    name_store_join.*,
    name_link.name_id as name_id
FROM
    name_store_join
JOIN
    name_link ON name_store_join.name_link_id = name_link.id;

CREATE VIEW store_view AS
SELECT
    store.*,
    name_link.name_id as name_id
FROM
    store
JOIN
    name_link ON store.name_link_id = name_link.id;
```

These views add a resolved `name_id` column that always points to the canonical entity.

#### 2. The `define_linked_tables!` Macro

A macro that generates dual Diesel table definitions:

```rust
// server/repository/src/diesel_macros.rs

define_linked_tables!(
    view: name_store_join = "name_store_join_view",      // For reading (uses resolved IDs)
    core: name_store_join_with_links = "name_store_join", // For writing (uses link IDs)
    struct: NameStoreJoinRow,
    repo: NameStoreJoinRepository,
    shared: {
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
    },
    links: {
        name_link_id -> name_id,  // Required link: Maps link column to resolved column
    },
    optional_links: {
        donor_link_id -> donor_id,  // Optional link: For nullable foreign keys
    }
);
```

This generates:
- **View table** (`name_store_join`): Queries the view with resolved `name_id` and `donor_id`
- **Core table** (`name_store_join_with_links`): Writes to the actual table with `name_link_id` and `donor_link_id`
- **Upsert method**: Automatically maps `name_id` → `name_link_id` and `donor_id` → `donor_link_id` on insert

**Links vs Optional Links:**
- `links`: For required (NOT NULL) foreign keys - generates non-optional fields in the struct
- `optional_links`: For nullable foreign keys - generates `Option<String>` fields in the struct

#### 3. Domain Structs Without Link References

Domain objects expose the resolved ID, not the link ID:

```rust
// Before (leaky abstraction):
pub struct NameStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub name_link_id: String,  // Exposes implementation detail
    // ...
}

// After (clean abstraction):
pub struct NameStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub name_id: String,  // Uses resolved canonical ID
    // ...
}
```

#### 4. Subquery-Based Filtering

When filtering by `name_link_id` is needed (e.g., from external references), use a subquery:

```rust
// server/repository/src/db_diesel/name.rs

if name_link_id.is_some() {
    let mut inner_query = name_link::table.into_boxed();
    apply_equal_filter!(inner_query, name_link_id, name_link::id);

    // Resolve to name_id via subquery
    query = query.filter(name::id.eq_any(inner_query.select(name_link::name_id)));
}
```

## Implementation Guide

### Adding Link Abstraction to a New Table

1. **Create the view migration** in `server/repository/src/migrations/views/link_views.rs`:

```sql
CREATE VIEW my_table_view AS
SELECT
    my_table.*,
    name_link.name_id as name_id,
    donor_link.name_id as donor_id
FROM
    my_table
JOIN
    name_link ON my_table.name_link_id = name_link.id
LEFT JOIN
    name_link AS donor_link ON my_table.donor_link_id = donor_link.id;
```

**Note:** Use `JOIN` for required links and `LEFT JOIN` for optional links.

2. **Use `define_linked_tables!`** in your row module:

```rust
use crate::diesel_macros::define_linked_tables;

define_linked_tables!(
    view: my_table = "my_table_view",
    core: my_table_with_links = "my_table",
    struct: MyTableRow,
    repo: MyTableRepository,
    shared: {
        // List all columns except id and link columns
        some_field -> Text,
    },
    links: {
        name_link_id -> name_id,  // Required link
    },
    optional_links: {
        donor_link_id -> donor_id,  // Optional link (for nullable FKs)
    }
);
```

3. **Update your struct** to use resolved IDs:

```rust
pub struct MyTableRow {
    pub id: String,
    pub some_field: String,
    // Resolved from name_link - must be last to match view column order
    pub name_id: String,  // NOT name_link_id (required field)
    pub donor_id: Option<String>,  // NOT donor_link_id (optional field)
}
```

**Important:** Resolved link fields must appear at the end of the struct in the same order as the view definition to match Diesel's query column order.

4. **Update queries** to use the view table for reading and core table for writing.

### Updating Existing Code

When refactoring existing code:

1. **Remove `*LinkRow` from domain structs** (e.g., remove `name_link_row` from `Name`)
2. **Change filters** from `StringFilter` to `EqualFilter<String>` for link ID fields
3. **Remove direct joins** to link tables; use subqueries instead
4. **Update tests** to not construct `*LinkRow` objects
5. **Update mock data** to use resolved IDs instead of link IDs

## Benefits

1. **No duplicate records**: Queries return one row per entity, regardless of merge history
2. **Clean API**: External layers never see `*_link_id` columns
3. **Automatic resolution**: The database handles link resolution via views
4. **Write transparency**: Inserts/updates automatically use the correct link ID
5. **Testability**: Tests don't need to construct link row objects

## Related Issues

- [#2937 - Make item_link_id, name_link_id and clinician_link_id private to repository layer](https://github.com/msupply-foundation/open-msupply/issues/2937)
- [#9824 - Rethink name_link joins in name repository](https://github.com/msupply-foundation/open-msupply/issues/9824)
