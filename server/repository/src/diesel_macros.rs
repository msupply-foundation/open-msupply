/// Example expand, when called with:
///
/// ```
/// apply_equal_filter!(query, filter.id, location_dsl::id)
/// ```
///
/// ```
/// if let Some(equal_filter) = filter.id {
///     if let Some(value) = equal_filter.equal_to {
///         query = query.filter(location_dsl::id.eq(value));
///     }
///
///     if let Some(value) = equal_filter.equal_any {
///         query = query.filter(location_dsl::id.eq_any(value));
///     }
/// }
/// ```
macro_rules! apply_equal_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(equal_filter) = $filter_field {
            if let Some(value) = equal_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = equal_filter.not_equal_to {
                $query = $query.filter($dsl_field.ne(value));
            }

            if let Some(value) = equal_filter.not_equal_to_or_null {
                $query = $query.filter($dsl_field.ne(value).or($dsl_field.is_null()));
            }

            if let Some(value) = equal_filter.equal_any {
                $query = $query.filter($dsl_field.eq_any(value));
            }

            if let Some(value) = equal_filter.equal_any_or_null {
                $query = $query.filter($dsl_field.eq_any(value).or($dsl_field.is_null()));
            }

            if let Some(value) = equal_filter.not_equal_all {
                $query = $query.filter($dsl_field.ne_all(value));
            }

            $query = match equal_filter.is_null {
                Some(true) => $query.filter($dsl_field.is_null()),
                Some(false) => $query.filter($dsl_field.is_not_null()),
                None => $query,
            }
        }
    }};
}

/// OR variant of [`apply_equal_filter`], applying the equal filter with
/// `or_filter` instead of `filter`. Used to combine an equal filter with other
/// (OR'd) filters of a potentially different data type, e.g. matching an
/// `invoice_number` (i64) OR a `status` (enum) from a single search term.
///
/// Warning: All OR filters need to be called before AND filters to work correctly.
macro_rules! apply_equal_or_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(equal_filter) = $filter_field {
            if let Some(value) = equal_filter.equal_to {
                $query = $query.or_filter($dsl_field.eq(value));
            }

            if let Some(value) = equal_filter.not_equal_to {
                $query = $query.or_filter($dsl_field.ne(value));
            }

            if let Some(value) = equal_filter.not_equal_to_or_null {
                $query = $query.or_filter($dsl_field.ne(value).or($dsl_field.is_null()));
            }

            if let Some(value) = equal_filter.equal_any {
                $query = $query.or_filter($dsl_field.eq_any(value));
            }

            if let Some(value) = equal_filter.equal_any_or_null {
                $query = $query.or_filter($dsl_field.eq_any(value).or($dsl_field.is_null()));
            }

            if let Some(value) = equal_filter.not_equal_all {
                $query = $query.or_filter($dsl_field.ne_all(value));
            }

            $query = match equal_filter.is_null {
                Some(true) => $query.or_filter($dsl_field.is_null()),
                Some(false) => $query.or_filter($dsl_field.is_not_null()),
                None => $query,
            }
        }
    }};
}

