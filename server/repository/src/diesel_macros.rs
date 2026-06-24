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

    // Owned field access for batch inserts (a `Vec<tuple>` can't borrow from per-row references).
    (@field_owned $table:ident, type_, $record:ident) => {
        $table::type_.eq($record.r#type.clone())
    };
    (@field_owned $table:ident, $field:ident, $record:ident) => {
        $table::$field.eq($record.$field.clone())
    };

    // `excluded`-based changeset for on-conflict updates (column = the value being inserted).
    (@excluded $table:ident, type_) => {
        $table::type_.eq(diesel::upsert::excluded($table::type_))
    };
    (@excluded $table:ident, $field:ident) => {
        $table::$field.eq(diesel::upsert::excluded($table::$field))
    };

    // `WalkRow` binding for a CORE column whose value comes from the SAME-named struct field
    // (special case: column `type_` binds the raw-ident field `r#type`). Skip-aware + comma-joined.
    (@walk_field $out:ident, $self:ident, $table:ident, $first:ident, $excludes:ident, type_) => {
        define_linked_tables!(@walk_bind $out, $self, $table, $first, $excludes, type_, r#type);
    };
    (@walk_field $out:ident, $self:ident, $table:ident, $first:ident, $excludes:ident, $col:ident) => {
        define_linked_tables!(@walk_bind $out, $self, $table, $first, $excludes, $col, $col);
    };

    // `WalkRow` binding for a link-id CORE column bound from a differently-named resolved field.
    (@walk_resolved $out:ident, $self:ident, $table:ident, $first:ident, $excludes:ident, $col:ident, $field:ident) => {
        define_linked_tables!(@walk_bind $out, $self, $table, $first, $excludes, $col, $field);
    };

    // Core `WalkRow` bind: push `$self.$field` with column `$col`'s diesel SQL type, unless excluded.
    (@walk_bind $out:ident, $self:ident, $table:ident, $first:ident, $excludes:ident, $col:ident, $field:ident) => {
        if !$excludes.contains(&<$table::$col as ::diesel::Column>::NAME) {
            if !$first {
                $out.push_sql(", ");
            }
            $first = false;
            $out.push_bind_param::<
                <$table::$col as ::diesel::expression::Expression>::SqlType, _,
            >(&$self.$field)?;
        }
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

        // Bind parameters per row for the CORE table (id + shared fields + link-id columns).
        impl $struct_name {
            pub const BATCH_COLUMN_COUNT: usize =
                1usize $(+ { let _ = stringify!($field); 1usize })*
                      $(+ { let _ = stringify!($link_id); 1usize })*
                      $(+ { let _ = stringify!($opt_link_id); 1usize })*;
        }

        // Raw-SQL batch upsert metadata/bindings for the CORE table. The struct carries
        // RESOLVED ids (`$resolved_id`); the core table stores LINK ids (`$link_id`), so
        // `WalkRow` binds the resolved field into the link-id column position.
        impl $crate::db_diesel::batch_upsert::BatchUpsertable for $struct_name {
            const TABLE_NAME: &'static str = $core_sql_name;
            const COLUMNS: &'static [&'static str] = &[
                <$core_table::id as ::diesel::Column>::NAME,
                $(<$core_table::$field as ::diesel::Column>::NAME,)*
                $(<$core_table::$link_id as ::diesel::Column>::NAME,)*
                $(<$core_table::$opt_link_id as ::diesel::Column>::NAME,)*
            ];
            const CONFLICT: &'static str = <$core_table::id as ::diesel::Column>::NAME;
            const UPDATE: &'static [&'static str] = &[
                $(<$core_table::$field as ::diesel::Column>::NAME,)*
                $(<$core_table::$link_id as ::diesel::Column>::NAME,)*
                $(<$core_table::$opt_link_id as ::diesel::Column>::NAME,)*
            ];
        }

        impl $crate::db_diesel::batch_upsert::WalkRow for $struct_name {
            fn walk_row<'b>(
                &'b self,
                excludes: &[&str],
                mut out: ::diesel::query_builder::AstPass<
                    '_, 'b, $crate::db_diesel::batch_upsert::DbType,
                >,
            ) -> ::diesel::QueryResult<()> {
                let mut __first = true;
                define_linked_tables!(@walk_field out, self, $core_table, __first, excludes, id);
                // Shared fields: `@walk_field` special-cases the `type_` column to bind `r#type`.
                $(define_linked_tables!(@walk_field out, self, $core_table, __first, excludes, $field);)*
                // Link columns: bind the struct's RESOLVED-id field into the link-id column slot.
                $(define_linked_tables!(
                    @walk_resolved out, self, $core_table, __first, excludes, $link_id, $resolved_id
                );)*
                $(define_linked_tables!(
                    @walk_resolved out, self, $core_table, __first, excludes, $opt_link_id, $opt_resolved_id
                );)*
                let _ = __first;
                Ok(())
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

            /// Batch upsert a slice of rows into the CORE table in ONE statement (NO
            /// changelog), on both backends, via the hand-built `INSERT ... ON CONFLICT
            /// DO UPDATE` (resolved-id fields are bound into the link-id columns). The
            /// caller chunks via `BATCH_COLUMN_COUNT` and wraps in a transaction.
            /// Generated by `define_linked_tables!`.
            pub(crate) fn batch_upsert(
                &self,
                rows: Vec<&$struct_name>,
            ) -> Result<(), crate::RepositoryError> {
                use ::diesel::query_dsl::RunQueryDsl;
                if rows.is_empty() {
                    return Ok(());
                }
                $crate::db_diesel::batch_upsert::batch_upsert(rows.as_slice())
                    .execute(self.connection.lock().connection())?;
                Ok(())
            }
        }
    };
}

