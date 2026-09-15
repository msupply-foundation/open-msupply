+++
title = "Rust"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Code Review Comments/Preferences for mSupply Rust Code

## Run Clippy

Installing and running clippy can help identify a lot of common rust style issues, see https://github.com/rust-lang/rust-clippy

Unfortunately, a lot of our code doesn't follow clippy style guides right now, so it can be hard to identify where your code represented amongst other errors.

The list of clippy lints can be found here:
https://rust-lang.github.io/rust-clippy/master/index.html

## Prefer `.to_string()`

When working with strings in rust, there's a number of ways to convert a `str` value into a Owned String.

Given this code:
`let hello = "Hello World";`

We prefer using
```
let hello = hello.to_string();
```

This is fast to type, is easy to read, and logically the easiest to follow for less experienced rust developers.

**Avoid** alternatives such as `let hello = hello.to_owned();` or `let hello = String::from(hello);`

## Soft Delete

Any record that is deletable and used in sync must be `soft deleted`. This means that instead of entirely removing the record from the database, it is marked as deleted. This `Delete` status of the record can be synced across to any related sites.
This allows a record to essentially be removed for new data entry, but available for reference.

* When soft deleting a new record type, we recommend creating a nullable database field `deleted_datetime`.
This allows for recording the status of deleted, but also tells us when it happened which can be useful if tracing back an issue related to the record.

> HOWEVER if we are migrating a record from legacy mSupply and it uses another field type such as `is_active` or `is_enabled` we should keep this naming to avoid confusion across the databases.

* If a record is soft deleted, the repository `delete` method should be named `mark_deleted` to signal that it is using a soft delete
* Repository `query` methods should filter out all deleted records by default
* Id based requests such as `find_one_by_id` should still succeed even if the record is deleted, as it's often used to look up associated records that might be needed for viewing in an historical context (e.g. Invoices should still show the associated supplier and receiver even if one of them is now deleted).

## Record `modified_datetime` and `created_datetime` in database records

When investigating an issue, it is often helpful to see when a record was first created and when it was last modified. For most records that can be updated (e.g. master_data records, user accounts, items, etc) `modified_datetime` and `created_datetime` should be recorded in the database.


## Record `user_id` in database records

When investigating an issue, it is often helpful to see who last modified a record.

## Don't use `unwrap()` unless in tests