#[cfg(not(feature = "postgres"))]
macro_rules! apply_string_filter_method {
    ($query:ident, $filter_method:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(filter) = $filter_field {
            if let Some(value) = filter.equal_to {
                $query = $query.$filter_method($dsl_field.eq(value));
            }
            if let Some(value) = filter.not_equal_to {
                $query = $query.$filter_method($dsl_field.ne(value));
            }
            if let Some(value) = filter.equal_any {
                $query = $query.$filter_method($dsl_field.eq_any(value));
            }
            if let Some(value) = filter.not_equal_all {
                $query = $query.$filter_method($dsl_field.ne_all(value));
            }
            if let Some(value) = filter.like {
                // in sqlite like is case insensitive (but on only works with ASCII chars)
                $query = $query.$filter_method($dsl_field.like(format!("%{}%", value)));
            }
            if let Some(value) = filter.starts_with {
                // in sqlite like is case insensitive (but on only works with ASCII chars)
                $query = $query.$filter_method($dsl_field.like(format!("{}%", value)));
            }
            if let Some(value) = filter.ends_with {
                // in sqlite like is case insensitive (but on only works with ASCII chars)
                $query = $query.$filter_method($dsl_field.like(format!("%{}", value)));
            }
        }
    }};
}
#[cfg(feature = "postgres")]
macro_rules! apply_string_filter_method {
    ($query:ident,  $filter_method:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(filter) = $filter_field {
            if let Some(value) = filter.equal_to {
                $query = $query.$filter_method($dsl_field.eq(value));
            }
            if let Some(value) = filter.not_equal_to {
                $query = $query.$filter_method($dsl_field.ne(value));
            }
            if let Some(value) = filter.equal_any {
                $query = $query.$filter_method($dsl_field.eq_any(value));
            }
            if let Some(value) = filter.not_equal_all {
                $query = $query.$filter_method($dsl_field.ne_all(value));
            }
            if let Some(value) = filter.like {
                // Use case insensitive like
                $query = $query.$filter_method($dsl_field.ilike(format!("%{}%", value)));
            }
            if let Some(value) = filter.starts_with {
                // Use case insensitive like
                $query = $query.$filter_method($dsl_field.ilike(format!("{}%", value)));
            }
            if let Some(value) = filter.ends_with {
                // Use case insensitive like
                $query = $query.$filter_method($dsl_field.ilike(format!("%{}", value)));
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_string_filter!(query, code, clinician_dsl::code)
/// ```
///
/// ```
//  if let Some(code) = filter_field {
//     if let Some(value) = filter.equal_to {
//         query = query.filter(clinician_dsl::code.eq(value));
//     }
//     if let Some(value) = filter.not_equal_to {
//         query = query.filter(clinician_dsl::code.ne(value));
//     }
//     if let Some(value) = filter.equal_any {
//         query = query.filter(clinician_dsl::code.eq_any(value));
//     }
//     if let Some(value) = filter.not_equal_all {
//         query = query.filter(clinician_dsl::code.ne_all(value));
//     }
//     if let Some(value) = filter.like {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.filter(clinician_dsl::code.like(format!("%{}%", value)));
//     }
//     if let Some(value) = filter.starts_with {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.filter(clinician_dsl::code.like(format!("{}%", value)));
//     }
//     if let Some(value) = filter.ends_with {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.filter(clinician_dsl::code.like(format!("%{}", value)));
//     }
// }
/// ```
macro_rules! apply_string_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        crate::diesel_macros::apply_string_filter_method!(
            $query,
            filter,
            $filter_field,
            $dsl_field
        );
    }};
}

/// Warning: All OR filters need to be called before AND filters to work correctly.
///
/// Example expand, when called with:
///
/// ```
/// apply_string_or_filter!(query, code, clinician_dsl::code)
/// ```
///
/// ```
//  if let Some(code) = filter_field {
//     if let Some(value) = filter.equal_to {
//         query = query.or_filter(clinician_dsl::code.eq(value));
//     }
//     if let Some(value) = filter.not_equal_to {
//         query = query.or_filter(clinician_dsl::code.ne(value));
//     }
//     if let Some(value) = filter.equal_any {
//         query = query.or_filter(clinician_dsl::code.eq_any(value));
//     }
//     if let Some(value) = filter.not_equal_all {
//         query = query.or_filter(clinician_dsl::code.ne_all(value));
//     }
//     if let Some(value) = filter.like {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.or_filter(clinician_dsl::code.like(format!("%{}%", value)));
//     }
//     if let Some(value) = filter.starts_with {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.or_filter(clinician_dsl::code.like(format!("{}%", value)));
//     }
//     if let Some(value) = filter.ends_with {
//         // in sqlite like is case insensitive (but on only works with ASCII chars)
//         query = query.or_filter(clinician_dsl::code.like(format!("%{}", value)));
//     }
// }
/// ```
macro_rules! apply_string_or_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        crate::diesel_macros::apply_string_filter_method!(
            $query,
            or_filter,
            $filter_field,
            $dsl_field
        );
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_date_time_filter!(query, filter.created_datetime, invoice_dsl::created_datetime)
/// ```
///
/// ```
/// if let Some(date_time_filter) = filter.created_datetime {
///     if let Some(value) = date_time_filter.equal_to {
///         query = query.filter(invoice_dsl::created_datetime.eq(value));
///     }
///
///     if let Some(value) = date_time_filter.before_or_equal_to {
///         query = query.filter(invoice_dsl::created_datetime.le(value));
///     }
///
///     if let Some(value) = date_time_filter.after_or_equal_to {
///         query = query.filter(invoice_dsl::created_datetime.ge(value));
///     }
/// }
/// ```
macro_rules! apply_date_time_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(date_time_filter) = $filter_field {
            if let Some(value) = date_time_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = date_time_filter.before {
                $query = $query.filter($dsl_field.lt(value));
            }

            if let Some(value) = date_time_filter.before_or_equal_to {
                $query = $query.filter($dsl_field.le(value));
            }

            if let Some(value) = date_time_filter.after_or_equal_to {
                $query = $query.filter($dsl_field.ge(value));
            }

            $query = match date_time_filter.is_null {
                Some(true) => $query.filter($dsl_field.is_null()),
                Some(false) => $query.filter($dsl_field.is_not_null()),
                None => $query,
            }
        }
    }};
}

