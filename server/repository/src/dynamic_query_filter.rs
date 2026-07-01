// Docs: docs/content/server/repository/_index.md
// This is from dynamic filtering repository [tutorial](https://github.com/andreievg/diesel-rs-dynamic-filters/tree/main)

// Implementation: ChangelogCondition in server/repository/src/db_diesel/changelog/changelog.rs

// The set of operators available on every filterable field.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(bound = "T: Clone + serde::Serialize + serde::de::DeserializeOwned")]
pub enum GeneralFilter<T: Clone + serde::Serialize + serde::de::DeserializeOwned> {
    Equal(T),
    NotEqual(T),
    GreaterThan(T),
    LowerThan(T),
    In(Vec<T>),
    IsNull,
    IsNotNull,
}

// Compiles a single GeneralFilter operator against a Diesel column expression to a boxed nullable Bool.
macro_rules! general_filter {
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
//
// Two field shapes can be freely mixed in one list:
//   Scalar:    (field_name, kind, dsl_expression)
//              kind is `number`, `string`, or a custom `T: Clone + Serialize + DeserializeOwned`.
//              Exposes GeneralFilter operators: equal/not_equal/greater_than/lower_than/any/is_null.
//   Subquery:  (field_name, subquery: ValueType, |value| <select expression>)
//              The variant carries a plain `ValueType` (so it serializes trivially). The closure
//              maps that value to a Diesel subquery expression — typically
//              `outer_col.eq_any(other_table::table.filter(...).select(other_col))` — replacing a
//              JOIN with an `IN (...)`. Built at the call site with `FieldName::matching(value)`.
//              NB: the closure parameter must not be named after another field in this condition
//              (each field generates a unit struct of that name, which would shadow the binding).
//
// create_condition!(ModuleName, Source, <field>, <field>, ...);
//
// Because a `macro_rules!` call can't expand in enum-variant position, the field list is consumed
// by an internal accumulator (@build): it munches one field at a time, classifying scalar vs
// subquery, and appends generated tokens to three accumulators (enum variants, field structs/impls,
// match arms). The terminal @build arm emits the whole module at once.
macro_rules! create_condition {
    ($mod_name:ident, $source:ty, $($field:tt),+ $(,)?) => {
        create_condition!(@build
            mod_name: $mod_name,
            source: $source,
            fields: [ $($field),+ ],
            variants: [],
            items: [],
            arms: [],
        );
    };

    // ===== Accumulator: classify and consume the next field =====

    // Subquery field. Variant carries the value type; the closure builds the subquery expression.
    (@build
        mod_name: $mod_name:ident, source: $source:ty,
        fields: [ ($variant:ident, subquery: $value_ty:ty, |$v:ident| $body:expr) $(, $rest:tt)* ],
        variants: [ $($variants:tt)* ],
        items: [ $($items:tt)* ],
        arms: [ $($arms:tt)* ],
    ) => {
        create_condition!(@build
            mod_name: $mod_name, source: $source,
            fields: [ $($rest),* ],
            variants: [ $($variants)* $variant($value_ty), ],
            items: [
                $($items)*
                #[allow(non_snake_case)]
                pub struct $variant;
                impl $variant {
                    pub fn matching(value: $value_ty) -> Inner {
                        Inner::$variant(value)
                    }
                }
            ],
            arms: [
                $($arms)*
                // Bind to a fixed internal name (not `$v`) so the pattern can't collide with a
                // same-named unit struct generated for another field; then expose it as `$v`.
                Inner::$variant(__subquery_value) => {
                    let $v: $value_ty = __subquery_value;
                    Some(Box::new(($body).nullable()))
                },
            ],
        );
    };

    // Scalar field. Variant carries a GeneralFilter; operators come from the FilterBuilder trait.
    (@build
        mod_name: $mod_name:ident, source: $source:ty,
        fields: [ ($variant:ident, $filter_kind:ident, $dsl_expr:expr) $(, $rest:tt)* ],
        variants: [ $($variants:tt)* ],
        items: [ $($items:tt)* ],
        arms: [ $($arms:tt)* ],
    ) => {
        create_condition!(@build
            mod_name: $mod_name, source: $source,
            fields: [ $($rest),* ],
            variants: [ $($variants)* $variant(create_condition!(@filter_type $filter_kind)), ],
            items: [
                $($items)*
                #[allow(non_snake_case)]
                pub struct $variant;
                create_condition!(@impl_trait $variant, $filter_kind);
            ],
            arms: [
                $($arms)*
                Inner::$variant(f) => {
                    Some(create_condition!(@filter_macro $filter_kind, f, $dsl_expr))
                },
            ],
        );
    };

    // ===== Terminal: all fields consumed, emit the module =====
    (@build
        mod_name: $mod_name:ident, source: $source:ty,
        fields: [],
        variants: [ $($variants:tt)* ],
        items: [ $($items:tt)* ],
        arms: [ $($arms:tt)* ],
    ) => {
        #[allow(non_snake_case, non_camel_case_types)]
        pub mod $mod_name {
            use super::*;

            #[derive(Clone, serde::Serialize, serde::Deserialize)]
            #[allow(non_snake_case)]
            pub enum Inner {
                $($variants)*
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
            }

            pub const TRUE: Inner = Inner::True;
            pub const FALSE: Inner = Inner::False;

            $($items)*

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


            type BoxedCondition = Box<dyn BoxableExpression<$source, crate::DBType, SqlType = diesel::sql_types::Nullable<diesel::sql_types::Bool>>>;

            impl Inner {
                 fn to_boxed_condition(self) -> Option<BoxedCondition> {
                   match self {
                        $($arms)*
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
    // add matching arms to @filter_type, @impl_trait, and @filter_macro.

    // Map filter kind to filter type
    (@filter_type number) => { crate::dynamic_query_filter::GeneralFilter<i32> };
    (@filter_type string) => { crate::dynamic_query_filter::GeneralFilter<String> };
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
    (@filter_macro $custom_type:ty, $f:ident, $dsl_expr:expr) => {
        crate::dynamic_query_filter::general_filter!($f, $dsl_expr)
    };
}

pub(crate) use create_condition;
pub(crate) use general_filter;
