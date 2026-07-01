// Docs: docs/content/server/repository/_index.md
// This is from dynamic filtering repository [tutorial](https://github.com/andreievg/diesel-rs-dynamic-filters/tree/main)

// Implementation: ChangelogCondition in server/repository/src/db_diesel/changelog/changelog.rs

// The set of operators available on every filterable field.
//
// NOTE: the serde shape of this enum is a wire format shared by sync v7
// (serialized ChangelogCondition/SyncRequestCondition trees) and the client's
// `dynamicFilter` GraphQL input. Adding variants is safe for existing
// serialized data, but a SENDER must not emit a new variant to a peer that
// may predate it (an older site fails to deserialize the whole tree) — sync
// currently constructs conditions locally only, so this only matters if a
// central server ever starts sending condition trees to remotes.
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(bound = "T: Clone + serde::Serialize + serde::de::DeserializeOwned")]
pub enum GeneralFilter<T: Clone + serde::Serialize + serde::de::DeserializeOwned> {
    Equal(T),
    NotEqual(T),
    GreaterThan(T),
    LowerThan(T),
    GreaterThanOrEqual(T),
    LowerThanOrEqual(T),
    In(Vec<T>),
    /// Case-insensitive substring match (same semantics as apply_string_filter!).
    /// Only meaningful for text fields; on non-text fields it matches nothing.
    Like(T),
    IsNull,
    IsNotNull,
}

// Compiles a single GeneralFilter operator against a Diesel column expression to a boxed nullable Bool.
// This variant is for text fields: Like compiles to a real (i)like. Non-text
// fields use general_filter_no_like! where Like matches nothing.
macro_rules! general_filter {
    ($filter:ident, $dsl_field:expr ) => {{
        match $filter {
            crate::dynamic_query_filter::GeneralFilter::Like(value) => {
                let pattern = format!("%{}%", value);
                // in sqlite like is case insensitive (but only works with ASCII chars)
                #[cfg(not(feature = "postgres"))]
                {
                    Box::new($dsl_field.like(pattern).nullable())
                }
                // Use case insensitive like on postgres
                #[cfg(feature = "postgres")]
                {
                    Box::new($dsl_field.ilike(pattern).nullable())
                }
            }
            other => crate::dynamic_query_filter::general_filter_no_like!(other, $dsl_field),
        }
    }};
}