/// Defines an enum that is stored as plain `TEXT` in the database via `strum` serialization
/// (`snake_case` by default). No database migration is needed when adding new variants.
///
/// Variants may optionally include a single-field payload (e.g.
/// `Unknown(String)`). The fallback variant should carry `#[strum(default)]`
///
/// Usage:
/// ```
/// diesel_string_enum! {
///     #[derive(Clone, Serialize, Deserialize)]
///     pub enum MyEnum {
///         #[default]
///         VariantA,
///         VariantB,
///         #[strum(default)]
///         Unknown(String),
///     }
/// }
/// ```
macro_rules! diesel_string_enum {
    (
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

/// Wraps a diesel `table! { .. }` definition so the table's columns are listed ONCE and are
/// reused to generate batch helpers — adding a column to the table automatically includes it
/// in the batch upsert (no separate column list to keep in sync).
///
/// Generates, in addition to the `table!`:
/// - `<Struct>::BATCH_COLUMN_COUNT` — bind parameters per row (id + columns), so the caller
///   (`perform_batch_operations`) can chunk under a backend's bind-parameter limit.
/// - `<Repo>::batch_upsert(&[Struct])` — upsert a (caller-chunked) slice in ONE statement, NO
///   changelog. postgres: multi-row `INSERT ... ON CONFLICT (id) DO UPDATE SET col=excluded.col`.
///   sqlite (no multi-row on-conflict): per-row upsert. Caller wraps in a transaction.
///
/// Only for "simple" tables whose row struct derives `Insertable + AsChangeset` directly on the
/// table (NOT `define_linked_tables!` rows). Chunking lives in the helper, not here.
///
/// Usage:
/// ```ignore
/// define_batch_table! {
///     struct: UnitRow,
///     repo: UnitRowRepository,
///     table: unit (id) {
///         id -> Text,
///         name -> Text,
///         ..
///     }
/// }
/// ```
macro_rules! define_batch_table {
    // ---- Front arms: fill in defaults, then forward to `@build`. ----
    // The Postgres batch insert borrows rows by default (no clone). Rows whose struct has a
    // `#[diesel(serialize_as = ..)]` field only implement `Insertable` for the OWNED type (the
    // field is moved during serialization), so those tables pass `owned_insert,` to clone first.
    // `writer:` overrides the per-row sqlite writer (default `_upsert_one`; logs use `_insert_one`).

    // (no writer, no owned_insert)
    (struct: $struct:ident, repo: $repo:ident, table: $($table:tt)*) => {
        define_batch_table!(@build $struct, $repo, _upsert_one, borrow, [], $($table)*);
    };
    // (no writer, owned_insert)
    (struct: $struct:ident, repo: $repo:ident, owned_insert, table: $($table:tt)*) => {
        define_batch_table!(@build $struct, $repo, _upsert_one, owned, [], $($table)*);
    };
    // (writer, no owned_insert)
    (struct: $struct:ident, repo: $repo:ident, writer: $writer:ident, table: $($table:tt)*) => {
        define_batch_table!(@build $struct, $repo, $writer, borrow, [], $($table)*);
    };
    // (writer, owned_insert)
    (struct: $struct:ident, repo: $repo:ident, writer: $writer:ident, owned_insert, table: $($table:tt)*) => {
        define_batch_table!(@build $struct, $repo, $writer, owned, [], $($table)*);
    };
    // (update-set override) Restrict `ON CONFLICT DO UPDATE SET` to just `$ucol`s; all other
    // non-pk columns become insert-only (their VALUES satisfy NOT-NULL but never overwrite on
    // conflict). For reduced tables that map onto an existing table and only touch some columns.
    (struct: $struct:ident, repo: $repo:ident, update: [$($ucol:ident),* $(,)?], table: $($table:tt)*) => {
        define_batch_table!(@build $struct, $repo, _upsert_one, borrow, [$($ucol)*], $($table)*);
    };

    // ---- Canonical builder. `$mode` is `borrow` or `owned` (Postgres `.values(..)` form). ----
    // Each column may optionally name its struct field via `col as field -> Type` for tables that
    // remap with `#[diesel(column_name = ..)]` (e.g. `asset_category_id as category_id`, or
    // `type_ as r#type`). When omitted, the field name equals the column name.
    // `[$($ucol)*]` is the optional update-set override (empty = update all non-pk columns).
    // A leading `#[sql_name = ".."]` on the table maps the Rust module onto a differently-named
    // physical table (used by reduced views of an existing table); the raw-SQL `TABLE_NAME` must
    // be that sql-name, not the module ident. This arm captures it; the next defaults it.
    (@build $struct:ident, $repo:ident, $writer:ident, $mode:ident, [$($ucol:ident)*],
        #[sql_name = $sqlname:literal]
        $(#[$tmeta:meta])*
        $table:ident ($pk:ident) {
            $(
                $(#[$cmeta:meta])*
                $col:ident $(as $field:ident)? -> $cty:ty
            ),* $(,)?
        }
        $(,)?
    ) => {
        define_batch_table!(@build_inner $struct, $repo, $writer, $mode, [$($ucol)*], $sqlname,
            #[sql_name = $sqlname] $(#[$tmeta])*
            $table ($pk) { $($(#[$cmeta])* $col $(as $field)? -> $cty,)* });
    };
    (@build $struct:ident, $repo:ident, $writer:ident, $mode:ident, [$($ucol:ident)*],
        $(#[$tmeta:meta])*
        $table:ident ($pk:ident) {
            $(
                $(#[$cmeta:meta])*
                $col:ident $(as $field:ident)? -> $cty:ty
            ),* $(,)?
        }
        $(,)?
    ) => {
        define_batch_table!(@build_inner $struct, $repo, $writer, $mode, [$($ucol)*], stringify!($table),
            $(#[$tmeta])*
            $table ($pk) { $($(#[$cmeta])* $col $(as $field)? -> $cty,)* });
    };

    // Canonical builder body; `$sqlname` is the physical table name (expr/literal).
    (@build_inner $struct:ident, $repo:ident, $writer:ident, $mode:ident, [$($ucol:ident)*], $sqlname:expr,
        $(#[$tmeta:meta])*
        $table:ident ($pk:ident) {
            $(
                $(#[$cmeta:meta])*
                $col:ident $(as $field:ident)? -> $cty:ty
            ),* $(,)?
        }
        $(,)?
    ) => {
        table! {
            $(#[$tmeta])*
            $table ($pk) {
                $(
                    $(#[$cmeta])*
                    $col -> $cty,
                )*
            }
        }

        impl $struct {
            /// Bind parameters per row (every column, incl. pk — the pk is already part of the
            /// listed columns). Used to chunk batch upserts under the backend's parameter limit.
            /// Generated by `define_batch_table!`.
            pub const BATCH_COLUMN_COUNT: usize = define_batch_table!(@count $($col)*);
        }

        // Normalize each column into a `[col field]` pair (filling in field = col when
        // not overridden) via a tt-muncher, then emit the batch machinery. `borrow`
        // tables get the generated raw-SQL path (one statement on BOTH backends);
        // `owned` tables (serialize_as fields whose types don't match the SQL column)
        // hand-write their own `batch_upsert`, so the macro emits nothing for them.
        define_batch_table!(@norm
            { $mode $struct $repo $writer $table [$pk $pk] [$($ucol)*] $sqlname }
            [ $( $col $(as $field)? , )* ]
            []
        );
    };

    // tt-muncher: consume `col` / `col as field` from the input list, push `[col field]`
    // onto the accumulator, recurse; dispatch to `@batch_methods` when the list is empty.
    // Explicit field override (`col as field`):
    (@norm { $($ctx:tt)* } [ $col:ident as $field:ident , $($rest:tt)* ] [ $($acc:tt)* ]) => {
        define_batch_table!(@norm { $($ctx)* } [ $($rest)* ] [ $($acc)* [$col $field] ]);
    };
    // Special case: the `type_` column always maps to the raw-ident field `r#type`
    // (SQL `type` is a keyword), so callers never write `type_ as r#type`.
    (@norm { $($ctx:tt)* } [ type_ , $($rest:tt)* ] [ $($acc:tt)* ]) => {
        define_batch_table!(@norm { $($ctx)* } [ $($rest)* ] [ $($acc)* [type_ r#type] ]);
    };
    // Default: field name equals column name.
    (@norm { $($ctx:tt)* } [ $col:ident , $($rest:tt)* ] [ $($acc:tt)* ]) => {
        define_batch_table!(@norm { $($ctx)* } [ $($rest)* ] [ $($acc)* [$col $col] ]);
    };
    (@norm { $mode:ident $struct:ident $repo:ident $writer:ident $table:ident [$pk:ident $pkf:ident] [$($ucol:ident)*] $sqlname:expr }
        [] [ $($pairs:tt)* ]) => {
        define_batch_table!(@batch_methods $mode, $struct, $repo, $writer, $table, [$pk $pkf], [$($ucol)*], $sqlname, $($pairs)*);
    };

    // ---- `borrow` mode: generate BatchUpsertable + WalkRow + batch_upsert (raw SQL). ----
    // Columns arrive as `[col field]` pairs and ALREADY INCLUDE the pk (the table body lists
    // it, per diesel's `table!` convention), so it must not be added separately.
    // `[$($ucol)*]` is the optional update-set override (empty = all columns except the pk).
    // `$sqlname` is the physical table name (honours `#[sql_name]`).
    (@batch_methods borrow, $struct:ident, $repo:ident, $writer:ident, $table:ident,
        [$pk:ident $pkf:ident], [$($ucol:ident)*], $sqlname:expr, $([$col:ident $field:ident])*) => {
        impl $crate::db_diesel::batch_upsert::BatchUpsertable for $struct {
            const TABLE_NAME: &'static str = $sqlname;
            const COLUMNS: &'static [&'static str] = &[
                $(<$table::$col as ::diesel::Column>::NAME,)*
            ];
            const CONFLICT: &'static str = <$table::$pk as ::diesel::Column>::NAME;
            // Default update-set = every column except the conflict (pk) column.
            const UPDATE: &'static [&'static str] =
                define_batch_table!(@update_set $table, $pk, [$($ucol)*], [$($col)*]);
        }

        impl $crate::db_diesel::batch_upsert::WalkRow for $struct {
            fn walk_row<'b>(
                &'b self,
                excludes: &[&str],
                mut out: ::diesel::query_builder::AstPass<
                    '_, 'b, $crate::db_diesel::batch_upsert::DbType,
                >,
            ) -> ::diesel::QueryResult<()> {
                let mut __first = true;
                $(define_batch_table!(@bind out, self, $table, __first, excludes, $col, $field);)*
                let _ = __first;
                Ok(())
            }
        }

        impl<'a> $repo<'a> {
            /// Upsert a caller-chunked slice of rows in ONE statement (NO changelog), on
            /// both backends, via the hand-built `INSERT ... ON CONFLICT DO UPDATE`. The
            /// caller chunks via `BATCH_COLUMN_COUNT` and wraps in a transaction.
            /// Generated by `define_batch_table!`.
            pub(crate) fn batch_upsert(
                &self,
                rows: Vec<&$struct>,
            ) -> Result<(), $crate::RepositoryError> {
                use ::diesel::query_dsl::RunQueryDsl;
                if rows.is_empty() {
                    return Ok(());
                }
                $crate::db_diesel::batch_upsert::batch_upsert(rows.as_slice())
                    .execute(self.connection.lock().connection())?;
                Ok(())
            }
        }
    };

    // ---- `owned` mode: serialize_as table — no generated batch machinery (hand-written). ----
    (@batch_methods owned, $struct:ident, $repo:ident, $writer:ident, $table:ident,
        [$pk:ident $pkf:ident], [$($ucol:ident)*], $sqlname:expr, $([$col:ident $field:ident])*) => {};

    // `DO UPDATE SET` column list. Empty override -> all columns (the pk is included; assigning
    // `pk = excluded.pk` is a harmless no-op on both backends, since the row matched on the pk).
    // A non-empty override sets exactly those columns, leaving the rest insert-only.
    (@update_set $table:ident, $pk:ident, [], [$($allcol:ident)*]) => {
        &[ $(<$table::$allcol as ::diesel::Column>::NAME,)* ]
    };
    (@update_set $table:ident, $pk:ident, [$($ucol:ident)+], [$($allcol:ident)*]) => {
        &[ $(<$table::$ucol as ::diesel::Column>::NAME,)+ ]
    };

    // One column binding for `WalkRow`: skip-aware, comma-separated. Binds struct
    // field `$field` with column `$col`'s diesel SQL type (field may differ from
    // column when remapped via `#[diesel(column_name = ..)]`).
    (@bind $out:ident, $self:ident, $table:ident, $first:ident, $excludes:ident, $col:ident, $field:ident) => {
        if !$excludes.contains(&<$table::$col as ::diesel::Column>::NAME) {
            if !$first {
                $out.push_sql(", ");
            }
            $first = false;
            $out.push_bind_param::<
                <$table::$col as ::diesel::expression::Expression>::SqlType, _,
            >(&$self.$field)?;
        }
    };

    (@count) => { 0usize };
    (@count $head:ident $($tail:ident)*) => { 1usize + define_batch_table!(@count $($tail)*) };
}
pub(crate) use define_batch_table;