macro_rules! apply_number_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(number_filter) = $filter_field {
            if let Some(range) = number_filter.not_in_range {
                $query = $query.filter($dsl_field.lt(range.start).or($dsl_field.gt(range.end)));
            }
        }
    }};
}

macro_rules! apply_date_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(date_filter) = $filter_field {
            if let Some(value) = date_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = date_filter.before_or_equal_to {
                $query = $query.filter($dsl_field.le(value));
            }

            if let Some(value) = date_filter.after_or_equal_to {
                $query = $query.filter($dsl_field.ge(value));
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_no_case!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_no_case());
/// } else {
///     query = query.order(location_dsl::name.asc_no_case());
/// }
/// ```
macro_rules! apply_sort_no_case {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        use crate::diesel_extensions::OrderByExtensions;
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_no_case());
        } else {
            $query = $query.order($dsl_field.asc_no_case());
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc());
/// } else {
///     query = query.order(location_dsl::name.asc());
/// }
/// ```
macro_rules! apply_sort {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc());
        } else {
            $query = $query.order($dsl_field.asc());
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_asc_nulls_last!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_nulls_first());
/// } else {
///     query = query.order(location_dsl::name.asc_nulls_last());
/// }
/// ```
macro_rules! apply_sort_asc_nulls_last {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        use crate::diesel_extensions::OrderByExtensions;
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_nulls_first());
        } else {
            $query = $query.order($dsl_field.asc_nulls_last());
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_asc_nulls_first!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_nulls_last());
/// } else {
///     query = query.order(location_dsl::name.asc_nulls_first));
/// }
/// ```
macro_rules! apply_sort_asc_nulls_first {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        use crate::diesel_extensions::OrderByExtensions;
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_nulls_last());
        } else {
            $query = $query.order($dsl_field.asc_nulls_first());
        }
    }};
}