When you make a call to `unwrap()` if an error was to occur in the code the whole server could crash.
In tests this is ok, but in production code it should almost never be used.
If you have a use case where unwrap does make sense (say if you can't connect to the database on server start up) this useage must include a comment and justification.
See Also: https://levelup.gitconnected.com/rust-never-use-unwrap-in-production-c123b311f620

## Avoid indirection with From implementation

Avoid using `From` implementation, unless it's for a common type like `RepositoryError`.

Generally in Rust, `From` implementation is used to translate between types, then translations are done with `.into()` or `?` (for errors), this created a bit of indirection which is harder to trace (navigation to implementation or definition in IDE brings you to `trait` implementation). Although it's possible to navigate to actual implementation of the trait (by examining implementations of a type), it's much easier to navigate to a standard method for a type, like `to_domain`. And when re-mapping errors, it's more clearly done inline.

```rust
// Preferred:

let result = validate_parameter(&parameter).map_err(|e| match e {
     ValidateParameterResult::One(extra) => ValidateResult::One(extra),
     ValidateParameterResult::Two => ValidateResult::Two,
     ValidateParameterResult::Three => ValidateResult::Three,
})?;

// vs To be avoided:

let result = validate_parameter(&parameter)?; // Can't navigate to `?`

// ..

impl From<ValidateParameterResult> for ValidateResult {
    fn from(result: ValidateParameterResult) -> ValidateResult {
        match e {
            ValidateParameterResult::One(extra) => ValidateResult::One(extra),
            ValidateParameterResult::Two => ValidateResult::Two,
            ValidateParameterResult::Three => ValidateResult::Three,
        }
    }
}


// Preferred:

let result = get_record().map(RecordNode::to_domain)?;

// ..

impl RecordNode {
    fn to_domain(row: RecordRow) -> RecordNode {
        //  mapper
    }
}

// vs To be avoided:

let result = get_record().map(RecordNode::from)?;

// or

let result = get_record().map(|r| r.into())?;

// ..

impl From<RecordRow> for RecordNode {
    fn from(row: RecordRow) -> RecordNode {
        //  mapper
    }
}

```

## Prefer using Diesel table modules over DSL

Diesel's [getting started page](https://diesel.rs/guides/getting-started) has this to say:

> The use self::schema::posts::dsl::* line imports a bunch of aliases so that we can say `posts` instead of `posts::table`, and `published` instead of `posts::published`. It's useful when we're only dealing with a single table, but that's not always what we want. It's always important to keep imports to `schema::table::dsl::*` inside of the current function to prevent polluting the module namespace.

TL;DR: Use DSL for convenience if just working with one table in a function. Import the DSL local to functions rather than pollute the namespace of the whole module file.

Our experience has been that polluting the namespace is more trouble than it's worth, and it frequently conflicts as field names are often close to our variable naming. For instance when working near something like `requisition_line::stock_on_hand` it is appealing to have a local variable named `stock_on_hand`. If you've imported the DSL, it'll include `requisition_line::stock_on_hand` as just `stock_on_hand`, there will be a name space conflict when you make a variable called `stock_on_hand` with cryptic messaging. The pollution is hidden behind the `*` wildcard so it's not always intuitive what's happening.

## Don't alias Diesel DSLs

An early pattern in the codebase was to alias DSLs to get access to table definitions. The table modules already give access to all the fields in a more concise way, so we should prefer just using them directly:

```rust
db_diesel::{
  master_list_name_join::master_list_name_join::dsl as master_list_name_join_dsl,
  name_link_row::name_link::dsl as name_link_dsl,
  //...
}
//...
NameRepository::create_filtered_query(store_id.to_string(), Some(name_filter))
  .inner_join(
    master_list_name_join_dsl::master_list_name_join
      .on(master_list_name_join_dsl::name_link_id.eq(name_link_dsl::id)),
```

Can be:

```rust
db_diesel::{
  master_list_name_join::master_list_name_join,
  name_link_row::name_link,
  //...
}
//...
NameRepository::create_filtered_query(store_id.to_string(), Some(name_filter))
  .inner_join(
    master_list_name_join::table
      .on(master_list_name_join::name_link_id.eq(name_link::id)),
```

## Diesel Field Orders

The field order in your struct must match the column order in your database table when using [#[derive(Queryable)]](https://diesel.rs/guides/getting-started.html#:~:text=A%20Note%20on%20Field%20Order). If the order is inconsistent, it can result in data being assigned to the wrong fields, causing unexpected behavior such as swapped or incorrect values.

To prevent this, ensure that the fields in your struct are defined in the exact same order as the columns in your table. Maintaining this alignment is crucial for reliable data mapping and consistent query results.

```rust
table! {
    table_name (id) {
        id -> Text
        field_one -> Text
        field_two -> Text
        field_three -> Text
        field_four -> Text
    }
}
```

Matches
```rust
// RIGHT WAY
pub struct TableName {
    pub id: string,
    pub field_one: string,
    pub field_two: string,
    pub field_three: string,
    pub field_four: string,
}

// WRONG WAY
pub struct TableName {
    pub id: string,
    pub field_one: string,
    pub field_three: string,
    pub field_two: string,
    pub field_four: string,
}
```

## "empty_str_as_option" for Legacy Sync

In our Legacy mSupply product, often when records are saved, default values are used for the columns. In the case of a String/Alpha/Text column this equates to an `""` or empty string. It's important that we handle this correctly when syncing to open-mSupply because empty string would normally be seen as a value value, and if it's a foreign key constraint may prevent records from being inserted into the database.

For example `donor_id` on the `stock_line` table is a foreign key constraint to the `name`.

If we don't have code like this when deserializing the `LegacyStockLineRow`, all stocklines WITHOUT a `donor_id` set will not be inserted into the database.

```rust
#[serde(default)]
#[serde(deserialize_with = "empty_str_as_option_string")]
pub donor_id: Option<String>,
```