// As general_filter!, for fields where (i)like does not type-check
// (numbers, dates, enums): Like compiles to FALSE (matches nothing).
macro_rules! general_filter_no_like {
    ($filter:ident, $dsl_field:expr ) => {{
        match $filter {
            crate::dynamic_query_filter::GeneralFilter::Equal(value) => {
                Box::new($dsl_field.eq(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::NotEqual(value) => {
                Box::new($dsl_field.ne(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::In(value) => {
                Box::new($dsl_field.eq_any(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::GreaterThan(value) => {
                Box::new($dsl_field.gt(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::LowerThan(value) => {
                Box::new($dsl_field.lt(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::GreaterThanOrEqual(value) => {
                Box::new($dsl_field.ge(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::LowerThanOrEqual(value) => {
                Box::new($dsl_field.le(value).nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::Like(_) => {
                Box::new(false.into_sql::<diesel::sql_types::Bool>().nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::IsNull => {
                Box::new($dsl_field.is_null().nullable())
            }
            crate::dynamic_query_filter::GeneralFilter::IsNotNull => {
                Box::new($dsl_field.is_not_null().nullable())
            }
        }
    }};
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub(crate) enum AndOr {
    And,
    Or,
}

// Trait with default implementations for filter builders
pub trait FilterBuilder<T: Clone + serde::Serialize + serde::de::DeserializeOwned> {
    type Condition;
    fn make_condition(filter: GeneralFilter<T>) -> Self::Condition;

    fn equal(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::Equal(value))
    }
    fn not_equal(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::NotEqual(value))
    }
    fn greater_than(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::GreaterThan(value))
    }
    fn lower_than(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::LowerThan(value))
    }
    fn greater_than_or_equal(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::GreaterThanOrEqual(value))
    }
    fn lower_than_or_equal(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::LowerThanOrEqual(value))
    }
    fn like(value: T) -> Self::Condition {
        Self::make_condition(GeneralFilter::Like(value))
    }
    fn any(values: Vec<T>) -> Self::Condition {
        Self::make_condition(GeneralFilter::In(values))
    }
    fn is_null() -> Self::Condition {
        Self::make_condition(GeneralFilter::IsNull)
    }
    fn is_not_null() -> Self::Condition {
        Self::make_condition(GeneralFilter::IsNotNull)
    }
}

// Generates a filter module for a given query Source.
// create_condition!(ModuleName, Source, (field_name, kind, dsl_expression), ...);
macro_rules! create_condition {
    ($mod_name:ident, $source:ty, $(($variant:ident, $filter_kind:ident, $dsl_expr:expr)),+ $(,)?) => {
        #[allow(non_snake_case, non_camel_case_types)]
        pub mod $mod_name {
            use super::*;

            #[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
            #[allow(non_snake_case)]
            pub enum Inner {
                $(
                    $variant(create_condition!(@filter_type $filter_kind)),
                )+
                And(Vec<Inner>),
                Or(Vec<Inner>),
                True,
                False
            }

            impl Inner {
                // Compile the filter AST into a boxed Diesel WHERE expression. An empty/no-op filter compiles to TRUE.
                pub fn to_boxed(self) -> BoxedCondition {
                    self.to_boxed_condition().unwrap_or_else(|| Box::new(true.into_sql::<diesel::sql_types::Bool>().nullable()))
                }

                /// All property conditions in the tree, for key validation
                /// against the table scope's allowed keys.
                pub fn custom_field_conditions(&self) -> Vec<&crate::db_diesel::json_custom_field_filter::CustomFieldCondition> {
                    match self {
                        $(
                            Inner::$variant(f) => create_condition!(@collect $filter_kind, f),
                        )+
                        Inner::And(conditions) | Inner::Or(conditions) => conditions
                            .iter()
                            .flat_map(|condition| condition.custom_field_conditions())
                            .collect(),
                        Inner::True | Inner::False => vec![],
                    }
                }
            }

            pub const TRUE: Inner = Inner::True;
            pub const FALSE: Inner = Inner::False;

            $(
                #[allow(non_snake_case)]
                pub struct $variant;

                create_condition!(@impl_trait $variant, $filter_kind);
            )+

            pub fn And(conditions: Vec<Inner>) -> Inner {
                Inner::And(conditions)
            }

            pub fn Or(conditions: Vec<Inner>) -> Inner {
                Inner::Or(conditions)
            }

            pub fn True() -> Inner {
                Inner::True
            }

            pub fn False() -> Inner {
                Inner::False
            }

            // Note: BoxableExpression has Send as a supertrait, so this is usable
            // inside boxed queries and subqueries (whose WHERE clauses require Send)
            type BoxedCondition = Box<dyn BoxableExpression<$source, crate::DBType, SqlType = diesel::sql_types::Nullable<diesel::sql_types::Bool>>>;

            impl Inner {
                 fn to_boxed_condition(self) -> Option<BoxedCondition> {
                   match self {
                        $(
                            Inner::$variant(f) => {
                                Some(create_condition!(@filter_macro $filter_kind, f, $dsl_expr))
                            },
                        )+
                        Inner::And(conditions) => create_filter(conditions, crate::dynamic_query_filter::AndOr::And),
                        Inner::Or(conditions) => create_filter(conditions, crate::dynamic_query_filter::AndOr::Or),
                        Inner::True => Some(Box::new(true.into_sql::<diesel::sql_types::Bool>().nullable())),
                        Inner::False => Some(Box::new(false.into_sql::<diesel::sql_types::Bool>().nullable())),
                    }
                }
            }

            fn create_filter(conditions: Vec<Inner>, and_or: crate::dynamic_query_filter::AndOr) -> Option<BoxedCondition> {
                conditions
                    .into_iter()
                    .filter_map::<BoxedCondition, _>(Inner::to_boxed_condition)
                    .fold(None, |boxed_conditions, boxed_condition| {
                        Some(match boxed_conditions {
                            None => boxed_condition,
                            Some(bc) =>
                                match and_or {
                                    crate::dynamic_query_filter::AndOr::And => Box::new(bc.and(boxed_condition)),
                                    crate::dynamic_query_filter::AndOr::Or => Box::new(bc.or(boxed_condition)),

                                }
                            })
                        })
            }
        }
    };

    // Internal arms below resolve the `kind` token. To add a new shorthand (e.g. `bool`),
    // add matching arms to @filter_type, @impl_trait, @filter_macro and @collect.
    // Note: literal-token arms (number, string, properties) must stay above the
    // generic `$custom_type:ty` fallbacks, or the fallback swallows them.

    // Map filter kind to filter type.
    // `properties` is special: the dsl expression is a JSON properties column and
    // the variant holds key + typed filter (see json_custom_field_filter.rs).
    (@filter_type number) => { crate::dynamic_query_filter::GeneralFilter<i32> };
    (@filter_type string) => { crate::dynamic_query_filter::GeneralFilter<String> };
    (@filter_type custom_fields) => { crate::db_diesel::json_custom_field_filter::CustomFieldCondition };
    (@filter_type $custom_type:ty) => { crate::dynamic_query_filter::GeneralFilter<$custom_type> };

    // Implement FilterBuilder trait for number fields
    (@impl_trait $variant:ident, number) => {
        impl crate::dynamic_query_filter::FilterBuilder<i32> for $variant {
            type Condition = Inner;
            fn make_condition(filter: crate::dynamic_query_filter::GeneralFilter<i32>) -> Inner {
                Inner::$variant(filter)
            }
        }
    };

    // Implement FilterBuilder trait for string fields
    (@impl_trait $variant:ident, string) => {
        impl crate::dynamic_query_filter::FilterBuilder<String> for $variant {
            type Condition = Inner;
            fn make_condition(filter: crate::dynamic_query_filter::GeneralFilter<String>) -> Inner {
                Inner::$variant(filter)
            }
        }
    };

    // Property fields don't fit FilterBuilder (a condition is key + typed
    // filter, not a single value) — generate an inherent constructor instead:
    // `Module::CustomField::condition("key", CustomFieldValueFilter::Text(GeneralFilter::Like(..)))`
    (@impl_trait $variant:ident, custom_fields) => {
        impl $variant {
            pub fn condition(
                key: impl Into<String>,
                filter: crate::db_diesel::json_custom_field_filter::CustomFieldValueFilter,
            ) -> Inner {
                Inner::$variant(crate::db_diesel::json_custom_field_filter::CustomFieldCondition {
                    key: key.into(),
                    filter,
                })
            }
        }
    };

    // Implement FilterBuilder trait for custom type fields
    (@impl_trait $variant:ident, $custom_type:ty) => {
        impl crate::dynamic_query_filter::FilterBuilder<$custom_type> for $variant {
            type Condition = Inner;
            fn make_condition(filter: crate::dynamic_query_filter::GeneralFilter<$custom_type>) -> Inner {
                Inner::$variant(filter)
            }
        }
    };

    // Helper rules - matching on identifier tokens
    (@filter_macro string, $f:ident, $dsl_expr:expr) => {
        crate::dynamic_query_filter::general_filter!($f, $dsl_expr)
    };
    (@filter_macro custom_fields, $f:ident, $dsl_expr:expr) => {
        crate::db_diesel::json_custom_field_filter::custom_field_condition_to_boxed($dsl_expr, $f)
    };
    (@filter_macro $custom_type:ty, $f:ident, $dsl_expr:expr) => {
        crate::dynamic_query_filter::general_filter_no_like!($f, $dsl_expr)
    };

    // custom_field_conditions() collection: only `properties` variants contribute
    (@collect custom_fields, $f:ident) => { vec![$f] };
    (@collect $custom_type:ty, $f:ident) => {{
        let _ = $f;
        vec![]
    }};
}

pub(crate) use create_condition;
pub(crate) use general_filter;
pub(crate) use general_filter_no_like;