/// Generates table definitions and repository methods for the entity linking abstraction pattern.
///
/// This macro automates the creation of:
/// 1. **Core table** definition (with `link_id` columns for database storage)
/// 2. **View table** definition (with resolved `id` columns for queries)
/// 3. **Repository `_upsert` method** that translates between resolved IDs and link IDs
///
/// # `treat_none_as_null` Semantics
///
/// The generated `_upsert` method always explicitly sets every field value, including `None`
/// values for `Option<T>` fields. This is equivalent to Diesel's `#[diesel(treat_none_as_null = true)]`
/// behavior — `None` is written as SQL `NULL`, never skipped.
///
/// **Important:** If a database column has a `NOT NULL DEFAULT` constraint, the corresponding
/// Rust field must NOT be `Option<T>` / `Nullable<...>`. Use the non-optional type instead
/// (e.g., `f64` / `Double`) and set a matching default in the Rust `Default` impl. Otherwise,
/// inserting a default-constructed row will attempt to write `NULL` and violate the constraint.
///
/// # Entity Linking Pattern
///
/// The pattern hides internal `*_link_id` columns from the public API, exposing only resolved IDs.
/// - Database tables store `name_link_id` (reference to name_link table)
/// - Views join with name_link to resolve `name_link_id` → `name_id`
/// - Row structs use `name_id` for clean public API
/// - Repository methods translate back to `name_link_id` when writing
///
/// # Syntax
///
/// ```rust,ignore
/// define_linked_tables!(
///     view: <view_table_name> = "<view_sql_name>",
///     core: <core_table_name> = "<core_sql_name>",
///     struct: <StructName>,
///     repo: <RepositoryName>,
///     shared: {
///         field1 -> Type1,
///         field2 -> Type2,
///         #[attribute] field3 -> Type3,  // Attributes supported
///         // ... other fields
///     },
///     links: {
///         link_id -> resolved_id,
///     }
/// );
/// ```
///
/// # Implicit Behavior
///
/// **The `id` field is automatically added** - you don't need to specify it in the `shared` section.
/// The macro always includes `id -> Text` as the first field in both core and view tables.
///
/// # Special Case: `type_` Field
///
/// The macro automatically handles Rust keywords like `type`:
/// - In the table schema: use `type_` with `#[sql_name = "type"]` attribute
/// - In the Row struct: the field must be `r#type` (raw identifier)
/// - The macro's `@field_access` helper automatically translates between them
///
/// This works transparently - just declare `type_` in your `shared` section with the
/// `#[sql_name = "type"]` attribute, and the macro handles the `r#type` mapping.
///
/// # Example: Invoice Table
///
/// **Input:**
/// ```rust,ignore
/// define_linked_tables!(
///     view: invoice = "invoice_view",
///     core: invoice_with_links = "invoice",
///     struct: InvoiceRow,
///     repo: InvoiceRowRepository,
///     shared: {
///         store_id -> Text,
///         #[sql_name = "type"] type_ -> InvoiceTypeMapping,
///         status -> InvoiceStatusMapping,
///         on_hold -> Bool,
///         comment -> Nullable<Text>,
///     },
///     links: {
///         name_link_id -> name_id,
///     }
/// );
/// ```
///
/// **Generated Output:**
/// ```rust,ignore
/// // Core table - used for INSERT/UPDATE operations
/// table! {
///     #[sql_name = "invoice"]
///     invoice_with_links (id) {
///         id -> Text,                    // Implicit - added automatically
///         store_id -> Text,
///         #[sql_name = "type"] type_ -> InvoiceTypeMapping,
///         status -> InvoiceStatusMapping,
///         on_hold -> Bool,
///         comment -> Nullable<Text>,
///         name_link_id -> Text,          // From links section
///     }
/// }
///
/// // View table - used for SELECT queries
/// table! {
///     #[sql_name = "invoice_view"]
///     invoice (id) {
///         id -> Text,                    // Implicit - added automatically
///         store_id -> Text,
///         #[sql_name = "type"] type_ -> InvoiceTypeMapping,
///         status -> InvoiceStatusMapping,
///         on_hold -> Bool,
///         comment -> Nullable<Text>,
///         name_id -> Text,               // Resolved from name_link_id
///     }
/// }
///
/// // Generated repository method
/// impl<'a> InvoiceRowRepository<'a> {
///     pub fn _upsert(&self, record: &InvoiceRow) -> Result<(), RepositoryError> {
///         // Automatically handles:
///         // - Writing to core table (invoice_with_links)
///         // - Translating name_id -> name_link_id
///         // - Special case: record.r#type -> table.type_
///         // - INSERT with ON CONFLICT DO UPDATE logic
///     }
/// }
/// ```
///
/// # Usage in Repository
///
/// After macro invocation, implement `upsert_one` that calls the generated `_upsert`:
///
/// ```rust,ignore
/// impl<'a> InvoiceRowRepository<'a> {
///     pub fn upsert_one(&self, row: &InvoiceRow) -> Result<i64, RepositoryError> {
///         self._upsert(row)?;
///         self.insert_changelog(row, RowActionType::Upsert)
///     }
/// }
/// ```
macro_rules! define_linked_tables {

    // Helper rule for field access - handles special case for type_
    (@field_access $table:ident, type_, $record:ident) => {
        $table::type_.eq(&$record.r#type)
    };
    (@field_access $table:ident, $field:ident, $record:ident) => {
        $table::$field.eq(&$record.$field)
    };

    (
        view: $view_table:ident = $view_sql_name:literal,
        core: $core_table:ident = $core_sql_name:literal,
        struct: $struct_name:ident,
        repo: $repo_name:ident,
        shared: {
            $(
                $(#[$attr:meta])?
                $field:ident -> $field_type:ty
            ),* $(,)?
        },
        links: {
            $(
                $link_id:ident -> $resolved_id:ident
            ),* $(,)?
        } $(,)?
        optional_links: {
            $(
                $opt_link_id:ident -> $opt_resolved_id:ident
            ),* $(,)?
        }
    ) => {
        // Core table with link IDs
        table! {
            #[sql_name = $core_sql_name]
            $core_table (id) {
                id -> Text,
                $(
                    $(#[$attr])?
                    $field -> $field_type,
                )*
                $($link_id -> Text,)*
                $($opt_link_id -> Nullable<Text>,)*
            }
        }

        // View table with resolved IDs
        table! {
            #[sql_name = $view_sql_name]
            $view_table (id) {
                id -> Text,
                $(
                    $(#[$attr])?
                    $field -> $field_type,
                )*
                $($resolved_id -> Text,)*
                $($opt_resolved_id -> Nullable<Text>,)*
            }
        }

        // Generate upsert method on repository
        impl<'a> $repo_name<'a> {
            pub fn _upsert(&self, record: &$struct_name) -> Result<(), crate::RepositoryError> {
                diesel::insert_into($core_table::table)
                    .values((
                        $core_table::id.eq(&record.id),
                        $(define_linked_tables!(@field_access $core_table, $field, record),)*
                        $($core_table::$link_id.eq(&record.$resolved_id),)*
                        $($core_table::$opt_link_id.eq(&record.$opt_resolved_id.as_ref()),)*
                    ))
                    .on_conflict($core_table::id)
                    .do_update()
                    .set((
                        $(define_linked_tables!(@field_access $core_table, $field, record),)*
                        $($core_table::$link_id.eq(&record.$resolved_id),)*
                        $($core_table::$opt_link_id.eq(&record.$opt_resolved_id.as_ref()),)*
                    ))
                    .execute(self.connection.lock().connection())?;

                Ok(())
            }
        }
    };
}

/// Defines an enum that is stored as plain `TEXT` in the database via `strum` serialization
/// (`snake_case` by default). No database migration is needed when adding new variants.
///
/// # serde
///
/// The macro also generates `serde::Serialize`/`Deserialize` so the enum can travel over
/// the wire (e.g. sync v7). To keep the wire format stable, serde uses the *variant
/// identifier* (PascalCase — serde's own default naming) rather than the `strum` casing
/// used for the database column. **Do not** add `Serialize`/`Deserialize` to the enum's
/// own `#[derive(...)]`; the macro provides them.
///
/// # Fallback variant (unknown values)
///
/// Variants may optionally include a single-field `String` payload, e.g. `Other(String)`.
/// When one is present and marked `#[strum(default, transparent)]` it becomes the fallback
/// for any value the enum doesn't recognise — both from the database and from serde. This
/// lets a newer peer send a value an older peer has never heard of (e.g. a table added on
/// central but not yet on a remote) without failing the whole parse: the unknown string is
/// captured in the fallback variant and emitted back out via `transparent` (`as_ref()`/
/// `Display`/serde all yield the inner string). Enums with no fallback variant keep
/// the strict behaviour — an unknown value is an error.
///
/// # `db_case` — unknown values are normalized to the DB casing at capture
///
/// A serde-captured unknown arrives in the *wire* casing (the newer peer's variant
/// identifier, PascalCase) but is subsequently written to a DB column whose known values
/// use the *strum* casing — and would then never parse into the real variant once an
/// upgrade adds it (`from_str` only knows the strum casing). To make stored values
/// self-heal, an enum with a fallback variant declares its strum rule up front:
///
/// `db_case = SCREAMING_SNAKE_CASE;` (or `snake_case`)
///
/// and the serde deserialize fallback converts the captured string with the matching
/// [`heck`] function — the same crate and version `strum_macros` uses for
/// `serialize_all`, so the conversion is byte-identical to what strum derives for the
/// variant on the build that knows it. The wire format for *known* values is unchanged
/// in both directions; a pass-through unknown re-serialises in its normalized form and
/// is re-captured idempotently at every hop. Caveat: a future variant carrying a
/// per-variant `#[strum(serialize = "…")]` override won't match its heck-derived form
/// and simply stays in the fallback after upgrade — the same as before this existed.
/// Enums without a fallback variant don't need (or use) a declaration.
///
/// **An enum with a `#[strum(default, transparent)]` fallback variant must declare
/// `db_case` — this is enforced at compile time.** The declaration-less form of the macro
/// only accepts enums whose variants are all unit (no `String` payload); a fallback enum
/// that omits `db_case` matches no arm and fails to build with a `compile_error!` pointing
/// here, rather than silently capturing unknowns in wire casing (the stranded-value bug
/// this section prevents). Choose the `db_case` that matches the enum's
/// `#[strum(serialize_all = ...)]`. If you deliberately want unknowns captured as-is with
/// no normalization, opt in explicitly with `db_case = verbatim;`.
///
/// Usage:
/// ```
/// diesel_string_enum! {
///     db_case = SCREAMING_SNAKE_CASE;
///     #[derive(Clone)]
///     #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
///     pub enum MyEnum {
///         #[default]
///         VariantA,
///         VariantB,
///         #[strum(default, transparent)]
///         Other(String),
///     }
/// }
/// ```
macro_rules! diesel_string_enum {
    // Declaration-less form: accepted ONLY for enums whose variants are all unit (no
    // `String`-payload fallback). Such enums capture nothing, so `db_case` is inert and
    // defaults to `verbatim`. An enum with a fallback variant does NOT match this arm
    // (the variant matcher below rejects payloads) — it must declare `db_case` explicitly,
    // otherwise it falls through to the `compile_error!` arm below the main expansion.
    (
        $(#[$meta:meta])*
        $vis:vis enum $name:ident {
            $(
                $(#[$variant_meta:meta])*
                $variant:ident
            ),* $(,)?
        }
    ) => {
        diesel_string_enum! {
            db_case = verbatim;
            $(#[$meta])*
            $vis enum $name {
                $(
                    $(#[$variant_meta])*
                    $variant
                ),*
            }
        }
    };

    (
        db_case = $db_case:ident;
        $(#[$meta:meta])*
        $vis:vis enum $name:ident {
            $(
                $(#[$variant_meta:meta])*
                $variant:ident $(( $($variant_payload:tt)* ))?
            ),* $(,)?
        }
    ) => {
        #[derive(
            strum::AsRefStr,
            strum::EnumString,
            strum::Display,
            Debug,
            Default,
            PartialEq,
            diesel::expression::AsExpression,
            diesel::deserialize::FromSqlRow,
        )]
        #[diesel(sql_type = diesel::sql_types::Text)]
        $(#[$meta])*
        $vis enum $name {
            $(
                $(#[$variant_meta])*
                $variant $(( $($variant_payload)* ))?
            ),*
        }

        impl From<String> for $name {
            fn from(value: String) -> Self {
                use std::str::FromStr;
                Self::from_str(&value).unwrap()
            }
        }

        impl diesel::serialize::ToSql<diesel::sql_types::Text, crate::DBType> for $name
        where
            str: diesel::serialize::ToSql<diesel::sql_types::Text, crate::DBType>,
        {
            fn to_sql<'b>(
                &'b self,
                out: &mut diesel::serialize::Output<'b, '_, crate::DBType>,
            ) -> diesel::serialize::Result {
                <str as
                 diesel::serialize::ToSql<diesel::sql_types::Text, crate::DBType>>::to_sql(
                    self.as_ref(),
                    out,
                )
            }
        }

        impl diesel::deserialize::FromSql<diesel::sql_types::Text, crate::DBType> for $name
        where
            String: diesel::deserialize::FromSql<diesel::sql_types::Text, crate::DBType>,
        {
            fn from_sql(
                bytes: <crate::DBType as diesel::backend::Backend>::RawValue<'_>,
            ) -> diesel::deserialize::Result<Self> {
                use std::str::FromStr;
                let s = <String as diesel::deserialize::FromSql<diesel::sql_types::Text, crate::DBType>>::from_sql(bytes)?;
                Self::from_str(&s).map_err(|e| e.into())
            }
        }

        // serde uses the variant *identifier* (PascalCase) for known variants — this is
        // serde's default enum naming, so the on-the-wire representation is unchanged from a
        // plain `#[derive(Serialize, Deserialize)]`. The `strum` casing only governs the
        // database column, not the wire. A `String`-payload fallback variant (declared last,
        // marked `#[strum(default, transparent)]`) captures any unrecognised value instead of
        // erroring, and round-trips it back out unchanged.
        impl serde::Serialize for $name {
            #[allow(unreachable_code)]
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                $(
                    diesel_string_enum!(@serialize_variant self serializer $name $variant $(( $($variant_payload)* ))?);
                )*
                // All variants are handled above; this is only here to satisfy the
                // return-type checker for the (impossible) fall-through.
                Err(serde::ser::Error::custom("unhandled variant"))
            }
        }

        impl<'de> serde::Deserialize<'de> for $name {
            // A fallback variant's arm returns unconditionally, making the trailing `Err`
            // unreachable for enums that have one; enums without a fallback do reach it.
            #[allow(unreachable_code)]
            fn deserialize<D: serde::Deserializer<'de>>(
                deserializer: D,
            ) -> Result<Self, D::Error> {
                let value = <String as serde::Deserialize>::deserialize(deserializer)?;
                $(
                    diesel_string_enum!(@deserialize_variant $db_case value $name $variant $(( $($variant_payload)* ))?);
                )*
                // No known variant matched and there was no fallback variant.
                Err(serde::de::Error::custom(format!(
                    "unknown variant `{}`",
                    value
                )))
            }
        }
    };

    // Fallback-without-`db_case` guard. Only reached when the unit-only declaration-less
    // arm rejected the enum (so it has a `String`-payload fallback variant) AND no
    // `db_case = ...;` was supplied. Turn that into a clear error rather than silently
    // capturing unknowns in wire casing. (`@`-prefixed internal calls never reach here —
    // they don't match the `enum` shape — and explicit-`db_case` invocations matched above.)
    (
        $(#[$meta:meta])*
        $vis:vis enum $name:ident {
            $($body:tt)*
        }
    ) => {
        compile_error!(concat!(
            "diesel_string_enum!: `",
            stringify!($name),
            "` has a fallback (`String`-payload) variant, so it must declare a `db_case` as \
             its first line, matching `#[strum(serialize_all = ...)]` — e.g. \
             `db_case = SCREAMING_SNAKE_CASE;` or `db_case = snake_case;`. Use \
             `db_case = verbatim;` only to deliberately capture unknowns in wire casing \
             (no normalization)."
        ));
    };

    // --- serde serialize: one `if let` per variant (macros can't emit partial match arms) ---
    // Unit variant: emit its PascalCase identifier.
    (@serialize_variant $self:ident $serializer:ident $name:ident $variant:ident) => {
        if let $name::$variant = $self {
            return $serializer.serialize_str(stringify!($variant));
        }
    };
    // Fallback variant with a payload: emit the captured inner string verbatim.
    (@serialize_variant $self:ident $serializer:ident $name:ident $variant:ident ( $($variant_payload:tt)* )) => {
        if let $name::$variant(inner) = $self {
            return $serializer.serialize_str(inner);
        }
    };

    // --- serde deserialize: compare against each known name; fallback catches the rest ---
    // Unit variant: match on its PascalCase identifier.
    (@deserialize_variant $db_case:ident $value:ident $name:ident $variant:ident) => {
        if $value == stringify!($variant) {
            return Ok($name::$variant);
        }
    };
    // Fallback variant with a payload: capture whatever value is left, normalized to the
    // enum's DB casing (see the `db_case` macro docs) so anything subsequently written to
    // the database — a column via ToSql, or `sync_buffer.table_name` via `to_string()` —
    // parses into the real variant once an upgrade adds it. Declared last in the enum, so
    // it only runs once every known variant has been ruled out above.
    (@deserialize_variant $db_case:ident $value:ident $name:ident $variant:ident ( $($variant_payload:tt)* )) => {
        return Ok($name::$variant(diesel_string_enum!(@to_db_case $db_case $value)));
    };

    // --- db_case dispatch: expansion-time mapping to the heck conversion strum_macros
    // uses for the matching `serialize_all` rule (same crate + version → byte-identical
    // output for any variant identifier).
    (@to_db_case SCREAMING_SNAKE_CASE $value:ident) => {{
        use heck::ToShoutySnakeCase;
        $value.to_shouty_snake_case()
    }};
    (@to_db_case snake_case $value:ident) => {{
        use heck::ToSnakeCase;
        $value.to_snake_case()
    }};
    (@to_db_case verbatim $value:ident) => {
        $value
    };
}

macro_rules! diesel_json_type {
    (
        $(#[$meta:meta])*
        $vis:vis $kind:ident $name:ident $($body:tt)*
    ) => {
        #[derive(serde::Serialize, serde::Deserialize, diesel::expression::AsExpression, diesel::deserialize::FromSqlRow)]
        #[diesel(sql_type = diesel::sql_types::Text)]
        $(#[$meta])*
        $vis $kind $name $($body)*

        impl diesel::deserialize::FromSql<diesel::sql_types::Text, crate::DBType> for $name {
            fn from_sql(bytes: <crate::DBType as diesel::backend::Backend>::RawValue<'_>) -> diesel::deserialize::Result<Self> {
                let string_value = <String as diesel::deserialize::FromSql<diesel::sql_types::Text, crate::DBType>>::from_sql(bytes)?;
                let deserialized: $name = serde_json::from_str(&string_value)?;
                Ok(deserialized)
            }
        }

        impl diesel::serialize::ToSql<diesel::sql_types::Text, crate::DBType> for $name {
            fn to_sql<'b>(
                &self,
                out: &mut diesel::serialize::Output<'b, '_, crate::DBType>,
            ) -> diesel::serialize::Result {
               #[cfg(not(feature = "postgres"))]
                {
                    out.set_value(serde_json::to_string(self)?);
                    Ok(diesel::serialize::IsNull::No)
                }
                #[cfg(feature = "postgres")]
                <String as diesel::serialize::ToSql<
                    diesel::sql_types::Text,
                    crate::DBType,
                >>::to_sql(&serde_json::to_string(self)?, &mut out.reborrow())
            }
        }
    };
}

pub(crate) use apply_date_filter;
pub(crate) use apply_date_time_filter;
pub(crate) use apply_equal_filter;
pub(crate) use apply_equal_or_filter;
pub(crate) use apply_number_filter;
pub(crate) use apply_sort;
pub(crate) use apply_sort_asc_nulls_first;
pub(crate) use apply_sort_asc_nulls_last;
pub(crate) use apply_sort_no_case;
pub(crate) use apply_string_filter;
pub(crate) use apply_string_filter_method;
pub(crate) use apply_string_or_filter;
pub(crate) use define_linked_tables;
pub(crate) use diesel_json_type;
pub(crate) use diesel_string_enum;

#[cfg(test)]
mod diesel_string_enum_test {
    diesel_string_enum! {
        db_case = SCREAMING_SNAKE_CASE;
        #[derive(Clone, Eq)]
        #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
        pub enum WithFallback {
            #[default]
            VariantA,
            VariantB,
            #[strum(default, transparent)]
            Other(String),
        }
    }

    // Explicit `db_case = verbatim;`: the opt-out that keeps unknowns captured as-is (no
    // normalization). A fallback enum can no longer omit `db_case` — it's a compile error —
    // so this pins that `verbatim` remains available when a caller genuinely wants it.
    diesel_string_enum! {
        db_case = verbatim;
        #[derive(Clone, Eq)]
        #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
        pub enum VerbatimFallback {
            #[default]
            VariantA,
            #[strum(default, transparent)]
            Other(String),
        }
    }

    diesel_string_enum! {
        #[derive(Clone, Eq)]
        #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
        pub enum Strict {
            #[default]
            VariantA,
            VariantB,
        }
    }

    #[test]
    fn known_variants_keep_the_identifier_wire_form() {
        assert_eq!(
            serde_json::to_value(WithFallback::VariantB).unwrap(),
            serde_json::json!("VariantB")
        );
        assert_eq!(
            serde_json::from_value::<WithFallback>(serde_json::json!("VariantB")).unwrap(),
            WithFallback::VariantB
        );
        // DB casing is strum's, unaffected by db_case.
        assert_eq!(WithFallback::VariantB.as_ref(), "VARIANT_B");
    }

    #[test]
    fn unknown_values_are_captured_normalized_to_the_db_casing() {
        // A wire-cased unknown (a variant only a newer build knows) is captured in the
        // enum's DB casing, so ToSql / `to_string()` store a value that parses into the
        // real variant once an upgrade adds it.
        assert_eq!(
            serde_json::from_value::<WithFallback>(serde_json::json!("FutureVariant")).unwrap(),
            WithFallback::Other("FUTURE_VARIANT".to_string())
        );
        // Re-serialises in the normalized form; re-capture is idempotent.
        assert_eq!(
            serde_json::to_value(WithFallback::Other("FUTURE_VARIANT".to_string())).unwrap(),
            serde_json::json!("FUTURE_VARIANT")
        );
        assert_eq!(
            serde_json::from_value::<WithFallback>(serde_json::json!("FUTURE_VARIANT")).unwrap(),
            WithFallback::Other("FUTURE_VARIANT".to_string())
        );
        // The normalized form is exactly what strum derives once the variant exists:
        // heck's ShoutySnake of "VariantB" == strum's serialize_all output.
        use std::str::FromStr;
        assert_eq!(
            serde_json::from_value::<WithFallback>(serde_json::json!("VariantB"))
                .map(|v| v.as_ref().to_string())
                .unwrap(),
            WithFallback::from_str("VARIANT_B").unwrap().as_ref()
        );
    }

    // `db_case = verbatim;` opts out of normalization: the unknown is captured exactly as
    // it arrived on the wire. (A fallback enum can no longer omit `db_case` at all — that
    // is now a compile error — so verbatim capture is only reachable by asking for it.)
    #[test]
    fn verbatim_db_case_captures_unknown_as_is() {
        assert_eq!(
            serde_json::from_value::<VerbatimFallback>(serde_json::json!("FutureVariant"))
                .unwrap(),
            VerbatimFallback::Other("FutureVariant".to_string())
        );
    }

    #[test]
    fn strict_enum_still_errors_on_unknown() {
        assert!(serde_json::from_value::<Strict>(serde_json::json!("FutureVariant")).is_err());
        assert_eq!(
            serde_json::from_value::<Strict>(serde_json::json!("VariantB")).unwrap(),
            Strict::VariantB
        );
    }
}
