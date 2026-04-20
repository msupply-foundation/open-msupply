// Regarding dynamic queries, see: docs/content/server/repository/db_diesel/_index.md
// This is from dynamic filtering repository [tutorial](https://github.com/andreievg/diesel-rs-dynamic-filters/tree/main)

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

macro_rules! create_condition {
    ($source:ty, $(($variant:ident, $filter_kind:ident, $dsl_expr:expr)),+ $(,)?) => {
        #[allow(non_snake_case, non_camel_case_types)]
        pub mod Condition {
            use super::*;

            #[derive(Clone, serde::Serialize, serde::Deserialize)]
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
                pub fn to_boxed(self) -> BoxedCondition {
                    self.to_boxed_condition().unwrap_or_else(|| Box::new(true.into_sql::<diesel::sql_types::Bool>().nullable()))
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
